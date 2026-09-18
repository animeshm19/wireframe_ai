import * as THREE from "three";

/**
 * A round brilliant, as three.js geometry.
 *
 * The CAD engine already builds one of these as a JSCAD polyhedron, but that
 * path needs the kernel, a worker and a mesh conversion — far too much to boot
 * for a landing page. This is the same cut and the same GIA proportions,
 * emitted straight as a BufferGeometry.
 *
 * It matters because a brilliant's entire life comes from discrete planar
 * facets bouncing light at each other. A smooth revolved cone has no facets, so
 * it has nothing to bounce — which is why a lofted "diamond" always reads as a
 * glass pebble no matter how good the material on it is.
 *
 * 57 facets, in the arrangement a cutter actually uses:
 *
 *   crown      1 table + 8 star + 8 bezel kites + 16 upper girdle  = 33
 *   pavilion   8 mains + 16 lower girdle                           = 24
 *   girdle     16 band facets (not counted in the 57, as is standard)
 *
 * Proportions, as percentages of girdle diameter, are the GIA reference cut:
 * table 57%, crown 14.5%, girdle 3%, pavilion 43%, star length 55%, lower-half
 * length 77%.
 *
 * The geometry is emitted non-indexed so no two facets share a vertex. That is
 * the point: shared vertices would average the normals across a facet edge and
 * round it off, and a round brilliant with rounded edges is a glass pebble
 * again. computeVertexNormals() on non-indexed geometry gives every triangle
 * its own face normal, which is exactly what a faceted stone needs.
 */

export type BrilliantOptions = {
  /** Girdle radius in scene units. Everything else is proportional to it. */
  girdleRadius?: number;
  /** Girdle/table ratio of a fancy shape: 1 is round. */
  lengthToWidth?: number;
};

export function createBrilliantGeometry({
  girdleRadius = 1,
  lengthToWidth = 1,
}: BrilliantOptions = {}): THREE.BufferGeometry {
  // Percentages of girdle DIAMETER, so each is doubled against a unit radius.
  const TABLE = 0.57;
  const CROWN = 0.145 * 2;
  const GIRDLE = 0.03 * 2;
  const PAVILION = 0.43 * 2;
  const STAR = 0.55;
  const LOWER = 0.77;

  const yGirdleBottom = 0;
  const yGirdleTop = GIRDLE;
  const yTable = yGirdleTop + CROWN;
  const yCulet = -PAVILION;

  // Fancy shapes are cut with this same facet arrangement on a stretched
  // girdle, so the shape is a radius function rather than a different solid.
  const radiusAt = (angle: number, r: number) => {
    // The stretch goes on z, the finger axis, because that is how an oval or a
    // marquise is set — long axis down the finger, not across it.
    if (lengthToWidth === 1) return [Math.cos(angle) * r, Math.sin(angle) * r];
    return [Math.cos(angle) * r, Math.sin(angle) * r * lengthToWidth];
  };

  const v = (angle: number, r: number, y: number): THREE.Vector3 => {
    const [x, z] = radiusAt(angle, r * girdleRadius);
    return new THREE.Vector3(x, y * girdleRadius, z);
  };

  const STEP = Math.PI / 8; // 16 girdle points, 22.5 degrees apart

  // Girdle: 16 points top and bottom. Even indices are the "mains", where a
  // bezel kite above and a pavilion main below both come to a point.
  const gTop: THREE.Vector3[] = [];
  const gBot: THREE.Vector3[] = [];
  for (let k = 0; k < 16; k++) {
    gTop.push(v(k * STEP, 1, yGirdleTop));
    gBot.push(v(k * STEP, 1, yGirdleBottom));
  }

  // Table octagon, aligned with the girdle mains.
  const table: THREE.Vector3[] = [];
  for (let j = 0; j < 8; j++) table.push(v(j * 2 * STEP, TABLE, yTable));

  // Star points: partway down the crown, above the odd girdle points.
  const starR = TABLE + STAR * (1 - TABLE);
  const starY = yTable - STAR * (yTable - yGirdleTop);
  const star: THREE.Vector3[] = [];
  for (let j = 0; j < 8; j++) star.push(v((2 * j + 1) * STEP, starR, starY));

  // Lower-girdle junctions: partway down the pavilion, below the odd points.
  const lowR = 1 - LOWER;
  const lowY = yGirdleBottom - LOWER * (yGirdleBottom - yCulet);
  const low: THREE.Vector3[] = [];
  for (let j = 0; j < 8; j++) low.push(v((2 * j + 1) * STEP, lowR, lowY));

  const culet = new THREE.Vector3(0, yCulet * girdleRadius, 0);

  // ---------------------------------------------------------------- faces --

  const pos: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const quad = (
    a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3
  ) => {
    tri(a, b, c);
    tri(a, c, d);
  };

  const at = <T,>(arr: T[], i: number) => arr[((i % arr.length) + arr.length) % arr.length];

  // Table — one planar octagon, fanned. Wound so its normal points up.
  for (let j = 1; j < 7; j++) tri(table[0], table[j + 1], table[j]);

  for (let j = 0; j < 8; j++) {
    // Star facet: between two table corners, apex down at the star point.
    tri(table[j], at(table, j + 1), star[j]);

    // Bezel kite: table corner at the top, the girdle main directly below it at
    // the bottom, and the two neighbouring star points as its shoulders.
    quad(table[j], at(star, j - 1), gTop[2 * j], star[j]);

    // Upper girdle: two per star point, filling down to the girdle scallops.
    tri(star[j], gTop[2 * j], at(gTop, 2 * j + 1));
    tri(star[j], at(gTop, 2 * j + 1), at(gTop, 2 * j + 2));

    // Girdle band.
    quad(at(gTop, 2 * j), at(gBot, 2 * j), at(gBot, 2 * j + 1), at(gTop, 2 * j + 1));
    quad(at(gTop, 2 * j + 1), at(gBot, 2 * j + 1), at(gBot, 2 * j + 2), at(gTop, 2 * j + 2));

    // Pavilion main: a kite from the girdle main down to the culet.
    quad(gBot[2 * j], at(low, j - 1), culet, low[j]);

    // Lower girdle: two per junction.
    tri(gBot[2 * j], low[j], at(gBot, 2 * j + 1));
    tri(at(gBot, 2 * j + 1), low[j], at(gBot, 2 * j + 2));
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  // Non-indexed: every triangle gets its own face normal, so every facet edge
  // stays a hard edge.
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

/** Height of the finished stone, girdle radius 1. Table top to culet. */
export const BRILLIANT_HEIGHT = 0.145 * 2 + 0.03 * 2 + 0.43 * 2;
/** Distance from the girdle plane down to the culet. */
export const BRILLIANT_PAVILION = 0.43 * 2;
/** Distance from the girdle plane up to the table. */
export const BRILLIANT_CROWN = 0.145 * 2 + 0.03 * 2;
