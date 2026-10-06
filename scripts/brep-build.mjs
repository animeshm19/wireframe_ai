/**
 * Compiles the B-rep engine and everything it imports into .brepcheck/.
 *
 * Shared by run-brep-tests.mjs, structure-audit.mjs and perf-baseline.mjs, so
 * the suite, the audit and the timings always run the same compiled engine.
 * Moved here unchanged from run-brep-tests.mjs; SRC grew by the modules the
 * ring-structure series added.
 */
import { readFileSync, writeFileSync, statSync, mkdirSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Every module whose change must trigger a rebuild. tsc follows imports on its
// own, but the freshness check below only looks at these, so a module left off
// this list can be edited without the suite ever seeing the edit.
export const SRC = [
  "src/lib/cad-engine.ts", "src/lib/cad-engine-brep.ts", "src/lib/studio-pick.ts",
  "src/lib/ring-spec.ts", "src/lib/finishes.ts", "src/lib/setting-standards.ts",
];
const OUT = ".brepcheck";

/**
 * Compile first, always.
 *
 * The suite imports the compiled copies, not the TypeScript. Skipping this
 * because "nothing changed" is how a green run gets reported against the
 * previous version of the engine — which happened while writing these tests,
 * and the passing run was the wrong answer.
 */
export function buildBrep() {
  const newest = Math.max(...SRC.map((f) => statSync(f).mtimeMs));
  let built = 0;
  try { built = Math.min(...SRC.map((f) =>
    statSync(`${OUT}/${f.split("/").pop().replace(/\.ts$/, ".js")}`).mtimeMs)); } catch { /* not built */ }
  if (built > newest) return;

  const r = spawnSync("npx", ["tsc", ...SRC,
    "--outDir", OUT, "--module", "es2022", "--target", "es2022",
    "--moduleResolution", "bundler", "--skipLibCheck", "--esModuleInterop"],
    { stdio: "inherit" });
  if (r.status !== 0) { console.error("compile failed"); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/package.json`, '{"type":"module"}');

  // tsc emits specifiers verbatim, so `import "./ring-spec"` stays
  // extensionless — which the bundler resolves and Node's ESM loader does not.
  // The suite ran green until MANUFACTURING_LIMITS moved into ring-spec
  // (b26df53) and gave the compiled engine its first runtime relative import.
  // Walks, because tsc emits subdirectories as soon as SRC spans two of them
  // and infers a rootDir a level up. Matches `import "./x"` and `import("./x")`
  // as well as `from "./x"`. Leaves anything already carrying an extension
  // alone, so `./limits.json` does not become `./limits.json.js`.
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);

  for (const f of walk(OUT).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(f, "utf8");
    const fixed = src.replace(
      /((?:from|import)\s*\(?\s*)(["'])(\.\.?\/[^"']+?)\2/g,
      (m, kw, q, spec) => (/\.[a-z0-9]+$/i.test(spec) ? m : `${kw}${q}${spec}.js${q}`)
    );
    if (fixed !== src) writeFileSync(f, fixed);
  }
}
