// Unit test for the parametric duel on the home page (issue C-07).
// Run: node --test scripts/duel-model.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const out = await build({
  entryPoints: ["src/components/duel-model.ts"],
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const mod = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
const { duelAt, innerDiameter, chordError } = mod;
const r2 = (n) => Math.round(n * 100) / 100;

test("inner diameter follows the engine's relation", () => {
  assert.equal(r2(innerDiameter(6.5)), 16.91);
  assert.equal(r2(innerDiameter(6)), 16.51);
});

test("size 6.5: both columns identical and neutral", () => {
  const d = duelAt(6.5);
  assert.deepEqual(d.mesh, d.brep);
  assert.equal(d.meshVerdict.kind, "same");
  assert.equal(d.brepVerdict.kind, "same");
});

test("size 9: scaled seat no longer fits, rebuilt stays at spec", () => {
  const d = duelAt(9);
  assert.equal(d.k.toFixed(3), "1.120");
  assert.equal(r2(d.mesh.seat), 8.29);
  assert.equal(r2(d.mesh.carat), 2.11);
  assert.equal(d.meshVerdict.reason, "seat");
  assert.equal(d.brep.seat, 7.4);
  assert.equal(d.brep.carat, 1.5);
  assert.equal(d.brepVerdict.kind, "ok");
});

test("size 4: seat mismatch reported first, prong below platinum minimum", () => {
  const d = duelAt(4);
  assert.equal(d.k.toFixed(3), "0.880");
  assert.equal(r2(d.mesh.seat), 6.51);
  assert.equal(r2(d.mesh.prong), 0.79);
  assert.ok(d.mesh.prong < 0.8);
  assert.equal(r2(d.mesh.carat), 1.02);
  assert.equal(d.meshVerdict.reason, "seat");
});

test("size 11", () => {
  const d = duelAt(11);
  assert.equal(d.k.toFixed(3), "1.216");
  assert.equal(r2(d.mesh.seat), 9.0);
  assert.equal(r2(d.mesh.carat), 2.7);
});

test("the size 6 to 9 figure quoted on the bench section", () => {
  const k = innerDiameter(9) / innerDiameter(6);
  assert.equal(k.toFixed(4), "1.1477");
  assert.equal((1.5 * k ** 3).toFixed(2), "2.27");
});

test("chord error at 16 facets on a size 6.5 hole", () => {
  assert.equal(chordError(8.45, 16).toFixed(3), "0.162");
});
