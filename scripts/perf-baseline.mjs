/**
 * Performance baseline for the default ring: the budgets the ring-structure
 * series is held to (STRUCTURE-RULES.md, rule 8).
 *
 *   node scripts/perf-baseline.mjs            median of 5 per phase
 *   node scripts/perf-baseline.mjs --runs 9
 *   node scripts/perf-baseline.mjs --spec '{"gemShape":"oval"}'
 *   node scripts/perf-baseline.mjs --cold     without the boot warm-up
 *   node scripts/perf-baseline.mjs --no-matrix   the default ring only
 *
 * Two numbers, in ms:
 *   preview  buildRingParts(spec) + previewMesh + previewEdges, as the
 *            worker runs them (stones meshed at 0.008): what a slider
 *            movement costs in the Studio
 *   resolve  buildRingParts(spec, {seats:true}) + fuseMetal + ringMetrics
 *            the merge that is measured, checked and exported; since S3,
 *            resolveRing (which also blends the head's joints) + ringMetrics
 *
 * Every measurement is its own Node process, booted and then timed once.
 * OCCT's heap only grows (see cad-engine-brep.ts), so a second run in the same
 * process is measuring a different, fuller kernel; and the worker that runs
 * this in the app is recycled for the same reason. Kernel boot is excluded.
 *
 * Booted through initKernel, the worker's own boot, since S1: the kernel
 * warms its code at boot (warmKernel in cad-engine-brep.ts), and a harness
 * that boots some other way measures a kernel the app never runs. `--cold`
 * boots the old way, without the warm-up, for comparison.
 *
 * The budgets (STRUCTURE-LOG.md, Baseline, measured at 72b375b): preview
 * 1.5 × 124.0 = 186.0 ms, resolve 2.0 × 1124.7 = 2249.4 ms, both on the
 * default ring. Since Animesh's decision of 2026-10-19 (q. 43), warm, the
 * preview budget also holds on every design of the structure audit's fast
 * matrix, and resolve on any design other than the default ring may take up
 * to 2.0 × its budget (4498.8 ms): each design timed `--matrix-runs` times
 * (default 3), median, and every one over its budget named. Not with --cold
 * or --spec, which time one ring as before. Exit 1 if any budget is broken.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildBrep } from "./brep-build.mjs";
import { matrices } from "./structure-matrix.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

if (process.argv.includes("--child")) {
  const phase = arg("--child");
  const spec = JSON.parse(arg("--spec", "{}"));
  const wasm = () => readFileSync("node_modules/replicad-opencascadejs/dist/replicad_single.wasm");
  const brep = await import(`${ROOT}/.brepcheck/cad-engine-brep.js`);
  if (process.argv.includes("--cold")) {
    const { default: opencascade } = await import("replicad-opencascadejs");
    const { setOC } = await import("replicad");
    setOC(await opencascade({ wasmBinary: wasm() }));
  } else {
    await brep.initKernel(wasm);
  }

  const t0 = performance.now();
  if (phase === "preview") {
    // Exactly what brep-worker.ts does for a preview: metal and its edges at
    // the default deflection, the stones finer so the facets read.
    const { metalParts, stones } = brep.buildRingParts(spec);
    brep.previewMesh(metalParts);
    brep.previewEdges(metalParts);
    if (stones.length) brep.previewMesh(stones, 0.008);
  } else {
    // Since S3 the merge blends the head's joints too (resolveRing).
    const { metal, parts: { stones, dims } } = brep.resolveRing(spec);
    brep.ringMetrics(metal, stones, dims);
  }
  process.stdout.write(JSON.stringify({ ms: performance.now() - t0 }));
  process.exit(0);
}

buildBrep();
const runs = Number(arg("--runs", 5));
const spec = arg("--spec", "{}");
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const cold = process.argv.includes("--cold");
const time = (phase, specJson, n) => {
  const ms = [];
  for (let i = 0; i < n; i++) {
    const r = spawnSync(process.execPath,
      [fileURLToPath(import.meta.url), "--child", phase, "--spec", specJson,
        ...(cold ? ["--cold"] : [])], { encoding: "utf8" });
    if (r.status !== 0) {
      console.error(`${phase} run ${i + 1} of ${specJson} failed:\n${r.stderr}`);
      process.exit(1);
    }
    ms.push(JSON.parse(r.stdout).ms);
  }
  return { medianMs: +median(ms).toFixed(1), runsMs: ms.map((x) => +x.toFixed(1)) };
};

const PREVIEW_BUDGET = 186.0, RESOLVE_BUDGET = 2249.4, COLD_PREVIEW_BUDGET = 500;
const out = {};
for (const phase of ["preview", "resolve"]) {
  out[phase] = time(phase, spec, runs);
  console.log(`${phase.padEnd(8)} median ${out[phase].medianMs} ms  (runs: ${out[phase].runsMs.join(", ")})`);
}
const over = [];
if (spec === "{}") {
  const pb = cold ? COLD_PREVIEW_BUDGET : PREVIEW_BUDGET;
  if (out.preview.medianMs > pb) over.push(`default ring: preview ${out.preview.medianMs} ms > ${pb}`);
  if (!cold && out.resolve.medianMs > RESOLVE_BUDGET) over.push(`default ring: resolve ${out.resolve.medianMs} ms > ${RESOLVE_BUDGET}`);
  console.log(`budgets  preview ${out.preview.medianMs} / ${pb} ms (headroom ${(pb - out.preview.medianMs).toFixed(1)})` +
    (cold ? "" : `, resolve ${out.resolve.medianMs} / ${RESOLVE_BUDGET} ms (headroom ${(RESOLVE_BUDGET - out.resolve.medianMs).toFixed(1)})`));
}

// The fast matrix, warm (q. 43): preview within its budget on every design,
// resolve within twice its budget on every design but the default ring.
let matrix = null;
if (!cold && spec === "{}" && !process.argv.includes("--no-matrix")) {
  const std = await import(`${ROOT}/.brepcheck/setting-standards.js`);
  const n = Number(arg("--matrix-runs", 3));
  const designs = matrices(std).fastMatrix().filter((d) => d.id !== "{}");
  const resolveMost = 2 * RESOLVE_BUDGET;
  matrix = [];
  for (const d of designs) {
    const pv = time("preview", JSON.stringify(d.spec), n), rs = time("resolve", JSON.stringify(d.spec), n);
    matrix.push({ id: d.id, preview: pv, resolve: rs });
    if (pv.medianMs > PREVIEW_BUDGET) over.push(`${d.id}: preview ${pv.medianMs} ms > ${PREVIEW_BUDGET}`);
    if (rs.medianMs > resolveMost) over.push(`${d.id}: resolve ${rs.medianMs} ms > ${resolveMost.toFixed(1)}`);
    console.log(`${d.id.padEnd(60).slice(0, 60)} preview ${String(pv.medianMs).padStart(6)}  resolve ${String(rs.medianMs).padStart(7)}`);
  }
  const worst = (k) => matrix.reduce((a, b) => (b[k].medianMs > a[k].medianMs ? b : a));
  const wp = worst("preview"), wr = worst("resolve");
  console.log(`matrix   ${matrix.length} designs, median of ${n}: slowest preview ${wp.preview.medianMs} / ${PREVIEW_BUDGET} ms (${wp.id}, headroom ${(PREVIEW_BUDGET - wp.preview.medianMs).toFixed(1)}), ` +
    `slowest resolve ${wr.resolve.medianMs} / ${resolveMost.toFixed(1)} ms (${wr.id}, headroom ${(resolveMost - wr.resolve.medianMs).toFixed(1)})`);
}
for (const o of over) console.log(`OVER BUDGET  ${o}`);
console.log(JSON.stringify({ spec: JSON.parse(spec), node: process.version, ...out, ...(matrix ? { matrix } : {}), over }));
if (over.length) process.exit(1);
