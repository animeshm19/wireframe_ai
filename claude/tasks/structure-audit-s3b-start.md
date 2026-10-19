# Structure audit: s3b-start

Command: `node scripts/structure-audit.mjs --fast --tag s3b-start --stage S3 --compare s3`

Commit `f05641c`, 2026-10-18T11:29:53.551Z, Node v26.12.0, stage **S3**, fast matrix, 35 designs, 0 crashed, 120s on 9 jobs.

Binding failures at S3: **0**. Regressions against `s3`: **0**.

Cells: pass, FAIL, – (not applicable), todo (no measurement yet). **Bold with !** = binding at this stage and not passing.

## Invariants

| ID | Rule | Pass | Fail | Todo | N/A |
|---|---|---|---|---|---|
| I1 | one solid, nothing dropped by the fuse | 35 | 0 | 0 | 0 |
| I2a | centre stone does not overlap metal (≤ 0.001 mm³) | 32 | 3 | 0 | 0 |
| I2b | no stone overlaps metal (≤ 0.001 mm³ each) | 28 | 7 | 0 | 0 |
| I2c | centre head's prongs and gallery do not overlap the centre stone (≤ 0.001 mm³ each) | 33 | 0 | 0 | 2 |
| I3a | culet clearance ≥ culetClearance (effective) − 0.01 | 35 | 0 | 0 | 0 |
| I3b | side stones' culet clearance ≥ culetClearance (effective) − 0.01 | 0 | 1 | 0 | 34 |
| I3c | halo and shank accents: culet not inside metal (≥ 0) | 1 | 3 | 0 | 31 |
| I11 | stones never intersect each other (≤ 0.001 mm³ per pair) | 34 | 1 | 0 | 0 |
| I4 | gallery clear of the stone, at galleryClearance, touching every prong | 33 | 0 | 0 | 2 |
| I5 | gallery at the rule-of-thirds height (±0.05), or lower by a reported amount; galleryThickness thick | 33 | 0 | 0 | 2 |
| I5b | centre gallery hidden under the girdle seen from above (360 directions) | 33 | 0 | 0 | 2 |
| I6 | every centre prong stands in the base (> 0.02 mm³) and not in the band | 33 | 0 | 0 | 2 |
| I6b | every side-head prong stands in its base (> 0.02 mm³) and not in the band | 0 | 1 | 0 | 34 |
| I14 | every joint of the centre head blended, by fillet or by flare | 33 | 0 | 0 | 2 |
| I12 | the centre base's section ≥ max(prongDiameter, minWall), at a prong-free angle | 33 | 0 | 0 | 2 |
| I7 | joint section ≥ JOINT_AREA_RATIO × summed prong sections | 33 | 0 | 0 | 2 |
| I8 | STL: every edge used twice, no zero-area triangle, one component | 35 | 0 | 0 | 0 |
| I9 | STEP is B-rep: metal written as MANIFOLD_SOLID_BREP, nothing triangulated, solids named | 35 | 0 | 0 | 0 |
| I9b | STEP: metal is exactly one MANIFOLD_SOLID_BREP, and the file holds every solid | 35 | 0 | 0 | 0 |
| I10a | every centre prong has a seat bearingDepth% of its diameter deep (±0.02), leaving the rest | 33 | 0 | 0 | 2 |
| I10b | every centre prong stands asCastProngHeight above the table (±0.05) | 33 | 0 | 0 | 2 |
| I10c | below girdle − d every centre prong keeps pavilionClearance (−0.02) from the stone | 33 | 0 | 0 | 2 |
| I13 | every customised bench value shows up in the geometry | 6 | 0 | 0 | 29 |

## Designs

| Design | Solids | Dropped | Metal mm³ | Centre ∩ metal | All stones ∩ metal | Culet mm | I1 | I2a | I2b | I2c | I3a | I3b | I3c | I11 | I4 | I5 | I5b | I6 | I6b | I14 | I12 | I7 | I8 | I9 | I9b | I10a | I10b | I10c | I13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `{}` | 1 | 0 | 267.516 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":3}` | 1 | 0 | 259.316 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":4}` | 1 | 0 | 262.178 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":8}` | 1 | 0 | 273.238 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"oval"}` | 1 | 0 | 275.456 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"pear"}` | 1 | 0 | 274.855 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise"}` | 1 | 0 | 313.554 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"cushion"}` | 1 | 0 | 267.396 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"emerald"}` | 1 | 0 | 280.303 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"princess"}` | 1 | 0 | 286.773 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise","prongCount":4}` | 1 | 0 | 303.549 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":0.25}` | 1 | 0 | 236.567 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":3}` | 1 | 0 | 316.009 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":0.5,"ringSize":4}` | 1 | 0 | 235.326 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":3,"ringSize":11}` | 1 | 0 | 354.013 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandWidth":1.2}` | 1 | 0 | 151.861 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandWidth":1.6}` | 1 | 0 | 170.979 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandWidth":6}` | 1 | 0 | 812.053 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandProfile":"flat"}` | 1 | 0 | 316.622 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandProfile":"knife"}` | 1 | 0 | 215.495 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"halo"}` | 1 | 0 | 289.729 | 0.000 | 2.295 | 0.300 | pass | pass | FAIL | pass | pass | – | FAIL | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"oval","setting":"halo"}` | 1 | 0 | 299.198 | 0.000 | 2.880 | 0.300 | pass | pass | FAIL | pass | pass | – | FAIL | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise","setting":"halo"}` | 1 | 0 | 347.043 | 0.012 | 5.343 | 0.300 | pass | FAIL | FAIL | pass | pass | – | FAIL | FAIL | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"cathedral"}` | 1 | 0 | 269.033 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"three_stone"}` | 1 | 0 | 293.798 | 0.000 | 0.070 | 0.300 | pass | pass | FAIL | pass | pass | FAIL | – | pass | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"bezel"}` | 1 | 0 | 215.449 | 3.478 | 3.478 | 0.300 | pass | FAIL | FAIL | – | pass | – | – | pass | – | – | – | – | – | – | – | – | pass | pass | pass | – | – | – | – |
| `{"gemShape":"emerald","setting":"bezel"}` | 1 | 0 | 211.197 | 7.798 | 7.798 | 0.300 | pass | FAIL | FAIL | – | pass | – | – | pass | – | – | – | – | – | – | – | – | pass | pass | pass | – | – | – | – |
| `{"shankStones":"pave"}` | 1 | 0 | 265.855 | 0.000 | 0.406 | 0.300 | pass | pass | FAIL | pass | pass | – | pass | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"shankStyle":"split"}` | 1 | 0 | 243.579 | 0.000 | 0.000 | 0.423 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3}}` *(corner all min, binds from S1)* | 1 | 0 | 225.902 | 0.000 | 0.000 | 0.100 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.4,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8}}` *(corner all max, binds from S1)* | 1 | 0 | 639.453 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"bearingDepth":20}}` *(corner bearingDepth min, binds from S1)* | 1 | 0 | 259.804 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"bearingDepth":50}}` *(corner bearingDepth max, binds from S1)* | 1 | 0 | 272.365 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"culetClearance":1.5}}` *(corner culetClearance max, binds from S1)* | 1 | 0 | 288.540 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.4,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8},"gemShape":"marquise"}` *(corner all max, binds from S1)* | 1 | 0 | 807.680 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | pass | – | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
