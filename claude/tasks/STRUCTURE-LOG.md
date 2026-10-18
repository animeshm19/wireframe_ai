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

**S1, `586dccb`: "B-rep and mesh engines agree on every supported design".** The whole-ring metal bound (5%, 25% for halo and bezel) became a band-only comparison; every dimensional equality and the stone-volume bound are unchanged. Why: the B-rep head is now deliberately not the frozen mesh head (default ring 7.8% apart once seated). The prompt asked for under 0.1% on the band; measured B-rep against mesh band: flat and knife −0.040%, round −0.877%, comfort −2.027% (−2.011 to −2.032 across sizes 4–11, widths 1.4–8). The gap is the frozen mesh engine's polygon section; the B-rep band is exact against Pappus in another test. Bounds per profile: 0.1, 0.1, 0.95, 2.1%. **Open question 17.**

**S2, `9a9f9fe`: I5 and I13 (galleryThickness) accept a reported lowering or thinning.** Before: the gallery's centre at mid-pavilion ±0.05 and its thickness as asked, always. Now:
- a gallery may sit lower, but only at the height laid out, and only if the engine reported the lowering;
- it may be thinner, but only to the thickness the engine reported, and never under the alloy's minimum wall (`55494e5`, added after the review).

Why: on most fancy cuts and small stones no wire of the rule's thickness, at the gap asked, fits under the girdle at mid-pavilion. That is the decision the 7 Oct run attributed to Animesh (open question 24).

Measured (`structure-audit-s2`, `55494e5`):
- 148 of 216 centre galleries sit lower, all reported;
- the rule's height holds on round and cushion at 1 and 3 ct;
- the most lowered are at 0.66 of mid-pavilion;
- 8 designs are thinned, e.g. 2.0 → 1.685 mm on the default ring.

The numbers are now also in the code comment (`889ba4c`).

**S3: I3a, I4 (centre head), and I13 for culetClearance and galleryClearance accept a reported size clamp.** Before: judged against the value asked, always. Now: where the engine held the value by the stone's size and reported it as `engine-clamped` with `asked` and `delivered` (Animesh's decision on question 25), it is judged against the delivered value; a held value with no such warning still fails. Side heads are judged as before. Measured (full matrix): only the 0.25 ct round all-max row is held, the culet 1.5 → 1.3 mm and the gallery gap 0.6 → 0.467 mm. (`252509a`'s message says 1.35, from a probe at 0.01 mm steps before the search was set to the field's 0.05.) No other design is held.

**S3: I10c and I13 (pavilionClearance) accept "nothing there".** Before: a prong with no metal below girdle − d recorded NaN and failed. Now it records Infinity and passes: nothing of it can come near the pavilion. Seen on the oval with 2 mm prongs, whose feet end high in a 2 mm base. A failed measurement is still NaN and still fails.

**S3: I7 is measured within the centre head's saddle plate** (open question 14, decided here as "the centre head's own metal"). Before: a disc of girdleR × 1.2 round the axis, which also cut a three-stone's side heads and a cathedral's struts, and on a 3 ct stone held only part of the base. The bound (`JOINT_AREA_RATIO`) is unchanged. Default ring: 9.52× the prong sections.

## Bench bounds changed

None in S0. Bounds are as specified in the S0 prompt's table; `test:cad` asserts them row by row.

**S1: pavilionClearance max 0.60 → 0.40 mm.** Evidence, default ring (US 6, 1 ct round, 6 prongs, 2.5 mm comfort band), `node scripts/structure-audit.mjs '{"bench":{"pavilionClearance":0.6}}' --stage S1`:
- The layout's exact lower bound can keep at most 0.432 mm below girdle − d. The measured distance is 0.440–0.456 mm, against the 0.58 the audit requires. I10c and I13 fail.
- Cause: until S3's head base, a prong standing beyond the band's edge has to bring its foot back under the stone, and just below the seat its post is only as far from the pavilion as the seat put it.
- At 0.40 the same ring passes I10c, I13 and I7 with no engine clamp, and so do the all-max corners.

The S0 test that pins the bench table records the new maximum, with a comment. Revisit in S3, when the legs end at a base.

No other bound changed. Every other S1-wired field stitches at both bounds.

**S2: none.** Neither gallery field's bound changed. The all-max bench corner on a 0.25 ct stone, which is outside the matrix, fails I3a, I5b and on the round I8: see open question 25. It is left to S3, with a size-dependent clamp preferred over a fixed bound.

## Open questions for the setter / caster

From `PROVISIONAL_INPUTS` (every bench field that is not a sourced default). Each is our starting point, not a verified fact.

**Status 2026-10-07: still open.** Animesh will put questions 1–9 to the setter and caster later. Until answered, the defaults stand as provisional and must not be presented as verified. Every later prompt keeps this list and carries it into its report.


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
    **Decided 2026-10-07: Animesh confirmed the I9 / I9b split.**
11. **STEP round trip is 3% light** (observed, not investigated): the default metal exports at 187.611 mm³ and re-imports with `importSTEP` at 181.894 (oval 184.759 → 178.435). Could be the importer or the file; for S7.
12. **Pear fix (S0, `f36345f`).** Every pear from 0.05 to 0.40 ct threw on `main` and could not be built. Fixed in its own commit by dividing a facet OCCT refuses, exactly as the engine divides a warped one; no other stone changes (proved on 105 cut × carat stones). It is a geometry change for designs that previously crashed; please review.
13. **One failed boolean in the audit itself.** `{"shankStones":"eternity"}`: metal ∩ accent 12 returns 0.35961 mm³, more than the stone's own 0.35921, while 0.052 of the stone lies outside the metal. The audit records it as a measurement error (NaN, the invariant fails) rather than a number. That accent's culet is 0.44 mm inside the metal: it sits under the head.

14. **Joint section (I7, for S3).** The disc is the prompt's (girdleR × 1.2 round the centre axis), so on a three-stone it also cuts the side heads and on a cathedral the struts: 1 ct round reads 3.89 mm² as a prong ring, 6.54 as a three-stone, 6.78 as a cathedral, with the same centre head. A cathedral at 0.25 ct passes I7 on its struts alone. S3, which builds the base, should decide whether the joint is "metal under the centre head" or "the centre head's own metal".
15. **Joint prong sum before S1 (I7).** It uses the effective prongDiameter, clamped to the alloy floor (0.80 mm), while until S1 wires the field the engine builds the raw formula (0.744 mm at 0.25 ct). This errs strict: the 0.25 ct rows read I7 FAIL at a true ratio of about 1.12. It is resolved when S1 makes the built prong the effective one.
16. **Pavé culets clear their seat floors by 0.01 mm**, and on a full eternity band one accent sits under the head with its culet 0.44 mm inside the metal (I3c, S6).

17. **Band-only comparison bound (S1).** See "Assertions changed": 0.1% only holds for flat and knife. Chosen: per-profile bounds just above the measured, deterministic gaps. Please confirm.
18. **Pavilion gap (S1).** The maximum was narrowed to 0.40 mm (see "Bench bounds changed"). On a stone where even the asked gap cannot be kept, the engine keeps what it can and reports it as `engine-clamped`; the audit now judges against the value asked, so such a design fails I10c/I13 visibly rather than passing against the clamp. Revisit in S3.
19. **Performance budget (S1): not cleanly met.** Measured the S0 way (fresh kernel, no warm-up), the preview is 242.3 ms against the 186.0 budget: the first sweep and first boolean in a fresh kernel compile OCCT code the old preview never ran. The kernel now warms that code at boot, and the worker now boots when spawned (an idle moment). Like for like, both engines warmed the same way, the preview is 96.6 ms against 64.3 (1.50×, at the limit). Resolve 1144.6 ms against the 2249.4 budget passes. Please decide which measure the budget means; if the cold one, the preview needs more work (candidates: replicad's double-build fuse and cut, q. 23; fewer prong faces to tessellate).
20. **Interim rail is flat, not a torus (S1).** The prompt said to keep the torus. OCCT fused the torus wrongly with crossing legs and cathedral struts at most placements tried (both as a revolved circle and as its own primitive); a square-section ring in the same place fused cleanly with every part of every failing design. S2 replaces the rail.
21. **Three-stone side stones open out when they must (S1).** Side stones are S6's, but their tall cast prongs reached the centre stone at 3 ct (1.4 mm³) and, with 2 mm prongs, came within 0.97 mm of a 1.5 mm culet. The splay starts at 0.45 rad as before and opens in 0.03 rad steps only until both side heads keep clear; the default 1 ct ring is unchanged.
22. **fuseMetal seals specks of air (S1).** Near-tangent fuses left sealed cavities under 0.001 mm³ (STEP then wrote a solid with voids). The merge now rebuilds such a solid from its outer shell; larger cavities are left for the checks.
23. **replicad runs every boolean twice (S1, finding).** `Shape.cut` and `Shape.fuse` construct the OCCT operation (which builds it) and then call `Build()` again. The seat cut now runs once (7.7 → 3.6 ms, identical result). `fuseMetal` still uses replicad's fuse; switching it would roughly halve resolve time. Not done in S1.

24. **Gallery lowering and thinning (S2).** The 7 Oct run's commits record a decision by Animesh (2026-10-07):
    - where a gallery of the bench thickness and gap would show beyond the girdle at mid-pavilion, it sits lower, reported;
    - where no height hides it, it is thinned to the thickest that hides, never under the minimum wall, reported.

    It was not in this log, so I could not confirm it. Effect: 148 of 216 centre galleries are lowered; 8 are thinned. **Please confirm.**

    **Decided 2026-10-18 (confirmed).** Where a gallery would show beyond the girdle, lower it first; thin it only where no height hides it, never below the alloy's minWall. Every lowering and thinning stays reported as `engine-clamped` with its reason, and S5's spec sheet must list them for the caster.
25. **The all-max bench corner at 0.25 ct (S2, outside the matrix).** Measured with `node scripts/structure-audit.mjs '<all-max, gemSize 0.25>' --stage S2`:
    - **culet** (asked 1.5): oval 0.846, pear 1.026, marquise 0.959. Already failing at S1: oval 1.222, round 1.410.
    - **gallery beyond the girdle:** oval 0.525, pear 0.564, marquise 0.801, round 0.199 mm.
    - **round STL:** 22 zero-area triangles (new at S2).
    - All are one solid.

    Proposed: add 0.25 and 3 ct all-max rows to the matrix, and give S3 size-dependent engine clamps rather than fixed bounds.

    **Decided 2026-10-18 (proposal accepted).** All-max rows at 0.25 ct and 3 ct join the full matrix from S3 and are binding. Impossible combinations get size-dependent engine clamps, reported in `warnings` with the value asked and the value delivered (e.g. culet asked 1.5, delivered 0.85); the global bounds are not narrowed. The 22 zero-area triangles in the round all-max STL are a defect, fixed in S3 so I8 passes on those rows.
26. **A "kicked" leg (S2).** Where no straight leg keeps the pavilion gap, the leg steps out under the seat and runs back in through the gallery (one more bend). Seen on the deepest-bearing marquise and the 0.25 ct princess's corner prongs. Please confirm, or say if you would rather clamp the bearing depth there.

    **Decided 2026-10-18 (accepted, as a fallback only).** Used only where no straight leg keeps the pavilion gap, reported in `warnings` (`kicked-leg`, with its reason) and counted per design in the audit. The user's bearing depth is not clamped to avoid it.
27. **`fuseMetal` shifted retry (S2).** A fuse that adds a solid is retried with the part moved 0.001 mm, and taken only as an exact union with ≥ 0.01 mm³ of overlap.
    - Why: OCCT missed a 0.25 ct cushion's prong in the band at its exact position and found it 0.001 mm off.
    - Counted in `shiftedRetries`; no design in the final matrix used it.
    - Please confirm, or prefer that such designs fail I1.

    **Decided 2026-10-18 (keep).** `shiftedRetries` stays counted in every audit report; any design in a stage's matrix that uses it is named in that stage's report.
28. **Performance after S2** (q. 19 continued). `node scripts/perf-baseline.mjs --runs 9`:
    - warm preview 151.6 ms (budget 186.0), resolve 1655.0 ms (budget 2249.4): both met;
    - cold preview 353.4 ms: not met;
    - like for like with S1 on the same machine: preview 1.75×, resolve 1.56×.

    **Decided 2026-10-18 (warm is the budget; this also settles q. 19).** The warm figure counts because the worker now boots when it is spawned. Cold is still measured and reported every stage and must stay ≤ 500 ms. Every stage reports the like-for-like slowdown against the previous stage. If warm preview passes 186 ms or cold passes 500 ms, stop and report rather than continue.

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

### S0 decisions — 2026-10-07

- **I9 split confirmed** by Animesh (open question 10). I9 binds from S0; I9b binds with I1.
- **Setter / caster questions 1–9:** owed by Animesh, to be asked later. They stay open and provisional.
- **Stale lock removed** with Animesh's permission: `~/Downloads/wireframe/.git/objects/maintenance.lock` (0 bytes, Sep 17), after checking that no git process was running. Nothing else in the main repo was touched; its `status --short` is unchanged.

### S1 — 2026-10-07 — seated as-cast prongs, culet clear, six bench fields wired

Status: see `claude/tasks/S1.md`. Start `088c607`; commits `bce0d0d`..HEAD.
- Default ring: centre stone in metal 4.310 → 0.000 mm³; culet −0.350 → +0.300 mm; seat 0.341 mm deep (asked 0.341); prong tops 5.926 mm above the culet (asked 5.926); STL now watertight (0 slivers, 1 component; was 6 and 7).
- Full audit `--stage S1 --compare s1-start`: 237 designs, 0 crashed, 0 binding failures, 0 regressions; against the full S0 baseline (offline, same rule): 0 regressions, no design lost its single solid.
- Suites: test:cad 31/31, test:brep 41/41; build passes; lint 108 errors + 4 warnings on tracked files (S0: 109 + 4).
- pavilionClearance max narrowed 0.60 → 0.40 ("Bench bounds changed"). The invariants now judge against the values asked, not the engine's clamped values (review finding).
- Performance: see open question 19 (not cleanly met).
- For S2: compare against `structure-audit-s1` (full). The interim rail is flat (q. 20); halos carry their bearers on it.

### S2 — 2026-10-16 — the upper gallery (resumed from the 7 Oct run)

Status: see `claude/tasks/S2.md`. Start `58039f3`; commits `63c1147`..HEAD. The 7 Oct run left 5 commits and uncommitted review fixes. Its last full audit read 3 crashed, 58 binding failures, 65 regressions. The uncommitted work measured better (0 crashed, 18 / 14) and was kept: nothing was reverted.
- **Gallery:** a round wire at the rule of thirds, lowered (reported) where it would show from above. It follows the outline, with bevelled corners never tighter than the wire, and keeps galleryClearance (3D) from the stone. Every leg is routed through it.
- **Baseline defects:** oval (dropped 1) and marquise (2 solids) both pass I1. The minimum pear prong ∩ gallery is 0.0465 mm³ (baseline 0.003).
- **Full audit** `--stage S2 --compare s1` at `55494e5`: 237 designs, 0 crashed, 0 binding failures, 0 regressions, exit 0. I1 237/237; I4, I5 and I5b 216/216.
- **Fast audit** at `889ba4c`: 34 designs, 0 / 0, exit 0.
- **Suites:** test:brep 48/48, test:cad 32/32, build passes, lint 108 + 4 on tracked files (unchanged).
- **Performance:** warm budgets met, cold not (q. 28).
- **Engine and audit:** galleryWire refuses folds; halo ties and bearer ends fixed (attachment only, S6's); a checked fuse retry (q. 27); the audit records each gallery's minimum wall.
- **For S3:**
  - compare against `structure-audit-s2` (full);
  - the I7 disc (q. 14);
  - the 0.25 ct all-max corner (q. 25);
  - the kicked legs (q. 26) may be replaced by legs ending in a base.

### S3 decisions — 2026-10-18

Animesh's answers to open questions 24–28, recorded before S3 started (each is also written under its question above):
- **Q24 confirmed:** lower first, thin only where no height hides it, never below minWall; every lowering and thinning reported as `engine-clamped` with its reason; S5's spec sheet lists them for the caster.
- **Q25 accepted:** 0.25 ct and 3 ct all-max rows join the full matrix from S3, binding; size-dependent engine clamps reported with asked and delivered values; no global bound narrowed; the round all-max STL's 22 zero-area triangles fixed in S3.
- **Q26 accepted as a fallback only:** reported as `kicked-leg` in `warnings` with its reason and counted per design; bearing depth not clamped to avoid it.
- **Q27 keep:** `shiftedRetries` counted in every report; any design using it is named.
- **Q28 (and q. 19):** the warm figure is the budget. Cold is reported every stage and must stay ≤ 500 ms; like-for-like slowdown against the previous stage reported every time. Warm preview over 186 ms or cold over 500 ms stops the work for a report.

Setter / caster questions 1–9 are still open; the bench defaults stay provisional.
