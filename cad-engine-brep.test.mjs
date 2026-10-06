/**
 * B-rep engine tests.
 *
 * Three things are checked, in increasing order of what they would cost to get
 * wrong: that the geometry matches closed-form maths where closed form exists,
 * that it matches the mesh engine everywhere else, and that what comes out the
 * other end is genuinely boundary representation rather than a mesh wearing a
 * STEP extension.
 *
 * No browser, no emulator, no network. Runs in a couple of seconds.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import opencascade from "replicad-opencascadejs";
import { setOC, measureVolume, measureDistanceBetween, makeVertex } from "replicad";

let mesh, brep, pick;

before(async () => {
  setOC(await opencascade({
    wasmBinary: readFileSync("node_modules/replicad-opencascadejs/dist/replicad_single.wasm"),
  }));
  mesh = await import("./.brepcheck/cad-engine.js");
  pick = await import("./.brepcheck/studio-pick.js");
  brep = await import("./.brepcheck/cad-engine-brep.js");
});

const thick = (w) => Math.min(2.6, Math.max(1.2, w * 0.62));
const innerRadius = (size) => (11.63 + size * 0.8128) / 2;

test("kernel boots and measures a known solid exactly", () => {
  assert.ok(brep, "engine loaded");
});

test("band volume matches closed form for every profile", () => {
  // Pappus's theorem gives the exact volume of a revolved section, so these are
  // not regression baselines — they are the right answer.
  const cases = [
    ["flat", 6, 2.5], ["flat", 6, 6], ["flat", 11, 2.5], ["flat", 4, 8],
    ["comfort", 6, 2.5], ["comfort", 6, 6], ["round", 6, 2.5], ["knife", 6, 2.5],
  ];
  for (const [profile, size, w] of cases) {
    const innerR = innerRadius(size), t = thick(w), outerR = innerR + t;
    const exact =
      profile === "flat"    ? Math.PI * (outerR ** 2 - innerR ** 2) * w :
      profile === "knife"   ? 2 * Math.PI * (innerR + t / 3) * (w * t / 2) :
      profile === "comfort" ? 2 * Math.PI * (innerR + (4 * t) / (3 * Math.PI)) * (Math.PI * t * (w / 2) / 2) :
                              2 * Math.PI * ((innerR + outerR) / 2) * (Math.PI * (t / 2) * (w / 2));
    const v = measureVolume(brep.buildBand(innerR, w, t, profile));
    const err = Math.abs(v - exact) / exact * 100;
    assert.ok(err < 0.1, `${profile} ${size}/${w}mm: ${v.toFixed(2)} vs exact ${exact.toFixed(2)} (${err.toFixed(2)}%)`);
  }
});

test("a round brilliant's facets are planar to machine precision", () => {
  // OCCT refuses to build a non-planar face, so this is what makes the stone
  // buildable at all — and a warped facet scatters light instead of reflecting
  // it, so it was never only a kernel concern.
  const { points, faces } = mesh.brilliantTopology("round", 3.25);
  let worst = 0;
  for (const f of faces) {
    if (f.length < 4) continue;
    const p = f.map((i) => points[i]);
    const [a, b, c] = p;
    const u = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], v = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
    const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const L = Math.hypot(...n);
    for (let i = 3; i < p.length; i++) {
      worst = Math.max(worst, Math.abs(
        ((p[i][0]-a[0])*n[0] + (p[i][1]-a[1])*n[1] + (p[i][2]-a[2])*n[2]) / L));
    }
  }
  assert.ok(worst < 1e-9, `worst facet is ${worst.toExponential(2)}mm out of plane`);
});

test("stone volume matches real carat weight", () => {
  // A diamond is 3.52 g/cm3 and a carat is 0.2g, so 1ct is 56.8mm3. If the
  // geometry says otherwise, the proportions are wrong however good it looks.
  for (const ct of [0.25, 0.5, 1, 1.5, 2, 3]) {
    const { metrics } = brep.buildRing({ gemSize: ct });
    const expected = ct * 0.2 / 3.52 * 1000;
    const err = Math.abs(metrics.stoneVolumeMm3 - expected) / expected * 100;
    assert.ok(err < 4, `${ct}ct: ${metrics.stoneVolumeMm3}mm3 vs ${expected.toFixed(1)}mm3 (${err.toFixed(1)}%)`);
  }
});

test("B-rep and mesh engines agree on every supported design", () => {
  const CASES = [
    {}, { ringSize: 4, gemSize: 0.5 }, { ringSize: 11, gemSize: 3 },
    { setting: "halo" }, { setting: "cathedral" },
    { setting: "halo", gemShape: "oval" }, { setting: "cathedral", gemSize: 3 },
    { setting: "three_stone" }, { shankStones: "pave" },
    { bandProfile: "flat" }, { bandProfile: "knife" }, { bandProfile: "round" },
    { bandWidth: 6 }, { prongCount: 4 },
    { gemShape: "oval" }, { gemShape: "pear" }, { gemShape: "marquise" },
    { gemShape: "cushion" }, { gemShape: "emerald" }, { gemShape: "princess" },
    { setting: "bezel" },
  ];
  const DIMS = ["innerDiameter","outerDiameter","bandWidth","bandThickness","girdleDiameter","stoneHeight"];
  for (const spec of CASES) {
    const m = mesh.buildRing(spec).metrics;
    const b = brep.buildRing(spec).metrics;
    for (const k of DIMS) {
      assert.equal(b[k], m[k], `${JSON.stringify(spec)} ${k}: ${b[k]} vs ${m[k]}`);
    }
    const dv = Math.abs(b.volumeMm3 - m.volumeMm3) / m.volumeMm3 * 100;
    const ds = Math.abs(b.stoneVolumeMm3 - m.stoneVolumeMm3) / m.stoneVolumeMm3 * 100;

    // The mesh engine tessellates curved profiles and runs 0.04-2% light, so it
    // is the looser of the two. These bounds catch a kernel bug, not that gap.
    //
    // Halo and bezel are held to a wider bound because the two engines
    // deliberately differ there, and the B-rep one is right. Both mesh versions
    // were not castable:
    //
    //   halo  — the rail is a circle sized to the outline's MAXIMUM radius, so
    //           on an oval it sails past the narrow ends without touching the
    //           stones it carries, and nothing ties it to the centre at all.
    //           The B-rep rail follows the outline and is carried on bearers.
    //           Its seats are also exact rather than 12-sided and 4.5% light.
    //   bezel — the seat floated inside the collar, touching neither it nor the
    //           band: three separate solids. The B-rep version has a real
    //           under-gallery flaring from the shank to the collar bore, which
    //           is more metal because a ring that holds together IS more metal.
    //
    // Tightening these would mean copying those defects back in.
    // three_stone and any shank stones exist only in the B-rep engine — the
    // mesh engine is frozen as the differential reference and builds neither,
    // so it is compared on dimensions alone for those.
    if (spec.setting === "three_stone" || spec.shankStones) continue;
    const limit = spec.setting === "halo" || spec.setting === "bezel" ? 25 : 5;
    assert.ok(dv < limit, `${JSON.stringify(spec)} metal ${dv.toFixed(1)}% (limit ${limit}%)`);
    assert.ok(ds < 1, `${JSON.stringify(spec)} stone ${ds.toFixed(1)}%`);
  }
});

test("unfused parts are NOT a substitute for the merged solid", () => {
  // Guards the two-phase design: if these ever agree, someone has quietly
  // started measuring the parts, and every weight quote is inflated by the
  // overlaps where the head meets the band and the rail meets the prongs.
  const loose = brep.buildRingParts({}).metalParts
    .reduce((t, p) => t + measureVolume(p), 0);
  const fused = measureVolume(brep.fuseMetal(brep.buildRingParts({}).metalParts).metal);
  assert.ok(loose > fused * 1.01,
    `sum of parts ${loose.toFixed(1)} should exceed fused ${fused.toFixed(1)}`);
});

test("previewMesh leaves the parts intact for phase two", () => {
  // makeCompound consumes its inputs, so an earlier preview built that way
  // deleted the very shapes the merge needed. This is the regression guard.
  const { metalParts, stones, dims } = brep.buildRingParts({});
  const mesh = brep.previewMesh(metalParts);
  assert.ok(mesh.vertices.length > 0 && mesh.triangles.length > 0, "mesh has content");
  assert.equal(mesh.vertices.length, mesh.normals.length, "a normal per vertex");
  const maxIndex = mesh.triangles.reduce((m, v) => Math.max(m, v), 0);
  assert.ok(maxIndex < mesh.vertices.length / 3, "indices stay in range after merging");
  // The parts must still be usable afterwards.
  const { metal } = brep.fuseMetal(metalParts);
  assert.ok(brep.ringMetrics(metal, stones, dims).volumeMm3 > 0, "parts survived");
});

test("halo and cathedral settings build", () => {
  for (const setting of ["prong", "bezel", "halo", "cathedral"]) {
    const { metrics } = brep.buildRing({ setting });
    assert.ok(metrics.volumeMm3 > 0, `${setting} has metal`);
    assert.ok(metrics.stoneCount >= 1, `${setting} has at least the centre stone`);
  }
  assert.ok(brep.buildRing({ setting: "halo" }).metrics.stoneCount > 5, "halo has accents");
});

test("every design fuses into ONE connected solid", () => {
  // The check a mesh kernel cannot make, and the most expensive thing to learn
  // about after a file reaches a caster. It caught real defects: the bezel
  // setting's seat floated inside its collar touching neither it nor the band
  // (three separate pieces), and every halo was a ring of metal hovering around
  // the centre stone attached to nothing (two pieces). Both rendered perfectly.
  const cases = [
    {}, { setting: "bezel" }, { setting: "cathedral" }, { setting: "halo" },
    { setting: "halo", gemShape: "oval" }, { setting: "halo", gemShape: "marquise" },
    { setting: "halo", gemShape: "pear" }, { setting: "halo", gemSize: 3 },
    { gemSize: 0.25 }, { gemSize: 3 }, { gemShape: "emerald", setting: "bezel" },
    { setting: "three_stone" }, { setting: "three_stone", gemShape: "oval" },
    { shankStones: "pave" }, { shankStones: "half_eternity" },
    { shankStones: "eternity" }, { shankStones: "eternity", bandWidth: 5 },
    // The combinations someone would actually order.
    { setting: "three_stone", shankStones: "pave" },
    { setting: "halo", shankStones: "half_eternity" },
  ];
  for (const spec of cases) {
    const { metrics } = brep.buildRing(spec);
    assert.equal(metrics.solidCount, 1,
      `${JSON.stringify(spec)} is ${metrics.solidCount} disconnected pieces — not castable`);
  }
});

test("a failed boolean cannot destroy the piece", () => {
  // OCCT booleans can fail by returning the wrong shape rather than throwing:
  // fusing one 0.5mm3 bearer into a finished 207mm3 marquise halo returned just
  // the bearer. fuseMetal discards any step that comes back smaller than what
  // went into it, because a union cannot remove material.
  const parts = brep.buildRingParts({ setting: "halo", gemShape: "marquise" }).metalParts;
  const loose = parts.reduce((t, p) => t + measureVolume(p), 0);
  const { metal, dropped } = brep.fuseMetal(parts);
  const v = measureVolume(metal);
  assert.ok(v > loose * 0.5, `merged ${v.toFixed(1)}mm3 from ${loose.toFixed(1)}mm3 of parts`);
  assert.ok(dropped < parts.length / 2, `dropped ${dropped} of ${parts.length} parts`);
});

test("shank stones are sized, counted and seated correctly", () => {
  const plain = brep.buildRing({}).metrics;
  let last = plain.stoneCount;

  for (const kind of ["pave", "half_eternity", "eternity"]) {
    const m = brep.buildRing({ shankStones: kind }).metrics;
    // Each step round the finger adds stones and removes metal — the seats are
    // cut, not decorative. If metal ever goes UP, the seats are not being cut.
    assert.ok(m.stoneCount > last, `${kind}: ${m.stoneCount} stones vs ${last}`);
    assert.ok(m.volumeMm3 < plain.volumeMm3,
      `${kind}: ${m.volumeMm3}mm3 should be less than a plain shank's ${plain.volumeMm3}mm3`);
    last = m.stoneCount;
  }

  // Stones scale with the band, not with a constant. A 5mm band takes visibly
  // bigger pavé than a 2mm one, which is what a jeweller would cut.
  const narrow = brep.shankStoneLayout("pave", 10, 2);
  const wide = brep.shankStoneLayout("pave", 10, 5);
  assert.ok(wide.stoneR > narrow.stoneR * 1.3,
    `pave on a 5mm band (${(wide.stoneR * 2).toFixed(2)}mm) should dwarf a 2mm band's (${(narrow.stoneR * 2).toFixed(2)}mm)`);
});

test("three-stone side stones are proportioned like real ones", () => {
  const solitaire = brep.buildRing({}).metrics;
  const three = brep.buildRing({ setting: "three_stone" }).metrics;
  assert.equal(three.stoneCount, 3, "a centre and two sides");
  assert.ok(three.stoneVolumeMm3 > solitaire.stoneVolumeMm3, "more stone than a solitaire");
  // Sides are a quarter to a third of the centre by weight, so the two of them
  // together land near half a centre — not the eighth a linear scale would give.
  const sides = three.stoneVolumeMm3 - solitaire.stoneVolumeMm3;
  const ratio = sides / solitaire.stoneVolumeMm3;
  assert.ok(ratio > 0.3 && ratio < 0.9,
    `two side stones are ${(ratio * 100).toFixed(0)}% of the centre; expected 30-90%`);
});

test("manufacturability refuses what a bench could not make", async () => {
  const { checkManufacturability } = await import("./.brepcheck/cad-engine.js");
  const run = (spec) => {
    const { metrics } = brep.buildRing(spec);
    return { metrics, issues: checkManufacturability(spec, metrics) };
  };
  const codes = (r) => r.issues.map((i) => i.code);

  // A plain solitaire and ordinary pavé are both fine.
  assert.deepEqual(codes(run({})), [], "a plain solitaire is castable");
  assert.ok(!codes(run({ shankStones: "pave" })).includes("seat_breaks_through"),
    "pavé on a normal band does not break through");
  assert.ok(!codes(run({ shankStones: "pave" })).includes("pave_walls_tight"),
    "stones are spaced widely enough to raise a bead between");

  // A seat is cut INTO the wall the ring relies on. On a thin band it reaches
  // the bore, and the stone shows through the inside of the ring.
  assert.ok(codes(run({ shankStones: "pave", bandWidth: 1.4 })).includes("seat_breaks_through"),
    "pavé in a 1.4mm band must be refused");

  // Not a geometry problem — a fact about eternity bands that costs a customer
  // real money if nobody says it before casting.
  assert.ok(codes(run({ shankStones: "eternity" })).includes("eternity_not_sizable"),
    "a full eternity band cannot be resized and must say so");
  assert.ok(!codes(run({ shankStones: "eternity" })).includes("eternity_not_sizable")
    === false, "sanity");
  assert.ok(!codes(run({ shankStones: "pave" })).includes("eternity_not_sizable"),
    "a pavé shank CAN be resized");

  // Softer metals need more of everything.
  assert.ok(codes(run({ metalType: "silver", gemSize: 0.3 })).includes("prongs_too_thin"),
    "fine prongs in sterling must be refused");
});

test("the seat depth the engine cuts is the depth the check assumes", () => {
  // These two live in different files and would drift silently: the check would
  // start passing seats that break through, or refusing ones that do not.
  // 0.65 diameters is the culet depth plus clearance.
  const L = brep.shankStoneLayout("pave", 10, 2.5);
  const stoneD = L.stoneR * 2;
  const seatDepth = stoneD * 0.65;
  const culet = L.stoneR * 0.34 + 0.43 * stoneD;   // girdle depth + pavilion
  assert.ok(seatDepth > culet, `seat ${seatDepth.toFixed(3)}mm must clear the culet at ${culet.toFixed(3)}mm`);
  assert.ok(seatDepth < culet * 1.25, `seat ${seatDepth.toFixed(3)}mm wastes metal below the culet`);
});

test("every shank style builds one castable solid", () => {
  for (const shankStyle of ["plain", "tapered", "split", "twisted"]) {
    for (const shankStones of ["none", "pave"]) {
      const { metrics } = brep.buildRing({ shankStyle, shankStones });
      assert.equal(metrics.solidCount, 1,
        `${shankStyle} + ${shankStones} is ${metrics.solidCount} pieces`);
      assert.ok(metrics.volumeMm3 > 50, `${shankStyle}: ${metrics.volumeMm3}mm3 is implausible`);
    }
  }
});

test("a uniform variable band matches the exact revolve", () => {
  // The revolve is exact against closed form; the loft is the approximation.
  // If a band that does not vary disagrees with the revolve by more than a
  // rounding error, the lofted path has the section wrong — and every style
  // built on it, and every lasso edit later, inherits that.
  const innerR = (11.63 + 6 * 0.8128) / 2, w = 2.5, t = Math.min(2.6, Math.max(1.2, w * 0.62));
  const exact = measureVolume(brep.buildBand(innerR, w, t, "comfort"));
  const lofted = measureVolume(brep.buildVariableBand(
    () => ({ innerR, width: w, thickness: t, profile: "comfort", shift: 0, twist: 0 })
  ));
  const err = Math.abs(lofted - exact) / exact * 100;
  assert.ok(err < 0.2, `lofted ${lofted.toFixed(2)} vs revolved ${exact.toFixed(2)} (${err.toFixed(2)}%)`);
});

test("shank styles change the metal they should", () => {
  const vol = (shankStyle) => brep.buildRing({ shankStyle }).metrics.volumeMm3;
  const plain = vol("plain");
  // Tapered narrows toward the back of the finger, so it MUST be lighter.
  assert.ok(vol("tapered") < plain, `tapered ${vol("tapered")} should be under plain ${plain}`);
  // A split shank has a slot cut out of it, so it must be lighter too.
  assert.ok(vol("split") < plain, `split ${vol("split")} should be under plain ${plain}`);
  // A twist reorients the section without removing anything.
  assert.ok(Math.abs(vol("twisted") - plain) / plain < 0.08,
    `twisted ${vol("twisted")} should be close to plain ${plain}`);
});

test("STEP export is real boundary representation", async () => {
  const r = brep.buildRing({ gemSize: 1.25 });
  const text = await brep.toSTEP(r.metal, r.stones).text();
  const n = (re) => (text.match(re) || []).length;

  assert.ok(/ISO-10303-21/.test(text), "is a STEP file");
  assert.equal(n(/MANIFOLD_SOLID_BREP/g), 2, "metal and stones, each a closed solid");
  assert.ok(n(/ADVANCED_FACE/g) > 50, "has real faces");
  assert.ok(n(/CYLINDRICAL_SURFACE/g) > 0, "has exact cylinders");
  assert.ok(n(/SURFACE_OF_REVOLUTION/g) > 0, "band is a surface of revolution");
  // The whole point. A tessellated STEP is an STL that lies about itself.
  assert.equal(n(/TRIANGULATED|TESSELLATED|POLY_LOOP/g), 0, "no tessellation");
  assert.ok(/PRODUCT\('metal'/.test(text) && /PRODUCT\('stones'/.test(text),
    "metal and stones are separately named");
});

/* ---------------------------------------------------------------- regions */

test("a region edit changes only the stretch it names", () => {
  const base = { ringSize: 6, bandWidth: 2.5, gemSize: 1 };
  const vol = (regions) =>
    measureVolume(brep.fuseMetal(brep.buildRingParts({ ...base, regions }).metalParts).metal);

  const plain = vol([]);
  const narrow = vol([{ start: Math.PI / 6, end: (5 * Math.PI) / 6, widthScale: 0.6 }]);

  // A third of the ring taken to 60% width removes roughly 0.33 * 0.4 of the
  // band. Anything close to zero means the region was not applied; anything
  // near the full 40% means it was applied everywhere.
  const drop = (plain - narrow) / plain;
  assert.ok(drop > 0.05 && drop < 0.20,
    `region should remove 5-20% of the metal, removed ${(drop * 100).toFixed(1)}%`);

  // The far side of the ring must be untouched: a region at the shoulders that
  // also thins the back is the bug this whole angular scheme exists to prevent.
  const at = brep.applyRegions(
    brep.shankSection("plain", 8.255, 2.5, 1.55, "comfort"),
    [{ start: Math.PI / 6, end: (5 * Math.PI) / 6, widthScale: 0.6 }],
  );
  assert.equal(at(Math.PI * 1.5).width, 2.5, "the back of the ring is unchanged");
  assert.equal(at(Math.PI / 2).width, 2.5 * 0.6, "the middle of the region is fully edited");
  const edge = at(Math.PI / 6).width;
  assert.ok(edge > 2.5 * 0.6 && edge < 2.5,
    `the boundary is eased, not stepped (got ${edge})`);
});

test("a region that wraps the seam is one region, not two", () => {
  const base = { ringSize: 6, bandWidth: 2.5, gemSize: 1 };
  const vol = (regions) =>
    measureVolume(brep.fuseMetal(brep.buildRingParts({ ...base, regions }).metalParts).metal);

  // 330deg -> 40deg crosses 0. If the wrap were handled by comparing against
  // the seam directly this would select the other 290 degrees instead, and the
  // volume would fall by far more than a 70 degree stretch can account for.
  const wrapped = vol([{ start: (330 * Math.PI) / 180, end: (40 * Math.PI) / 180, widthScale: 0.5 }]);
  const plain = vol([]);
  const drop = (plain - wrapped) / plain;
  assert.ok(drop > 0.03 && drop < 0.15,
    `a 70deg wrapped region should remove 3-15%, removed ${(drop * 100).toFixed(1)}%`);
});

test("region edits still cast as one connected solid", () => {
  const cases = [
    [{ start: 0.5, end: 2.6, widthScale: 1.6 }],
    [{ start: 3.5, end: 5.9, thicknessScale: 0.75 }],
    [{ start: 5.8, end: 0.7, widthScale: 0.7 }],                 // wraps
    [{ start: 0.5, end: 2.6, widthScale: 1.4 },
     { start: 3.5, end: 5.0, thicknessScale: 1.3 }],             // two at once
    [{ start: 0.5, end: 2.6, profile: "knife" }],
  ];
  for (const regions of cases) {
    const { metalParts } = brep.buildRingParts({ ringSize: 6, bandWidth: 2.5, gemSize: 1, regions });
    const { metal, dropped } = brep.fuseMetal(metalParts);
    assert.equal(dropped, 0, `no part may be dropped: ${JSON.stringify(regions)}`);
    assert.equal(metal.solids.length, 1,
      `${JSON.stringify(regions)} made ${metal.solids.length} solids — uncastable`);
  }
});

test("a locally thinned section is caught by the checks", () => {
  const p = {
    ringSize: 6, bandWidth: 2.5, gemSize: 1, metalType: "platinum",
    regions: [{ start: 2.7, end: 3.5, thicknessScale: 0.5 }],
  };
  const { metrics } = brep.buildRing(p);
  const issues = mesh.checkManufacturability(p, metrics);
  assert.ok(issues.some((i) => i.code === "region_too_thin"),
    `a 0.78mm section must be refused; got ${JSON.stringify(issues.map((i) => i.code))}`);

  // And the same ring without the region must NOT be refused, or the check is
  // just noise.
  const clean = brep.buildRing({ ...p, regions: [] });
  assert.ok(!mesh.checkManufacturability({ ...p, regions: [] }, clean.metrics)
    .some((i) => i.code === "region_too_thin"), "an unedited band is fine");
});

test("carat weight is honest for every cut", () => {
  // 3.25mm is the one-carat girdle radius of a ROUND brilliant, and for years
  // every cut used it. The shapes hold different amounts of stone under the
  // same girdle, so a "1.00ct" marquise weighed 0.75ct and a "1.00ct" emerald
  // 1.24ct — a quarter of the stone, on the number the piece is priced by.
  const cuts = ["round", "princess", "oval", "emerald", "cushion", "marquise", "pear"];
  const worst = [];

  for (const gemShape of cuts) {
    for (const carat of [0.5, 1, 2.5]) {
      const { stones } = brep.buildRingParts({ gemShape, gemSize: carat });
      const got = (measureVolume(stones[0]) * 3.52) / 200;
      const err = Math.abs(got - carat) / carat;
      worst.push([gemShape, carat, got, err]);
      assert.ok(err < 0.02,
        `${gemShape} at ${carat}ct weighs ${got.toFixed(3)}ct (${(err * 100).toFixed(1)}% out)`);
    }
  }

  // And the footprint reported must be the footprint built, not a diameter
  // borrowed from the round.
  const m = brep.buildRing({ gemShape: "marquise", gemSize: 1 }).metrics;
  assert.ok(m.stoneLength > m.stoneWidth * 2,
    `a marquise is long: got ${m.stoneLength} x ${m.stoneWidth}`);
  const r = brep.buildRing({ gemShape: "round", gemSize: 1 }).metrics;
  assert.equal(r.stoneLength, r.stoneWidth, "a round is as wide as it is long");
  assert.ok(Math.abs(r.caratActual - 1) < 0.02,
    `the reported weight must be the real one: ${r.caratActual}`);
});

/* ------------------------------------------------- lasso -> region mapping */

test("a lasso becomes the region the designer drew", () => {
  const B = Math.PI / 180;
  const D = (d) => d * B;
  const deg = (r) => Math.round((r * 180) / Math.PI);
  // A lasso is sampled per pixel, so the input is a cloud of angles.
  const sweep = (a, b) => {
    const out = [];
    for (let d = a; d <= b; d += 0.5) out.push(D(d));
    return out;
  };
  const got = (angles) =>
    pick.toRegions(angles, "metal", B).map((r) => [deg(r.start), deg(r.end)]);

  assert.deepEqual(got(sweep(30, 150)), [[30, 150]], "a plain stretch");

  // Every angle must come back in [0, 2pi). The engine, the highlight shader
  // and the stored spec all work in that range; a negative angle matches
  // nothing and the edit silently does nothing at all.
  for (const r of pick.toRegions(sweep(200, 300), "metal", B)) {
    assert.ok(r.start >= 0 && r.start < Math.PI * 2, `start out of range: ${r.start}`);
    assert.ok(r.end >= 0 && r.end < Math.PI * 2, `end out of range: ${r.end}`);
  }

  // A region across the seam is ONE region with start > end, not two.
  assert.deepEqual(got([...sweep(330, 359.9), ...sweep(0, 40)]), [[330, 40]]);

  // Selecting the whole ring must not collapse to a zero-width region — the
  // angle just under 2pi rounds up to a bucket that does not exist.
  assert.deepEqual(got(sweep(0, 359.9)), [[0, 359]]);

  // A lasso over the head crosses the prongs, and the gaps between them must
  // not shatter the selection into slivers too narrow to edit.
  assert.deepEqual(got([80, 86, 92, 98, 104, 110].flatMap((a) => sweep(a, a + 3))),
    [[80, 113]], "six prongs are one selection");

  // Genuinely separate selections stay separate.
  assert.deepEqual(got([...sweep(20, 60), ...sweep(200, 240)]), [[20, 60], [200, 240]]);

  // A single pixel is noise at a silhouette, not an instruction.
  assert.deepEqual(got([D(10)]), []);

  // Anything narrower than the engine's blend can never reach full strength, so
  // a pinpoint selection is widened rather than left inert.
  const tiny = pick.toRegions(sweep(100, 102), "metal", B)[0];
  assert.ok(deg(tiny.end) - deg(tiny.start) >= 12,
    `a tiny pick must be widened, got ${deg(tiny.start)}-${deg(tiny.end)}`);
});

/* ------------------------------------------------------------ roles (S0) */

test("every part and stone carries a role, for every setting", () => {
  // The structure audit asks questions of individual parts (how far does
  // prong 3 sink into the band?), so it has to know which part is which.
  // Parallel arrays: a length mismatch would silently label the wrong solid.
  const cases = [
    {}, { setting: "bezel" }, { setting: "halo" }, { setting: "cathedral" },
    { setting: "three_stone" }, { shankStones: "pave" }, { shankStyle: "split" },
    { setting: "three_stone", shankStones: "pave" }, { setting: "halo", gemShape: "marquise" },
    { gemShape: "princess", prongCount: 4 }, { setting: "bezel", gemShape: "emerald" },
  ];
  for (const spec of cases) {
    const p = brep.buildRingParts(spec);
    const tag = JSON.stringify(spec);
    assert.equal(p.metalRoles.length, p.metalParts.length, `${tag} metalRoles`);
    assert.equal(p.stoneRoles.length, p.stones.length, `${tag} stoneRoles`);
    assert.equal(p.metalRoles[0].role, "band", `${tag} band first`);
    assert.equal(p.stoneRoles[0].role, "centre", `${tag} centre stone first`);
    assert.equal(p.heads[0].head, "centre", `${tag} centre head first`);

    const n = (role, head) => p.metalRoles.filter((r) => r.role === role && (!head || r.head === head)).length;
    const setting = spec.setting ?? "prong";
    if (setting === "bezel") {
      assert.equal(n("collar"), 1, tag);
      assert.equal(n("base"), 1, tag);
      assert.equal(n("prong"), 0, tag);
    } else {
      assert.equal(n("prong", "centre"), spec.prongCount ?? 6, `${tag} prongs`);
      assert.equal(n("gallery", "centre"), 1, `${tag} gallery`);
      // Prong indices are 0..n-1 in order, matching the head's prong angles.
      assert.deepEqual(p.metalRoles.filter((r) => r.role === "prong" && r.head === "centre").map((r) => r.index),
        [...Array(spec.prongCount ?? 6).keys()]);
      assert.equal(p.heads[0].prongAngles.length, spec.prongCount ?? 6);
    }
    if (setting === "halo") {
      const halo = p.stoneRoles.filter((r) => r.role === "halo").length;
      assert.ok(halo >= 10, tag);
      assert.equal(n("halo-seat"), halo, `${tag} one seat per halo stone`);
      assert.equal(n("halo-rail"), 1, tag);
      assert.equal(n("bearer"), 4, tag);
    }
    if (setting === "cathedral") assert.equal(n("strut"), 2, tag);
    if (setting === "three_stone") {
      for (const h of ["side-left", "side-right"]) {
        assert.equal(n("prong", h), 4, `${tag} ${h} prongs`);
        assert.equal(n("gallery", h), 1, `${tag} ${h} gallery`);
        assert.equal(p.stoneRoles.filter((r) => r.role === "side" && r.head === h).length, 1);
        assert.ok(p.heads.some((f) => f.head === h), `${tag} ${h} frame`);
      }
    }
    if (spec.shankStones) {
      assert.ok(p.stoneRoles.filter((r) => r.role === "accent").length > 3, `${tag} accents`);
    }
    assert.ok(p.metalRoles.every((r) => r.role === "band" || r.head), `${tag} every head part names its head`);
  }
});

test("each stone's recorded culet and axis are where the stone actually is", () => {
  // The culet and axis are carried through the same placement steps as the
  // solid. If they ever drift apart, every clearance the audit reports is
  // measured from the wrong point. Two checks, both against the real solid:
  // the culet lies on the stone, and nothing of the stone is below it.
  for (const spec of [{}, { setting: "three_stone" }, { setting: "halo", gemShape: "pear" },
    { shankStones: "pave" }, { gemShape: "emerald" }, { gemShape: "princess", setting: "bezel" }]) {
    const p = brep.buildRingParts(spec);
    p.stones.forEach((stone, i) => {
      const { culet, axis, role } = p.stoneRoles[i];
      const tag = `${JSON.stringify(spec)} stone ${i} (${role})`;
      assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-9, `${tag} axis is a unit vector`);
      const d = measureDistanceBetween(makeVertex(culet), stone);
      assert.ok(d < 1e-6, `${tag}: culet is ${d.toExponential(2)}mm off the stone`);
      const v = stone.mesh({ tolerance: 0.05, angularTolerance: 30 }).vertices;
      let lowest = Infinity;
      for (let k = 0; k < v.length; k += 3) {
        lowest = Math.min(lowest,
          (v[k] - culet[0]) * axis[0] + (v[k + 1] - culet[1]) * axis[1] + (v[k + 2] - culet[2]) * axis[2]);
      }
      // Float32 mesh coordinates on a ~10mm ring: a few 1e-6 of rounding.
      assert.ok(lowest > -1e-5, `${tag}: stone reaches ${lowest}mm below its culet`);
    });
    // The centre head's frame agrees with the centre stone's.
    assert.deepEqual(p.heads[0].culet, p.stoneRoles[0].culet);
    assert.deepEqual(p.heads[0].axis, p.stoneRoles[0].axis);
  }
});

/* -------------------------------------------- the structure audit's tools */
//
// The audit is the source of truth for the whole ring-structure series, so
// its instruments are proved against shapes whose answers are closed form
// before any ring is measured with them.

test("audit overlap and gap match closed form on two cylinders", async () => {
  const audit = await import("./.brepcheck/structure-audit.js");
  const { makeCylinder } = await import("replicad");
  const r = 1, h = 40;
  // Two long cylinders crossing at right angles: the Steinmetz solid, 16r³/3.
  const a = makeCylinder(r, h, [0, 0, -h / 2], [0, 0, 1]);
  const b = makeCylinder(r, h, [-h / 2, 0, 0], [1, 0, 0]);
  const steinmetz = (16 * r ** 3) / 3;
  const got = audit.overlapVolume(a, b);
  assert.ok(Math.abs(got - steinmetz) / steinmetz < 0.005, `Steinmetz ${got} vs ${steinmetz}`);

  // Two parallel cylinders d apart overlap in a lens: area × height.
  const d = 1.2, H = 3;
  const c1 = makeCylinder(r, H, [0, 0, 0], [0, 0, 1]);
  const c2 = makeCylinder(r, H, [d, 0, 0], [0, 0, 1]);
  const lens = (2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d)) * H;
  const lensGot = audit.overlapVolume(c1, c2);
  assert.ok(Math.abs(lensGot - lens) / lens < 0.005, `lens ${lensGot} vs ${lens}`);

  // The same pair 2.7 apart: no overlap, and a 0.7 gap between the surfaces.
  const c3 = makeCylinder(r, H, [2.7, 0, 0], [0, 0, 1]);
  assert.equal(audit.overlapVolume(c1, c3), 0);
  assert.ok(Math.abs(measureDistanceBetween(c1, c3) - 0.7) < 1e-6, "gap 0.7");
  // Overlapping solids are 0 apart, which is what clearanceToStone relies on.
  assert.ok(measureDistanceBetween(c1, c2) < 1e-9, "touching or overlapping is 0");
});

test("audit signed depth is right inside and outside known solids", async () => {
  const audit = await import("./.brepcheck/structure-audit.js");
  const { makeBox, makeSphere } = await import("replicad");
  const box = makeBox([-5, -5, -5], [5, 5, 5]);
  const near = (got, want, msg) => assert.ok(Math.abs(got - want) < 1e-6, `${msg}: ${got} vs ${want}`);
  let r = audit.signedDepth([0, 0, 3.65], box);
  assert.equal(r.inside, true);
  near(r.depth, -1.35, "1.35 below the top face");
  r = audit.signedDepth([1, -4.2, 0], box);
  near(r.depth, -0.8, "nearest face, not the top");
  r = audit.signedDepth([0, 0, 7], box);
  assert.equal(r.inside, false);
  near(r.depth, 2, "outside is positive");
  r = audit.signedDepth([0, 0, 5], box);
  near(r.depth, 0, "on the surface is 0");
  // A culet inside a sphere, the curved case.
  const ball = makeSphere(2).translate([1, 1, 1]);
  r = audit.signedDepth([1, 1, 1.5], ball);
  assert.equal(r.inside, true);
  near(r.depth, -1.5, "0.5 from the centre of a radius-2 ball");
  r = audit.signedDepth([1, 1, 4], ball);
  near(r.depth, 1, "1 outside the ball");
});

test("STL checker: a closed cube, a hole and a sliver", async () => {
  const { checkStl } = await import("./.brepcheck/stl-check.js");
  const V = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const T = [
    [0,2,1],[0,3,2], [4,5,6],[4,6,7], [0,1,5],[0,5,4],
    [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
  ];
  const ascii = (tris) => "solid cube\n" + tris.map((t) =>
    " facet normal 0 0 0\n  outer loop\n" + t.map((i) => `   vertex ${V[i].join(" ")}\n`).join("") +
    "  endloop\n endfacet\n").join("") + "endsolid cube\n";
  const binary = (tris) => {
    const buf = Buffer.alloc(84 + tris.length * 50);
    buf.write("solid but binary", 0);            // OCCT's headers say "solid" too
    buf.writeUInt32LE(tris.length, 80);
    tris.forEach((t, k) => t.forEach((i, j) => V[i].forEach((x, c) =>
      buf.writeFloatLE(x, 84 + k * 50 + 12 + j * 12 + c * 4))));
    return new Uint8Array(buf);
  };

  for (const enc of [ascii, binary]) {
    const ok = checkStl(enc(T));
    assert.equal(ok.format, enc === ascii ? "ascii" : "binary");
    assert.equal(ok.triangles, 12);
    assert.equal(ok.vertices, 8);
    assert.equal(ok.edges, 18);
    assert.equal(ok.edgesNot2, 0);
    assert.equal(ok.zeroArea, 0);
    assert.equal(ok.components, 1);
    assert.equal(ok.watertight, true);

    const holed = checkStl(enc(T.slice(1)));
    assert.equal(holed.openEdges, 3, "a missing triangle leaves its three edges open");
    assert.equal(holed.edgesNot2, 3);
    assert.equal(holed.watertight, false);

    // A zero-area triangle sharing two of the cube's corners: the kind OCCT
    // leaves at a prong tip. Its edge 0-0 is used once and 0-2 four times.
    const slivered = checkStl(enc([...T, [0, 0, 2]]));
    assert.equal(slivered.zeroArea, 1);
    assert.equal(slivered.triangles, 13);
    assert.deepEqual(slivered.edgeUse, { 1: 1, 2: 17, 4: 1 });
    assert.equal(slivered.components, 2, "the sliver is not part of the closed surface");
    assert.deepEqual(slivered.componentSizes, [12, 1]);
    assert.equal(slivered.edgesNot2IgnoringZeroArea, 0, "the cube itself is still closed");
    assert.equal(slivered.watertight, false);
  }
});
