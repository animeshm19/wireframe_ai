/**
 * The structure invariants: what a ring's head must be, and from which prompt
 * of the ring-structure series each rule is enforced.
 *
 * One table, so a later prompt flips an expectation in exactly one place.
 * `requiredFrom(spec)` names the stage at which the rule starts to bind for
 * that design; before it the result is reported and nothing fails. Rules that
 * bind some settings earlier than others say so here, as a predicate on the
 * spec, rather than as a single stage.
 *
 * Every threshold is read from the EFFECTIVE bench values the audit recorded
 * for that design (result.bench.values), never from a default: a design that
 * asks for a 0.8 mm gap under the culet is held to 0.8 (STRUCTURE-RULES 6a).
 *
 * Statuses:
 *   PASS  measured and within the rule
 *   FAIL  measured and outside it, or the measurement itself failed
 *   N/A   the rule has nothing to measure on this design (no gallery on a bezel)
 *   TODO  the rule applies but its measurement does not exist yet; a TODO
 *         that is required counts as a failure, so the prompt that makes a
 *         rule binding cannot forget to give it a measurement
 */

export const STAGES = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
export const stageIndex = (s) => {
  const i = STAGES.indexOf(s);
  if (i < 0) throw new Error(`unknown stage ${s}; expected one of ${STAGES.join(", ")}`);
  return i;
};

// Fixed standards the rules use, mirrored from FIXED_STANDARDS in
// src/lib/setting-standards.ts; checked against it by the audit script at
// start-up, so the two cannot drift.
export const JOINT_AREA_RATIO = 1.0;

const setting = (spec) => spec.setting ?? "prong";
/** Settings whose centre head is a prong head the S1 seat work covers. */
const prongLike = (spec) => setting(spec) === "prong" || setting(spec) === "three_stone";
const num = (x) => typeof x === "number" && Number.isFinite(x);
const fmt = (x) => (num(x) ? String(+x.toFixed(4)) : String(x));

const pass = (detail = "") => ({ status: "PASS", detail });
const fail = (detail) => ({ status: "FAIL", detail });
const na = (detail = "") => ({ status: "N/A", detail });
const todo = (detail) => ({ status: "TODO", detail });

/** All of a list of checks; the first failure explains the row. */
function all(checks) {
  const bad = checks.find((c) => !c.ok);
  return bad ? fail(bad.why) : pass(checks.map((c) => c.note).filter(Boolean).join("; "));
}

/**
 * How each bench field shows up in the measured geometry, for I13. Empty at
 * S0: no field reaches the geometry yet. The prompt that wires a field adds
 * its entry here: `(r, v) => ({ ok, why })`, with v the effective value.
 */
export const BENCH_MEASURES = {};

export const INVARIANTS = [
  {
    id: "I1",
    title: "one solid, nothing dropped by the fuse",
    // Oval and marquise prong rings fail today because of the round rail;
    // halo and bezel are reworked in S6.
    requiredFrom: (spec) => (["halo", "bezel"].includes(setting(spec)) ? "S6" : "S2"),
    evaluate: (r) => all([
      { ok: r.solidCount === 1, why: `${r.solidCount} solids` },
      { ok: r.dropped === 0, why: `${r.dropped} part(s) dropped by the fuse` },
    ]),
  },
  {
    id: "I2a",
    title: "centre stone does not overlap metal (≤ 0.001 mm³)",
    requiredFrom: (spec) => (prongLike(spec) ? "S1" : "S6"),
    evaluate: (r) => {
      const v = r.stones[0]?.overlapWithMetal;
      return num(v) && v <= 0.001 ? pass(fmt(v)) : fail(`centre overlap ${fmt(v)} mm³`);
    },
  },
  {
    id: "I2b",
    title: "no stone overlaps metal (≤ 0.001 mm³ each)",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const bad = r.stones.filter((s) => !(num(s.overlapWithMetal) && s.overlapWithMetal <= 0.001));
      const total = r.stones.reduce((t, s) => t + (num(s.overlapWithMetal) ? s.overlapWithMetal : 0), 0);
      return bad.length
        ? fail(`${bad.length} of ${r.stones.length} stones overlap metal, total ${fmt(total)} mm³`)
        : pass(`${r.stones.length} stones`);
    },
  },
  {
    id: "I3a",
    title: "culet clearance ≥ culetClearance (effective) − 0.01",
    requiredFrom: (spec) => (prongLike(spec) ? "S1" : "S6"),
    evaluate: (r) => {
      const want = r.bench.values.culetClearance - 0.01;
      const got = r.centre.culetClearance;
      return num(got) && got >= want ? pass(fmt(got)) : fail(`culet ${fmt(got)} mm, needs ≥ ${fmt(want)}`);
    },
  },
  {
    id: "I3b",
    title: "side stones' culet clearance ≥ culetClearance (effective) − 0.01",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const sides = r.stones.filter((s) => s.role === "side");
      if (!sides.length) return na("no side stones");
      const want = r.bench.values.culetClearance - 0.01;
      const worst = Math.min(...sides.map((s) => (num(s.culetClearance) ? s.culetClearance : -Infinity)));
      return worst >= want ? pass(fmt(worst)) : fail(`side culet ${fmt(worst)} mm, needs ≥ ${fmt(want)}`);
    },
  },
  {
    id: "I3c",
    title: "halo and shank accents: culet not inside metal (≥ 0)",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const acc = r.stones.filter((s) => s.role === "halo" || s.role === "accent");
      if (!acc.length) return na("no accents");
      const worst = Math.min(...acc.map((s) => (num(s.culetClearance) ? s.culetClearance : -Infinity)));
      return worst >= 0 ? pass(`worst ${fmt(worst)}`) : fail(`an accent culet is ${fmt(-worst)} mm inside metal`);
    },
  },
  {
    id: "I11",
    title: "stones never intersect each other (≤ 0.001 mm³ per pair)",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const bad = r.stonePairs.filter((p) => !(num(p.volume) && p.volume <= 0.001));
      return bad.length ? fail(`${bad.length} pair(s), worst ${fmt(r.maxStoneStoneOverlap)} mm³`) : pass();
    },
  },
  {
    id: "I4",
    title: "gallery clear of the stone, at galleryClearance, touching every prong",
    requiredFrom: () => "S2",
    evaluate: (r) => {
      if (!r.galleries.length) return na("no gallery");
      return all(r.galleries.flatMap((g) => {
        // Each head by its own values (a side head's automatic ones follow its
        // smaller stone); reports from before S0's review carry none.
        const gc = g.bench?.galleryClearance ?? r.bench.values.galleryClearance;
        return [
        { ok: num(g.inStone) && g.inStone <= 0.001, why: `${g.head} gallery in stone ${fmt(g.inStone)} mm³` },
        { ok: num(g.clearanceToStone) && g.clearanceToStone >= gc - 0.02 && g.clearanceToStone <= gc + 0.10,
          why: `${g.head} gallery clearance ${fmt(g.clearanceToStone)}, needs ${fmt(gc - 0.02)} to ${fmt(gc + 0.10)}` },
        { ok: g.prongsTouched === g.prongCount, why: `${g.head} gallery touches ${g.prongsTouched} of ${g.prongCount} prongs` },
        ];
      }));
    },
  },
  {
    id: "I5",
    title: "gallery at the rule-of-thirds height (±0.05), at least galleryThickness thick",
    requiredFrom: () => "S2",
    evaluate: (r) => {
      if (!r.galleries.length) return na("no gallery");
      return all(r.galleries.flatMap((g) => {
        const t = g.bench?.galleryThickness ?? r.bench.values.galleryThickness;
        return [
        { ok: num(g.centreHeightAboveCulet) && Math.abs(g.centreHeightAboveCulet - g.ruleOfThirdsHeight) <= 0.05,
          why: `${g.head} gallery centre ${fmt(g.centreHeightAboveCulet)} above culet, rule says ${fmt(g.ruleOfThirdsHeight)}` },
        // 0.01 allows for the section being read off a 0.002 mm mesh.
        { ok: num(g.thicknessEstimate) && g.thicknessEstimate >= t - 0.01,
          why: `${g.head} gallery ${fmt(g.thicknessEstimate)} thick, needs ${fmt(t)}` },
        ];
      }));
    },
  },
  {
    id: "I6",
    title: "every prong stands in the base (> 0.02 mm³) and not in the band",
    requiredFrom: () => "S3",
    evaluate: (r) => {
      if (!r.prongs.length) return na("no prongs");
      return all(r.prongs.flatMap((p) => [
        { ok: num(p.inBase) && p.inBase > 0.02, why: `${p.head} prong ${p.index} in base ${fmt(p.inBase)} mm³` },
        { ok: num(p.inBand) && p.inBand <= 1e-6, why: `${p.head} prong ${p.index} in band ${fmt(p.inBand)} mm³` },
      ]));
    },
  },
  // Known limits, for S3, which owns the joint: the disc is the prompt's
  // (girdleR × 1.2 round the centre axis), so on a three-stone it also cuts
  // the side heads and on a cathedral the struts (1 ct round: prong 3.89,
  // three-stone 6.54, cathedral 6.78 mm²). And the prong sum uses the
  // effective prongDiameter, which until S1 wires it can differ from the
  // built one (0.25 ct: clamped 0.80 against 0.744 built), erring strict.
  {
    id: "I7",
    title: "joint section ≥ JOINT_AREA_RATIO × summed prong sections",
    requiredFrom: () => "S3",
    evaluate: (r) => {
      // A prong head whose joint could not be measured fails: a missing
      // number is never a pass (the cause is in result.errors).
      if (!r.joint) return r.prongs.some((p) => p.head === "centre") ? fail("joint not measured") : na("no prong head");
      const { jointSectionArea: a, prongSectionSum: p } = r.joint;
      return num(a) && a >= JOINT_AREA_RATIO * p
        ? pass(`${fmt(a)} vs ${fmt(p)}`) : fail(`joint ${fmt(a)} mm² vs prongs ${fmt(p)} mm²`);
    },
  },
  {
    id: "I8",
    title: "STL: every edge used twice, no zero-area triangle, one component",
    requiredFrom: () => "S7",
    evaluate: (r) => {
      if (!r.stl) return fail("no STL measured");
      return all([
        { ok: r.stl.edgesNot2 === 0, why: `${r.stl.edgesNot2} edges not used twice` },
        { ok: r.stl.zeroArea === 0, why: `${r.stl.zeroArea} zero-area triangles` },
        { ok: r.stl.components === 1, why: `${r.stl.components} components` },
      ]);
    },
  },
  // The prompt's I9 is "metal is 1 MANIFOLD_SOLID_BREP, 0 triangulated
  // entities", expected to hold from S0. Measured in S0, the one-solid half
  // cannot: it is I1 read back from the file, and a two-piece metal stays two
  // pieces until S2. Worse, it sometimes "passes" for the wrong reason:
  //   {"gemShape":"marquise","prongCount":4}  2 solids, STEP has 2  (honest, fails)
  //   {"gemShape":"marquise"}                 2 solids, STEP has 1  (a piece lost)
  // toSTEP wrote the six-prong marquise's 7.529 + 186.238 mm³ as one solid of
  // 179.504 when re-imported. So the rule is split, nothing dropped from it:
  // I9 (B-rep, nothing triangulated, named) binds from S0 as the prompt asks;
  // I9b (exactly one solid, and as many in the file as in the metal) binds
  // with I1. Logged as an open question in STRUCTURE-LOG.md.
  {
    id: "I9",
    title: "STEP is B-rep: metal written as MANIFOLD_SOLID_BREP, nothing triangulated, solids named",
    requiredFrom: () => "S0",
    evaluate: (r) => {
      if (!r.step) return fail("no STEP measured");
      const s = r.step;
      const stoneNames = r.stones.length === 1 ? ["stones"] : r.stones.map((_, i) => `stone_${i + 1}`);
      return all([
        { ok: s.metalSolidBreps >= 1, why: "metal-only STEP has no MANIFOLD_SOLID_BREP" },
        { ok: s.triangulated === 0, why: `${s.triangulated} triangulated entities` },
        { ok: s.names.includes("metal") && stoneNames.every((n) => s.names.includes(n)), why: `names ${s.names.join(",")}` },
      ]);
    },
  },
  {
    id: "I9b",
    title: "STEP: metal is exactly one MANIFOLD_SOLID_BREP, and the file holds every solid",
    requiredFrom: (spec) => (["halo", "bezel"].includes(setting(spec)) ? "S6" : "S2"),
    evaluate: (r) => {
      if (!r.step) return fail("no STEP measured");
      return all([
        { ok: r.step.metalSolidBreps === 1, why: `metal-only STEP has ${r.step.metalSolidBreps} MANIFOLD_SOLID_BREP` },
        { ok: r.step.metalSolidBreps === r.solidCount,
          why: `metal has ${r.solidCount} solids, its STEP ${r.step.metalSolidBreps}` },
        { ok: r.step.manifoldSolidBreps === r.solidCount + r.stones.length,
          why: `${r.step.manifoldSolidBreps} MANIFOLD_SOLID_BREP for ${r.solidCount} metal + ${r.stones.length} stones` },
      ]);
    },
  },
  {
    id: "I10",
    title: "bearings and as-set prongs (measurements added by S1 and S4)",
    requiredFrom: (spec) => (prongLike(spec) ? "S1" : "S6"),
    evaluate: () => todo("bearing and as-set measurements do not exist until S1 and S4"),
  },
  {
    id: "I13",
    title: "every customised bench value shows up in the geometry",
    // Binds from the earliest prompt that wires one of the customised fields.
    requiredFrom: (spec, ctx) => {
      const stages = (ctx.customised ?? []).map((k) => ctx.wiredIn[k]).filter(Boolean);
      return stages.length ? stages.sort((a, b) => stageIndex(a) - stageIndex(b))[0] : null;
    },
    evaluate: (r) => {
      const keys = r.bench.customised;
      if (!keys.length) return na("nothing customised");
      const results = keys.map((k) => (BENCH_MEASURES[k]
        ? { k, ...BENCH_MEASURES[k](r, r.bench.values[k]) }
        : { k, ok: null, why: "no measurement defined yet" }));
      const bad = results.find((x) => x.ok === false);
      if (bad) return fail(`${bad.k}: ${bad.why}`);
      const missing = results.filter((x) => x.ok === null).map((x) => x.k);
      return missing.length ? todo(`no measurement yet for ${missing.join(", ")}`) : pass(keys.join(", "));
    },
  },
];

/**
 * When a rule binds for one design. A bench-corner design (a field at a
 * bound) binds no earlier than the prompt that wires that field: before then
 * the value does not reach the geometry and the row is the default ring under
 * another name. All-min and all-max bind from the first wired field.
 */
export function requiredStage(inv, design, ctx) {
  const own = inv.requiredFrom(design.spec, ctx);
  if (own == null) return null;
  const corner = design.corner?.stage;
  return corner && stageIndex(corner) > stageIndex(own) ? corner : own;
}

/** Every invariant for one audited design, with whether it binds at `stage`. */
export function evaluateDesign(design, result, stage, wiredIn) {
  const out = {};
  for (const inv of INVARIANTS) {
    let res;
    if (!result || result.crash) res = fail(`audit crashed: ${result?.crash ?? "no result"}`);
    else {
      try { res = inv.evaluate(result, design.spec); } catch (e) { res = fail(`evaluate threw ${e?.message ?? e}`); }
    }
    const req = requiredStage(inv, design, { customised: result?.bench?.customised, wiredIn });
    const required = req != null && stageIndex(stage) >= stageIndex(req);
    out[inv.id] = { ...res, requiredFrom: req, required };
  }
  return out;
}
