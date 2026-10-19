# S3b: a real basket head (tapered prongs, a wire lower gallery, a band that rises to meet it)

**Status: stopped for decisions.** The basket is built, the performance budget is met, and the decided I7 clamp is in. The full matrix still has **9 failing rows**, in three groups (below). None of them can be fixed without one of Animesh's decisions, and the prompt forbids loosening the rules to pass them. Branch `structure/ring-head`, worktree `~/Downloads/wireframe-structure`. Run in Claude Code on the Mac (Darwin 25.6.0, arm64), Node v26.12.0.

**S3b start:** `943430e` (S3 complete), then `f05641c` (Animesh's decisions on S3's questions). All S3b work is `943430e..HEAD`.

Setter / caster questions 1–9 are still open, and question 10 (basketTaper) is new. Every bench default is provisional, not verified.

## How the run went

1. **First pass (uncommitted, 18 Oct):** the basket, the pad, the new invariants and the audit measures.
2. **Stopped on the resolve budget:** 2523.7 ms against 2249.4.
3. **Animesh's decisions (19 Oct, logged):**
   - fix the pad-to-band fillet at its cause, in its own commit;
   - clamp the value that drives the all-max I7 shortfall;
   - commit the work first.
4. **Committed in pieces:** `338c340`..`ff629cf`, then pushed.
5. **The fillet, timed:** see "Performance" below.
6. **The I7 clamp:** `5bcb27d`, `a57c24d`, `cc58111`.
7. **The first full audit** found failures that the fast matrix never sees:
   - side heads and a twisted band read as overhang;
   - a stone moved into its seats by the audit's own retry;
   - a crash on an oval with 2 mm prongs;
   - zero-area slivers;
   - prongs not joined to the wire on an 8-prong emerald.

   Each was fixed in its own commit (`d801ce5`..`87319c8`).
8. **Third full audit:** 9 rows left, all for Animesh.

## What changed

### The head below the stone (`165ca14`)

| | S3 | S3b |
|---|---|---|
| Legs | straight down to a flat base ring | S3's prongs down to the upper gallery, then in to the feet at **basketTaper** × the girdle radius in each prong's direction |
| Base | flat ring as wide as the stone, sunk in a saddle prism | a **round wire** at the feet. A torus on round stones; on fancy cuts, a circle swept along the outline scaled to the feet with its corners rounded. Section 1.1 × max(prongDiameter, minWall) |
| Joint to the band | solid saddle prism, wider than narrow bands | a **pad** from inside the wire down into the band, cut to the band's width at the band line and widening above it, with its flare to the band built in |
| Blends | fillet or flare at feet, base and saddle | the same three joints. Pad to band is always the designed flare (below) |

**The wire is 1.1× the rule's thickness.** At exactly 1.0× the legs meet the wire as an equal-radius T, which OCCT cannot fillet. This is a deliberate deviation (q. 41).

**basketTaper** (`f3b5f92`):
- default 0.60, bounds 0.45–0.90, "our default";
- wired through resolveBench and I13;
- provisional (setter q. 10).

The layout tries the asked value first, then wider up to 0.90, then narrower down to 0.45. A taper the stone forces is reported with asked and delivered.

### Performance: the pad-to-band joint (`0f721c3`)

Timed on the default ring, warm, before the fix: blendHead took 908 ms of a 2290 ms resolve. The pad-to-band joint alone took **544 ms**:

| Pad-to-band step | Time |
|---|---|
| Finding the edges | 24 ms |
| The fillet attempt, which always failed | 68 ms |
| Building the flare | 7 ms |
| **The flare's fuse into the whole ring** | **~425 ms** |
| The validity check | 20 ms |

**Why the fillet fails.** The clip that keeps the pad within the band's width cuts the pad's revolved faces. That leaves outside corners on the pad's edge with the band, where two inside edges meet one outside one, and OCCT's fillet fails there:
- on 32 of 32 rings in the fast audit, wide bands too;
- on each edge alone, at every radius down to 0.05 mm;
- rounding the pad's corners first also failed, at 0.2–0.5 mm.

Moving the faces' creases off the band let the clip's sides fillet at 0.15 mm. The opening's edges still failed, and the change stood a 0.4 mm upright wall on the shoulder, so it was not kept.

**The fix:** that joint is always the designed flare, never an attempt that fails:
- `padOutline` joins the pad's profile and the flare's in 2D, so the pad is swept and clipped once and nothing is fused;
- its sides never step back in going down (a step sealed a void on a 0.25 ct stone);
- the flare is held inside the footprint + d over the band (it stood 0.06 mm past it on a flat band).

The other cost found is that the leg's knee bend sits inside the gallery wire on the default ring. That doubles the gallery's fuse, 40 → 85 ms a prong. Moving the knee below the wire would need a bend tighter than minBendRadius's minimum, so it was left.

### I7 on narrow bands: a prong-thickness clamp (`5bcb27d`, `a57c24d`, `cc58111`)

**Animesh's decision (2026-10-19):**
- a size-dependent engine clamp on the value that drives it, reported with asked and delivered;
- no plate or washer, and I7 not relaxed;
- never culetClearance or an alloy minimum.

**Row, value and numbers (all-max 1 ct round):**
- the pad held the band over 17.46 mm² against the prongs' 18.85 (6 × π × 1²);
- prongDiameter 2, basketTaper already at its 0.9 maximum, culetClearance 1.5.

**Why prongDiameter drives it:** the seat must carry 6π(d/2)², which grows with d². The pad's length along the band is held by the culet's gap inside and by the footprint + d outside (I16), and those grow only with d.

**What was done:**
- **The reckoning:** the layout reckons the seat (`padSeatArea`) wherever its estimate of the pad's length was held at the culet's gap. It reads 11.652 mm² on the default ring, where the audit measures 11.63, and is only run for such heads.
- **The clamp:** the prongs are thinned, on the field's 0.05 mm steps and by halves, to the thickest whose seat holds 1.02× the prongs' section. The clamp also acts where the wire, 1.1× the prong, would touch the stone at any taper.
- **What a candidate must meet:** every leg must sweep, the culet gap must be no worse, and the feet must stay inside basketTaper's bounds. Never below the alloy's minimum.
- **Its limits:**
  - where even the alloy's minimum does not do, the head is left as asked;
  - the culet clamp's search skips this clamp;
  - the shoulders did not need to grow on any row.

**Clamped rows** (prongDiameter, asked → delivered; full matrix, `structure-audit-s3b`):

| Design | Prongs | Why |
|---|---|---|
| all-max 1 ct round (and its halo and three-stone) | 2 → 1.85 | I7 |
| all-max 3 ct round | 2 → 1.85 | I7 |
| all-max 3 ct marquise | 2 → 1.45 | I7 |
| all-max 0.25 ct round | 2 → 1.15 | I7 (still fails its culet, below) |
| `{"bench":{"prongDiameter":2}}` (1 ct round) | 2 → 1.45 | I7 |
| `{"bench":{"prongDiameter":2},"gemShape":"oval"}` | 2 → 1.3 | the wire touched the stone (0.001 mm, 0.33 mm³ in it) |
| `{"bench":{"prongDiameter":2},"gemShape":"marquise"}` | 2 → 1.25 | I7 |
| `{"bandWidth":1.2,"shankStyle":"twisted"}` | 0.852 → 0.8 | I7 |

These are large reductions on the 2 mm rows (q. 40).

### Other engine fixes from the full audit

- **`d801ce5`, the merge's shifted retry** now also runs where a fuse throws or loses metal, and at 0.005 mm where 0.001 finds nothing. This fixed:
  - an oval's foot flares, which stopped the merge;
  - an 8-prong emerald's side prongs, which stood apart from the wire, held only by the gallery.
- **`5bfe069`, the wire and the gallery:**
  - a wire that only grazes the gallery is lifted 0.1 mm into it, at most 0.3 mm and only while it keeps its gaps (the twisted shank's zero-area slivers);
  - on heads where the wire meets the gallery, straight legs land in the wire again, unless that puts the feet outside the bounds.
- **`32737f2`, the base flare and straight legs:**
  - the base flare is held to the room on the pad's face;
  - straight legs land at the taper asked unless nothing else fits.
- **`eca183d`:** dead code removed. Lint is back to the S3 count.

## Audit (`structure-audit-s3b`, full, at `87319c8`)

`253 designs, 0 crashed, stage S3: 15 binding failure(s), 6 regression(s) against s3 in 1973s`, exit 1.

### Acceptance numbers

- **Per invariant, of 232 prong-family heads:** I6, I12, I14, I15 and I17 pass on 232; I7 on 231 (not the all-max marquise); I16 on 230.
- **I15 (flush with the band):** the largest overhang is **0.000 mm**, at `{"bandProfile":"round","bandWidth":1.2}` (x 1.95, −y, z −1.119).
- **I16 (basket form):** the widest point below the gallery is **0.0205 mm inside** the footprint + d (the flat band's pad, at (2.59, 1.00, −0.46)). It fails only on the all-max marquise and the 0.25 ct all-max round, through the wire's culet gap.
- **I17 (head metal does not grow):** passes everywhere. The highest ratio to S3 is 0.456, on `{"gemSize":3,"prongCount":8}`.
- **Foot fillets (Q29):** none under 0.10 mm anywhere.

  | Foot fillet | Designs |
  |---|---|
  | 0.30 mm or more | 95 |
  | 0.10 to 0.30 mm | 6 |
  | flared | 131 |

- **Blends:** feet fillet 101, flare 131; base fillet 185, flare 47; shank (pad to band) flare 232. No design has no blend (I14).
- **Q32, band crest under the base ring:** 7 designs in S3 (all 0.25 ct marquises), **0** in S3b (the crest is inside the pad's opening on all 232 heads).
- **Q34, flare columns:** 60 in S3, **0** in S3b.
- **basketTaper, I13 at its corners:**
  - min 0.45 → delivered 0.50 (reported), measured 0.498;
  - max 0.90, measured 0.904;
  - all-min rows pass;
  - all-max round, halo, three-stone and 3 ct pass;
  - all-max marquise and 0.25 ct round fail (below).
- **Tapers the stone forces** (reported with both numbers): 83 designs. Most are fancy cuts and 0.25 ct stones; the list is in `structure-audit-s3b.json` (`bench.warnings`).
  - **On 42 of them, the 0.25 ct stones, the reported value is above the field's 0.90 maximum (0.904 to 0.98).** There the wire sits at the gallery's own height, so the legs run straight down through the gallery and the basket hardly tapers. Reported, not hidden (q. 39).
- **Kicked legs (Q26/Q33):** 310 legs on 76 designs (S3: 90 legs on 30).
- **shiftedRetries:** none in the merge. **commonRetries:** 1 design.
- **meshOpen:** 11 designs (non-binding, q. 37): 3 ct ovals and marquises in each setting, `{"ringSize":3}`, `{"bench":{"bearingDepth":20},"gemShape":"marquise"}`.

### Head metal and weight (default alloy, platinum 21.45 g/cm³)

| Design | Head metal S3 | Head metal S3b | Ring S3 | Ring S3b |
|---|---|---|---|---|
| default (US 6, 1 ct round, 2.5 mm comfort) | 68.45 mm³ | **20.28 mm³** | 267.5 mm³, 5.74 g | **219.3 mm³, 4.70 g** |
| 1.6 mm band | 59.31 | 17.95 | 171.0, 3.67 g | 129.7, 2.78 g |
| 6 mm band | 62.96 | 19.21 | 812.1, 17.42 g | 768.1, 16.48 g |
| cathedral | 68.45 | 20.28 | 269.0, 5.77 g | 220.7, 4.73 g |
| halo | 68.45 | 20.28 | 289.7, 6.21 g | 241.5, 5.18 g |
| three-stone | 68.45 | 20.28 | 293.8, 6.30 g | 243.8, 5.23 g |
| 0.25 ct round | 49.61 | 16.47 | 236.6, 5.07 g | 200.9, 4.31 g |
| 3 ct round | 81.11 | 34.58 | 316.0, 6.78 g | 266.2, 5.71 g |

Head metal is vol((base ∪ pad) − band). In S3b the pad includes its flare to the band.

### The 9 failing rows (for Animesh)

**1. I4 on 0.25 ct emeralds and an 8-prong 0.25 ct marquise (6 rows, the 6 regressions against S3).**

| Design | Gallery touches |
|---|---|
| `{"gemShape":"emerald","gemSize":0.25}` (and its halo, cathedral and three-stone) | 2 of 6 prongs |
| `{"gemShape":"emerald","gemSize":0.25,"prongCount":3}` | 1 of 3 |
| `{"gemShape":"marquise","gemSize":0.25,"prongCount":8}` | 2 of 8 |

- **What happens:** on a 0.25 ct stone the lower wire sits at the gallery's own height (emerald: wire z 0.287, gallery z 0.401, the two overlapping 2.09 mm³). The legs therefore end inside the gallery's height span instead of passing through it.
- **The overlaps:** where the leg must also cross the gallery 0.5–0.55 mm off its centreline, the prong overlaps the gallery by 0.0062–0.0136 mm³, against I4's 0.02. In S3 the same prongs overlapped it by 0.054 (they ran on through to the base).
- **The prongs are held:** they are fused to the wire, and the wire to the gallery.
- **Before today:** these rows were failing in S3b's code before today's changes.

**2. The all-max marquise at 1 ct, and the all-max round at 0.25 ct: the culet gap.**
- **1 ct marquise:** a culet gap of 1.5 mm cannot be kept by a wire under a narrow stone.
  - At every taper up to 0.9 the wire comes 0.61 mm from the culet at d = 2.
  - At the alloy's minimum prong (0.8 mm) it comes 1.39–1.41 mm against 1.52.
  - It also fails I7 (14.98 against 18.85), I10c (0.278 against 0.38) and I16.
  - S3's flat base, as wide as the stone, kept 1.5.
- **0.25 ct round:** the culet clamp (Q35) holds the gap to 1.35, and the I7 clamp then thins the prongs to 1.15 mm. The wire comes **1.30 mm** from the culet, against 1.34. It was failing in S3b's code before the clamp too (culet 0.74).

**3. The all-max marquise at 3 ct: I13 basketTaper.** The feet's mean is 0.9174 (inside 0.03), but one foot is 0.158 off the asked 0.9, against 0.10. These are straight legs near the marquise's tips. Same class as 2: a 2 mm prong basket on a marquise with the largest culet gap.

## Performance (`node scripts/perf-baseline.mjs --runs 9`, and `--cold`)

At `0f721c3`, the commit the stop asked for:

| | Measured | Budget | Headroom |
|---|---|---|---|
| Preview, warm | 162.1 ms | 186 | **23.9 ms** |
| Preview, cold | 359.8 ms | 500 | **140.2 ms** |
| Resolve, warm | 1984.4 ms | 2249.4 | **265.0 ms** |
| Resolve, cold | 2213.7 ms | | |

Re-measured at HEAD: see "Final verification".

## Screenshots and slices (`audit/s3b/`)

The same set as S3, each side by side with its S3 version in `audit/s3b/compare-*.png`. The section views were taken by clicking "Section cut": the 5 key did not open it in this run.

| View | Prongs | Base | Band rises in | At the joint | Reads like |
|---|---|---|---|---|---|
| Default, front and close | lean in below the gallery to a narrow joint | thin wire, open space under the stone | the pad flares out of the band with no step | nothing wider than the band (S3 had a puck wider than the band) | a standard cast solitaire head on a short, tapered neck |
| Default, top | — | nothing shows outside the girdle (S3's base rim did) | — | — | — |
| Default, side | — | — | shoulders widen from the band's width up to the wire, sloping, no upright wall | — | a short tapered pedestal |
| 1.6 mm band | — | the wire is wider than the band | short, shallow shoulders | flush with the flanks (S3's washer overhung) | — |
| 6 mm band | — | — | — | — | the weakest view: the pad is a narrow neck under the wire, flaring into a wide band |
| Knife edge, split, tapered | as on the default | as on the default | as on the default | as on the default | as on the default |
| Cathedral | as on the default | as on the default | as on the default | as on the default | as on the default |
| Halo | — | — | — | the halo hides the basket from the front | — |
| Three-stone | — | — | — | the centre's black S3 collar is gone | — |
| Sections, default and 1.6 mm | legs bend in at the knee | round wire section | the pad tapers into the band | — | — |

**Slices** (`head-section-A.png` through two prongs, `-B.png` between them): **no red** (0 red pixels in either). A shows each leg's knee and the wire on the pad, flaring into the band, with the band's crest in the opening under the culet. B shows the gallery and wire sections, and open space under the stone.

## Final verification

| Check | Result |
|---|---|
| `npm run build` | passes |
| `npm run lint` (tracked files) | 103 errors, 4 warnings: the same as S3, none new |
| `npm run test:cad` | 32 of 32 |
| `npm run test:brep` | **62 of 62** in 2445 s, at `87319c8` plus the new tests (`5e39e86`), including 7 new basket tests |
| Full audit `--tag s3b --stage S3 --compare s3`, at `87319c8` (HEAD's two later commits are a stricter I16 and the tests, checked on the fast matrix) | 253 designs, 0 crashed, 15 binding failures on 9 rows, 6 regressions (I4, 0.25 ct); exit 1 |
| Fast audit after the review's fixes | 35 designs, 0 crashed, 5 binding failures (the all-max marquise), 0 regressions |

`perf-baseline --runs 9` at HEAD:

| | Measured | Budget | Headroom |
|---|---|---|---|
| Preview, warm | 161.5 ms | 186 | 24.5 ms |
| Preview, cold | 355.9 ms | 500 | 144.1 ms |
| Resolve, warm | 1983.5 ms | 2249.4 | 265.9 ms |
| Resolve, cold | 2208.9 ms | | |

Like for like with S3 (warm preview 170.4, resolve 1420.5, cold 338.2): preview 0.95×, resolve 1.40×, cold 1.05×.

Off the default ring, a 1.2 mm band: preview 180 ms (6 ms under the default ring's budget), resolve 3085 ms. The prong clamp and the seat reckoning run there. Not a budget breach, which is measured on the default ring, but close (q. 43).

## Self-review and adversarial review

**Self-review**, during the run:
- the full audit's own failures, each fixed in its own commit (above);
- dead code (`eca183d`);
- lint back to S3's count.

**Adversarial review** of `943430e..87319c8`: the reviewer read only the diff, STRUCTURE-RULES.md and the prompt's criteria. It made 12 findings:

| # | Finding | Outcome |
|---|---|---|
| 1 | I7 is reached by thinning the prongs; the prompt says stop | Animesh's decision of 2026-10-19 (logged). Put back to him as q. 40, with the rows and sizes |
| 2 | A near-zero flare counts as a blend | **Real.** 17 designs have foot flares held to 0.006–0.045 mm by the stone's gaps, effectively no blend. Not fixed (it would be an assertion change); **q. 44** |
| 3 | I16 cannot tell a ring from a plate | **Fixed** (`d4296cd`): the head's axis must pass through the wire and the pad (0.376–1.575 mm clear) |
| 4 | I17 leaves out the base and foot flares and the struts | Like for like with S3's reference (the same formula on S3's code). Left; **q. 45** |
| 5 | The audit's new booleans are unchecked | **Fixed** (`d4296cd`): the cut and the fuse are checked |
| 6 | The S3b tests were uncommitted | **Fixed:** committed after test:brep passed |
| 7 | I16's footprint is the wire's centreline, not the feet | The feet sit on the centreline, except straight legs within the wire. Recorded in q. 39 |
| 8 | I15 leaves out three-stone side heads | Deliberate, as I6/I6b (S6's heads). Recorded in the log |
| 9 | basketTaper's I13 accepts any reported clamp inside the bounds | As every size clamp is (Q25). Recorded |
| 10 | The overlap retry could find overlap in a mere touch | Limited to overlaps that must exist, and judged at 0.02 mm³. Recorded |
| 11 | Layouts multiply on narrow bands | **Measured:** 1.2 mm band preview 180 ms (q. 43) |
| 12 | Legs are read from the layout's spine, not the solid | As S3's I10c. Recorded |

Also noted: the joint is a clipped pad solid, not a change to the band's section function (`shankSection`, `applyRegions`), which the prompt suggests. The band's section is a revolve along the whole ring; a local rise under the head would need regions on the band's top, and a pad was cheaper to make flush.
