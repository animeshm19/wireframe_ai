/**
 * The structure audit's design matrices (see structure-audit.mjs), shared
 * with perf-baseline.mjs, which holds the warm preview budget on every
 * design of the fast matrix (Animesh, 2026-10-19, q. 43).
 *
 * `std` is the compiled setting-standards module (.brepcheck), so the
 * bench corners are built from BENCH_FIELDS at run time and a field added
 * later is covered.
 */
import { stageIndex } from "./structure-invariants.mjs";

export function matrices(std) {
  const WIRED_IN = Object.fromEntries(std.BENCH_FIELDS.map((f) => [f.key, f.wiredIn]));
  const FIRST_WIRED = [...new Set(Object.values(WIRED_IN))].sort((a, b) => stageIndex(a) - stageIndex(b))[0];

  /** A stable name for a spec: its keys sorted, so the same design is the same row in every report. */
  function idOf(spec) {
    const sortDeep = (v) => (v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])])) : v);
    return JSON.stringify(sortDeep(spec));
  }
  /**
   * The engine's own defaults (buildRingParts). A key at its default is dropped,
   * so one ring is one row whichever matrix spelled it: the fast matrix's
   * `{prongCount: 3}` and the full matrix's round 1 ct three-prong are the same
   * design, and --compare has to see them as such.
   */
  const ENGINE_DEFAULTS = {
    ringSize: 6, bandWidth: 2.5, gemSize: 1, prongCount: 6, bandProfile: "comfort",
    gemShape: "round", setting: "prong", shankStones: "none", shankStyle: "plain", metalType: "platinum",
  };
  const normalise = (spec) => Object.fromEntries(Object.entries(spec)
    .filter(([k, v]) => ENGINE_DEFAULTS[k] !== v));
  const design = (raw, corner) => {
    const spec = normalise(raw);
    return { id: idOf(spec), spec, ...(corner ? { corner } : {}) };
  };

  /** Bench corners. Built from BENCH_FIELDS at run time, so a field added later is covered. */
  const bound = (key, which, alloy = "platinum") => std.benchBounds(key, alloy)[which];
  const allAt = (which, alloy) => Object.fromEntries(std.BENCH_FIELDS.map((f) => [f.key, bound(f.key, which, alloy)]));
  const corner = (base, key, which) => design(
    { ...base, bench: { [key]: bound(key, which, base.metalType) } },
    { field: key, bound: which, stage: WIRED_IN[key] });
  const cornerAll = (base, which) => design(
    { ...base, bench: allAt(which, base.metalType) },
    { field: "all", bound: which, stage: FIRST_WIRED });

  const CUTS = ["round", "oval", "pear", "marquise", "cushion", "emerald", "princess"];

  function fastMatrix() {
    const d = [design({})];
    for (const prongCount of [3, 4, 8]) d.push(design({ prongCount }));
    for (const gemShape of ["oval", "pear", "marquise", "cushion", "emerald", "princess"]) d.push(design({ gemShape }));
    d.push(design({ gemShape: "marquise", prongCount: 4 }));
    for (const gemSize of [0.25, 3]) d.push(design({ gemSize }));
    d.push(design({ ringSize: 4, gemSize: 0.5 }), design({ ringSize: 11, gemSize: 3 }));
    for (const bandWidth of [1.2, 1.6, 6]) d.push(design({ bandWidth }));
    for (const bandProfile of ["flat", "knife"]) d.push(design({ bandProfile }));
    for (const gemShape of ["round", "oval", "marquise"]) d.push(design({ setting: "halo", gemShape }));
    d.push(design({ setting: "cathedral" }), design({ setting: "three_stone" }));
    for (const gemShape of ["round", "emerald"]) d.push(design({ setting: "bezel", gemShape }));
    d.push(design({ shankStones: "pave" }), design({ shankStyle: "split" }));
    // Bench corners, fast set.
    d.push(cornerAll({}, "min"), cornerAll({}, "max"));
    d.push(corner({}, "bearingDepth", "min"), corner({}, "bearingDepth", "max"));
    d.push(corner({}, "culetClearance", "max"));
    d.push(cornerAll({ gemShape: "marquise" }, "max"));
    return d;
  }

  function fullMatrix() {
    const d = [];
    for (const gemShape of CUTS) {
      for (const prongCount of [3, 4, 6, 8]) {
        for (const gemSize of [0.25, 1, 3]) d.push(design({ gemShape, prongCount, gemSize }));
      }
    }
    for (const setting of ["halo", "cathedral", "three_stone", "bezel"]) {
      for (const gemShape of CUTS) {
        for (const gemSize of [0.25, 1, 3]) d.push(design({ setting, gemShape, gemSize }));
      }
    }
    for (const bandWidth of [1.2, 1.4, 1.6, 6, 8]) d.push(design({ bandWidth }));
    for (const bandProfile of ["flat", "knife", "round"]) d.push(design({ bandProfile }));
    for (const shankStyle of ["tapered", "split", "twisted"]) d.push(design({ shankStyle }));
    // S3: the joint must hold on every band. The narrowest band with each
    // profile and the split and tapered shanks, and lasso edits under the
    // head that widen, thin and reshape the band there.
    for (const bandProfile of ["flat", "knife", "round"]) d.push(design({ bandWidth: 1.2, bandProfile }));
    for (const shankStyle of ["split", "tapered", "twisted"]) d.push(design({ bandWidth: 1.2, shankStyle }));
    d.push(design({ regions: [{ start: 1.2, end: 1.95, widthScale: 1.6 }] }));
    d.push(design({ regions: [{ start: 1.25, end: 1.9, thicknessScale: 0.75 }] }));
    d.push(design({ regions: [{ start: 1.25, end: 1.9, profile: "flat" }] }));
    d.push(design({ bandWidth: 1.6, regions: [{ start: 1.2, end: 1.95, widthScale: 0.8 }] }));
    for (const shankStones of ["pave", "half_eternity", "eternity"]) d.push(design({ shankStones }));
    for (const ringSize of [3, 16]) d.push(design({ ringSize }));
    // Bench corners, full set.
    for (const f of std.BENCH_FIELDS) {
      for (const which of ["min", "max"]) d.push(corner({}, f.key, which));
    }
    for (const key of ["bearingDepth", "prongDiameter", "asCastProngHeight", "galleryClearance",
      "galleryThickness", "filletRadius"]) {
      for (const gemShape of ["oval", "marquise"]) {
        for (const which of ["min", "max"]) d.push(corner({ gemShape }, key, which));
      }
    }
    for (const base of [{}, { gemShape: "marquise" }, { setting: "halo" }, { setting: "three_stone" }]) {
      for (const which of ["min", "max"]) d.push(cornerAll(base, which));
    }
    // S3, Animesh's decision on S2's question 25: the all-max corner on a
    // 0.25 ct and a 3 ct stone, binding, met by size-dependent engine clamps.
    for (const gemSize of [0.25, 3]) d.push(cornerAll({ gemSize }, "max"));
    d.push(cornerAll({ gemShape: "marquise", gemSize: 3 }, "max"));
    return d;
  }

  return { idOf, normalise, design, fastMatrix, fullMatrix, WIRED_IN, FIRST_WIRED };
}
