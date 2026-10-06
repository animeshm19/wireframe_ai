/**
 * Performance baseline for the default ring: the budgets the ring-structure
 * series is held to (STRUCTURE-RULES.md, rule 8).
 *
 *   node scripts/perf-baseline.mjs            median of 5 per phase
 *   node scripts/perf-baseline.mjs --runs 9
 *   node scripts/perf-baseline.mjs --spec '{"gemShape":"oval"}'
 *
 * Two numbers, in ms:
 *   preview  buildRingParts(spec) + previewMesh + previewEdges, as the
 *            worker runs them (stones meshed at 0.008): what a slider
 *            movement costs in the Studio
 *   resolve  buildRingParts(spec, {seats:true}) + fuseMetal + ringMetrics
 *            the merge that is measured, checked and exported
 *
 * Every measurement is its own Node process, booted and then timed once.
 * OCCT's heap only grows (see cad-engine-brep.ts), so a second run in the same
 * process is measuring a different, fuller kernel; and the worker that runs
 * this in the app is recycled for the same reason. Kernel boot is excluded.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildBrep } from "./brep-build.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

if (process.argv.includes("--child")) {
  const phase = arg("--child");
  const spec = JSON.parse(arg("--spec", "{}"));
  const { default: opencascade } = await import("replicad-opencascadejs");
  const { setOC } = await import("replicad");
  setOC(await opencascade({
    wasmBinary: readFileSync("node_modules/replicad-opencascadejs/dist/replicad_single.wasm"),
  }));
  const brep = await import(`${ROOT}/.brepcheck/cad-engine-brep.js`);

  const t0 = performance.now();
  if (phase === "preview") {
    // Exactly what brep-worker.ts does for a preview: metal and its edges at
    // the default deflection, the stones finer so the facets read.
    const { metalParts, stones } = brep.buildRingParts(spec);
    brep.previewMesh(metalParts);
    brep.previewEdges(metalParts);
    if (stones.length) brep.previewMesh(stones, 0.008);
  } else {
    const { metalParts, stones, dims } = brep.buildRingParts(spec, { seats: true });
    const { metal } = brep.fuseMetal(metalParts);
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

const out = {};
for (const phase of ["preview", "resolve"]) {
  const ms = [];
  for (let i = 0; i < runs; i++) {
    const r = spawnSync(process.execPath,
      [fileURLToPath(import.meta.url), "--child", phase, "--spec", spec], { encoding: "utf8" });
    if (r.status !== 0) {
      console.error(`${phase} run ${i + 1} failed:\n${r.stderr}`);
      process.exit(1);
    }
    ms.push(JSON.parse(r.stdout).ms);
  }
  out[phase] = { medianMs: +median(ms).toFixed(1), runsMs: ms.map((x) => +x.toFixed(1)) };
  console.log(`${phase.padEnd(8)} median ${out[phase].medianMs} ms  (runs: ${out[phase].runsMs.join(", ")})`);
}
console.log(JSON.stringify({ spec: JSON.parse(spec), node: process.version, ...out }));
