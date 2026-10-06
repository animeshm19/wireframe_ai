/**
 * The structure audit, run over a matrix of designs. The source of truth for
 * the ring-structure series (STRUCTURE-RULES.md, rule 3).
 *
 *   node scripts/structure-audit.mjs --fast --tag s1 --stage S1
 *   node scripts/structure-audit.mjs --full --tag baseline --stage S0 --report-only
 *   node scripts/structure-audit.mjs '{"gemShape":"oval"}' --stage S2
 *   node scripts/structure-audit.mjs --fast --tag s2 --stage S2 --compare s1
 *
 *   --fast | --full   which matrix (about 34 or 237 designs); or one JSON spec
 *   --jobs N          designs audited at once; default CPUs − 1
 *   --tag NAME        writes claude/tasks/structure-audit-NAME.{md,json}
 *   --stage S0..S8    which invariants bind (scripts/structure-invariants.mjs)
 *   --report-only     exit 0 even if a binding invariant fails
 *   --compare TAG     fail if anything that passed in TAG fails now, binding
 *                     or not, even with --report-only
 *
 * One Node process per design, like run-brep-tests.mjs and for the same
 * reason: OCCT's WASM heap only grows, and a matrix run in one process dies of
 * it partway through, looking exactly like a hang.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { cpus } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { buildBrep } from "./brep-build.mjs";
import {
  INVARIANTS, STAGES, JOINT_AREA_RATIO, evaluateDesign, stageIndex,
} from "./structure-invariants.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const MARK = "@@STRUCTURE-AUDIT@@";
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
};

// ------------------------------------------------------------------ child --

if (flag("--child")) {
  const spec = JSON.parse(opt("--child"));
  const { default: opencascade } = await import("replicad-opencascadejs");
  const { setOC } = await import("replicad");
  setOC(await opencascade({
    wasmBinary: readFileSync("node_modules/replicad-opencascadejs/dist/replicad_single.wasm"),
  }));
  const { auditStructure } = await import(`${ROOT}/.brepcheck/structure-audit.js`);
  const result = await auditStructure(spec);
  // NaN is how a failed measurement is recorded; JSON would turn it into
  // null, which reads as "nothing there". Keep it visible.
  const json = JSON.stringify(result, (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? String(v) : v));
  // The STEP writer talks on stdout, so the result is marked rather than
  // assumed to be the only thing printed.
  process.stdout.write(`\n${MARK}${json}\n`);
  process.exit(0);
}

// ----------------------------------------------------------------- parent --

buildBrep();
const std = await import(`${ROOT}/.brepcheck/setting-standards.js`);
if (std.FIXED_STANDARDS.JOINT_AREA_RATIO.value !== JOINT_AREA_RATIO) {
  console.error("JOINT_AREA_RATIO in structure-invariants.mjs disagrees with setting-standards.ts");
  process.exit(2);
}
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
  for (const bandWidth of [1.6, 6]) d.push(design({ bandWidth }));
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
  for (const bandWidth of [1.4, 1.6, 6, 8]) d.push(design({ bandWidth }));
  for (const bandProfile of ["flat", "knife", "round"]) d.push(design({ bandProfile }));
  for (const shankStyle of ["tapered", "split", "twisted"]) d.push(design({ shankStyle }));
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
  return d;
}

// ---------------------------------------------------------------- options --

const stage = opt("--stage", "S0");
stageIndex(stage);
const jobs = Math.max(1, Math.floor(Number(opt("--jobs", Math.max(1, cpus().length - 1)))));
if (!Number.isFinite(jobs)) { console.error("--jobs takes a number"); process.exit(2); }
const tag = opt("--tag", null);
const compareTag = opt("--compare", null);
const reportOnly = flag("--report-only");
const single = argv.find((a) => a.trim().startsWith("{"));
const mode = single ? "single" : flag("--full") ? "full" : flag("--fast") ? "fast" : null;
if (!mode) {
  console.error("usage: structure-audit.mjs --fast | --full | '<spec json>' [--jobs N] [--tag NAME] [--stage S0..S8] [--report-only] [--compare TAG]");
  process.exit(2);
}
const designs = mode === "single" ? [design(JSON.parse(single))] : mode === "full" ? fullMatrix() : fastMatrix();
{
  const seen = new Set();
  for (const d of designs) {
    if (seen.has(d.id)) throw new Error(`duplicate design in matrix: ${d.id}`);
    seen.add(d.id);
  }
}

// ------------------------------------------------------------------- run --

const TIMEOUT_MS = 30 * 60 * 1000;
function auditOne(d) {
  return new Promise((done) => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), "--child", JSON.stringify(d.spec)],
      { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (x) => (out += x));
    p.stderr.on("data", (x) => (err += x));
    const timer = setTimeout(() => p.kill("SIGKILL"), TIMEOUT_MS);
    p.on("close", (code, signal) => {
      clearTimeout(timer);
      const line = out.split("\n").find((l) => l.startsWith(MARK));
      const wallMs = Date.now() - t0;
      if (code === 0 && line) {
        const result = JSON.parse(line.slice(MARK.length), (_k, v) => (v === "NaN" || v === "Infinity" || v === "-Infinity" ? Number(v) : v));
        return done({ ...d, result, wallMs });
      }
      const why = signal ? `killed by ${signal}${signal === "SIGKILL" && wallMs >= TIMEOUT_MS ? " (timeout)" : ""}` : `exit ${code}`;
      done({ ...d, result: { crash: why, stderr: err.split("\n").filter(Boolean).slice(-8).join("\n") }, wallMs });
    });
  });
}

const started = Date.now();
const results = new Array(designs.length);
let next = 0, finished = 0;
async function worker() {
  while (next < designs.length) {
    const i = next++;
    results[i] = await auditOne(designs[i]);
    finished++;
    const r = results[i].result;
    const brief = r.crash ? `CRASH ${r.crash}` :
      `solids ${r.solidCount} dropped ${r.dropped} centre overlap ${(+r.stones[0].overlapWithMetal).toFixed(3)} culet ${(+r.centre.culetClearance).toFixed(3)}`;
    console.log(`[${String(finished).padStart(3)}/${designs.length}] ${(results[i].wallMs / 1000).toFixed(1).padStart(6)}s  ${designs[i].id}  ${brief}`);
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, designs.length) }, worker));

// --------------------------------------------------------------- verdicts --

for (const r of results) r.invariants = evaluateDesign(r, r.result, stage, WIRED_IN);

const requiredFailures = [];
for (const r of results) {
  for (const [id, v] of Object.entries(r.invariants)) {
    if (v.required && v.status !== "PASS" && v.status !== "N/A") requiredFailures.push({ id: r.id, inv: id, ...v });
  }
}
const crashed = results.filter((r) => r.result.crash);

let regressions = [];
if (compareTag) {
  const file = `claude/tasks/structure-audit-${compareTag}.json`;
  if (!existsSync(file)) { console.error(`--compare: ${file} not found`); process.exit(2); }
  const prev = JSON.parse(readFileSync(file, "utf8"));
  const before = new Map(prev.designs.map((d) => [d.id, d.invariants]));
  for (const r of results) {
    const was = before.get(r.id);
    if (!was) continue;
    for (const [id, v] of Object.entries(r.invariants)) {
      if (was[id]?.status === "PASS" && v.status !== "PASS" && v.status !== "N/A") {
        regressions.push({ id: r.id, inv: id, now: v.status, detail: v.detail });
      }
    }
  }
}

// ---------------------------------------------------------------- report --

const commit = (() => { try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "?"; } })();
const meta = {
  tag, stage, mode, commit, node: process.version, date: new Date().toISOString(),
  designs: results.length, crashed: crashed.length, jobs,
  wallSeconds: Math.round((Date.now() - started) / 1000),
  invariants: INVARIANTS.map((i) => ({ id: i.id, title: i.title })),
  compare: compareTag, regressions,
};

const IDS = INVARIANTS.map((i) => i.id);
const cell = (v) => {
  const s = { PASS: "pass", FAIL: "FAIL", "N/A": "–", TODO: "todo" }[v.status];
  return v.required && v.status !== "PASS" && v.status !== "N/A" ? `**${s}!**` : s;
};
const n3 = (x) => (typeof x === "number" && Number.isFinite(x) ? x.toFixed(3) : String(x));
const label = (r) => `\`${r.id}\`${r.corner ? ` *(corner ${r.corner.field} ${r.corner.bound}, binds from ${r.corner.stage})*` : ""}`;

const md = [];
md.push(`# Structure audit: ${tag ?? "(untagged)"}`, "");
md.push(`Command: \`node scripts/structure-audit.mjs ${argv.join(" ")}\``, "");
md.push(`Commit \`${commit}\`, ${meta.date}, Node ${meta.node}, stage **${stage}**, ${mode} matrix, ${results.length} designs, ${crashed.length} crashed, ${meta.wallSeconds}s on ${jobs} jobs.`, "");
md.push(`Binding failures at ${stage}: **${requiredFailures.length}**.` + (compareTag ? ` Regressions against \`${compareTag}\`: **${regressions.length}**.` : ""), "");
md.push("Cells: pass, FAIL, – (not applicable), todo (no measurement yet). **Bold with !** = binding at this stage and not passing.", "");
md.push("## Invariants", "", "| ID | Rule | Pass | Fail | Todo | N/A |", "|---|---|---|---|---|---|");
for (const inv of INVARIANTS) {
  const c = { PASS: 0, FAIL: 0, TODO: 0, "N/A": 0 };
  for (const r of results) c[r.invariants[inv.id].status]++;
  md.push(`| ${inv.id} | ${inv.title} | ${c.PASS} | ${c.FAIL} | ${c.TODO} | ${c["N/A"]} |`);
}
md.push("");
if (requiredFailures.length) {
  md.push(`## Binding failures at ${stage}`, "");
  for (const f of requiredFailures) md.push(`- \`${f.id}\` ${f.inv}: ${f.status} ${f.detail}`);
  md.push("");
}
if (regressions.length) {
  md.push(`## Regressions against ${compareTag}`, "");
  for (const f of regressions) md.push(`- \`${f.id}\` ${f.inv}: was PASS, now ${f.now} ${f.detail}`);
  md.push("");
}
if (crashed.length) {
  md.push("## Crashed", "");
  for (const r of crashed) md.push(`- \`${r.id}\`: ${r.result.crash}\n\n  \`\`\`\n  ${(r.result.stderr || "").replace(/\n/g, "\n  ")}\n  \`\`\``);
  md.push("");
}
md.push("## Designs", "");
md.push(`| Design | Solids | Dropped | Metal mm³ | Centre ∩ metal | All stones ∩ metal | Culet mm | ${IDS.join(" | ")} |`);
md.push(`|---|---|---|---|---|---|---|${IDS.map(() => "---").join("|")}|`);
for (const r of results) {
  const x = r.result;
  if (x.crash) { md.push(`| ${label(r)} | CRASH: ${x.crash} | | | | | | ${IDS.map((i) => cell(r.invariants[i])).join(" | ")} |`); continue; }
  const all = x.stones.reduce((t, s) => t + (Number.isFinite(s.overlapWithMetal) ? s.overlapWithMetal : 0), 0);
  md.push(`| ${label(r)} | ${x.solidCount} | ${x.dropped} | ${n3(x.metalVolume)} | ${n3(x.stones[0].overlapWithMetal)} | ${n3(all)} | ${n3(x.centre.culetClearance)} | ${IDS.map((i) => cell(r.invariants[i])).join(" | ")} |`);
}
md.push("");
const withErrors = results.filter((r) => r.result.errors?.length);
if (withErrors.length) {
  md.push("## Measurement errors", "", "Booleans or queries that failed or returned impossible answers; the measurement is recorded as NaN and fails its invariant.", "");
  for (const r of withErrors) md.push(`- \`${r.id}\`: ${r.result.errors.join("; ")}`);
  md.push("");
}

if (tag) {
  mkdirSync("claude/tasks", { recursive: true });
  writeFileSync(`claude/tasks/structure-audit-${tag}.md`, md.join("\n"));
  const nanSafe = (_k, v) => (typeof v === "number" && !Number.isFinite(v) ? String(v) : v);
  writeFileSync(`claude/tasks/structure-audit-${tag}.json`,
    JSON.stringify({ meta, designs: results }, nanSafe, 1) + "\n");
  console.log(`\nwrote claude/tasks/structure-audit-${tag}.md and .json`);
}

console.log(`\n${results.length} designs, ${crashed.length} crashed, stage ${stage}: ${requiredFailures.length} binding failure(s)` +
  (compareTag ? `, ${regressions.length} regression(s) against ${compareTag}` : "") + ` in ${meta.wallSeconds}s`);
for (const f of requiredFailures.slice(0, 30)) console.log(`  BINDING ${f.inv} ${f.id}: ${f.status} ${f.detail}`);
for (const f of regressions.slice(0, 30)) console.log(`  REGRESSION ${f.inv} ${f.id}: now ${f.now} ${f.detail}`);
if (mode === "single" && !tag) {
  const r = results[0];
  console.log(JSON.stringify({ invariants: Object.fromEntries(Object.entries(r.invariants).map(([k, v]) => [k, `${v.status}${v.required ? " (binding)" : ""} ${v.detail}`])) }, null, 1));
}

if (regressions.length) process.exit(1);
if (requiredFailures.length && !reportOnly) process.exit(1);
process.exit(0);
