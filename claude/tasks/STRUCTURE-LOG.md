# Ring-structure series — log

Read with STRUCTURE-RULES.md. Every prompt appends; nothing here is rewritten.

## Baseline

Recorded in S0 on branch `structure/ring-head`, forked from `origin/main` at `fbe8c88`.
Mac (Darwin 25.6.0, arm64), Node v24.9.0, npm 11.6.1, replicad 1.1.0.

**Suite health on `main` before any change** (run in the worktree, to completion):

| Command | Result on fbe8c88 |
|---|---|
| `npm run build` | passes (`✓ built in 3.77s`; chunk-size warning only) |
| `npm run lint` | `✖ 113 problems (109 errors, 4 warnings)`. 5 of the errors are in gitignored harness files (`src/cad-contact-sheet.ts` 4, `src/studio-test.ts` 1); tracked files alone: 104 errors, 4 warnings. A8 recorded 130 + 4 in an earlier environment; the difference was not investigated |
| `npm run test:cad` | `tests 14, pass 14, fail 0` |
| `npm run test:brep` | **pre-existing red**: `0 passed, 24 failed in 235s`, though every test passes when run directly. The runner matches TAP's `ok 1`, and Node ≥ 23 defaults to the spec reporter. Fixed in `4971a29` (pins `--test-reporter=tap`): `24 passed, 0 failed in 237s` with geometry unchanged |

Lint budget for the series (rule 10): **109 errors, 4 warnings** for `npm run lint` in the worktree (harness files present), per-file counts in S0.md.

**Performance budgets** (rule 8), `node scripts/perf-baseline.mjs`, default ring, median of 5, one process per run, kernel boot excluded:

| Phase | Budget baseline (median) | Runs (ms) | Budget |
|---|---|---|---|
| preview: `buildRingParts` + `previewMesh` + `previewEdges` (+ stones at 0.008, as the worker does) | **124.0 ms** | 124, 124.8, 127.4, 120.2, 119.7 | **≤ 186.0 ms** (1.5×) |
| resolve: `buildRingParts({seats:true})` + `fuseMetal` + `ringMetrics` | **1124.7 ms** | 1123.9, 1126.6, 1124.7, 1131.8, 1118.5 | **≤ 2249.4 ms** (2.0×) |

Measured at `72b375b` on a quiet machine. Geometry there is fbe8c88's for the default ring (roles add metadata only; the pear fix touches no round stone). An earlier run at `5b98e15`, taken while the machine was loaded, read 192.5 ms (154.6–233.1) and 1229.2 ms (1143.5–1292.9); the budgets use the quiet run because its spread is tight and it gives the stricter limits. Re-measure on a quiet machine: under load the preview number moves by ±40%.

**Structure baseline**: `claude/tasks/structure-audit-baseline.{md,json}`, from
`node scripts/structure-audit.mjs --full --tag baseline --stage S0 --report-only` (237 designs, 0 crashed).
The default ring (US 6, 1 ct round, 6 prongs, 2.5 mm comfort band):

| Measure | Value |
|---|---|
| solids / dropped | 1 / 0 |
| metal volume | 187.611 mm³ |
| centre stone | 56.818 mm³, overlaps metal by 4.310 mm³ (7.6%) |
| culet | 0.350 mm inside the band (signed clearance −0.350) |
| prongs in band | 0.533 (prongs 0, 3), 0.193 (1, 2, 4, 5) mm³ of 2.69 |
| each prong in stone / in gallery | 0.643 / 0.253 mm³ |
| gallery in stone | 0.583 mm³ |
| joint section, band top + 0.10 | 3.895 mm² vs 3.421 mm² of prong section (ratio 1.14) |
| STL (0.01) | 16,652 triangles, 6 zero-area, 6 edges used once, 6 used 4 times, 7 components (body 16,646, closed without the slivers) |
| STEP | 2 MANIFOLD_SOLID_BREP, 97 ADVANCED_FACE (24 metal + 73 stone), 0 triangulated |

All 73 figures of the independent audit reproduce: `node scripts/structure-audit-baseline-check.mjs baseline` → `73 of 73 reproduced`.

## Assertions changed

None in S0. (Tests added only; none removed or loosened.)

## Bench bounds changed

None in S0. Bounds are as specified in the S0 prompt's table; `test:cad` asserts them row by row.

## Open questions for the setter / caster

From `PROVISIONAL_INPUTS` (every bench field that is not a sourced default). Each is our starting point, not a verified fact:

1. **bearingDepth 40% of prong** (published 30–50%). Which depth does your setter cut?
2. **seatTolerance 0.05 mm.** Unsourced. How much room around the girdle do you want in a cast seat?
3. **culetClearance 0.30 mm.** Unsourced. Minimum gap you want under the culet?
4. **pavilionClearance 0.25 mm.** Unsourced (reuses the gallery figure).
5. **prongDiameter: (0.28 + 0.045 × girdle radius) × 2**, held at the alloy minimum. Gives 0.85 mm at 1 ct and 0.93 at 2 ct; one bench jeweller suggests ≥ 1.2 mm for a 2 ct platinum ring. Below about 0.45 ct the formula is under every alloy's minimum (0.74 mm at 0.25 ct), so the automatic value is clamped to the floor. What prong diameter does your caster want by stone size?
6. **asCastProngHeight 2.0 mm above table** (published 0.75–5.0; one setter asks 3.5–4.5). How tall do you want prongs cast?
7. **galleryClearance 0.25 mm** (published 0.20–0.30 for diamonds).
8. **filletRadius 0.30 mm.** Unsourced.
9. **minBendRadius 1.0 × prong diameter.** Unsourced.

For Animesh (decisions, not bench questions):

10. **I9 split (S0).** The prompt asks I9, "metal is 1 MANIFOLD_SOLID_BREP, 0 triangulated", to bind from S0. Measured, the one-solid half cannot hold at S0: it is I1 read from the file. `{"gemShape":"marquise","prongCount":4}` is 2 solids and its STEP honestly has 2. Worse, `{"gemShape":"marquise"}` is 2 solids (7.529 + 186.238 mm³) and its STEP has **1**: `toSTEP` silently drops a piece of a multi-solid metal (re-imported: one solid of 179.504 mm³). Chosen (most conservative, nothing dropped): I9 = B-rep, nothing triangulated, solids named, binds from S0; I9b = exactly one MANIFOLD_SOLID_BREP *and* as many in the file as in the metal, binds with I1 (S2; S6 for halo and bezel). Please confirm.
11. **STEP round trip is 3% light** (observed, not investigated): the default metal exports at 187.611 mm³ and re-imports with `importSTEP` at 181.894 (oval 184.759 → 178.435). Could be the importer or the file; for S7.
12. **Pear fix (S0, `f36345f`).** Every pear from 0.05 to 0.40 ct threw on `main` and could not be built. Fixed in its own commit by dividing a facet OCCT refuses, exactly as the engine divides a warped one; no other stone changes (proved on 105 cut × carat stones). It is a geometry change for designs that previously crashed; please review.
13. **One failed boolean in the audit itself.** `{"shankStones":"eternity"}`: metal ∩ accent 12 returns 0.35961 mm³, more than the stone's own 0.35921, while 0.052 of the stone lies outside the metal. The audit records it as a measurement error (NaN, the invariant fails) rather than a number. That accent's culet is 0.44 mm inside the metal: it sits under the head.

14. **Joint section (I7, for S3).** The disc is the prompt's (girdleR × 1.2 round the centre axis), so on a three-stone it also cuts the side heads and on a cathedral the struts: 1 ct round reads 3.89 mm² as a prong ring, 6.54 as a three-stone, 6.78 as a cathedral, with the same centre head. A cathedral at 0.25 ct passes I7 on its struts alone. S3, which builds the base, should decide whether the joint is "metal under the centre head" or "the centre head's own metal".
15. **Joint prong sum before S1 (I7).** It uses the effective prongDiameter, clamped to the alloy floor (0.80 mm), while until S1 wires the field the engine builds the raw formula (0.744 mm at 0.25 ct). This errs strict: the 0.25 ct rows read I7 FAIL at a true ratio of about 1.12. It is resolved when S1 makes the built prong the effective one.
16. **Pavé culets clear their seat floors by 0.01 mm**, and on a full eternity band one accent sits under the head with its culet 0.44 mm inside the metal (I3c, S6).

## Progress

### S0 — 2026-10-06 — branch, bench settings, structure audit, baseline

Status: see `claude/tasks/S0.md`. Worktree inspected and classified **(a) healthy**; nothing repaired, nothing renamed.

Commits `4971a29`..`1bf11b4` (12) plus the docs commit. Summary:
- **Standards:** setting-standards.ts (5 fixed standards, 11 bench fields), `RingSpec.bench`, `?bench=`.
- **Audit:** roles, the structure audit (237-design full matrix, 34-design fast), and the perf baseline.
- **Pre-existing bugs fixed in their own commits:** the test:brep runner under Node 24, and pears under 0.45 ct that could not be built.
- **Final runs:**
  - Full baseline: 237 designs, 0 crashed, 0 binding failures at S0.
  - Independent figures: 73 of 73 reproduced.
  - Gate run without `--report-only`: exit 0, 0 regressions.
  - Fast audit: 0 regressions against the baseline.
  - Suites: `test:cad` 26/26, `test:brep` 30/30. Lint 109 + 4, unchanged. The build passes.
- **Owed:** the draft PR (`gh` not installed). The body is in S0.md. *Opened 2026-10-07: #2.*
- **For S1:** compare against `structure-audit-baseline` (full) or `structure-audit-s0-fast` (fast). I10 and I13 are TODO and become binding in S1, so S1 must add their measurements (`BENCH_MEASURES` in structure-invariants.mjs).

### S0 re-verification — 2026-10-07

S0 v2 was run again and found already complete (case b, `c1ec8cb`, nothing repaired). Every criterion was re-run:
- build passes; lint 109 + 4; `test:cad` 26/26; `test:brep` 30/30 in 241s
- fresh full audit gate at S0 against `baseline`: 237 designs, 0 crashed, 0 binding failures, 0 regressions, exit 0
- 73 of 73 independent figures reproduced from the fresh run; metal volume identical on all 237 designs

Draft PR opened: https://github.com/animeshm19/wireframe_ai/pull/2. Nothing owed for S0. Details in S0.md.
