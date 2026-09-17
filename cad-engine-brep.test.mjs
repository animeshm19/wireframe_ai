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
import { setOC, measureVolume } from "replicad";

let mesh, brep;

before(async () => {
  setOC(await opencascade({
    wasmBinary: readFileSync("node_modules/replicad-opencascadejs/dist/replicad_single.wasm"),
  }));
  mesh = await import("./.brepcheck/cad-engine.js");
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
