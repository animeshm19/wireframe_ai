# Structure audit: s0-fast

Command: `node scripts/structure-audit.mjs --fast --tag s0-fast --stage S0 --compare baseline`

Commit `673825f`, 2026-10-06T17:20:47.385Z, Node v24.9.0, stage **S0**, fast matrix, 34 designs, 0 crashed, 54s on 9 jobs.

Binding failures at S0: **0**. Regressions against `baseline`: **0**.

Cells: pass, FAIL, – (not applicable), todo (no measurement yet). **Bold with !** = binding at this stage and not passing.

## Invariants

| ID | Rule | Pass | Fail | Todo | N/A |
|---|---|---|---|---|---|
| I1 | one solid, nothing dropped by the fuse | 28 | 6 | 0 | 0 |
| I2a | centre stone does not overlap metal (≤ 0.001 mm³) | 0 | 34 | 0 | 0 |
| I2b | no stone overlaps metal (≤ 0.001 mm³ each) | 0 | 34 | 0 | 0 |
| I3a | culet clearance ≥ culetClearance (effective) − 0.01 | 1 | 33 | 0 | 0 |
| I3b | side stones' culet clearance ≥ culetClearance (effective) − 0.01 | 0 | 1 | 0 | 33 |
| I3c | halo and shank accents: culet not inside metal (≥ 0) | 0 | 4 | 0 | 30 |
| I11 | stones never intersect each other (≤ 0.001 mm³ per pair) | 33 | 1 | 0 | 0 |
| I4 | gallery clear of the stone, at galleryClearance, touching every prong | 0 | 32 | 0 | 2 |
| I5 | gallery at the rule-of-thirds height (±0.05), at least galleryThickness thick | 0 | 32 | 0 | 2 |
| I6 | every prong stands in the base (> 0.02 mm³) and not in the band | 0 | 32 | 0 | 2 |
| I7 | joint section ≥ JOINT_AREA_RATIO × summed prong sections | 29 | 3 | 0 | 2 |
| I8 | STL: every edge used twice, no zero-area triangle, one component | 2 | 32 | 0 | 0 |
| I9 | STEP is B-rep: metal written as MANIFOLD_SOLID_BREP, nothing triangulated, solids named | 34 | 0 | 0 | 0 |
| I9b | STEP: metal is exactly one MANIFOLD_SOLID_BREP, and the file holds every solid | 31 | 3 | 0 | 0 |
| I10 | bearings and as-set prongs (measurements added by S1 and S4) | 0 | 0 | 34 | 0 |
| I13 | every customised bench value shows up in the geometry | 0 | 0 | 6 | 28 |

## Designs

| Design | Solids | Dropped | Metal mm³ | Centre ∩ metal | All stones ∩ metal | Culet mm | I1 | I2a | I2b | I3a | I3b | I3c | I11 | I4 | I5 | I6 | I7 | I8 | I9 | I9b | I10 | I13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `{}` | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"prongCount":3}` | 1 | 0 | 181.211 | 2.473 | 2.473 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"prongCount":4}` | 1 | 0 | 183.275 | 3.086 | 3.086 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"prongCount":8}` | 1 | 0 | 191.870 | 5.536 | 5.536 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval"}` | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear"}` | 1 | 0 | 189.778 | 3.841 | 3.841 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise"}` | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"cushion"}` | 1 | 0 | 187.227 | 3.629 | 3.629 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald"}` | 1 | 0 | 188.444 | 2.630 | 2.630 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess"}` | 1 | 0 | 191.223 | 1.453 | 1.453 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","prongCount":4}` | 2 | 0 | 189.053 | 2.793 | 2.793 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemSize":0.25}` | 1 | 0 | 177.877 | 1.810 | 1.810 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemSize":3}` | 1 | 0 | 204.780 | 9.231 | 9.231 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":0.5,"ringSize":4}` | 1 | 0 | 166.141 | 2.752 | 2.752 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3,"ringSize":11}` | 1 | 0 | 243.583 | 9.231 | 9.231 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandWidth":1.6}` | 1 | 0 | 100.874 | 4.305 | 4.305 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandWidth":6}` | 1 | 0 | 736.422 | 4.315 | 4.315 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandProfile":"flat"}` | 1 | 0 | 236.004 | 4.318 | 4.318 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandProfile":"knife"}` | 1 | 0 | 124.947 | 4.276 | 4.276 | -0.220 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"setting":"halo"}` | 1 | 0 | 212.434 | 5.746 | 7.917 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","setting":"halo"}` | 1 | 1 | 211.105 | 4.937 | 7.675 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","setting":"halo"}` | 1 | 3 | 219.833 | 5.433 | 10.387 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"setting":"cathedral"}` | 1 | 0 | 196.121 | 4.927 | 4.927 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"setting":"three_stone"}` | 1 | 0 | 198.792 | 4.310 | 6.742 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"setting":"bezel"}` | 1 | 0 | 213.260 | 3.532 | 3.532 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"emerald","setting":"bezel"}` | 1 | 0 | 208.991 | 7.913 | 7.913 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"shankStones":"pave"}` | 1 | 0 | 184.491 | 4.304 | 5.385 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"shankStyle":"split"}` | 1 | 0 | 169.990 | 4.256 | 4.256 | 0.425 | pass | FAIL | FAIL | pass | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3}}` *(corner all min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.6,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8}}` *(corner all max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | todo |
| `{"bench":{"bearingDepth":20}}` *(corner bearingDepth min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"bearingDepth":50}}` *(corner bearingDepth max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"culetClearance":1.5}}` *(corner culetClearance max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.6,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8},"gemShape":"marquise"}` *(corner all max, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | todo | todo |
