/**
 * Proves the structure audit against numbers measured independently.
 *
 *   node scripts/structure-audit-baseline-check.mjs [tag]     (default: baseline)
 *
 * An independent audit measured the engine at fbe8c88 with replicad 1.1.0
 * before the audit in this repository existed (S0 prompt, Step 8). If the
 * audit reproduces those figures, its instruments can be trusted for the rest
 * of the ring-structure series; if it does not, every later "pass" means
 * nothing. Tolerances: ±0.005 mm³ on volumes, ±0.01 mm on distances.
 *
 * These are the numbers of the OLD, defective geometry. Once S1 changes the
 * head this check is expected to fail against a new report; it is for the S0
 * baseline only, and the expected figures must never be edited to match.
 */
import { readFileSync } from "node:fs";

const tag = process.argv[2] ?? "baseline";
const report = JSON.parse(readFileSync(`claude/tasks/structure-audit-${tag}.json`, "utf8"));
const byId = new Map(report.designs.map((d) => [d.id, d.result]));

const VOL = 0.005, DIST = 0.01;
const rows = [];
const check = (design, what, got, want, tol) => {
  const ok = typeof got === "number" && typeof want === "number"
    ? Math.abs(got - want) <= tol : got === want;
  rows.push({ design, what, got, want, ok });
};
const get = (id) => {
  const r = byId.get(id);
  if (!r || r.crash) { rows.push({ design: id, what: "present", got: r?.crash ?? "missing", want: "audited", ok: false }); return null; }
  return r;
};
const sumOverlap = (r) => r.stones.reduce((t, s) => t + s.overlapWithMetal, 0);

// default {}
let r = get("{}");
if (r) {
  check("{}", "solidCount", r.solidCount, 1, 0);
  check("{}", "dropped", r.dropped, 0, 0);
  check("{}", "metal volume", r.metalVolume, 187.611, VOL);
  check("{}", "centre stone volume", r.stones[0].volume, 56.818, VOL);
  check("{}", "centre overlap with metal", r.stones[0].overlapWithMetal, 4.310, VOL);
  check("{}", "culet height above band top (axial)", r.centre.culetAboveBandTop, -0.35, DIST);
  check("{}", "culet y", r.centre.culet[1], 9.453, DIST);
  check("{}", "band top y", r.centre.bandTop, 9.803, DIST);
  check("{}", "culet clearance (signed distance)", r.centre.culetClearance, -0.35, DIST);
  r.prongs.forEach((p) => {
    check("{}", `prong ${p.index} inBand`, p.inBand, p.index % 3 === 0 ? 0.533 : 0.193, VOL);
    check("{}", `prong ${p.index} inStone`, p.inStone, 0.643, VOL);
    check("{}", `prong ${p.index} inGallery`, p.inGallery, 0.253, VOL);
  });
  check("{}", "prong count", r.prongs.length, 6, 0);
  check("{}", "gallery inStone", r.galleries[0].inStone, 0.583, VOL);

  // STL, toSTL(metal) at 0.01.
  check("{}", "STL triangles", r.stl.triangles, 16652, 0);
  check("{}", "STL zero-area triangles", r.stl.zeroArea, 6, 0);
  check("{}", "STL edges used once", r.stl.edgeUse["1"] ?? 0, 6, 0);
  check("{}", "STL edges used 4 times", r.stl.edgeUse["4"] ?? 0, 6, 0);
  check("{}", "STL components", r.stl.components, 7, 0);
  check("{}", "STL main body triangles", r.stl.componentSizes[0], 16646, 0);
  check("{}", "STL single-triangle components", r.stl.componentSizes.filter((n) => n === 1).length, 6, 0);
  check("{}", "STL main body closed without the slivers", r.stl.edgesNot2IgnoringZeroArea, 0, 0);

  // STEP.
  check("{}", "STEP MANIFOLD_SOLID_BREP", r.step.manifoldSolidBreps, 2, 0);
  check("{}", "STEP triangulated entities", r.step.triangulated, 0, 0);
  check("{}", "STEP ADVANCED_FACE", r.step.advancedFaces, 97, 0);
  check("{}", "STEP metal ADVANCED_FACE", r.step.metalAdvancedFaces, 24, 0);
  check("{}", "STEP stone ADVANCED_FACE", r.step.advancedFaces - r.step.metalAdvancedFaces, 73, 0);
}

r = get('{"gemShape":"oval"}');
if (r) {
  check("oval", "dropped (the rail)", r.dropped, 1, 0);
  r.prongs.forEach((p) => check("oval", `prong ${p.index} inGallery`, p.inGallery, p.index % 3 === 0 ? 0 : 0.159, VOL));
}

r = get('{"gemShape":"marquise"}');
if (r) {
  check("marquise", "solidCount", r.solidCount, 2, 0);
  r.prongs.forEach((p) => check("marquise", `prong ${p.index} inGallery`, p.inGallery, 0, VOL));
}

r = get('{"gemShape":"pear"}');
if (r) {
  const want = [0.012, 0.003, 0.003, 0.012, 0.215, 0.215];
  r.prongs.forEach((p) => check("pear", `prong ${p.index} inGallery`, p.inGallery, want[p.index], VOL));
}

for (const [id, name, want] of [
  ['{"setting":"bezel"}', "bezel", 3.532],
  ['{"gemShape":"emerald","setting":"bezel"}', "emerald bezel", 7.913],
  ['{"gemShape":"oval","setting":"bezel"}', "oval bezel", 4.876],
  ['{"setting":"cathedral"}', "cathedral", 4.927],
  ['{"gemSize":3}', "3 ct", 9.231],
]) {
  r = get(id);
  if (r) check(name, "centre overlap with metal", r.stones[0].overlapWithMetal, want, VOL);
}

r = get('{"setting":"halo"}');
if (r) {
  check("halo", "overlap, all stones", sumOverlap(r), 7.917, VOL);
  check("halo", "centre overlap", r.stones[0].overlapWithMetal, 5.746, VOL);
}
r = get('{"gemShape":"oval","setting":"halo"}');
if (r) check("oval halo", "dropped", r.dropped, 1, 0);
r = get('{"gemShape":"marquise","setting":"halo"}');
if (r) check("marquise halo", "dropped", r.dropped, 3, 0);

r = get('{"setting":"three_stone"}');
if (r) {
  check("three-stone", "overlap, all stones", sumOverlap(r), 6.742, VOL);
  check("three-stone", "centre overlap", r.stones[0].overlapWithMetal, 4.310, VOL);
}

const fmt = (x) => (typeof x === "number" ? String(+x.toFixed(4)) : String(x));
console.log("| Design | Measure | Expected | Audit | |\n|---|---|---|---|---|");
for (const x of rows) console.log(`| ${x.design} | ${x.what} | ${fmt(x.want)} | ${fmt(x.got)} | ${x.ok ? "ok" : "**MISMATCH**"} |`);
const bad = rows.filter((x) => !x.ok);
console.log(`\n${rows.length - bad.length} of ${rows.length} reproduced against structure-audit-${tag}.json` +
  (bad.length ? `; ${bad.length} mismatch(es)` : ""));
process.exit(bad.length ? 1 : 0);
