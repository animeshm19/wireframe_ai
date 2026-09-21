/**
 * A8 acceptance tests: extraction survives an unavailable model.
 *
 * No network, no clock. `generate`, `parse`, `now`, `sleep` and `random` are
 * all injected into extractWithFailover precisely so these can be proved
 * deterministically instead of observed occasionally in production.
 *
 * The live failure these are written against, 2026-09-21 07:45:17Z:
 *   ApiError, status 503, UNAVAILABLE, "This model is currently experiencing
 *   high demand", model gemini-3.8-flash, durationMs 3111.
 * Note 3111ms. It fails FAST. This is contention, not a timeout.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractWithFailover,
  describeAttempts,
  isRetryable,
  statusOf,
  DEADLINE_MS,
  DISCOVERY_TIMEOUT_MS,
} = require("./resilient-extract");

/** The chain pickModel logs on every call in production today, in rank order. */
const CHAIN = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

/** The shape @google/genai actually throws: name ApiError, numeric .status. */
function apiError(status, statusName) {
  const err = new Error(
    JSON.stringify({
      error: {
        code: status,
        message:
          status === 503
            ? "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."
            : "request failed",
        status: statusName || "UNAVAILABLE",
      },
    }),
  );
  err.name = "ApiError";
  err.status = status;
  return err;
}

const SPEC = { gemShape: "round", setting: "prong" };
const OK = { text: JSON.stringify(SPEC) };

const parse = (response) => JSON.parse(response.text);

/**
 * A fake model call plus a fake clock the call advances, so "3.1 seconds per
 * refusal" is something the test states rather than waits for.
 */
function harness(script, perCallMs = 3100, startAt = 0) {
  const queue = [...script];
  const calls = [];
  const sleeps = [];
  let t = startAt;

  return {
    calls,
    sleeps,
    elapsed: () => t,
    opts: {
      generate: async (model) => {
        calls.push(model);
        t += perCallMs;
        if (!queue.length) throw new Error(`unscripted call for ${model}`);
        const next = queue.shift();
        if (next instanceof Error) throw next;
        return next;
      },
      parse,
      now: () => t,
      sleep: async (ms) => {
        sleeps.push(ms);
        t += ms;
      },
      random: () => 0.5,
    },
  };
}

// ------------------------------------------------- 1. retry, same model ---

test("one 503 then success on the retry — same model, no failover", async () => {
  const h = harness([apiError(503), OK]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.ok, true);
  assert.deepEqual(result.spec, SPEC);
  assert.equal(result.model, "gemini-3.8-flash");
  assert.equal(result.attempts, 2);
  assert.deepEqual(h.calls, ["gemini-3.8-flash", "gemini-3.8-flash"]);

  // One short jittered backoff, and only before the same-model retry.
  assert.equal(h.sleeps.length, 1);
  assert.ok(h.sleeps[0] >= 250 && h.sleeps[0] < 500, `backoff was ${h.sleeps[0]}ms`);
});

// -------------------------------------------------------- 2. failover ---

test("two 503s then the second model answers", async () => {
  const h = harness([apiError(503), apiError(503), OK]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.ok, true);
  assert.equal(result.model, "gemini-3.7-flash");
  assert.equal(result.attempts, 3);
  assert.deepEqual(h.calls, [
    "gemini-3.8-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
  ]);
  // Backoff is for giving one model time to recover. Moving to a different
  // model is not that, so there is still exactly one sleep.
  assert.equal(h.sleeps.length, 1);
});

test("the model that ANSWERED is reported, not the one we asked first", async () => {
  const h = harness([apiError(503), apiError(503), apiError(503), OK]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.ok, true);
  assert.equal(result.model, "gemini-3.6-flash");
  assert.notEqual(result.model, CHAIN[0]);
});

// ------------------------------------------- 3. everything fails ---

test("every model refuses: no spec, marked exhausted, every model tried once", async () => {
  const h = harness(new Array(7).fill(null).map(() => apiError(503)));
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "exhausted");
  assert.equal(result.spec, undefined, "a failed chain must not carry a spec");

  // First choice twice, then one shot each down the rest of the chain.
  assert.deepEqual(h.calls, [
    "gemini-3.8-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ]);
  assert.equal(result.attempts, 7);
  assert.ok(
    result.attemptLog.every((a) => a.ok === false && a.status === 503),
    "every attempt should be logged as a 503",
  );
  // This is the state the card must label as a parser result. The function
  // returning ok:false is what makes the client run parseSpecFromPrompt at
  // all, and outcome:"exhausted" is what the handler counts as
  // outcome="parser_fallback" in the metric.
});

// ------------------------------------------------ 4. our bugs, not theirs ---

test("a 400 is NOT retried and does NOT fail over", async () => {
  const h = harness([apiError(400, "INVALID_ARGUMENT")]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "fatal");
  assert.equal(result.attempts, 1);
  assert.deepEqual(h.calls, ["gemini-3.8-flash"]);
});

test("a 400 whose message contains UNAVAILABLE is still NOT retried", async () => {
  // The guard that matters: an explicit numeric status is decisive, so a word
  // in a payload can never promote a bug of ours into a retry.
  const err = apiError(400, "INVALID_ARGUMENT");
  err.message = 'model UNAVAILABLE for this RESOURCE_EXHAUSTED request';
  const h = harness([err]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.outcome, "fatal");
  assert.equal(result.attempts, 1);
});

test("auth failures are NOT retried", async () => {
  for (const status of [401, 403, 404]) {
    const h = harness([apiError(status, "PERMISSION_DENIED")]);
    const result = await extractWithFailover({ chain: CHAIN, ...h.opts });
    assert.equal(result.outcome, "fatal", `status ${status} must be fatal`);
    assert.equal(result.attempts, 1);
  }
});

test("a schema violation is NOT retried and NOT failed over", async () => {
  // Structured output means a spec we cannot read is our bug. Asking another
  // model the same question would only make it intermittent.
  const h = harness([{ text: "{not json" }]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "fatal");
  assert.equal(result.attempts, 1);
  assert.equal(result.error.name, "SpecSchemaViolation");
  assert.deepEqual(h.calls, ["gemini-3.8-flash"]);
});

test("500 INTERNAL is deliberately NOT retried", () => {
  assert.equal(isRetryable(apiError(500, "INTERNAL")), false);
});

test("a numeric code beside a string status still decides — {status:UNAVAILABLE, code:400}", async () => {
  // The hole an adversarial pass found: preferring `status` merely because it
  // was defined made statusOf return null here, so the text "UNAVAILABLE" was
  // matched and a 400 of ours got retried across all six models.
  const err = new Error("bad request");
  err.name = "ApiError";
  err.status = "UNAVAILABLE";
  err.code = 400;

  assert.equal(statusOf(err), 400);
  assert.equal(isRetryable(err), false);

  const h = harness([err]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });
  assert.equal(result.outcome, "fatal");
  assert.equal(result.attempts, 1);
});

test("502 and 504 are retried — a busy Google frontend is not our bug", () => {
  // Reporting these as fatal told the customer "could not interpret that
  // description" over what was purely someone else's queue.
  assert.equal(isRetryable(apiError(502, "UNAVAILABLE")), true);
  assert.equal(isRetryable(apiError(504, "DEADLINE_EXCEEDED")), true);
});

test("a gRPC-shaped error is classified by its status NAME, not its number", () => {
  // gRPC 14 is UNAVAILABLE and 8 is RESOURCE_EXHAUSTED. An unclassified
  // number falls through to the name rather than being guessed at.
  assert.equal(isRetryable({ code: 14, message: "14 UNAVAILABLE: the service is busy" }), true);
  assert.equal(isRetryable({ code: 8, status: "RESOURCE_EXHAUSTED" }), true);
  assert.equal(isRetryable({ code: 3, status: "INVALID_ARGUMENT" }), false);
});

// --------------------------------------------- retryable classification ---

test("429 RESOURCE_EXHAUSTED is retried", async () => {
  const h = harness([apiError(429, "RESOURCE_EXHAUSTED"), OK]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
});

test("a status name with no numeric status is still classified", () => {
  assert.equal(isRetryable({ status: "UNAVAILABLE", message: "busy" }), true);
  assert.equal(isRetryable({ status: "RESOURCE_EXHAUSTED" }), true);
  assert.equal(isRetryable({ status: "INVALID_ARGUMENT" }), false);
});

test("a network-level failure is retried", async () => {
  const err = new Error("read ECONNRESET");
  err.code = "ECONNRESET";
  const h = harness([err, OK]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
});

// ------------------------------------------------------------- budget ---

test("no attempt is started that cannot finish before the deadline", async () => {
  // 11s per refusal: pathologically slow next to the real 3.1s, but still
  // inside the 12s per-attempt cap, so this measures the budget arithmetic
  // rather than the attempt timeout (which has its own test below).
  const h = harness(new Array(7).fill(null).map(() => apiError(503)), 11000);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "budget");
  assert.equal(result.attempts, 3, "stopped rather than starting a 4th");
  assert.ok(
    h.elapsed() < DEADLINE_MS,
    `finished at ${h.elapsed()}ms, budget is ${DEADLINE_MS}ms`,
  );
  // The claim that actually matters: budget + a bounded discovery still
  // leaves headroom inside the function's own 60s timeout.
  assert.ok(
    DEADLINE_MS + DISCOVERY_TIMEOUT_MS < 60000,
    `${DEADLINE_MS} + ${DISCOVERY_TIMEOUT_MS} must stay under the 60s timeout`,
  );
});

test("time already spent on discovery is deducted from the budget", async () => {
  // A cold start where models.list() took 25 seconds. The budget runs from
  // the start of the REQUEST, so only one attempt can be afforded — and the
  // whole thing still lands inside 45s rather than 25s + 45s.
  const h = harness(new Array(7).fill(null).map(() => apiError(503)), 11000, 25000);
  const result = await extractWithFailover({
    chain: CHAIN,
    ...h.opts,
    startedAt: 0,
  });

  assert.equal(result.outcome, "budget");
  assert.equal(result.attempts, 1);
  assert.ok(h.elapsed() < DEADLINE_MS, `finished at ${h.elapsed()}ms`);
});

test("the fast real-world case stays far inside the function timeout", async () => {
  const h = harness(new Array(7).fill(null).map(() => apiError(503)));
  await extractWithFailover({ chain: CHAIN, ...h.opts });
  assert.ok(h.elapsed() < 30000, `whole chain took ${h.elapsed()}ms`);
});

test("an attempt that never answers is abandoned, and its late rejection does not crash", async () => {
  let rejectLate;
  const hanging = new Promise((_resolve, reject) => {
    rejectLate = reject;
  });
  let call = 0;
  const result = await extractWithFailover({
    chain: CHAIN,
    attemptTimeoutMs: 20,
    generate: () => (++call === 1 ? hanging : Promise.resolve(OK)),
    parse,
  });

  assert.equal(result.ok, true);
  assert.equal(result.model, "gemini-3.8-flash");
  assert.equal(result.attempts, 2);
  assert.equal(result.attemptLog[0].errorName, "AttemptTimeout");

  // The abandoned call rejects after the race was decided. If it were not
  // caught, this would be an unhandled rejection and take the instance down.
  rejectLate(apiError(503));
  await new Promise((resolve) => setTimeout(resolve, 30));
});

// ------------------------------------------------ never poison the chain ---

test("the caller's chain is never mutated", async () => {
  const chain = [...CHAIN];
  const h = harness(new Array(7).fill(null).map(() => apiError(503)));
  await extractWithFailover({ chain, ...h.opts });
  assert.deepEqual(chain, CHAIN, "failover must not reorder or truncate the chain");
});

test("an empty chain is a programming error, not a silent parser fallback", async () => {
  await assert.rejects(
    () => extractWithFailover({ chain: [], generate: async () => OK, parse }),
    /non-empty model chain/,
  );
});

// --------------------------------------------------------- log legibility ---

test("the attempt chain is readable in one log line", async () => {
  const h = harness([apiError(503), apiError(503), OK]);
  const result = await extractWithFailover({ chain: CHAIN, ...h.opts });
  assert.equal(
    describeAttempts(result.attemptLog),
    "gemini-3.8-flash#1 503, gemini-3.8-flash#2 503, gemini-3.7-flash#1 ok",
  );
});
