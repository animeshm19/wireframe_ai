import * as THREE from "three";
import {
  brilliantTopology,
  gemDims,
  gemOutline,
  radiusAtAngle,
  type GemCut,
  type Pt,
} from "./cad-engine";

/**
 * Creates an exact, GIA-proportioned 3D gemstone geometry for any cut.
 *
 * - Brilliant cuts (Round, Oval, Marquise, Cushion, Pear) use the mathematical 57-facet
 *   facet topology from `brilliantTopology()`.
 * - Step cuts (Emerald, Princess) use concentric planar step lofts with flat rectangular
 *   tables, step crown facets, step pavilion facets, and culet keels.
 *
 * All geometries are non-indexed with hard facet normals to produce realistic
 * diamond facet contrast, refraction, and optical fire.
 *
 * Orientation in Three.js coordinate system:
 * - Table top at +Y
 * - Culet at origin (Y = 0)
 * - Finger axis along Z
 * - Cross-finger axis along X
 */
export function createAccurateGemGeometry(
  cut: GemCut,
  girdleR: number
): THREE.BufferGeometry {
  if (cut === "emerald" || cut === "princess") {
    return createStepCutGeometry(cut, girdleR);
  }
  return createFacetedBrilliantGeometry(cut, girdleR);
}

/**
 * Builds modified brilliants (Round, Oval, Marquise, Cushion, Pear) using
 * `brilliantTopology` with 57 planar facets.
 */
function createFacetedBrilliantGeometry(
  cut: GemCut,
  girdleR: number
): THREE.BufferGeometry {
  const { points, faces } = brilliantTopology(cut, girdleR);
  const pos: number[] = [];

  const tri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    // Map cad-engine coordinates [x, y, z] to Three.js:
    // cad-engine: Z is up (culet to table), X is cross, Y is along finger
    // Three.js: Y is up (culet to table), X is cross, Z is along finger
    pos.push(a[0], a[2], a[1]);
    pos.push(b[0], b[2], b[1]);
    pos.push(c[0], c[2], c[1]);
  };

  for (const f of faces) {
    if (f.length === 3) {
      tri(points[f[0]], points[f[1]], points[f[2]]);
    } else {
      // Fan triangulation for quad / polygon facets (table, kites, girdle bands)
      for (let i = 1; i < f.length - 1; i++) {
        tri(points[f[0]], points[f[i]], points[f[i + 1]]);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Builds step-cut gemstones (Emerald cut with cut corners, Princess cut with sharp corners).
 */
function createStepCutGeometry(
  cut: GemCut,
  girdleR: number
): THREE.BufferGeometry {
  const o: Pt[] = gemOutline(cut);
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const zG = pavH;
  const zGt = pavH + girdleH;
  const zTable = pavH + girdleH + crownH;

  // Step scales and heights
  // Pavilion steps: culet up to girdle
  const pavSteps = [
    { z: 0.05 * pavH, s: 0.12 },
    { z: 0.35 * pavH, s: 0.40 },
    { z: 0.68 * pavH, s: 0.72 },
    { z: zG, s: 1.0 },
  ];

  // Girdle band
  const girdleTop = { z: zGt, s: 1.0 };

  // Crown steps: girdle up to table
  const crownSteps = [
    girdleTop,
    { z: zGt + crownH * 0.35, s: 0.86 },
    { z: zGt + crownH * 0.70, s: 0.72 },
    { z: zTable, s: 0.58 }, // Table
  ];

  const allLevels = [
    { z: 0, s: 0.02 }, // Culet point
    ...pavSteps,
    ...crownSteps,
  ];

  const pos: number[] = [];

  const to3D = (p: Pt, scale: number, z: number): [number, number, number] => {
    // [x, Y-up, z-finger]
    return [p[0] * girdleR * scale, z, p[1] * girdleR * scale];
  };

  // Culet cap to first level
  const culetPt: [number, number, number] = [0, 0, 0];
  const firstRing = o.map((p) => to3D(p, pavSteps[0].s, pavSteps[0].z));
  for (let i = 0; i < firstRing.length; i++) {
    const next = (i + 1) % firstRing.length;
    pos.push(...culetPt, ...firstRing[next], ...firstRing[i]);
  }

  // Loft adjacent rings with flat rectangular/trapezoid step facets
  for (let l = 1; l < allLevels.length - 1; l++) {
    const curr = allLevels[l];
    const nxt = allLevels[l + 1];
    const ringA = o.map((p) => to3D(p, curr.s, curr.z));
    const ringB = o.map((p) => to3D(p, nxt.s, nxt.z));

    for (let i = 0; i < o.length; i++) {
      const next = (i + 1) % o.length;
      // Two triangles per quad step facet
      pos.push(...ringA[i], ...ringA[next], ...ringB[next]);
      pos.push(...ringA[i], ...ringB[next], ...ringB[i]);
    }
  }

  // Table facet (flat top polygon fanned out)
  const topLevel = crownSteps[crownSteps.length - 1];
  const tableRing = o.map((p) => to3D(p, topLevel.s, topLevel.z));
  const tableCenter: [number, number, number] = [0, topLevel.z, 0];
  for (let i = 0; i < tableRing.length; i++) {
    const next = (i + 1) % tableRing.length;
    pos.push(...tableCenter, ...tableRing[i], ...tableRing[next]);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Calculates optimal prong anchor points on the diamond girdle perimeter
 * for each specific cut so prongs sit firmly on corners, tips, or cardinal axes.
 */
export function getProngAnglesForCut(cut: GemCut, count: number): number[] {
  switch (cut) {
    case "princess":
      // 4 prongs placed exactly on the 4 corners (45°, 135°, 225°, 315°)
      return [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

    case "emerald":
      // 4 prongs placed on the 4 clipped corners of the emerald cut
      // Outline has corners around 38°, 142°, 218°, 322°
      return [0.68, Math.PI - 0.68, Math.PI + 0.68, -0.68];

    case "marquise":
      if (count === 4) {
        // 4 prongs on the bulging belly
        return [0.85, Math.PI - 0.85, Math.PI + 0.85, -0.85];
      }
      // 6 prongs: 2 on the northern/southern sharp tips, 4 on the belly
      return [
        Math.PI / 2, // North tip
        -Math.PI / 2, // South tip
        0.55,
        Math.PI - 0.55,
        Math.PI + 0.55,
        -0.55,
      ];

    case "oval":
    case "cushion":
    case "round":
    default:
      if (count === 4) {
        return [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
      }
      // 6 prongs: classic 60-degree distribution
      return [
        Math.PI / 6,
        Math.PI / 2,
        (5 * Math.PI) / 6,
        (7 * Math.PI) / 6,
        (3 * Math.PI) / 2,
        (11 * Math.PI) / 6,
      ];
  }
}
