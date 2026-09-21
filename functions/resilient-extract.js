/**
 * Retry and failover for one spec-extraction request.
 *
 * The failure this exists for, verbatim from Cloud Logging on 2026-09-21:
 *
 *   {"errorName":"ApiError","errorStatus":503,
 *    "error":"{\"error\":{\"code\":503,\"message\":\"This model is currently
 *      experiencing high demand...\",\"status\":\"UNAVAILABLE\"}}",
 *    "model":"gemini-3.8-flash","durationMs":3111}
 *
 * Note the duration: 3.1 seconds. The request reached Gemini and Gemini
 * refused. This is contention, not a timeout and not a bug in our code —
 * gemini-3.8-flash is the newest flagship Flash and therefore the most
 * queued-for model on the platform. We chose it for quality and inherited
 * its queue.
 *
 * Before this module, one 503 dropped the customer all the way to
 * `parseSpecFromPrompt`, a regex parser. A jeweller who silently gets
 * gemini-3.6-flash notices nothing; one who gets a regex parser notices
 * everything.
 *
 * Three rules this file exists to keep:
 *
 *   1. A retryable failure is retried; OUR failures are not. A 400, an auth
 *      error or a schema violation is a bug of ours, and retrying it hides
 *      the bug behind an intermittent symptom. Those abort the whole chain.
 *   2. Failover is per-request and never a permanent demotion. This module
 *      is handed a chain and never writes back to it or to the model
 *      picker's cache, so a 503 on one request says nothing about the next.
 *      gemini-3.8-flash is first choice again on the following call.
 *   3. The whole budget stays well inside the 60s function timeout. Every
 *      attempt is individually bounded, no attempt is STARTED unless it could
 *      finish before the deadline, and the deadline is measured from when the
 *      REQUEST started, not from when this module was entered — model
 *      discovery on a cold start is charged to the same 60 seconds and is
 *      bounded separately (DISCOVERY_TIMEOUT_MS).
 *
 * Nothing here talks to the network, imports firebase-functions or reads the
 * clock directly on a path a test cannot control: `generate`, `parse`, `now`,
 * `sleep` and `random` are all injected. That is what makes the acceptance
 * tests possible without a network.
 */

/** Longest a single generateContent call may run before we give up on it. */
const ATTEMPT_TIMEOUT_MS = 12000;

/**
 * Wall-clock budget for the whole chain. The function's own timeout is 60s
 * (see `timeoutSeconds` in index.js), and this is measured from the start of
 * the REQUEST (see `startedAt`), so discovery is inside it rather than free.
 * 15s of headroom covers the JSON parse, the log write and the callable
 * wrapper, so a caller never sees Cloud Run terminate the request instead of
 * us answering.
 */
const DEADLINE_MS = 45000;

/** Never walk further than this down the chain, whatever discovery returned. */
const MAX_MODELS = 6;

/** Jittered backoff before a same-model retry: 250-500ms. */
const BACKOFF_BASE_MS = 250;
const BACKOFF_JITTER_MS = 250;

/**
 * Longest model discovery may take before we give up on it. Discovery is a
 * network call of its own (`models.list()`), it happens on a cold start, and
 * it is charged to the same 60s function timeout, so it has to be bounded or
 * the budget below is a wish rather than a guarantee.
 */
const DISCOVERY_TIMEOUT_MS = 10000;

/**
 * HTTP statuses that mean "the fleet is busy, ask again".
 *
 * 502 and 504 are here alongside 503 because a Google frontend under load
 * returns all three for the same condition, and none of them is a statement
 * about our request. Treating 502/504 as fatal was worse than not retrying:
 * it reported Google's queue to the customer as our bug.
 *
 * 500 INTERNAL is deliberately NOT here. It is as likely to be a malformed
 * request of ours as a transient fault on their side, and retrying it is
 * exactly how a bug of ours gets laundered into an intermittent.
 */
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

/** Statuses that are decisively ours. Retrying any of these hides a bug. */
const FATAL_STATUS = new Set([400, 401, 403, 404, 422]);

/** gRPC / Google API status strings, for SDK versions that report those instead. */
const RETRYABLE_STATUS_NAMES = ["UNAVAILABLE", "RESOURCE_EXHAUSTED"];

/** Node and undici network failures. The call never reached a model at all. */
const NETWORK_MARKERS = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
  "FETCH FAILED",
  "SOCKET HANG UP",
  "NETWORK ERROR",
];

/**
 * The numeric status on an error, or null when it does not carry one.
 *
 * Both `status` and `code` are examined, and the first NUMERIC one wins.
 * Preferring `status` merely because it is defined was a real hole: an error
 * shaped `{ status: "UNAVAILABLE", code: 400 }` returned null, fell through
 * to text matching and got retried, which is precisely the bug-hiding this
 * module exists to prevent.
 */
function statusOf(err) {
  if (!err) return null;
  for (const raw of [err.status, err.code]) {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && /^\d+$/.test(raw)) return parseInt(raw, 10);
  }
  return null;
}

/**
 * Whether this failure is worth asking again about.
 *
 * Order matters. An explicit numeric status is decisive and is checked before
 * any text matching, so a 400 whose message happens to contain the word
 * "unavailable" can never be promoted into a retry.
 */
function isRetryable(err) {
  if (!err) return false;
  if (err.wfFatal === true) return false;
  if (err.wfRetryable === true) return true;

  const status = statusOf(err);
  if (status !== null) {
    if (RETRYABLE_STATUS.has(status)) return true;
    // A status we have decided is ours is decisive, and is checked before any
    // text matching, so a 400 whose payload happens to contain the word
    // "UNAVAILABLE" can never be promoted into a retry.
    if (FATAL_STATUS.has(status)) return false;
    // Anything else numeric is unclassified — a gRPC code (14 UNAVAILABLE,
    // 8 RESOURCE_EXHAUSTED), a 500, some future shape. Fall through and let
    // the status NAME decide rather than guessing from a number.
  }

  const text = [err.status, err.code, err.name, err.message]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toUpperCase();

  if (RETRYABLE_STATUS_NAMES.some((s) => new RegExp(`\\b${s}\\b`).test(text))) {
    return true;
  }
  return NETWORK_MARKERS.some((m) => text.includes(m));
}

/**
 * Bound one attempt in time.
 *
 * The SDK call cannot be cancelled, so the abandoned promise is caught
 * separately: a rejection arriving after the race has been decided would
 * otherwise be an unhandled rejection and take the instance down.
 */
function withTimeout(promise, ms, model) {
  let timer = null;
  promise.catch(() => {});
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${model} did not answer within ${ms}ms`);
      err.name = "AttemptTimeout";
      err.wfRetryable = true;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

/**
 * Run one request across a ranked chain of models.
 *
 * Returns a result object rather than throwing, so the caller decides what a
 * failure means to a customer and nothing depends on mutating an SDK error
 * that may be frozen.
 *
 * @returns {Promise<
 *   {ok: true, spec: object, model: string, attempts: number, attemptLog: Array} |
 *   {ok: false, outcome: "exhausted"|"fatal"|"budget", error: Error,
 *    attempts: number, attemptLog: Array}
 * >}
 */
async function extractWithFailover(opts) {
  const {
    chain,
    generate,
    parse,
    now = () => Date.now(),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    random = Math.random,
    deadlineMs = DEADLINE_MS,
    attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
    maxModels = MAX_MODELS,
    backoffBaseMs = BACKOFF_BASE_MS,
    backoffJitterMs = BACKOFF_JITTER_MS,
    // When the caller has already spent time (model discovery on a cold
    // start), it passes the moment the REQUEST started. The budget is the
    // whole request's, not this module's share of it — otherwise discovery
    // is free, and "well inside the 60s timeout" stops being true.
    startedAt: callerStartedAt,
  } = opts;

  if (!Array.isArray(chain) || chain.length === 0) {
    throw new Error("extractWithFailover needs a non-empty model chain.");
  }

  // A copy, always. This module must never be able to reorder or truncate the
  // caller's list: that list is the model picker's cached ranking, and editing
  // it would turn one 503 into a permanent downgrade of every future design.
  const models = chain.slice(0, maxModels);

  const startedAt = callerStartedAt === undefined ? now() : callerStartedAt;
  const attemptLog = [];
  let lastError = null;
  let outcome = "exhausted";

  outer: for (let i = 0; i < models.length; i++) {
    const model = models[i];
    // Only the first choice gets a same-model retry. Every failover model
    // gets one shot, which is what keeps the worst case inside the budget.
    const tries = i === 0 ? 2 : 1;

    for (let attempt = 1; attempt <= tries; attempt++) {
      const elapsed = now() - startedAt;
      if (elapsed + attemptTimeoutMs > deadlineMs) {
        // Do not start something that cannot finish in time. Better to hand
        // the customer an honest parser result than to have Cloud Run
        // terminate the request mid-flight and tell them nothing at all.
        lastError =
          lastError ||
          new Error(`No budget left for ${model} after ${elapsed}ms.`);
        outcome = "budget";
        break outer;
      }

      const attemptStartedAt = now();
      try {
        const raw = await withTimeout(generate(model), attemptTimeoutMs, model);

        let spec;
        try {
          spec = parse(raw);
        } catch (parseErr) {
          // A schema violation under responseSchema is ours, not theirs.
          // Asking a different model the same question would only make it
          // intermittent.
          const fatal = new Error(
            `Model ${model} returned a spec we could not read: ${
              parseErr && parseErr.message
            }`,
          );
          fatal.name = "SpecSchemaViolation";
          fatal.wfFatal = true;
          fatal.cause = parseErr;
          throw fatal;
        }

        attemptLog.push({
          model,
          attempt,
          ok: true,
          durationMs: now() - attemptStartedAt,
        });
        return { ok: true, spec, model, attempts: attemptLog.length, attemptLog };
      } catch (err) {
        attemptLog.push({
          model,
          attempt,
          ok: false,
          errorName: (err && err.name) || null,
          status: statusOf(err),
          durationMs: now() - attemptStartedAt,
        });
        lastError = err;

        if (!isRetryable(err)) {
          outcome = "fatal";
          break outer;
        }

        // Backoff belongs before a same-model retry only. Moving to a
        // different model is not the same wait: nothing is being given time
        // to recover.
        if (attempt < tries) {
          await sleep(backoffBaseMs + Math.floor(random() * backoffJitterMs));
        }
      }
    }
  }

  return {
    ok: false,
    outcome,
    error: lastError,
    attempts: attemptLog.length,
    attemptLog,
  };
}

/** "gemini-3.8-flash#1 503, gemini-3.8-flash#2 503, gemini-3.7-flash#1 ok" */
function describeAttempts(attemptLog) {
  return attemptLog
    .map((a) => {
      const how = a.ok ? "ok" : a.status !== null ? String(a.status) : a.errorName;
      return `${a.model}#${a.attempt} ${how}`;
    })
    .join(", ");
}

module.exports = {
  extractWithFailover,
  describeAttempts,
  isRetryable,
  statusOf,
  withTimeout,
  ATTEMPT_TIMEOUT_MS,
  DISCOVERY_TIMEOUT_MS,
  DEADLINE_MS,
  MAX_MODELS,
  BACKOFF_BASE_MS,
  BACKOFF_JITTER_MS,
  RETRYABLE_STATUS,
  FATAL_STATUS,
};
