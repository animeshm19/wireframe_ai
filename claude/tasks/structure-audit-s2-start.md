# Structure audit: s2-start

Command: `node scripts/structure-audit.mjs --fast --tag s2-start --stage S1 --compare s1`

Commit `4d7afd2`, 2026-10-07T09:08:27.902Z, Node v24.9.0, stage **S1**, fast matrix, 34 designs, 0 crashed, 49s on 9 jobs.

Binding failures at S1: **0**. Regressions against `s1`: **0**.

Cells: pass, FAIL, – (not applicable), todo (no measurement yet). **Bold with !** = binding at this stage and not passing.

## Invariants

| ID | Rule | Pass | Fail | Todo | N/A |
|---|---|---|---|---|---|
| I1 | one solid, nothing dropped by the fuse | 34 | 0 | 0 | 0 |
| I2a | centre stone does not overlap metal (≤ 0.001 mm³) | 28 | 6 | 0 | 0 |
| I2b | no stone overlaps metal (≤ 0.001 mm³ each) | 26 | 8 | 0 | 0 |
| I2c | centre head's prongs and gallery do not overlap the centre stone (≤ 0.001 mm³ each) | 32 | 0 | 0 | 2 |
| I3a | culet clearance ≥ culetClearance (effective) − 0.01 | 34 | 0 | 0 | 0 |
| I3b | side stones' culet clearance ≥ culetClearance (effective) − 0.01 | 0 | 1 | 0 | 33 |
| I3c | halo and shank accents: culet not inside metal (≥ 0) | 0 | 4 | 0 | 30 |
| I11 | stones never intersect each other (≤ 0.001 mm³ per pair) | 33 | 1 | 0 | 0 |
| I4 | gallery clear of the stone, at galleryClearance, touching every prong | 2 | 30 | 0 | 2 |
| I5 | gallery at the rule-of-thirds height (±0.05), at least galleryThickness thick | 0 | 32 | 0 | 2 |
| I6 | every prong stands in the base (> 0.02 mm³) and not in the band | 0 | 32 | 0 | 2 |
| I7 | joint section ≥ JOINT_AREA_RATIO × summed prong sections | 30 | 2 | 0 | 2 |
| I8 | STL: every edge used twice, no zero-area triangle, one component | 33 | 1 | 0 | 0 |
| I9 | STEP is B-rep: metal written as MANIFOLD_SOLID_BREP, nothing triangulated, solids named | 34 | 0 | 0 | 0 |
| I9b | STEP: metal is exactly one MANIFOLD_SOLID_BREP, and the file holds every solid | 34 | 0 | 0 | 0 |
| I10a | every centre prong has a seat bearingDepth% of its diameter deep (±0.02), leaving the rest | 32 | 0 | 0 | 2 |
| I10b | every centre prong stands asCastProngHeight above the table (±0.05) | 32 | 0 | 0 | 2 |
| I10c | below girdle − d every centre prong keeps pavilionClearance (−0.02) from the stone | 32 | 0 | 0 | 2 |
| I13 | every customised bench value shows up in the geometry | 6 | 0 | 0 | 28 |

## Designs

| Design | Solids | Dropped | Metal mm³ | Centre ∩ metal | All stones ∩ metal | Culet mm | I1 | I2a | I2b | I2c | I3a | I3b | I3c | I11 | I4 | I5 | I6 | I7 | I8 | I9 | I9b | I10a | I10b | I10c | I13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `{}` | 1 | 0 | 198.704 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":3}` | 1 | 0 | 187.422 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":4}` | 1 | 0 | 191.219 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"prongCount":8}` | 1 | 0 | 206.456 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"oval"}` | 1 | 0 | 199.213 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | pass | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"pear"}` | 1 | 0 | 199.557 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise"}` | 1 | 0 | 205.768 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"cushion"}` | 1 | 0 | 197.290 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"emerald"}` | 1 | 0 | 199.687 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"princess"}` | 1 | 0 | 202.256 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise","prongCount":4}` | 1 | 0 | 197.255 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | pass | pass | pass | – |
| `{"gemSize":0.25}` | 1 | 0 | 187.842 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":3}` | 1 | 0 | 221.329 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":0.5,"ringSize":4}` | 1 | 0 | 175.732 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemSize":3,"ringSize":11}` | 1 | 0 | 260.128 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandWidth":1.6}` | 1 | 0 | 111.155 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandWidth":6}` | 1 | 0 | 747.489 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandProfile":"flat"}` | 1 | 0 | 247.105 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bandProfile":"knife"}` | 1 | 0 | 136.245 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"halo"}` | 1 | 0 | 223.203 | 1.532 | 3.827 | 0.300 | pass | FAIL | FAIL | pass | pass | – | FAIL | pass | pass | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"oval","setting":"halo"}` | 1 | 0 | 226.698 | 1.417 | 4.298 | 0.300 | pass | FAIL | FAIL | pass | pass | – | FAIL | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"gemShape":"marquise","setting":"halo"}` | 1 | 0 | 243.268 | 1.151 | 6.483 | 0.300 | pass | FAIL | FAIL | pass | pass | – | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"cathedral"}` | 1 | 0 | 207.234 | 0.055 | 0.055 | 0.300 | pass | FAIL | FAIL | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"three_stone"}` | 1 | 0 | 220.876 | 0.000 | 0.073 | 0.300 | pass | pass | FAIL | pass | pass | FAIL | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"setting":"bezel"}` | 1 | 0 | 215.449 | 3.478 | 3.478 | 0.300 | pass | FAIL | FAIL | – | pass | – | – | pass | – | – | – | – | pass | pass | pass | – | – | – | – |
| `{"gemShape":"emerald","setting":"bezel"}` | 1 | 0 | 211.197 | 7.798 | 7.798 | 0.300 | pass | FAIL | FAIL | – | pass | – | – | pass | – | – | – | – | pass | pass | pass | – | – | – | – |
| `{"shankStones":"pave"}` | 1 | 0 | 195.564 | 0.000 | 1.056 | 0.300 | pass | pass | FAIL | pass | pass | – | FAIL | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"shankStyle":"split"}` | 1 | 0 | 180.769 | 0.000 | 0.000 | 0.578 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | – |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3}}` *(corner all min, binds from S1)* | 1 | 0 | 191.982 | 0.000 | 0.000 | 0.100 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.4,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8}}` *(corner all max, binds from S1)* | 1 | 0 | 376.131 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"bearingDepth":20}}` *(corner bearingDepth min, binds from S1)* | 1 | 0 | 199.744 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"bearingDepth":50}}` *(corner bearingDepth max, binds from S1)* | 1 | 0 | 199.145 | 0.000 | 0.000 | 0.300 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"culetClearance":1.5}}` *(corner culetClearance max, binds from S1)* | 1 | 0 | 202.832 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass | pass |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.4,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8},"gemShape":"marquise"}` *(corner all max, binds from S1)* | 1 | 0 | 377.189 | 0.000 | 0.000 | 1.500 | pass | pass | pass | pass | pass | – | – | pass | FAIL | FAIL | FAIL | FAIL | pass | pass | pass | pass | pass | pass | pass |
