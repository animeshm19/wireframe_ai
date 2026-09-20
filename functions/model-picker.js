/**
 * Chooses a Gemini model at runtime instead of hardcoding one.
 *
 * This project has already been broken once by a hardcoded model name
 * (gemini-1.5-flash) being retired by Google, with nothing surfacing the
 * failure. Discovering a supported model at cold start means a future
 * retirement degrades to picking the next model rather than 404ing every
 * request forever.
 *
 * Three things the first version got wrong, all fixed here:
 *
 *   1. Preview / exp / experimental models were merely penalised (-60), not
 *      excluded. A future `gemini-4.5-flash-preview` outscored a current
 *      stable Flash and would have been selected silently. Preview endpoints
 *      are exactly where this class of outage comes from, so they are now
 *      excluded outright — see the env pins below for the deliberate override.
 *   2. The non-text exclusion list was incomplete. `gemini-3.1-flash-image`
 *      and `gemini-3.1-flash-lite-image` are live, eligible candidates in this
 *      project's own production logs today, ranked 7th and 8th for a text
 *      generation call.
 *   3. One global cache meant one model for the whole process. There are three
 *      jobs with different needs (cheap gate, spec extraction, vision
 *      landmarks), so selection is per role and cached per role.
 *
 * Plus a floor: nothing below MIN_GENERATION is ever selected by discovery, so
 * a malformed or truncated list response cannot silently downgrade this to
 * something ancient. If nothing clears the floor we throw rather than guess.
 *
 * Pinning, in precedence order (a pin is a deliberate human decision and
 * bypasses every rule here, including the preview exclusion and the floor):
 *   GEMINI_MODEL_GATE / GEMINI_MODEL_EXTRACT / GEMINI_MODEL_VISION  (per role)
 *   GEMINI_MODEL                                                    (legacy, all roles)
 */

/**
 * Lowest model generation discovery may select. Named, not inferred: the
 * retired model that caused the December 2025 outage was generation 1, and the
 * model policy in claude/execution-board.md puts every current job on a
 * generation-3 Flash. Override with GEMINI_MIN_GENERATION if a policy change
 * ever requires it.
 */
const MIN_GENERATION = 3;

/**
 * Substrings that mark a model as not a general text-generation model.
 * `supportedActions` filtering alone does not catch these: several of them do
 * advertise generateContent while being specialised for another modality.
 */
const NON_TEXT_MARKERS = [
  "vision",
  "embedding",
  "aqa",
  "imagen",
  "image",
  "veo",
  "tts",
  "live",
  "native-audio",
  "transcribe",
  "robotics",
  "computer-use",
  "deep-research",
  "antigravity",
  "omni",
];

/** Substrings that mark an endpoint as unstable. Never selected by discovery. */
const UNSTABLE_MARKERS = ["preview", "exp", "experimental"];

/**
 * Per-role selection policy. `policyModel` is the model named for this job in
 * claude/execution-board.md; it is applied as a decisive preference rather
 * than a hardcoded return value, so the policy's choice wins while it exists
 * and discovery still has somewhere to fall back to when it is retired.
 */
const ROLES = {
  extract: {
    env: "GEMINI_MODEL_EXTRACT",
    policyModel: "gemini-3.8-flash",
    bonus: { flash: 40, lite: -25, pro: 20 },
  },
  gate: {
    env: "GEMINI_MODEL_GATE",
    policyModel: "gemini-3.1-flash-lite",
    bonus: { flash: 40, lite: 60, pro: -50 },
  },
  vision: {
    env: "GEMINI_MODEL_VISION",
    policyModel: "gemini-3.8-flash",
    bonus: { flash: 40, lite: -25, pro: 20 },
  },
};

const DEFAULT_ROLE = "extract";

/** role -> selected model name. Per role, so one job cannot fix another's choice. */
const cache = new Map();

function minGeneration() {
  const raw = process.env.GEMINI_MIN_GENERATION;
  const n = raw === undefined ? NaN : parseInt(raw, 10);
  return Number.isFinite(n) ? n : MIN_GENERATION;
}

function roleConfig(role) {
  const cfg = ROLES[role];
  if (!cfg) {
    throw new Error(
      `Unknown model role "${role}". Known roles: ${Object.keys(ROLES).join(", ")}.`,
    );
  }
  return cfg;
}

/**
 * Why a model is not selectable, or null if it is.
 * Kept separate from score() so rejections can be logged with a reason.
 */
function rejectionReason(name, role = DEFAULT_ROLE) {
  const n = String(name).toLowerCase();
  roleConfig(role);

  const marker = NON_TEXT_MARKERS.find((m) => n.includes(m));
  if (marker) return `non-text model (matched "${marker}")`;

  const unstable = UNSTABLE_MARKERS.find((m) =>
    new RegExp(`(^|[^a-z])${m}([^a-z]|$)`).test(n),
  );
  if (unstable) return `unstable endpoint (matched "${unstable}")`;

  const ver = n.match(/gemini-(\d+)(?:\.(\d+))?/);
  if (!ver) return "no parseable generation in name";

  const generation = parseInt(ver[1], 10);
  const floor = minGeneration();
  if (generation < floor) {
    return `generation ${generation} is below the floor of ${floor}`;
  }

  return null;
}

/**
 * Rank an eligible model for a role; higher wins.
 * Returns -Infinity for anything that must never be selected, so a single
 * `Number.isFinite` check in pickModel is the only gate that matters.
 */
function score(name, role = DEFAULT_ROLE) {
  const cfg = roleConfig(role);
  if (rejectionReason(name, role) !== null) return -Infinity;

  const n = String(name).toLowerCase();
  const ver = n.match(/gemini-(\d+)(?:\.(\d+))?/);
  let s = parseInt(ver[1], 10) * 100 + parseInt(ver[2] || "0", 10) * 10;

  if (n.includes("flash")) s += cfg.bonus.flash;
  if (n.includes("lite")) s += cfg.bonus.lite;
  if (n.includes("pro")) s += cfg.bonus.pro;

  // The policy's named model wins outright while it is still offered.
  if (n === cfg.policyModel) s += 1000;

  return s;
}

/**
 * Resolve a model name for `role`, discovering it from the API on first use.
 *
 * @param {object} ai       a GoogleGenAI client
 * @param {object} [logger] firebase-functions logger, or anything with .info/.warn
 * @param {string} [role]   "extract" | "gate" | "vision"
 */
async function pickModel(ai, logger, role = DEFAULT_ROLE) {
  const cfg = roleConfig(role);

  const pinned = process.env[cfg.env] || process.env.GEMINI_MODEL;
  if (pinned) {
    if (rejectionReason(pinned, role) !== null) {
      logger?.warn?.("Pinned Gemini model would not be selected by discovery", {
        role,
        pinned,
        reason: rejectionReason(pinned, role),
      });
    }
    return pinned;
  }

  if (cache.has(role)) return cache.get(role);

  const discovered = [];
  for await (const m of await ai.models.list()) {
    const actions = m.supportedActions || m.supportedGenerationMethods || [];
    const name = (m.name || "").replace(/^models\//, "");
    if (!name.startsWith("gemini")) continue;
    if (actions.length && !actions.includes("generateContent")) continue;
    discovered.push(name);
  }

  if (!discovered.length) {
    throw new Error(
      "No Gemini model supporting generateContent is available to this API key.",
    );
  }

  const eligible = discovered.filter((n) => Number.isFinite(score(n, role)));
  if (!eligible.length) {
    throw new Error(
      `No Gemini model for role "${role}" cleared the selection rules ` +
        `(minimum generation ${minGeneration()}, no preview or non-text models). ` +
        `Discovered: ${discovered.slice(0, 12).join(", ")}. ` +
        `Pin ${cfg.env} to override.`,
    );
  }

  eligible.sort((a, b) => score(b, role) - score(a, role) || a.localeCompare(b));
  const selected = eligible[0];
  cache.set(role, selected);

  logger?.info?.("Selected Gemini model", {
    role,
    selected,
    policyModel: cfg.policyModel,
    matchesPolicy: selected === cfg.policyModel,
    considered: eligible.slice(0, 8),
    rejected: discovered
      .filter((n) => !Number.isFinite(score(n, role)))
      .slice(0, 8)
      .map((n) => `${n}: ${rejectionReason(n, role)}`),
  });

  if (selected !== cfg.policyModel) {
    // Not an error — discovery working as intended after a retirement — but it
    // must never happen silently. claude/execution-board.md is now stale.
    logger?.warn?.("Selected Gemini model differs from the model policy", {
      role,
      selected,
      policyModel: cfg.policyModel,
    });
  }

  return selected;
}

/** Test seam. Not used in production. */
function _resetCache() {
  cache.clear();
}

module.exports = {
  pickModel,
  score,
  rejectionReason,
  MIN_GENERATION,
  NON_TEXT_MARKERS,
  UNSTABLE_MARKERS,
  ROLES,
  _score: score, // back-compat with the original export name
  _resetCache,
};
