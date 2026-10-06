/**
 * Runs the B-rep suite one test per process.
 *
 * Not a style choice. OCCT is a WASM module with its own heap, and nothing in
 * JavaScript reaches into it: every shape a test builds stays allocated for the
 * life of the process, at roughly 11MB a second of this suite. Run end to end in
 * one process the suite exhausts a 4GB machine at about test fourteen and is
 * killed — which looks exactly like a hang, because the reporter's buffer dies
 * with it and the last thing on screen is the TAP header.
 *
 * The application has the same constraint and answers it the same way, by
 * recycling the worker that holds the kernel. Here each test gets a fresh
 * process, so peak memory is one test's worth rather than the whole suite's.
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { buildBrep } from "./scripts/brep-build.mjs";

const FILE = "cad-engine-brep.test.mjs";

// Compile first, always: see scripts/brep-build.mjs. Shared with the structure
// audit and the performance baseline so all three measure the same build.
buildBrep();
let names = [...readFileSync(FILE, "utf8").matchAll(/^test\(\s*"([^"]+)"/gm)].map((m) => m[1]);

// An optional argument narrows the run, so a single failing test can be
// re-run on its own without waiting out the four minutes the suite takes.
const only = process.argv[2];
if (only) {
  const re = new RegExp(only, "i");
  names = names.filter((n) => re.test(n));
}
if (!names.length) { console.error("no tests found in " + FILE); process.exit(1); }

// The pattern is a regex, so a name with regex punctuation in it must be quoted.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let pass = 0, fail = 0;
const failed = [];
const t0 = Date.now();

for (const name of names) {
  const started = Date.now();
  const out = await new Promise((resolve) => {
    // The reporter is pinned because the pass check below reads TAP. Node 23
    // made `spec` the default even when stdout is a pipe, and under Node 24
    // every test then "failed" with exit 0 and a green tick in its output.
    const p = spawn(process.execPath,
      ["--test", "--test-reporter=tap", "--test-name-pattern", `^${esc(name)}$`, FILE],
      { stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    p.stdout.on("data", (d) => (buf += d));
    p.stderr.on("data", (d) => (buf += d));
    // A killed process (OOM) exits without a TAP summary; treat that as a
    // failure rather than silently counting zero tests as success.
    p.on("close", (code, signal) => resolve({ buf, code, signal }));
  });

  const ok = /^ok 1 /m.test(out.buf) && out.code === 0;
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${ok ? "ok  " : "FAIL"}  ${secs.padStart(6)}s  ${name}`);
  if (ok) pass++;
  else {
    fail++;
    failed.push(name);
    const why = out.signal ? `killed by ${out.signal}` : `exit ${out.code}`;
    console.log(out.buf.split("\n").filter((l) =>
      /error|expected|actual|AssertionError|at /.test(l)).slice(0, 12)
      .map((l) => "        " + l.trim()).join("\n") || `        ${why}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (fail) { console.log("failed: " + failed.join(", ")); process.exit(1); }
