# Structure audit: baseline

Command: `node scripts/structure-audit.mjs --full --tag baseline --stage S0 --report-only`

Commit `bf79dc9`, 2026-10-06T16:53:44.779Z, Node v24.9.0, stage **S0**, full matrix, 237 designs, 0 crashed, 796s on 9 jobs.

Binding failures at S0: **0**.

Cells: pass, FAIL, – (not applicable), todo (no measurement yet). **Bold with !** = binding at this stage and not passing.

## Invariants

| ID | Rule | Pass | Fail | Todo | N/A |
|---|---|---|---|---|---|
| I1 | one solid, nothing dropped by the fuse | 166 | 71 | 0 | 0 |
| I2a | centre stone does not overlap metal (≤ 0.001 mm³) | 0 | 237 | 0 | 0 |
| I2b | no stone overlaps metal (≤ 0.001 mm³ each) | 0 | 237 | 0 | 0 |
| I3a | culet clearance ≥ culetClearance (effective) − 0.01 | 1 | 236 | 0 | 0 |
| I3b | side stones' culet clearance ≥ culetClearance (effective) − 0.01 | 0 | 23 | 0 | 214 |
| I3c | halo and shank accents: culet not inside metal (≥ 0) | 0 | 26 | 0 | 211 |
| I11 | stones never intersect each other (≤ 0.001 mm³ per pair) | 228 | 9 | 0 | 0 |
| I4 | gallery clear of the stone, at galleryClearance, touching every prong | 0 | 216 | 0 | 21 |
| I5 | gallery at the rule-of-thirds height (±0.05), at least galleryThickness thick | 0 | 216 | 0 | 21 |
| I6 | every prong stands in the base (> 0.02 mm³) and not in the band | 0 | 216 | 0 | 21 |
| I7 | joint section ≥ JOINT_AREA_RATIO × summed prong sections | 172 | 44 | 0 | 21 |
| I8 | STL: every edge used twice, no zero-area triangle, one component | 21 | 216 | 0 | 0 |
| I9 | STEP is B-rep: metal written as MANIFOLD_SOLID_BREP, nothing triangulated, solids named | 237 | 0 | 0 | 0 |
| I9b | STEP: metal is exactly one MANIFOLD_SOLID_BREP, and the file holds every solid | 198 | 39 | 0 | 0 |
| I10 | bearings and as-set prongs (measurements added by S1 and S4) | 0 | 0 | 237 | 0 |
| I13 | every customised bench value shows up in the geometry | 0 | 0 | 54 | 183 |

## Designs

| Design | Solids | Dropped | Metal mm³ | Centre ∩ metal | All stones ∩ metal | Culet mm | I1 | I2a | I2b | I3a | I3b | I3c | I11 | I4 | I5 | I6 | I7 | I8 | I9 | I9b | I10 | I13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `{"gemSize":0.25,"prongCount":3}` | 1 | 0 | 175.199 | 1.021 | 1.021 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"prongCount":3}` | 1 | 0 | 181.211 | 2.473 | 2.473 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3,"prongCount":3}` | 1 | 0 | 191.806 | 5.405 | 5.405 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":0.25,"prongCount":4}` | 1 | 0 | 176.072 | 1.271 | 1.271 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"prongCount":4}` | 1 | 0 | 183.275 | 3.086 | 3.086 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3,"prongCount":4}` | 1 | 0 | 195.796 | 6.723 | 6.723 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":0.25}` | 1 | 0 | 177.877 | 1.810 | 1.810 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{}` | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3}` | 1 | 0 | 204.780 | 9.231 | 9.231 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":0.25,"prongCount":8}` | 1 | 0 | 179.662 | 2.311 | 2.311 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"prongCount":8}` | 1 | 0 | 191.870 | 5.536 | 5.536 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3,"prongCount":8}` | 1 | 0 | 213.474 | 11.867 | 11.867 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":0.25,"prongCount":3}` | 1 | 0 | 175.995 | 0.825 | 0.825 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","prongCount":3}` | 1 | 1 | 177.581 | 1.786 | 1.786 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3,"prongCount":3}` | 1 | 1 | 184.374 | 3.625 | 3.625 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":0.25,"prongCount":4}` | 1 | 0 | 177.105 | 1.117 | 1.117 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","prongCount":4}` | 1 | 0 | 185.096 | 2.579 | 2.579 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3,"prongCount":4}` | 2 | 0 | 198.613 | 5.373 | 5.373 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"oval","gemSize":0.25}` | 1 | 0 | 178.923 | 1.590 | 1.590 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval"}` | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3}` | 1 | 1 | 198.344 | 7.198 | 7.198 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":0.25,"prongCount":8}` | 1 | 0 | 180.989 | 2.148 | 2.148 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","prongCount":8}` | 1 | 0 | 194.301 | 4.950 | 4.950 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3,"prongCount":8}` | 1 | 0 | 217.284 | 10.318 | 10.318 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":0.25,"prongCount":3}` | 1 | 0 | 175.993 | 0.875 | 0.875 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","prongCount":3}` | 1 | 0 | 182.844 | 1.968 | 1.968 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3,"prongCount":3}` | 1 | 1 | 184.475 | 3.960 | 3.960 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":0.25,"prongCount":4}` | 1 | 0 | 177.084 | 1.025 | 1.025 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","prongCount":4}` | 1 | 0 | 185.283 | 2.441 | 2.441 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3,"prongCount":4}` | 2 | 0 | 199.111 | 5.228 | 5.228 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"pear","gemSize":0.25}` | 1 | 0 | 178.938 | 1.687 | 1.687 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear"}` | 1 | 0 | 189.778 | 3.841 | 3.841 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3}` | 1 | 1 | 198.546 | 7.867 | 7.867 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":0.25,"prongCount":8}` | 1 | 0 | 180.996 | 2.247 | 2.247 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","prongCount":8}` | 1 | 0 | 194.387 | 5.260 | 5.260 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3,"prongCount":8}` | 1 | 0 | 217.566 | 11.058 | 11.058 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","gemSize":0.25,"prongCount":3}` | 2 | 0 | 177.446 | 1.166 | 1.166 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","prongCount":3}` | 2 | 0 | 185.850 | 2.606 | 2.606 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":3,"prongCount":3}` | 2 | 0 | 200.930 | 5.359 | 5.359 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":0.25,"prongCount":4}` | 1 | 0 | 179.002 | 1.164 | 1.164 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","prongCount":4}` | 2 | 0 | 189.053 | 2.793 | 2.793 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":3,"prongCount":4}` | 2 | 0 | 206.775 | 6.056 | 6.056 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":0.25}` | 2 | 0 | 180.938 | 2.290 | 2.290 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise"}` | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":3}` | 2 | 0 | 216.813 | 10.639 | 10.639 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":0.25,"prongCount":8}` | 1 | 0 | 183.514 | 2.449 | 2.449 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","prongCount":8}` | 2 | 0 | 199.394 | 5.649 | 5.649 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":3,"prongCount":8}` | 2 | 0 | 227.783 | 11.923 | 11.923 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"cushion","gemSize":0.25,"prongCount":3}` | 1 | 0 | 175.213 | 0.847 | 0.847 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","prongCount":3}` | 1 | 0 | 181.144 | 1.906 | 1.906 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3,"prongCount":3}` | 1 | 0 | 191.407 | 3.948 | 3.948 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":0.25,"prongCount":4}` | 1 | 0 | 175.981 | 1.176 | 1.176 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","prongCount":4}` | 1 | 0 | 183.000 | 2.655 | 2.655 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3,"prongCount":4}` | 1 | 0 | 195.152 | 5.474 | 5.474 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":0.25}` | 1 | 0 | 177.761 | 1.598 | 1.598 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion"}` | 1 | 0 | 187.227 | 3.629 | 3.629 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3}` | 1 | 0 | 203.587 | 7.503 | 7.503 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":0.25,"prongCount":8}` | 1 | 0 | 179.476 | 2.080 | 2.080 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","prongCount":8}` | 1 | 0 | 191.334 | 4.840 | 4.840 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3,"prongCount":8}` | 1 | 0 | 212.064 | 10.115 | 10.115 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25,"prongCount":3}` | 1 | 0 | 175.646 | 0.586 | 0.586 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","prongCount":3}` | 1 | 0 | 182.021 | 1.499 | 1.499 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":3,"prongCount":3}` | 1 | 0 | 192.762 | 3.337 | 3.337 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25,"prongCount":4}` | 1 | 0 | 176.499 | 0.481 | 0.481 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","prongCount":4}` | 1 | 0 | 183.957 | 1.217 | 1.217 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":3,"prongCount":4}` | 1 | 0 | 196.508 | 2.723 | 2.723 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25}` | 1 | 0 | 178.360 | 1.063 | 1.063 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald"}` | 1 | 0 | 188.444 | 2.630 | 2.630 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":3}` | 1 | 0 | 205.307 | 5.722 | 5.722 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25,"prongCount":8}` | 1 | 0 | 180.050 | 1.290 | 1.290 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","prongCount":8}` | 1 | 0 | 192.452 | 3.129 | 3.129 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":3,"prongCount":8}` | 1 | 0 | 213.671 | 6.738 | 6.738 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":0.25,"prongCount":3}` | 1 | 0 | 176.235 | 0.319 | 0.319 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","prongCount":3}` | 1 | 0 | 183.587 | 0.834 | 0.834 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":3,"prongCount":3}` | 1 | 0 | 196.471 | 1.946 | 1.946 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":0.25,"prongCount":4}` | 1 | 0 | 177.337 | 0.993 | 0.993 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","prongCount":4}` | 1 | 0 | 186.295 | 2.691 | 2.691 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":3,"prongCount":4}` | 1 | 0 | 202.170 | 6.247 | 6.247 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":0.25}` | 1 | 0 | 179.434 | 0.566 | 0.566 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess"}` | 1 | 0 | 191.223 | 1.453 | 1.453 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":3}` | 1 | 0 | 211.812 | 3.380 | 3.380 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":0.25,"prongCount":8}` | 1 | 0 | 181.566 | 0.994 | 0.994 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","prongCount":8}` | 1 | 0 | 196.316 | 2.691 | 2.691 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":3,"prongCount":8}` | 1 | 0 | 222.096 | 6.247 | 6.247 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":0.25,"setting":"halo"}` | 1 | 0 | 184.030 | 2.146 | 2.700 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"setting":"halo"}` | 1 | 0 | 212.434 | 5.746 | 7.917 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3,"setting":"halo"}` | 1 | 0 | 289.264 | 13.598 | 23.357 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":0.25,"setting":"halo"}` | 1 | 3 | 179.085 | 1.669 | 2.208 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","setting":"halo"}` | 1 | 1 | 211.105 | 4.937 | 7.675 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3,"setting":"halo"}` | 2 | 1 | 289.231 | 11.450 | 23.393 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"pear","gemSize":0.25,"setting":"halo"}` | 1 | 4 | 181.954 | 1.163 | 1.718 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","setting":"halo"}` | 1 | 4 | 208.986 | 3.920 | 6.754 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3,"setting":"halo"}` | 1 | 1 | 293.299 | 11.962 | 24.324 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","gemSize":0.25,"setting":"halo"}` | 1 | 0 | 184.746 | 2.538 | 3.282 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","setting":"halo"}` | 1 | 3 | 219.833 | 5.433 | 10.387 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","gemSize":3,"setting":"halo"}` | 2 | 4 | 311.590 | 10.599 | 31.435 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"cushion","gemSize":0.25,"setting":"halo"}` | 1 | 0 | 183.344 | 1.973 | 2.446 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","setting":"halo"}` | 1 | 0 | 210.242 | 5.205 | 7.223 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3,"setting":"halo"}` | 1 | 0 | 280.958 | 12.245 | 21.032 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25,"setting":"halo"}` | 1 | 0 | 183.436 | 1.490 | 1.938 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","setting":"halo"}` | 6 | 0 | 210.813 | 4.345 | 6.664 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"emerald","gemSize":3,"setting":"halo"}` | 8 | 0 | 284.435 | 10.862 | 20.913 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"princess","gemSize":0.25,"setting":"halo"}` | 5 | 0 | 185.909 | 1.045 | 1.707 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"princess","setting":"halo"}` | 8 | 0 | 221.343 | 3.438 | 6.841 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"princess","gemSize":3,"setting":"halo"}` | 11 | 0 | 318.898 | 9.456 | 23.591 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemSize":0.25,"setting":"cathedral"}` | 1 | 0 | 183.680 | 2.229 | 2.229 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"setting":"cathedral"}` | 1 | 0 | 196.121 | 4.927 | 4.927 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3,"setting":"cathedral"}` | 1 | 0 | 215.199 | 10.074 | 10.074 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":0.25,"setting":"cathedral"}` | 1 | 0 | 184.364 | 1.739 | 1.739 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","setting":"cathedral"}` | 1 | 1 | 193.262 | 3.713 | 3.713 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3,"setting":"cathedral"}` | 1 | 1 | 208.757 | 7.444 | 7.444 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":0.25,"setting":"cathedral"}` | 1 | 0 | 184.516 | 1.983 | 1.983 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","setting":"cathedral"}` | 1 | 2 | 184.271 | 3.841 | 3.841 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3,"setting":"cathedral"}` | 1 | 1 | 208.994 | 8.457 | 8.457 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","gemSize":0.25,"setting":"cathedral"}` | 2 | 2 | 180.938 | 2.290 | 2.290 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","setting":"cathedral"}` | 2 | 0 | 203.373 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":3,"setting":"cathedral"}` | 2 | 0 | 228.540 | 10.639 | 10.639 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"cushion","gemSize":0.25,"setting":"cathedral"}` | 1 | 0 | 183.196 | 2.060 | 2.060 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","setting":"cathedral"}` | 1 | 0 | 195.402 | 4.285 | 4.285 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3,"setting":"cathedral"}` | 1 | 0 | 213.739 | 8.382 | 8.382 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25,"setting":"cathedral"}` | 1 | 0 | 183.744 | 1.486 | 1.486 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","setting":"cathedral"}` | 1 | 0 | 196.563 | 3.089 | 3.089 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":3,"setting":"cathedral"}` | 1 | 0 | 215.349 | 6.221 | 6.221 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":0.25,"setting":"cathedral"}` | 1 | 0 | 185.826 | 0.972 | 0.972 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","setting":"cathedral"}` | 1 | 0 | 200.815 | 1.888 | 1.888 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":3,"setting":"cathedral"}` | 1 | 0 | 223.816 | 3.849 | 3.849 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":0.25,"setting":"three_stone"}` | 1 | 0 | 183.007 | 1.810 | 2.957 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"setting":"three_stone"}` | 1 | 0 | 198.792 | 4.310 | 6.742 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":3,"setting":"three_stone"}` | 1 | 0 | 224.246 | 9.568 | 16.225 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":0.25,"setting":"three_stone"}` | 1 | 0 | 183.953 | 1.590 | 2.717 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","setting":"three_stone"}` | 1 | 1 | 195.721 | 3.520 | 5.902 | -0.350 | FAIL | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3,"setting":"three_stone"}` | 1 | 1 | 218.139 | 7.198 | 11.985 | -0.350 | FAIL | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":0.25,"setting":"three_stone"}` | 1 | 0 | 184.065 | 1.687 | 2.833 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","setting":"three_stone"}` | 1 | 0 | 200.924 | 3.841 | 6.272 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3,"setting":"three_stone"}` | 1 | 1 | 218.123 | 7.923 | 13.054 | -0.350 | FAIL | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"marquise","gemSize":0.25,"setting":"three_stone"}` | 2 | 0 | 186.969 | 2.290 | 3.614 | -0.350 | FAIL | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","setting":"three_stone"}` | 2 | 2 | 205.048 | 5.160 | 7.969 | -0.350 | FAIL | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"marquise","gemSize":3,"setting":"three_stone"}` | 2 | 0 | 241.572 | 10.639 | 16.577 | -0.350 | FAIL | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | – |
| `{"gemShape":"cushion","gemSize":0.25,"setting":"three_stone"}` | 1 | 0 | 182.420 | 1.598 | 2.655 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","setting":"three_stone"}` | 1 | 0 | 197.384 | 3.629 | 5.830 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3,"setting":"three_stone"}` | 1 | 0 | 221.257 | 7.606 | 14.005 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25,"setting":"three_stone"}` | 1 | 0 | 182.904 | 1.063 | 2.100 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","setting":"three_stone"}` | 1 | 0 | 198.338 | 2.630 | 4.777 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":3,"setting":"three_stone"}` | 1 | 0 | 222.492 | 5.803 | 13.349 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":0.25,"setting":"three_stone"}` | 1 | 0 | 185.136 | 0.566 | 1.825 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","setting":"three_stone"}` | 1 | 0 | 203.652 | 1.453 | 4.178 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":3,"setting":"three_stone"}` | 1 | 0 | 234.931 | 4.015 | 14.564 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"gemSize":0.25,"setting":"bezel"}` | 1 | 0 | 183.622 | 2.524 | 2.524 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"setting":"bezel"}` | 1 | 0 | 213.260 | 3.532 | 3.532 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemSize":3,"setting":"bezel"}` | 1 | 0 | 275.281 | 2.807 | 2.807 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":0.25,"setting":"bezel"}` | 1 | 0 | 183.226 | 2.666 | 2.666 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"oval","setting":"bezel"}` | 1 | 0 | 211.960 | 4.876 | 4.876 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"oval","gemSize":3,"setting":"bezel"}` | 1 | 0 | 272.413 | 8.215 | 8.215 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":0.25,"setting":"bezel"}` | 1 | 0 | 183.372 | 2.508 | 2.508 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"pear","setting":"bezel"}` | 1 | 0 | 212.160 | 4.269 | 4.269 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"pear","gemSize":3,"setting":"bezel"}` | 1 | 0 | 272.680 | 6.631 | 6.631 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"marquise","gemSize":0.25,"setting":"bezel"}` | 1 | 0 | 186.016 | 1.659 | 1.659 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"marquise","setting":"bezel"}` | 1 | 0 | 219.959 | 3.229 | 3.229 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"marquise","gemSize":3,"setting":"bezel"}` | 1 | 0 | 290.538 | 5.774 | 5.774 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":0.25,"setting":"bezel"}` | 1 | 0 | 182.810 | 3.275 | 3.275 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"cushion","setting":"bezel"}` | 1 | 0 | 211.685 | 6.784 | 6.784 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"cushion","gemSize":3,"setting":"bezel"}` | 1 | 0 | 273.464 | 10.532 | 10.532 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":0.25,"setting":"bezel"}` | 1 | 0 | 182.008 | 3.347 | 3.347 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"emerald","setting":"bezel"}` | 1 | 0 | 208.991 | 7.913 | 7.913 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"emerald","gemSize":3,"setting":"bezel"}` | 1 | 0 | 266.498 | 15.416 | 15.416 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":0.25,"setting":"bezel"}` | 1 | 0 | 184.540 | 2.051 | 2.051 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"princess","setting":"bezel"}` | 1 | 0 | 214.183 | 2.653 | 2.653 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"gemShape":"princess","gemSize":3,"setting":"bezel"}` | 1 | 0 | 275.920 | 3.658 | 3.658 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | – | – | – | – | pass | pass | pass | todo | – |
| `{"bandWidth":1.4}` | 1 | 0 | 90.607 | 4.302 | 4.302 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandWidth":1.6}` | 1 | 0 | 100.874 | 4.305 | 4.305 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandWidth":6}` | 1 | 0 | 736.422 | 4.315 | 4.315 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandWidth":8}` | 1 | 0 | 976.300 | 4.317 | 4.317 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandProfile":"flat"}` | 1 | 0 | 236.004 | 4.318 | 4.318 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandProfile":"knife"}` | 1 | 0 | 124.947 | 4.276 | 4.276 | -0.220 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bandProfile":"round"}` | 1 | 0 | 189.371 | 4.313 | 4.313 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"shankStyle":"tapered"}` | 1 | 0 | 140.411 | 4.309 | 4.309 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"shankStyle":"split"}` | 1 | 0 | 169.990 | 4.256 | 4.256 | 0.425 | pass | FAIL | FAIL | pass | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"shankStyle":"twisted"}` | 1 | 0 | 188.766 | 4.317 | 4.317 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"shankStones":"pave"}` | 1 | 0 | 184.491 | 4.304 | 5.385 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"shankStones":"half_eternity"}` | 1 | 1 | 180.257 | 3.691 | 4.755 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | – |
| `{"shankStones":"eternity"}` | 1 | 0 | 176.654 | 4.267 | 6.787 | -0.012 | pass | FAIL | FAIL | FAIL | – | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"ringSize":3}` | 1 | 0 | 164.320 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"ringSize":16}` | 1 | 0 | 265.277 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | – |
| `{"bench":{"bearingDepth":20}}` *(corner bearingDepth min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"bearingDepth":50}}` *(corner bearingDepth max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"seatTolerance":0}}` *(corner seatTolerance min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"seatTolerance":0.2}}` *(corner seatTolerance max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"culetClearance":0.1}}` *(corner culetClearance min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"culetClearance":1.5}}` *(corner culetClearance max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"pavilionClearance":0.1}}` *(corner pavilionClearance min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"pavilionClearance":0.6}}` *(corner pavilionClearance max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"prongDiameter":0.8}}` *(corner prongDiameter min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"prongDiameter":2}}` *(corner prongDiameter max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":0.75}}` *(corner asCastProngHeight min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":5}}` *(corner asCastProngHeight max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryClearance":0.1}}` *(corner galleryClearance min, binds from S2)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryClearance":0.6}}` *(corner galleryClearance max, binds from S2)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryThickness":0.7}}` *(corner galleryThickness min, binds from S2)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryThickness":2}}` *(corner galleryThickness max, binds from S2)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"filletRadius":0.1}}` *(corner filletRadius min, binds from S3)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"filletRadius":0.8}}` *(corner filletRadius max, binds from S3)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"setTipHeight":0.3}}` *(corner setTipHeight min, binds from S4)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"setTipHeight":0.8}}` *(corner setTipHeight max, binds from S4)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"minBendRadius":0.5}}` *(corner minBendRadius min, binds from S4)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"minBendRadius":3}}` *(corner minBendRadius max, binds from S4)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"bearingDepth":20},"gemShape":"oval"}` *(corner bearingDepth min, binds from S1)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"bearingDepth":50},"gemShape":"oval"}` *(corner bearingDepth max, binds from S1)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"bearingDepth":20},"gemShape":"marquise"}` *(corner bearingDepth min, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"bearingDepth":50},"gemShape":"marquise"}` *(corner bearingDepth max, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"prongDiameter":0.8},"gemShape":"oval"}` *(corner prongDiameter min, binds from S1)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"prongDiameter":2},"gemShape":"oval"}` *(corner prongDiameter max, binds from S1)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | todo |
| `{"bench":{"prongDiameter":0.8},"gemShape":"marquise"}` *(corner prongDiameter min, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"prongDiameter":2},"gemShape":"marquise"}` *(corner prongDiameter max, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"asCastProngHeight":0.75},"gemShape":"oval"}` *(corner asCastProngHeight min, binds from S1)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":5},"gemShape":"oval"}` *(corner asCastProngHeight max, binds from S1)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":0.75},"gemShape":"marquise"}` *(corner asCastProngHeight min, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"asCastProngHeight":5},"gemShape":"marquise"}` *(corner asCastProngHeight max, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"galleryClearance":0.1},"gemShape":"oval"}` *(corner galleryClearance min, binds from S2)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryClearance":0.6},"gemShape":"oval"}` *(corner galleryClearance max, binds from S2)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryClearance":0.1},"gemShape":"marquise"}` *(corner galleryClearance min, binds from S2)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"galleryClearance":0.6},"gemShape":"marquise"}` *(corner galleryClearance max, binds from S2)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"galleryThickness":0.7},"gemShape":"oval"}` *(corner galleryThickness min, binds from S2)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryThickness":2},"gemShape":"oval"}` *(corner galleryThickness max, binds from S2)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"galleryThickness":0.7},"gemShape":"marquise"}` *(corner galleryThickness min, binds from S2)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"galleryThickness":2},"gemShape":"marquise"}` *(corner galleryThickness max, binds from S2)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"filletRadius":0.1},"gemShape":"oval"}` *(corner filletRadius min, binds from S3)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"filletRadius":0.8},"gemShape":"oval"}` *(corner filletRadius max, binds from S3)* | 1 | 1 | 184.759 | 3.520 | 3.520 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"filletRadius":0.1},"gemShape":"marquise"}` *(corner filletRadius min, binds from S3)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"filletRadius":0.8},"gemShape":"marquise"}` *(corner filletRadius max, binds from S3)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3}}` *(corner all min, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.6,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8}}` *(corner all max, binds from S1)* | 1 | 0 | 187.611 | 4.310 | 4.310 | -0.350 | pass | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3},"gemShape":"marquise"}` *(corner all min, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.6,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8},"gemShape":"marquise"}` *(corner all max, binds from S1)* | 2 | 0 | 193.767 | 5.160 | 5.160 | -0.350 | FAIL | FAIL | FAIL | FAIL | – | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | FAIL | todo | todo |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3},"setting":"halo"}` *(corner all min, binds from S1)* | 1 | 0 | 212.434 | 5.746 | 7.917 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.6,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8},"setting":"halo"}` *(corner all max, binds from S1)* | 1 | 0 | 212.434 | 5.746 | 7.917 | -0.350 | pass | FAIL | FAIL | FAIL | – | FAIL | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":0.75,"bearingDepth":20,"culetClearance":0.1,"filletRadius":0.1,"galleryClearance":0.1,"galleryThickness":0.7,"minBendRadius":0.5,"pavilionClearance":0.1,"prongDiameter":0.8,"seatTolerance":0,"setTipHeight":0.3},"setting":"three_stone"}` *(corner all min, binds from S1)* | 1 | 0 | 198.792 | 4.310 | 6.742 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | pass | FAIL | pass | pass | todo | todo |
| `{"bench":{"asCastProngHeight":5,"bearingDepth":50,"culetClearance":1.5,"filletRadius":0.8,"galleryClearance":0.6,"galleryThickness":2,"minBendRadius":3,"pavilionClearance":0.6,"prongDiameter":2,"seatTolerance":0.2,"setTipHeight":0.8},"setting":"three_stone"}` *(corner all max, binds from S1)* | 1 | 0 | 198.792 | 4.310 | 6.742 | -0.350 | pass | FAIL | FAIL | FAIL | FAIL | – | pass | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | todo | todo |

## Measurement errors

Booleans or queries that failed or returned impossible answers; the measurement is recorded as NaN and fails its invariant.

- `{"shankStones":"eternity"}`: metal ∩ stone 12: intersection 0.35960725803282667 exceeds the smaller input 0.35920748244660633 and 0.05219043539856797 of it lies outside
