const { Type } = require("@google/genai");

/**
 * Structured-output schema for ring specs. Mirrors RingSpec in
 * src/lib/ring-spec.ts — keep the two in step.
 *
 * Using a responseSchema means the model cannot return prose, markdown fences
 * or malformed JSON, which removes the "strip ``` and hope JSON.parse works"
 * failure mode entirely.
 */
const RING_SPEC_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ringSize: { type: Type.NUMBER, description: "US ring size, 3 to 16. Default 6." },
    bandWidth: { type: Type.NUMBER, description: "Band width in mm, 1.2 to 8. Default 2.5." },
    bandProfile: { type: Type.STRING, enum: ["comfort", "flat", "round", "knife"] },
    gemShape: {
      type: Type.STRING,
      enum: ["round", "princess", "oval", "emerald", "cushion", "marquise", "pear"],
    },
    gemSize: { type: Type.NUMBER, description: "Centre stone weight in carats, 0.05 to 15." },
    prongCount: { type: Type.INTEGER, description: "Number of prongs, 3 to 8. Default 6." },
    setting: { type: Type.STRING, enum: ["prong", "bezel", "halo", "cathedral", "three_stone"] },
    shankStyle: {
      type: Type.STRING,
      enum: ["plain", "tapered", "split", "twisted"],
    },
    shankStones: {
      type: Type.STRING,
      enum: ["none", "pave", "half_eternity", "eternity"],
    },
    finish: {
      type: Type.STRING,
      enum: ["polished", "satin", "matte", "hammered", "florentine"],
    },
    metalType: {
      type: Type.STRING,
      enum: ["18k_gold", "14k_rose", "white_gold", "platinum", "silver"],
    },
    interpretation: {
      type: Type.STRING,
      description:
        "One short sentence describing how the request was read, in plain language for the customer.",
    },
  },
  required: [
    "ringSize", "bandWidth", "bandProfile", "gemShape",
    "gemSize", "prongCount", "setting", "metalType", "finish", "shankStones", "shankStyle", "interpretation",
  ],
  propertyOrdering: [
    "ringSize", "bandWidth", "bandProfile", "gemShape",
    "gemSize", "prongCount", "setting", "metalType", "finish", "shankStones", "shankStyle", "interpretation",
  ],
};

const SYSTEM_INSTRUCTION = `
You are a jewellery CAD engineer. Convert a customer's description of a ring into
manufacturing parameters.

Rules:
- Only the listed enum values exist. Map anything else to the nearest option:
  "baguette" or "step cut" -> emerald; "navette" -> marquise; "teardrop" -> pear;
  "rub-over" -> bezel; "claw" -> prong; "white gold" -> white_gold;
  "brushed" or "silk" -> satin; "sandblasted" or "frosted" -> matte;
  "planished" or "beaten" -> hammered; "cross-hatched" or "engraved texture" ->
  florentine; "mirror" or "high shine" -> polished.
- "trilogy", "past present future" and "three stone" all mean setting=three_stone.
- shankStyle is the SHAPE of the band: "tapered" narrows toward the back of the
  finger, "split" divides into two rails across the shoulders, "twisted" is a
  rope or braid. Default plain.
- shankStones are accent stones set into the BAND, separate from the centre
  stone: "pave" for stones on the shoulders only, "half_eternity" for halfway
  round, "eternity" for all the way round. "diamond band", "accented shoulders"
  and "micro-pave" all mean pave. Default to none — most rings have a plain
  shank, and stones in the band are a deliberate and much more expensive choice.
- finish describes the SURFACE of the metal, not the stone and not the shape. If
  the customer says nothing about texture, use polished: it is what the
  overwhelming majority of rings are sold as, and a hammered band is a choice
  nobody makes by accident.
- If the customer does not state something, choose what a jeweller would default to
  for the style they described rather than repeating the same numbers every time.
- Ring size defaults to 6 if unstated. Never invent a size the customer did not give
  unless they described a wearer that implies one.
- Keep gemSize physically sensible for the described piece — a "delicate" or "dainty"
  ring is well under 1 carat; a "statement" ring may be 2 or more.
- "interpretation" must be one sentence, addressed to the customer, and must not
  mention JSON, schemas or parameters.
`.trim();

const CLAMPS = {
  ringSize: [3, 16], bandWidth: [1.2, 8], gemSize: [0.05, 15], prongCount: [3, 8],
};

/** Defends against a model returning out-of-range numbers despite the schema. */
function sanitiseSpec(raw) {
  const out = { ...raw };
  for (const [k, [lo, hi]] of Object.entries(CLAMPS)) {
    const n = Number(out[k]);
    out[k] = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined;
    if (out[k] === undefined) delete out[k];
  }
  if (out.prongCount !== undefined) out.prongCount = Math.round(out.prongCount);
  return out;
}

module.exports = { RING_SPEC_SCHEMA, SYSTEM_INSTRUCTION, sanitiseSpec };
