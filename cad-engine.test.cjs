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
