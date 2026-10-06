/**
 * CAD engine tests. No browser, no emulator, no network — compiles
 * src/lib/cad-engine.ts to CommonJS and asserts against real jewellery physics.
 *
 *   npm run test:cad
 */
const test = require("node:test");
const assert = require("node:assert");
const { measurements } = require("@jscad/modeling");
const {
  buildRing, buildGem, buildBand, gemOutline, gemDims,
} = require("./.cadcheck/cad-engine.js");

const CUTS = ["round", "princess", "oval", "emerald", "cushion", "marquise", "pear"];
const SETTINGS = ["prong", "bezel", "halo", "cathedral"];
const PROFILES = ["comfort", "flat", "round", "knife"];

const DIAMOND_DENSITY = 3.52;   // g/cm3
const CARAT_GRAMS = 0.2;

test("stone volume matches the carat weight it claims", () => {
  for (const ct of [0.25, 0.5, 1, 2, 3, 5]) {
    const girdleR = 3.25 * Math.cbrt(ct);
    const mm3 = measurements.measureVolume(buildGem("round", girdleR));
    const impliedCt = (mm3 / 1000) * DIAMOND_DENSITY / CARAT_GRAMS;
    const errorPct = Math.abs(impliedCt / ct - 1) * 100;
    assert.ok(errorPct < 6, `${ct}ct built as ${impliedCt.toFixed(2)}ct (${errorPct.toFixed(1)}% off)`);
  }
});

test("US ring size maps to the standard inner diameter", () => {
  // Published values: size 6 = 16.51mm, size 9 = 18.95mm, 0.8128mm per size.
  for (const [size, expected] of [[4, 14.88], [6, 16.51], [9, 18.95], [12, 21.39]]) {
    const { metrics } = buildRing({ ringSize: size });
    assert.ok(Math.abs(metrics.innerDiameter - expected) < 0.06,
      `size ${size}: got ${metrics.innerDiameter}mm, standard is ${expected}mm`);
  }
});

test("every cut builds a closed solid with sane proportions", () => {
  for (const cut of CUTS) {
    const solid = buildGem(cut, 3.25);
    const vol = measurements.measureVolume(solid);
    assert.ok(vol > 5, `${cut}: volume ${vol}`);
    const bb = measurements.measureBoundingBox(solid);
    const height = bb[1][2] - bb[0][2];
    const d = gemDims(3.25);
    assert.ok(Math.abs(height - d.totalH) < 0.1, `${cut}: height ${height} vs ${d.totalH}`);
  }
});

test("outlines are closed loops with enough points to loft", () => {
  for (const cut of CUTS) {
    const o = gemOutline(cut);
    assert.ok(o.length >= 4, `${cut}: only ${o.length} points`);
    assert.ok(o.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), `${cut}: non-finite point`);
  }
});

test("every setting builds, and keeps metal separate from stones", () => {
  for (const setting of SETTINGS) {
    const { metal, stones, metrics } = buildRing({ setting });
    assert.ok(measurements.measureVolume(metal) > 50, `${setting}: no metal`);
    assert.ok(stones, `${setting}: no stones`);
    assert.ok(metrics.stoneCount >= 1, `${setting}: stoneCount ${metrics.stoneCount}`);
    // Metal volume must EXCLUDE the stones, or weight estimates lie.
    assert.ok(metrics.volumeMm3 < measurements.measureVolume(metal) + 1);
    assert.ok(metrics.stoneVolumeMm3 > 0);
  }
});

test("halo produces multiple stones, other settings exactly one", () => {
  assert.strictEqual(buildRing({ setting: "prong" }).metrics.stoneCount, 1);
  assert.ok(buildRing({ setting: "halo" }).metrics.stoneCount > 5);
});

test("band profiles differ in cross-section at identical dimensions", () => {
  const vols = {};
  for (const p of PROFILES) vols[p] = measurements.measureVolume(buildBand(8.3, 3, 1.86, p));
  assert.ok(vols.flat > vols.comfort, "flat should use more metal than comfort");
  assert.ok(vols.comfort > vols.knife, "comfort should use more metal than knife");
  // A triangular section is about half a rectangular one.
  const ratio = vols.knife / vols.flat;
  assert.ok(ratio > 0.4 && ratio < 0.6, `knife/flat ratio ${ratio.toFixed(2)}`);
});

test("band thickness and width track the requested width", () => {
  const thin = buildRing({ bandWidth: 1.5 }).metrics;
  const wide = buildRing({ bandWidth: 6 }).metrics;
  assert.ok(wide.bandWidth > thin.bandWidth);
  assert.ok(wide.bandThickness >= thin.bandThickness);
  assert.ok(wide.outerDiameter > thin.outerDiameter);
});

test("out-of-range input is clamped rather than producing nonsense", () => {
  const tiny = buildRing({ ringSize: -5, gemSize: 0, bandWidth: 0 }).metrics;
  assert.ok(tiny.innerDiameter > 10, `clamped inner diameter ${tiny.innerDiameter}`);
  assert.ok(tiny.girdleDiameter > 0);
  const huge = buildRing({ ringSize: 999, gemSize: 999, bandWidth: 999 }).metrics;
  assert.ok(huge.innerDiameter < 30, `clamped inner diameter ${huge.innerDiameter}`);
});

test("a plausible ring weighs a plausible amount", () => {
  // A platinum solitaire is typically 3-7g.
  const { metrics } = buildRing({ ringSize: 6, bandWidth: 2.5, gemSize: 1 });
  const grams = (metrics.volumeMm3 / 1000) * 21.45;
  assert.ok(grams > 2.5 && grams < 8, `platinum weight ${grams.toFixed(2)}g`);
});

const { checkManufacturability, MANUFACTURING_LIMITS } = require("./.cadcheck/cad-engine.js");

test("manufacturability: a normal design passes clean", () => {
  const params = { ringSize: 6, bandWidth: 2.5, gemSize: 1, metalType: "platinum" };
  const { metrics } = buildRing(params);
  const issues = checkManufacturability(params, metrics);
  assert.deepStrictEqual(issues.filter(i => i.severity === "error"), [],
    "a standard 1ct platinum solitaire should raise no errors");
});

test("manufacturability: a too-thin band is caught", () => {
  const params = { ringSize: 6, bandWidth: 1.2, gemSize: 1, metalType: "silver" };
  const { metrics } = buildRing(params);
  const issues = checkManufacturability(params, metrics);
  assert.ok(issues.some(i => i.code === "band_too_thin"),
    `expected band_too_thin, got ${JSON.stringify(issues.map(i => i.code))}`);
});

test("manufacturability: an oversized stone is flagged", () => {
  const params = { ringSize: 4, bandWidth: 2, gemSize: 8, metalType: "platinum" };
  const { metrics } = buildRing(params);
  const issues = checkManufacturability(params, metrics);
  assert.ok(issues.some(i => i.code === "stone_overwhelms_band"),
    `expected stone_overwhelms_band, got ${JSON.stringify(issues.map(i => i.code))}`);
});

test("manufacturability: silver demands more metal than platinum", () => {
  assert.ok(MANUFACTURING_LIMITS.silver.minBandThickness >
            MANUFACTURING_LIMITS.platinum.minBandThickness);
  const params = { ringSize: 6, bandWidth: 1.8, gemSize: 1 };
  const { metrics } = buildRing(params);
  const pt = checkManufacturability({ ...params, metalType: "platinum" }, metrics);
  const ag = checkManufacturability({ ...params, metalType: "silver" }, metrics);
  assert.ok(ag.length >= pt.length, "silver should be at least as strict as platinum");
});

/* ------------------------------------------------- bench settings (S0) */
//
// setting-standards.ts is pure and compiles into .cadcheck through
// cad-engine's import of prongDiameterFor, so it is tested here without a
// kernel.

const std = require("./.cadcheck/setting-standards.js");
const { girdleRadiusFor } = require("./.cadcheck/cad-engine.js");
const ALLOYS = ["platinum", "white_gold", "18k_gold", "14k_rose", "silver"];
const ctxFor = (carat, alloy = "platinum", cut = "round") => {
  const girdleR = girdleRadiusFor(cut, carat);
  return { alloy, girdleR, pavH: gemDims(girdleR).pavH };
};
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("bench fields match the S0 table exactly", () => {
  // The table in claude/tasks/S0 prompt v2, row for row. A later prompt that
  // narrows a bound changes this table on purpose and logs it under "Bench
  // bounds changed"; nothing else should.
  const T = {
    bearingDepth:      ["% of prong", 40, 20, 50, [30, 50], "sourced range, our point value", "S1", "Seat"],
    seatTolerance:     ["mm", 0.05, 0, 0.20, undefined, "our default", "S1", "Seat"],
    culetClearance:    ["mm", 0.30, 0.10, 1.50, undefined, "our default", "S1", "Clearances"],
    pavilionClearance: ["mm", 0.25, 0.10, 0.60, undefined, "our default", "S1", "Clearances"],
    prongDiameter:     ["mm", "auto", "minProngDia", 2.0, undefined, "our default", "S1", "Prongs"],
    asCastProngHeight: ["mm above table", 2.0, 0.75, 5.0, [0.75, 5.0], "sourced range, our point value", "S1", "Prongs"],
    galleryClearance:  ["mm", 0.25, 0.10, 0.60, [0.20, 0.30], "sourced range, our point value", "S2", "Gallery"],
    galleryThickness:  ["mm", "auto", "minWall", 2.0, undefined, "sourced default", "S2", "Gallery"],
    filletRadius:      ["mm", 0.30, 0.10, 0.80, undefined, "our default", "S3", "Finishing"],
    setTipHeight:      ["fraction of crown height", 0.5, 0.3, 0.8, undefined, "sourced default", "S4", "Prongs"],
    minBendRadius:     ["× prong diameter", 1.0, 0.5, 3.0, undefined, "our default", "S4", "Prongs"],
  };
  assert.deepStrictEqual(std.BENCH_FIELDS.map((f) => f.key), Object.keys(T), "every field, in order");
  for (const f of std.BENCH_FIELDS) {
    const [unit, def, min, max, pr, status, wiredIn, group] = T[f.key];
    assert.strictEqual(f.unit, unit, `${f.key} unit`);
    assert.strictEqual(f.default, def, `${f.key} default`);
    for (const alloy of ALLOYS) {
      const b = std.benchBounds(f.key, alloy);
      const want = typeof min === "string" ? MANUFACTURING_LIMITS[alloy][min] : min;
      assert.strictEqual(b.min, want, `${f.key} min for ${alloy}`);
      assert.strictEqual(b.max, max, `${f.key} max`);
    }
    assert.deepStrictEqual(f.publishedRange, pr, `${f.key} published range`);
    assert.strictEqual(f.status, status, `${f.key} status`);
    assert.strictEqual(f.wiredIn, wiredIn, `${f.key} wiredIn`);
    assert.strictEqual(f.group, group, `${f.key} group`);
    assert.ok(f.source && f.label && f.help && f.step > 0 && f.appliesTo.length, `${f.key} is complete`);
    if (f.default === "auto") assert.ok(f.autoRule && typeof f.auto === "function", `${f.key} auto rule`);
  }
  assert.deepStrictEqual(std.PROVISIONAL_INPUTS.map((f) => f.key),
    std.BENCH_FIELDS.filter((f) => f.status !== "sourced default").map((f) => f.key));
  assert.ok(!std.PROVISIONAL_INPUTS.some((f) => f.key === "galleryThickness" || f.key === "setTipHeight"));
  for (const k of ["GALLERY_RULE_OF_THIRDS", "AS_SET_TIP_BELOW_TABLE", "AS_SET_CONTACT_TOL_MM",
    "JOINT_AREA_RATIO", "GALLERY_CLEARANCE_COLOURED_MM"]) {
    assert.ok(std.FIXED_STANDARDS[k] && std.FIXED_STANDARDS[k].source && std.FIXED_STANDARDS[k].why, k);
  }
  assert.strictEqual(std.FIXED_STANDARDS.AS_SET_CONTACT_TOL_MM.value, 0.05);
  assert.strictEqual(std.FIXED_STANDARDS.JOINT_AREA_RATIO.value, 1.0);
  assert.strictEqual(std.FIXED_STANDARDS.GALLERY_CLEARANCE_COLOURED_MM.value, 0.40);
});

test("bench copy passes the site's copy rules", () => {
  // The same patterns scripts/audit.mjs fails rendered text on. Labels and
  // help are shown to users in the Studio's bench panel (S5).
  const RULES = [
    /—/, /\b[\w' ]{2,40}, (not|never) (a |an |the )?[\w'-]+/i,
    /\b(mathematical precision|synthesi[sz]e|algebraic|micron-accurate|seamless|unlock|elevate|empower|cutting-edge|revolution|harness|leverage|robust|next-gen|game-changer|effortless|rigorous)\b/i,
    /\bjewelry\b|\bcenter\b|\bcolor\b|\bcustomi[sz]e\b/i,
  ];
  for (const f of std.BENCH_FIELDS) {
    for (const text of [f.label, f.help]) {
      for (const re of RULES) assert.ok(!re.test(text), `${f.key}: "${text}" breaks ${re}`);
    }
  }
});

test("prongDiameterFor is the engine's formula, unchanged", () => {
  near(std.prongDiameterFor(3.245), 0.852, 0.0005, "1ct round girdle");
  near(std.prongDiameterFor(girdleRadiusFor("round", 2)), 0.928, 0.0005, "2ct round girdle");
  for (const g of [1, 2.5, 3.245, 4.7, 8]) {
    assert.strictEqual(std.prongDiameterFor(g), (0.28 + g * 0.045) * 2, `bit-identical at ${g}`);
  }
});

test("resolveBench: defaults, with nothing customised", () => {
  const ctx = ctxFor(1);
  const r = std.resolveBench(undefined, ctx);
  assert.deepStrictEqual(r.warnings, []);
  assert.deepStrictEqual(r.customised, []);
  assert.strictEqual(r.values.bearingDepth, 40);
  assert.strictEqual(r.values.culetClearance, 0.30);
  near(r.values.prongDiameter, 0.852, 0.0005, "auto prong");
  near(r.values.galleryThickness, ctx.pavH / 3, 1e-12, "auto gallery is a third of the pavilion");
  assert.deepStrictEqual(Object.keys(r.values), std.BENCH_KEYS);
  assert.deepStrictEqual(std.resolveBench({}, ctx), r, "an empty object is the same as none");
});

test("resolveBench: every field clamps at both bounds and says so", () => {
  for (const alloy of ALLOYS) {
    const ctx = ctxFor(1, alloy);
    for (const f of std.BENCH_FIELDS) {
      const { min, max } = std.benchBounds(f.key, alloy);
      for (const [asked, want] of [[min - 1, min], [max + 1, max]]) {
        const r = std.resolveBench({ [f.key]: asked }, ctx);
        assert.strictEqual(r.values[f.key], want, `${alloy} ${f.key} ${asked}`);
        assert.ok(r.warnings.some((w) => w.key === f.key && w.kind === "clamped"),
          `${alloy} ${f.key} ${asked} is reported as clamped`);
      }
      // At the bound itself nothing is clamped.
      for (const v of [min, max]) {
        const r = std.resolveBench({ [f.key]: v }, ctx);
        assert.strictEqual(r.values[f.key], v);
        assert.ok(!r.warnings.some((w) => w.key === f.key && w.kind === "clamped"), `${f.key}=${v}`);
      }
    }
  }
  const r = std.resolveBench({ culetClearance: 0.8 }, ctxFor(1));
  assert.strictEqual(r.values.culetClearance, 0.8);
  assert.deepStrictEqual(r.customised, ["culetClearance"]);
});

test("resolveBench: outside the published range warns but is kept", () => {
  const r = std.resolveBench({ bearingDepth: 25, galleryClearance: 0.5 }, ctxFor(1));
  assert.strictEqual(r.values.bearingDepth, 25);
  assert.strictEqual(r.values.galleryClearance, 0.5);
  assert.deepStrictEqual(r.warnings.map((w) => [w.key, w.kind]),
    [["bearingDepth", "outside-published"], ["galleryClearance", "outside-published"]]);
  assert.deepStrictEqual(r.customised, ["bearingDepth", "galleryClearance"]);
});

test("resolveBench: auto fields at 0.25, 1 and 3 ct for every alloy", () => {
  for (const alloy of ALLOYS) {
    const lim = MANUFACTURING_LIMITS[alloy];
    for (const ct of [0.25, 1, 3]) {
      const ctx = ctxFor(ct, alloy);
      const r = std.resolveBench(undefined, ctx);
      const formula = (0.28 + 0.045 * ctx.girdleR) * 2;
      const prong = Math.min(2, Math.max(lim.minProngDia, formula));
      const gallery = Math.min(2, Math.max(lim.minWall, ctx.pavH / 3));
      assert.strictEqual(r.values.prongDiameter, prong, `${alloy} ${ct}ct prong`);
      assert.strictEqual(r.values.galleryThickness, gallery, `${alloy} ${ct}ct gallery`);
      // A clamped automatic value is reported, and is not the user's change.
      assert.strictEqual(r.warnings.some((w) => w.key === "prongDiameter" && w.kind === "clamped"),
        formula < lim.minProngDia, `${alloy} ${ct}ct prong clamp reported`);
      assert.deepStrictEqual(r.customised, [], `${alloy} ${ct}ct nothing customised`);
    }
  }
  // The case that matters: a quarter carat's formula prong is under every
  // alloy's floor, so the automatic value never reaches the engine as such.
  const q = ctxFor(0.25);
  assert.ok(std.prongDiameterFor(q.girdleR) < 0.8);
  assert.strictEqual(std.resolveBench(undefined, q).values.prongDiameter, 0.8);
});

test("resolveBench: junk is ignored and it never throws", () => {
  const ctx = ctxFor(1);
  const clean = std.resolveBench(undefined, ctx);
  const junk = [
    { bearingDepth: NaN }, { bearingDepth: "45" }, { bearingDepth: Infinity },
    { bearingDepth: -Infinity }, { bearingDepth: null }, { bearingDepth: {} },
    { noSuchField: 3 }, { __proto__: { bearingDepth: 49 } }, null, 42, "bearingDepth:45", [],
  ];
  for (const j of junk) {
    let r;
    assert.doesNotThrow(() => { r = std.resolveBench(j, ctx); }, JSON.stringify(j));
    assert.deepStrictEqual(r, clean, `${String(j && JSON.stringify(j))} changes nothing`);
  }
  // A missing or broken context still yields values: defaults for platinum.
  assert.doesNotThrow(() => std.resolveBench({ culetClearance: 0.5 }, undefined));
  assert.doesNotThrow(() => std.resolveBench(undefined, { alloy: "unobtainium", girdleR: NaN, pavH: "x" }));
  const r = std.resolveBench(undefined, { alloy: "unobtainium", girdleR: 3.245, pavH: 2.79 });
  assert.strictEqual(std.benchBounds("prongDiameter", "unobtainium").min, MANUFACTURING_LIMITS.platinum.minProngDia);
  assert.ok(Object.values(r.values).every(Number.isFinite));
});

test("parseBenchParam drops junk and keeps real numbers", () => {
  assert.deepStrictEqual(
    std.parseBenchParam("bearingDepth:45, culetClearance:0.6,seatTolerance:abc,bogus:1,:3,galleryClearance:,filletRadius:Infinity,setTipHeight"),
    { bearingDepth: 45, culetClearance: 0.6 });
  assert.deepStrictEqual(std.parseBenchParam("bearingDepth:99"), { bearingDepth: 99 },
    "out of bounds is kept for resolveBench to clamp and report");
  for (const j of [null, undefined, "", ",,,", 7]) assert.deepStrictEqual(std.parseBenchParam(j), {});
});

test("bench settings never come from the AI or the prompt parser", () => {
  const { readFileSync } = require("node:fs");
  assert.ok(!/bench/i.test(readFileSync("functions/ring-schema.js", "utf8")),
    "the extraction schema must not offer bench fields");
  const { parseSpecFromPrompt, withDefaults } = require("./.cadcheck/ring-spec.js");
  for (const p of [
    "1ct round, 6 prongs, deep seats, bearing depth 45%, culet clearance 0.6mm, bench settings",
    "platinum solitaire with tall prongs and a 1mm gap under the culet",
  ]) {
    assert.ok(!("bench" in parseSpecFromPrompt(p)), p);
  }
  // withDefaults leaves it absent rather than inventing an empty one.
  assert.ok(!("bench" in withDefaults({})), "absent by default");
  assert.ok(!("bench" in withDefaults(null)));
  assert.deepStrictEqual(withDefaults({ bench: { culetClearance: 0.5 } }).bench, { culetClearance: 0.5 });
});

test("?bench= harness override rejects junk", () => {
  // ring-spec reads location once at load, so each case is a fresh process.
  const { execFileSync } = require("node:child_process");
  const run = (search) => JSON.parse(execFileSync(process.execPath, ["-e", `
    globalThis.location = { search: ${JSON.stringify(search)} };
    const r = require("./.cadcheck/ring-spec.js");
    process.stdout.write(JSON.stringify({ d: r.DEFAULT_SPEC.bench ?? null, w: r.withDefaults({}).bench ?? null }));
  `], { encoding: "utf8" }));
  assert.deepStrictEqual(
    run("?bench=bearingDepth:45,culetClearance:abc,seatTolerance:NaN,filletRadius:Infinity,a:1:2,galleryClearance:,%3Cx%3E:1"),
    { d: { bearingDepth: 45 }, w: { bearingDepth: 45 } });
  assert.deepStrictEqual(run("?bench=culetClearance:0.6,carat:2"), {
    d: { culetClearance: 0.6, carat: 2 }, w: { culetClearance: 0.6, carat: 2 },
  }, "unknown keys pass the harness and are dropped by resolveBench (tested above)");
  assert.deepStrictEqual(run("?bench=culetClearance:abc"), { d: null, w: null }, "all junk: no bench at all");
  assert.deepStrictEqual(run("?carat=2"), { d: null, w: null }, "no ?bench: absent");
  // A real spec's own bench outranks the URL's, as every other override does.
  const own = JSON.parse(execFileSync(process.execPath, ["-e", `
    globalThis.location = { search: "?bench=bearingDepth:45" };
    const r = require("./.cadcheck/ring-spec.js");
    process.stdout.write(JSON.stringify(r.withDefaults({ bench: { culetClearance: 0.5 } }).bench));
  `], { encoding: "utf8" }));
  assert.deepStrictEqual(own, { culetClearance: 0.5 });
});

test("bench: names from Object's prototype are not alloys or fields", () => {
  // `in` answered yes to these, every bound became NaN and a 0.1mm prong
  // passed with no warning (found in S0's review).
  for (const alloy of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    const r = std.resolveBench({ prongDiameter: 0.1 }, { alloy, girdleR: 3, pavH: 2 });
    assert.ok(Object.values(r.values).every(Number.isFinite), alloy);
    assert.strictEqual(r.values.prongDiameter, MANUFACTURING_LIMITS.platinum.minProngDia, alloy);
  }
  assert.deepStrictEqual(std.parseBenchParam("toString:5,constructor:1,__proto__:2,bearingDepth:45"),
    { bearingDepth: 45 });
});
