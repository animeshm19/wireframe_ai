# Structure audit: s2-fast

Command: `node scripts/structure-audit.mjs --fast --tag s2-fast --stage S2 --compare s1`

Commit `889ba4c`, 2026-10-16T09:51:19.648Z, Node v26.12.0, stage **S2**, fast matrix, 34 designs, 0 crashed, 66s on 9 jobs.

Binding failures at S2: **0**. Regressions against `s1`: **0**.

Cells: pass, FAIL, – (not applicable), todo (no measurement yet). **Bold with !** = binding at this stage and not passing.

## Invariants

| ID | Rule | Pass | Fail | Todo | N/A |
|---|---|---|---|---|---|
| I1 | one solid, nothing dropped by the fuse | 34 | 0 | 0 | 0 |
| I2a | centre stone does not overlap metal (≤ 0.001 mm³) | 30 | 4 | 0 | 0 |
| I2b | no stone overlaps metal (≤ 0.001 mm³ each) | 26 | 8 | 0 | 0 |
| I2c | centre head's prongs and gallery do not overlap the centre stone (≤ 0.001 mm³ each) | 32 | 0 | 0 | 2 |
| I3a | culet clearance ≥ culetClearance (effective) − 0.01 | 34 | 0 | 0 | 0 |
| I3b | side stones' culet clearance ≥ culetClearance (effective) − 0.01 | 0 | 1 | 0 | 33 |
| I3c | halo and shank accents: culet not inside metal (≥ 0) | 0 | 4 | 0 | 30 |
| I11 | stones never intersect each other (≤ 0.001 mm³ per pair) | 33 | 1 | 0 | 0 |
| I4 | gallery clear of the stone, at galleryClearance, touching every prong | 32 | 0 | 0 | 2 |
| I5 | gallery at the rule-of-thirds height (±0.05), or lower by a reported amount; galleryThickness thick | 32 | 0 | 0 | 2 |
| I5b | centre gallery hidden under the girdle seen from above (360 directions) | 32 | 0 | 0 | 2 |
| I6 | every prong stands in the base (> 0.02 mm³) and not in the band | 0 | 32 | 0 | 2 |
| I7 | joint section ≥ JOINT_AREA_RATIO × summed prong sections | 32 | 0 | 0 | 2 |
| I8 | STL: every edge used twice, no zero-area triangle, one component | 34 | 0 | 0 | 0 |
| I9 | STEP is B-rep: metal written as MANIFOLD_SOLID_BREP, nothing triangulated, solids named | 34 | 0 | 0 | 0 |
| I9b | STEP: metal is exactly one MANIFOLD_SOLID_BREP, and the file holds every solid | 34 | 0 | 0 | 0 |
| I10a | every centre prong has a seat bearingDepth% of its diameter deep (±0.02), leaving the rest | 32 | 0 | 0 | 2 |
| I10b | every centre prong stands asCastProngHeight above the table (±0.05) | 32 | 0 | 0 | 2 |
| I10c | below girdle − d every centre prong keeps pavilionClearance (−0.02) from the stone | 32 | 0 | 0 | 2 |
| I13 | every customised bench value shows up in the geometry | 6 | 0 | 0 | 28 |

## Designs

| Design | Solids | Dropped | Metal mm³ | Centre ∩ metal | All stones ∩ metal | Culet mm | I1 | I2a | I2b | I2c | I3a | I3b | I3c | I11 | I4 | I5 | I5b | I6 | I7 | I8 | I9 | I9b | I10a | I10b | I10c | I13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `{}` | 1 | 0 | 206.494 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":3}` | 1 | 0 | 194.294 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":4}` | 1 | 0 | 198.283 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":8}` | 1 | 0 | 215.063 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"oval"}` | 1 | 0 | 206.261 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"pear"}` | 1 | 0 | 206.646 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise"}` | 1 | 0 | 208.517 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"cushion"}` | 1 | 0 | 204.046 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"emerald"}` | 1 | 0 | 203.193 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"princess"}` | 1 | 0 | 211.521 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise","prongCount":4}` | 1 | 0 | 201.197 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":0.25}` | 1 | 0 | 189.594 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":3}` | 1 | 0 | 248.942 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":0.5,"ringSize":4}` | 1 | 0 | 179.313 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":3,"ringSize":11}` | 1 | 0 | 287.486 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandWidth":1.6}` | 1 | 0 | 119.673 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandWidth":6}` | 1 | 0 | 755.378 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandProfile":"flat"}` | 1 | 0 | 255.391 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandProfile":"knife"}` | 1 | 0 | 143.946 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"halo"}` | 1 | 0 | 228.646 | 0.000 | 2.295 | 0.300 | pass | pass | FAIL | pass | pass | – | FAIL | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"oval","setting":"halo"}` | 1 | 0 | 229.958 | 0.000 | 2.880 | 0.300 | pass | pass | FAIL | pass | pass | – | FAIL | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise","setting":"halo"}` | 1 | 0 | 242.007 | 0.012 | 5.343 | 0.300 | pass | FAIL | FAIL | pass | pass | – | FAIL | FAIL | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"cathedral"}` | 1 | 0 | 214.926 | 0.055 | 0.055 | 0.300 | pass | FAIL | FAIL | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"three_stone"}` | 1 | 0 | 230.692 | 0.000 | 0.070 | 0.300 | pass | pass | FAIL | pass | pass | FAIL | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"bezel"}` | 1 | 0 | 215.449 | 3.478 | 3.478 | 0.300 | pass | FAIL | FAIL | – | pass | – | – | pass | – | – | – | – | – | pass | pass | pass | – | – | – | – |
| `{"gemShape":"emerald","setting":"bezel"}` | 1 | 0 | 211.197 | 7.798 | 7.798 | 0.300 | pass | FAIL | FAIL | – | pass | – | – | pass | – | – | – | – | – | pass | pass | pass | – | – | – | – |
| `{"shankStones":"pave"}` | 1 | 0 | 203.317 | 0.000 | 1.028 | 0.300 | pass | pass | FAIL | pass | pass | – | FAIL | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"shankStyle":"split"}` | 1 | 0 | 189.157 | 0.000 | 0.000 | 0.578 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3}}` *(corner all min, binds from S1)* | 1 | 0 | 192.241 | 0.000 | 0.000 | 0.100 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.4,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8}}` *(corner all max, binds from S1)* | 1 | 0 | 487.983 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"bearingDepth":20}}` *(corner bearingDepth min, binds from S1)* | 1 | 0 | 208.011 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"bearingDepth":50}}` *(corner bearingDepth max, binds from S1)* | 1 | 0 | 206.190 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"culetClearance":1.5}}` *(corner culetClearance max, binds from S1)* | 1 | 0 | 210.412 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.4,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8},"gemShape":"marquise"}` *(corner all max, binds from S1)* | 1 | 0 | 378.943 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | pass | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
