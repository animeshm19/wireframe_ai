/**
 * Scorer and selection tests for model-picker.js.
 *
 * Run: npm --prefix functions test     (node --test, no new dependencies)
 *
 * MODELS below is not invented. The first eight entries are the exact
 * `considered` list logged by the deployed extractRingSpec function on
 * 2026-09-20T17:31:44Z in wireframe-v1 — including the two *-image models that
 * were genuinely eligible for a text call. The rest are the shapes this picker
 * has to survive: a future preview that outscores current stable, retired
 * generations, and the non-text families Google ships under the gemini- prefix.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  pickModel,
  score,
  rejectionReason,
  NON_TEXT_MARKERS,
  UNSTABLE_MARKERS,
  ROLES,
  _resetCache,
} = require("./model-picker");

const MODELS = [
  // --- observed live in production, in logged rank order ---
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  // --- unstable endpoints ---
  "gemini-4.5-flash-preview",
  "gemini-3.9-flash-exp",
  "gemini-3.2-pro-experimental",
  // --- below the generation floor ---
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  // --- non-text families ---
  "gemini-3.5-transcribe",
  "gemini-3.5-computer-use",
  "gemini-3.4-robotics-er",
  "gemini-3.6-deep-research",
  "gemini-3.3-native-audio-dialog",
  "gemini-3.0-antigravity",
  "gemini-3.7-omni",
  "gemini-live-2.5-flash",
  "gemini-embedding-001",
  "gemini-3.5-pro-vision",
];

/** Minimal stand-in for the @google/genai client: models.list() is async-iterable. */
function fakeAi(names = MODELS) {
  return {
    models: {
      list: async () => ({
        async *[Symbol.asyncIterator]() {
          for (const name of names) {
            yield { name: `models/${name}`, supportedActions: ["generateContent"] };
          }
        },
      }),
    },
  };
}

const quietLogger = { info() {}, warn() {}, error() {} };

function cleanEnv() {
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_MODEL_EXTRACT;
  delete process.env.GEMINI_MODEL_GATE;
  delete process.env.GEMINI_MODEL_VISION;
  delete process.env.GEMINI_MIN_GENERATION;
  _resetCache();
}

test.beforeEach(cleanEnv);
test.afterEach(cleanEnv);

/** Highest-scoring model for a role, computed the same way pickModel does. */
function best(role, names = MODELS) {
  return [...names]
    .filter((n) => Number.isFinite(score(n, role)))
    .sort((a, b) => score(b, role) - score(a, role) || a.localeCompare(b))[0];
}

// ---------------------------------------------------------------- bug (a) ---

test("a hypothetical gemini-4.5-flash-preview is NOT selected, despite outscoring stable on the old scorer", async () => {
  // Old scorer: 400 + 50 + 40 - 60 = 430 vs gemini-3.8-flash's 380 + 40 = 420.
  assert.equal(score("gemini-4.5-flash-preview", "extract"), -Infinity);
  assert.match(
    rejectionReason("gemini-4.5-flash-preview", "extract"),
    /unstable endpoint/,
  );
  assert.notEqual(best("extract"), "gemini-4.5-flash-preview");

  const selected = await pickModel(fakeAi(), quietLogger, "extract");
  assert.notEqual(selected, "gemini-4.5-flash-preview");
  assert.equal(selected, "gemini-3.8-flash");
});

test("every unstable marker is excluded outright, not merely penalised", () => {
  for (const name of ["gemini-4.5-flash-preview", "gemini-3.9-flash-exp", "gemini-3.2-pro-experimental"]) {
    assert.equal(score(name, "extract"), -Infinity, `${name} should be ineligible`);
  }
  assert.deepEqual(UNSTABLE_MARKERS, ["preview", "exp", "experimental"]);
});

test("an explicit per-role env pin overrides the preview exclusion", async () => {
  process.env.GEMINI_MODEL_EXTRACT = "gemini-4.5-flash-preview";
  assert.equal(await pickModel(fakeAi(), quietLogger, "extract"), "gemini-4.5-flash-preview");
});

test("the legacy GEMINI_MODEL pin still works, for every role", async () => {
  process.env.GEMINI_MODEL = "gemini-3.6-flash";
  for (const role of Object.keys(ROLES)) {
    assert.equal(await pickModel(fakeAi(), quietLogger, role), "gemini-3.6-flash");
  }
});

// ---------------------------------------------------------------- bug (b) ---

test("gemini-3.1-flash-image is NOT selected for a text call", async () => {
  // Scored 350 on the old scorer and was eligible; it is live in this project's
  // own production `considered` list today.
  assert.equal(score("gemini-3.1-flash-image", "extract"), -Infinity);
  assert.match(rejectionReason("gemini-3.1-flash-image", "extract"), /non-text model/);

  const selected = await pickModel(fakeAi(), quietLogger, "extract");
  assert.notEqual(selected, "gemini-3.1-flash-image");
  assert.notEqual(selected, "gemini-3.1-flash-lite-image");
});

test("gemini-3.5-transcribe is NOT selected for a text call", () => {
  assert.equal(score("gemini-3.5-transcribe", "extract"), -Infinity);
  assert.match(rejectionReason("gemini-3.5-transcribe", "extract"), /non-text model/);
});

test("every marker the old regex missed is now excluded", () => {
  const missed = {
    "gemini-3.1-flash-image": "image",
    "gemini-3.5-transcribe": "transcribe",
    "gemini-3.4-robotics-er": "robotics",
    "gemini-3.5-computer-use": "computer-use",
    "gemini-3.6-deep-research": "deep-research",
    "gemini-3.0-antigravity": "antigravity",
    "gemini-3.7-omni": "omni",
  };
  for (const [name, marker] of Object.entries(missed)) {
    assert.equal(score(name, "extract"), -Infinity, `${name} should be ineligible`);
    assert.match(rejectionReason(name, "extract"), new RegExp(marker));
  }
});

test("the markers the old regex already caught are still caught", () => {
  for (const name of [
    "gemini-3.5-pro-vision",
    "gemini-embedding-001",
    "gemini-3.3-native-audio-dialog",
    "gemini-live-2.5-flash",
  ]) {
    assert.equal(score(name, "extract"), -Infinity, `${name} should be ineligible`);
  }
  for (const m of ["vision", "embedding", "aqa", "imagen", "veo", "tts", "live", "native-audio"]) {
    assert.ok(NON_TEXT_MARKERS.includes(m), `${m} must stay in the exclusion list`);
  }
});

test("no model in the fixture list that is excluded can ever win a role", () => {
  for (const role of Object.keys(ROLES)) {
    const winner = best(role);
    assert.equal(rejectionReason(winner, role), null);
    assert.ok(Number.isFinite(score(winner, role)));
  }
});

// ---------------------------------------------------------------- bug (c) ---

test("each role resolves independently and matches the model policy", async () => {
  const ai = fakeAi();
  assert.equal(await pickModel(ai, quietLogger, "extract"), "gemini-3.8-flash");
  assert.equal(await pickModel(ai, quietLogger, "gate"), "gemini-3.1-flash-lite");
  assert.equal(await pickModel(ai, quietLogger, "vision"), "gemini-3.8-flash");
});

test("one role's cached choice does not become another role's choice", async () => {
  const ai = fakeAi();
  const gate = await pickModel(ai, quietLogger, "gate");
  const extract = await pickModel(ai, quietLogger, "extract");
  assert.notEqual(gate, extract);
  // and re-reading is stable
  assert.equal(await pickModel(ai, quietLogger, "gate"), gate);
  assert.equal(await pickModel(ai, quietLogger, "extract"), extract);
});

test("each role has its own env pin", async () => {
  process.env.GEMINI_MODEL_GATE = "gemini-3.5-flash-lite";
  const ai = fakeAi();
  assert.equal(await pickModel(ai, quietLogger, "gate"), "gemini-3.5-flash-lite");
  assert.equal(await pickModel(ai, quietLogger, "extract"), "gemini-3.8-flash");
});

test("an unknown role is a programming error, not a silent default", async () => {
  await assert.rejects(() => pickModel(fakeAi(), quietLogger, "landmarks"), /Unknown model role/);
  assert.throws(() => score("gemini-3.8-flash", "landmarks"), /Unknown model role/);
});

test("when the policy's model is retired, discovery falls back within the same tier", async () => {
  const without = MODELS.filter((n) => n !== "gemini-3.8-flash");
  assert.equal(await pickModel(fakeAi(without), quietLogger, "extract"), "gemini-3.7-flash");

  _resetCache();
  const noLite = MODELS.filter((n) => n !== "gemini-3.1-flash-lite");
  assert.equal(await pickModel(fakeAi(noLite), quietLogger, "gate"), "gemini-3.5-flash-lite");
});

test("extract prefers full Flash over Flash-Lite at the same generation", () => {
  assert.ok(score("gemini-3.5-flash", "extract") > score("gemini-3.5-flash-lite", "extract"));
});

test("gate prefers Flash-Lite and refuses to drift up to Pro", () => {
  assert.ok(score("gemini-3.5-flash-lite", "gate") > score("gemini-3.5-flash", "gate"));
  assert.ok(score("gemini-3.5-flash-lite", "gate") > score("gemini-3.8-flash", "gate"));
});

// -------------------------------------------------------- generation floor ---

test("nothing below the named minimum generation is selectable", () => {
  for (const name of ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]) {
    assert.equal(score(name, "extract"), -Infinity, `${name} is below the floor`);
    assert.match(rejectionReason(name, "extract"), /below the floor/);
  }
  assert.ok(Number.isFinite(score("gemini-3.1-flash-lite", "extract")));
});

test("a malformed list response cannot silently downgrade to something ancient", async () => {
  // Every current model gone; only the retired one that caused the Dec 2025
  // outage comes back. Refusing is the correct outcome.
  await assert.rejects(
    () => pickModel(fakeAi(["gemini-1.5-flash", "gemini-1.0-pro"]), quietLogger, "extract"),
    /cleared the selection rules/,
  );
});

test("an empty list is still an explicit failure", async () => {
  await assert.rejects(
    () => pickModel(fakeAi([]), quietLogger, "extract"),
    /No Gemini model supporting generateContent/,
  );
});

test("a model name with no parseable generation is refused", () => {
  assert.equal(score("gemini-nano", "extract"), -Infinity);
  assert.match(rejectionReason("gemini-nano", "extract"), /no parseable generation/);
});

test("the floor is overridable, for a deliberate policy change", () => {
  assert.equal(score("gemini-2.5-pro", "extract"), -Infinity);
  process.env.GEMINI_MIN_GENERATION = "2";
  assert.ok(Number.isFinite(score("gemini-2.5-pro", "extract")));
});

// ------------------------------------------------------------- regressions ---

test("models not supporting generateContent are dropped before scoring", async () => {
  const ai = {
    models: {
      list: async () => ({
        async *[Symbol.asyncIterator]() {
          yield { name: "models/gemini-3.9-flash", supportedActions: ["countTokens"] };
          yield { name: "models/gemini-3.8-flash", supportedActions: ["generateContent"] };
          yield { name: "models/not-a-gemini-9.9-flash", supportedActions: ["generateContent"] };
        },
      }),
    },
  };
  assert.equal(await pickModel(ai, quietLogger, "extract"), "gemini-3.8-flash");
});

test("selection is deterministic when two models tie", () => {
  const a = "gemini-3.5-flash";
  const b = "gemini-3.5-flash";
  assert.equal(score(a, "extract"), score(b, "extract"));
});

test("the chosen model is logged with its role and whether it matches policy", async () => {
  const lines = [];
  const logger = { info: (msg, ctx) => lines.push([msg, ctx]), warn: () => {} };
  await pickModel(fakeAi(), logger, "extract");
  const [msg, ctx] = lines[0];
  assert.equal(msg, "Selected Gemini model");
  assert.equal(ctx.role, "extract");
  assert.equal(ctx.selected, "gemini-3.8-flash");
  assert.equal(ctx.matchesPolicy, true);
  assert.ok(Array.isArray(ctx.rejected) && ctx.rejected.length > 0);
});

test("a divergence from the model policy is warned about, never silent", async () => {
  const warnings = [];
  const logger = { info: () => {}, warn: (msg, ctx) => warnings.push([msg, ctx]) };
  const without = MODELS.filter((n) => n !== "gemini-3.8-flash");
  await pickModel(fakeAi(without), logger, "extract");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0][0], /differs from the model policy/);
  assert.equal(warnings[0][1].selected, "gemini-3.7-flash");
  assert.equal(warnings[0][1].policyModel, "gemini-3.8-flash");
});
