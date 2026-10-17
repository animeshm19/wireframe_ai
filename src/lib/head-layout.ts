/**
 * Where everything in a prong head goes, as pure maths.
 *
 * No kernel, no replicad. The engine builds from these numbers, the structure
 * audit measures against them, and later prompts (the gallery, the base, the
 * as-set prongs) extend them, so there is one answer to "where is prong 3's
 * seat" rather than one per file. Every dimension a bench setting covers
 * arrives here already resolved (setting-standards.ts, resolveBench); nothing
 * in this file reads a default.
 *
 * Frame: the stone's own. Culet at the origin, +Z up the stone's axis, table
 * at zT. Distances in mm.
 *
 * Prong directions are unchanged from the first engine: (i / n) of a turn,
 * plus an eighth for a princess so its prongs land on the corners. V-prongs
 * on the points of a marquise, pear or princess are what a bench would
 * actually fit there; that is a known future improvement and not part of the
 * ring-structure series.
 */
import {
  brilliantTopology, gemDims, gemOutline, TABLE_SCALE, type GemCut, type V3,
} from "./cad-engine";
import { benchBounds, FIXED_STANDARDS, type BenchKey, type BenchValues } from "./setting-standards";

/** minBendRadius's own lower bound: the tightest bend the layout may fall back to. */
const BEND_MIN = benchBounds("minBendRadius", "platinum").min;

export type V2 = [number, number];
/** One section of a stone or envelope: the girdle outline scaled by `s`, at height `z`. */
export type Station = { z: number; s: number };

// ----------------------------------------------------------------- stone --

/**
 * The step cut's sections, culet to table. Moved here unchanged from the
 * B-rep stone builder, which now reads them from here: the seat that holds a
 * step cut has to be built from the same sections as the stone, and two
 * copies of a list of numbers drift.
 */
export function stepCutStations(girdleR: number): Station[] {
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const zG = pavH, zGt = pavH + girdleH;
  const steps: Station[] = [{ z: 0, s: 0.10 }];
  const PAV = [0.10, 0.34, 0.63, 0.85];
  PAV.forEach((s, k) => steps.push({ z: (zG * (k + 1)) / (PAV.length + 1), s }));
  steps.push({ z: zG, s: 1 }, { z: zGt, s: 1 });
  [0.86, 0.71].forEach((s, k) => steps.push({ z: zGt + (crownH * (k + 1)) / 3, s }));
  steps.push({ z: zGt + crownH, s: 0.57 });
  return steps;
}

export const isStepCut = (cut: GemCut) => cut === "emerald" || cut === "princess";

export type StoneProfile = {
  cut: GemCut;
  girdleR: number;
  pavH: number; girdleH: number; crownH: number;
  /** Girdle bottom, girdle top and table heights above the culet. */
  zGb: number; zGt: number; zT: number;
  tableScale: number;
  /**
   * The stone's real girdle, as a convex polygon, counter-clockwise, in mm.
   * For a brilliant that is the sixteen girdle vertices the stone is built
   * from, not the smooth outline they were sampled from: between two of them
   * the girdle is a flat facet, up to 0.06 mm inside the outline at 1 ct, and
   * a seat measured from the outline would be that much deeper than asked.
   */
  girdle: V2[];
  /**
   * The seat envelope's sections: the smallest concave scale profile that
   * every vertex of the stone sits under (the upper hull of each vertex's
   * height and scale). Scaled copies of a convex polygon stacked on a concave
   * profile make a convex solid, so a stone whose vertices are all inside it
   * is wholly inside it. Without this a brilliant pokes out: its pavilion's
   * lower-girdle junctions stand 8% proud of the plain cone from culet to
   * girdle.
   */
  hull: Station[];
  /**
   * A step cut's own sections, culet to table: the girdle polygon scaled by
   * s at height z, flat facets between. Its pavilion bends inward between
   * stations (the profile is not concave), so the hull above stands up to
   * 0.6 mm outside it at mid-pavilion (princess 3 ct); a gallery set off the
   * hull sat that much too far from the stone (S2 review). Null for a
   * brilliant, whose hull is its pavilion.
   */
  stations: Station[] | null;
};

/** Smallest section the envelope is given, so its bottom face is not a point. */
const MIN_SCALE = 0.02;

export function stoneProfile(cut: GemCut, girdleR: number): StoneProfile {
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const zGb = pavH, zGt = pavH + girdleH, zT = zGt + crownH;

  let girdle: V2[];
  let points: V3[];
  if (isStepCut(cut)) {
    girdle = gemOutline(cut).map(([x, y]) => [x * girdleR, y * girdleR] as V2);
    points = stepCutStations(girdleR).flatMap(({ z, s }) =>
      girdle.map(([x, y]) => [x * s, y * s, z] as V3));
  } else {
    points = brilliantTopology(cut, girdleR).points;
    // Built from the same gemDims call, so equality is exact.
    girdle = points.filter((p) => p[2] === zGb).map((p) => [p[0], p[1]] as V2);
    girdle.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
  }
  if (signedArea(girdle) < 0) girdle.reverse();

  const scaled = points.map((p) => {
    const r = Math.hypot(p[0], p[1]);
    return { z: p[2], s: r < 1e-12 ? 0 : r / radialHit(girdle, Math.atan2(p[1], p[0])).r };
  });
  const hull = upperHull(scaled).map((st) => ({ z: st.z, s: Math.max(MIN_SCALE, st.s) }));

  return {
    cut, girdleR, pavH, girdleH, crownH, zGb, zGt, zT,
    tableScale: TABLE_SCALE, girdle, hull,
    stations: isStepCut(cut) ? stepCutStations(girdleR) : null,
  };
}

function signedArea(poly: V2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** The smallest concave piecewise-linear function over every (z, s), as its corners. */
function upperHull(pts: Station[]): Station[] {
  const byZ = new Map<number, number>();
  for (const p of pts) byZ.set(p.z, Math.max(byZ.get(p.z) ?? -Infinity, p.s));
  const sorted = [...byZ].map(([z, s]) => ({ z, s })).sort((a, b) => a.z - b.z);
  const out: Station[] = [];
  for (const p of sorted) {
    while (out.length >= 2) {
      const a = out[out.length - 2], b = out[out.length - 1];
      // Pop b unless a -> b -> p turns clockwise (keeps the chain concave).
      if ((b.z - a.z) * (p.s - a.s) - (b.s - a.s) * (p.z - a.z) >= 0) out.pop();
      else break;
    }
    out.push(p);
  }
  return out;
}

/**
 * Where a ray from the origin at `angle` leaves a polygon: its distance, the
 * edge it crosses, and how far along that edge (0 at its first vertex).
 */
export function radialHit(poly: V2[], angle: number): { r: number; edge: number; w: number } {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  let best = { r: Infinity, edge: -1, w: 0 };
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const ex = bx - ax, ey = by - ay;
    const den = ux * ey - uy * ex;
    if (Math.abs(den) < 1e-15) continue;
    const t = (ax * ey - ay * ex) / den;          // along the ray
    const w = (ax * uy - ay * ux) / den;          // along the edge
    if (t > 0 && w >= -1e-12 && w <= 1 + 1e-12 && t < best.r) best = { r: t, edge: i, w };
  }
  if (best.edge < 0) throw new Error(`no girdle edge at ${angle} rad`);
  return best;
}

const edgeNormal = (poly: V2[], i: number): V2 => {
  const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
  const L = Math.hypot(bx - ax, by - ay);
  return [(by - ay) / L, -(bx - ax) / L];      // outward for counter-clockwise
};

/** The envelope's scale at height z, 0 outside it. */
export function scaleAt(stations: Station[], z: number): number {
  if (z < stations[0].z || z > stations[stations.length - 1].z) return 0;
  for (let k = 0; k < stations.length - 1; k++) {
    const a = stations[k], b = stations[k + 1];
    if (z <= b.z) return b.z === a.z ? Math.max(a.s, b.s) : a.s + ((b.s - a.s) * (z - a.z)) / (b.z - a.z);
  }
  return stations[stations.length - 1].s;
}

// --------------------------------------------------------- seat envelope --

/**
 * The seat envelope's scale profile: the hull's, grown by `tol` up and down as
 * well as sideways, so there is room under the culet and over the table too,
 * not only round the girdle. The pavilion's sections move down by tol, the
 * crown's up by tol, and the girdle's upright band widens by tol each way:
 * that is the hull swept along a vertical segment of ±tol, which is convex
 * again, so it still contains the stone.
 */
export function envelopeStations(stone: StoneProfile, tol: number): Station[] {
  return stone.hull.map(({ z, s }) => ({
    z: z <= stone.zGb ? z - tol : z >= stone.zGt ? z + tol : z,
    s,
  }));
}

/**
 * Largest factor by which a rounded corner of the envelope is drawn outside
 * its true arc: each corner is turned in straight runs of at most 22.5°, each
 * touching the arc at its middle, so they sit at most 1/cos(11.25°) of the
 * tolerance out. Outside, never inside, so containment survives.
 */
export const CORNER_FACTOR = 1 / Math.cos(Math.PI / 16);

/**
 * The seat envelope's sections as closed rings, one per hull station: the
 * girdle polygon at that station's scale, offset outward by `tol` with each
 * corner rounded in short straight runs.
 *
 * Straight runs rather than true arcs, because they make every face of the
 * envelope flat. The seat is cut out of every prong on every rebuild, and
 * OCCT cuts flat faces several times faster than the ruled patches a lofted
 * arc gives (measured in S1: 125 ms a prong against a lofted envelope, 8 ms
 * against a flat one clipped to the prong). Each run is parallel at every
 * station, so the faces between stations are exactly planar.
 */
export function envelopeRings(stone: StoneProfile, tol: number): V3[][] {
  const P = stone.girdle, m = P.length;
  const normals = P.map((_, i) => edgeNormal(P, i));
  return envelopeStations(stone, tol).map(({ z, s }) => {
    const ring: V3[] = [];
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      const v: V2 = [P[j][0] * s, P[j][1] * s];
      const n0 = normals[i], n1 = normals[j];
      if (tol <= 1e-9) { ring.push([v[0], v[1], z]); continue; }
      // Only the corners of the runs: the arc's tangent points lie on the
      // straight edges either side, and a point in the middle of a straight
      // edge would give two coplanar faces where one belongs.
      const a0 = Math.atan2(n0[1], n0[0]);
      let turn = Math.atan2(n1[1], n1[0]) - a0;
      while (turn < 0) turn += Math.PI * 2;
      const k = Math.max(1, Math.ceil(turn / (Math.PI / 8) - 1e-9));
      const R = tol / Math.cos(turn / (2 * k));
      for (let q = 0; q < k; q++) {
        const a = a0 + (turn * (q + 0.5)) / k;
        ring.push([v[0] + Math.cos(a) * R, v[1] + Math.sin(a) * R, z]);
      }
    }
    return ring;
  });
}

/** The envelope as flat faces: a cap at each end and a quad per run per station gap. */
export function envelopeFaces(stone: StoneProfile, tol: number): V3[][] {
  const rings = envelopeRings(stone, tol);
  const faces: V3[][] = [[...rings[0]].reverse(), rings[rings.length - 1]];
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1], n = A.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const quad = [A[i], A[j], B[j], B[i]];
      if (polygonArea(quad) > 1e-12) faces.push(quad);
    }
  }
  return faces.map((f) => orientOutward(f, [0, 0, (stone.zGb + stone.zGt) / 2]));
}

/** The half spaces bounding a convex solid given by its faces. */
export function facePlanes(faces: V3[][]): HalfSpace[] {
  const out: HalfSpace[] = [];
  for (const f of faces) {
    const n = unitV(newell(f));
    const h = dot(n, f[0]);
    // One plane once: clipping twice by the same plane would add the same
    // face twice, and a solid with two coincident faces is not a solid.
    if (!out.some((p) => Math.abs(p.h - h) < 1e-9 && dot(p.n, n) > 1 - 1e-12)) out.push({ n, h });
  }
  return out;
}

/**
 * A box as six outward faces, its sides along u and w (unit, at right angles,
 * in plan) and up the axis: lo and hi are its corners in those coordinates.
 */
export function orientedBoxFaces(u: V2, lo: V3, hi: V3): V3[][] {
  const w: V2 = [-u[1], u[0]];
  const at = (a: number, b: number, z: number): V3 => [u[0] * a + w[0] * b, u[1] * a + w[1] * b, z];
  const c: V3[] = [at(lo[0], lo[1], lo[2]), at(hi[0], lo[1], lo[2]), at(hi[0], hi[1], lo[2]), at(lo[0], hi[1], lo[2]),
    at(lo[0], lo[1], hi[2]), at(hi[0], lo[1], hi[2]), at(hi[0], hi[1], hi[2]), at(lo[0], hi[1], hi[2])];
  const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return faces.map((f) => f.map((i) => c[i]));
}

/** An axis-aligned box as six outward faces. */
export function boxFaces(lo: V3, hi: V3): V3[][] {
  const [x0, y0, z0] = lo, [x1, y1, z1] = hi;
  const c: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return faces.map((f) => f.map((i) => c[i]));
}

/**
 * A convex solid (as outward faces) cut down by half spaces n·x ≤ h, as
 * outward faces again. Sutherland–Hodgman on every face, and the points where
 * the plane crossed become the new face that closes the cut.
 */
export function clipConvex(faces: V3[][], planes: HalfSpace[]): V3[][] {
  const EPS = 1e-10;
  let out = faces;
  for (const pl of planes) {
    // A plane the whole solid is already inside cuts nothing: skip it, which
    // is most of the envelope's planes for a box round one post.
    if (out.every((f) => f.every((P) => dot(pl.n, P) - pl.h <= EPS))) continue;
    const next: V3[][] = [];
    const onPlane: V3[] = [];
    let capped = false;
    for (const f of out) {
      // A face already on this plane is the cap; keep it as it is.
      if (f.every((P) => Math.abs(dot(pl.n, P) - pl.h) <= EPS)) { next.push(f); capped = true; continue; }
      const res: V3[] = [];
      for (let i = 0; i < f.length; i++) {
        const P = f[i], Q = f[(i + 1) % f.length];
        const dp = dot(pl.n, P) - pl.h, dq = dot(pl.n, Q) - pl.h;
        if (dp <= EPS) res.push(P);
        if (Math.abs(dp) <= EPS) onPlane.push(P);
        if ((dp < -EPS && dq > EPS) || (dp > EPS && dq < -EPS)) {
          const X = lerp(P, Q, dp / (dp - dq));
          res.push(X);
          onPlane.push(X);
        }
      }
      const clean = dedupe(res);
      if (clean.length >= 3 && polygonArea(clean) > 1e-12) next.push(clean);
    }
    const cap = dedupe(onPlane);
    if (!capped && cap.length >= 3) {
      const ordered = orderOnPlane(cap, pl.n);
      if (polygonArea(ordered) > 1e-12) next.push(ordered);
    }
    out = next;
    if (!out.length) break;
  }
  // A point part-way along an edge of the solid sits on two faces and is a
  // corner of neither; left in one face and not its neighbour it is a
  // T-junction, the sewn shell does not close, and OCCT then cuts with a solid
  // that is not one (seen: a prong split in three with nothing removed). On a
  // convex solid such a point is collinear in both faces, so dropping every
  // collinear point drops it consistently.
  return out.map(dropCollinear).filter((f) => f.length >= 3);
}

function dropCollinear(f: V3[]): V3[] {
  let pts = f;
  for (let changed = true; changed && pts.length > 3;) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const ab = sub(b, a), bc = sub(c, b);
      const scaleLen = Math.hypot(...ab) * Math.hypot(...bc);
      if (Math.hypot(...cross(ab, bc)) <= 1e-9 * Math.max(scaleLen, 1e-30)) {
        pts = pts.filter((_, k) => k !== i);
        changed = true;
        break;
      }
    }
  }
  return pts;
}

function newell(f: V3[]): V3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < f.length; i++) {
    const a = f[i], b = f[(i + 1) % f.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}
const polygonArea = (f: V3[]) => Math.hypot(...newell(f)) / 2;

function orientOutward(f: V3[], inside: V3): V3[] {
  const c = f.reduce((t, p) => add(t, scale(p, 1 / f.length)), [0, 0, 0] as V3);
  return dot(newell(f), sub(c, inside)) < 0 ? [...f].reverse() : f;
}

function dedupe(pts: V3[]): V3[] {
  const out: V3[] = [];
  for (const p of pts) {
    if (!out.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-9)) out.push(p);
  }
  return out;
}

/** Points on one plane, ordered round their centroid so their normal is n. */
function orderOnPlane(pts: V3[], n: V3): V3[] {
  const c = pts.reduce((t, p) => add(t, scale(p, 1 / pts.length)), [0, 0, 0] as V3);
  const a = Math.abs(n[2]) < 0.9 ? [0, 0, 1] as V3 : [1, 0, 0] as V3;
  const u = unitV(cross(n, a)), w = cross(n, u);
  return [...pts].sort((p, q) => {
    const dp = sub(p, c), dq = sub(q, c);
    return Math.atan2(dot(dp, w), dot(dp, u)) - Math.atan2(dot(dq, w), dot(dq, u));
  });
}

/**
 * Whether a closed polygon turns the same way at every corner (collinear
 * corners allowed). The gallery is the girdle's outline set outward side by
 * side, which only keeps its shape on a convex outline: on a re-entrant
 * corner the offset sides would cross.
 */
export function isConvex(poly: V2[]): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = poly[(i + 2) % poly.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(z);
    else if (Math.sign(z) !== sign) return false;
  }
  return sign !== 0;
}

/** Signed distance from a point to a convex polygon in the plane: negative inside. */
export function polygonDistance(poly: V2[], q: V2): number {
  let inside = true, best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const ex = bx - ax, ey = by - ay;
    if (ex * (q[1] - ay) - ey * (q[0] - ax) < 0) inside = false;
    const t = Math.min(1, Math.max(0, ((q[0] - ax) * ex + (q[1] - ay) * ey) / (ex * ex + ey * ey)));
    best = Math.min(best, Math.hypot(q[0] - ax - ex * t, q[1] - ay - ey * t));
  }
  return inside ? -best : best;
}

// ------------------------------------------------------- clearance bound --

export type HalfSpace = { n: V3; h: number };

/**
 * The faces of the stone's hull (the envelope with no tolerance) as half
 * spaces. The hull is convex and contains the stone, so for any point the
 * largest signed distance to these planes is a LOWER bound on its distance to
 * the stone. A leg cleared against this bound clears the real stone by at
 * least as much, which is the direction a clearance check has to err in.
 */
export function hullPlanes(stone: StoneProfile): HalfSpace[] {
  const P = stone.girdle, H = stone.hull;
  const out: HalfSpace[] = [
    { n: [0, 0, -1], h: -H[0].z },
    { n: [0, 0, 1], h: H[H.length - 1].z },
  ];
  for (let k = 0; k < H.length - 1; k++) {
    for (let i = 0; i < P.length; i++) {
      const j = (i + 1) % P.length;
      const A: V3 = [P[i][0] * H[k].s, P[i][1] * H[k].s, H[k].z];
      const B: V3 = [P[j][0] * H[k].s, P[j][1] * H[k].s, H[k].z];
      const C: V3 = [P[i][0] * H[k + 1].s, P[i][1] * H[k + 1].s, H[k + 1].z];
      const D: V3 = [P[j][0] * H[k + 1].s, P[j][1] * H[k + 1].s, H[k + 1].z];
      // The longer of the two parallel edges, so a tiny culet section still
      // gives a well-conditioned normal.
      const [p0, p1, q] = H[k].s >= H[k + 1].s ? [A, B, C] : [C, D, A];
      let n = cross(sub(p1, p0), sub(q, p0));
      const L = Math.hypot(...n);
      if (L < 1e-12) continue;
      n = [n[0] / L, n[1] / L, n[2] / L];
      // Outward: away from the axis at that height.
      const mid: V3 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0];
      if (n[0] * mid[0] + n[1] * mid[1] < 0) n = [-n[0], -n[1], -n[2]];
      out.push({ n, h: dot(n, p0) });
    }
  }
  return out;
}

/** A lower bound on the distance from q to the stone (negative inside it). */
export function clearanceBound(planes: HalfSpace[], q: V3): number {
  let m = -Infinity;
  for (const p of planes) {
    const v = p.n[0] * q[0] + p.n[1] * q[1] + p.n[2] * q[2] - p.h;
    if (v > m) m = v;
  }
  return m;
}

// ------------------------------------------------------------------ head --

export type LayoutWarning = {
  key: BenchKey; kind: "engine-clamped" | "kicked-leg"; message: string;
  /** For a clamp the stone's size forces: the value asked and the value built (see BenchWarning). */
  asked?: number; delivered?: number;
};

/**
 * Where the band is, seen from a head. Built by the engine from the band's
 * own section function, so a tapered shank, a knife edge or a lasso edit is
 * the band the feet land in.
 */
export type BandProbe = {
  /** Stone-frame z of the band's top and bottom under (x, y); null where there is no metal. */
  at(x: number, y: number): { top: number; bottom: number } | null;
  /** Unit vector in the stone's xy plane along the finger axis. */
  axial: V2;
  /**
   * Where along `axial` there is band metal at the head, as |distance| from
   * the axis: from axialMin (a split shank's slot, else 0) to axialMax (the
   * band's edge). A foot is kept wholly inside it.
   */
  axialMin: number;
  axialMax: number;
  /** Stone-frame z of the band top on the head axis. */
  topOnAxis: number;
};

export type ProngPlan = {
  index: number;
  /** Direction of the prong about the axis, radians from +x. */
  angle: number;
  /** Where the prong meets the girdle, and the girdle's outward normal there. */
  girdlePoint: V2;
  normal: V2;
  /** girdlePoint · normal: the girdle's support distance along the normal. */
  support: number;
  /** Prong diameter actually built. */
  d: number;
  /** The post's centreline, in plan. */
  postCentre: V2;
  /** Seat depth into the prong: bearingDepth% of d. */
  notch: number;
  /** Height of the cap's centre: the top of the straight post. */
  postTop: number;
  /** Highest point of the prong: table + asCastProngHeight. */
  tip: number;
  /** Where the crown seat no longer reaches the post (+0.05): the post's own face is measured here. */
  measureZ: number;
  /**
   * The heights between which the post's whole section is inside the seat
   * envelope somewhere: below seatLow and above seatHigh it is clear all
   * round. The post is kept straight across this span and the bend below it.
   */
  seatLow: number;
  seatHigh: number;
  /**
   * The seat envelope cut down to a box round this post, as flat faces. The
   * prong is cut by this rather than by the whole envelope: identical inside
   * the box, and the layout proves nothing of the prong outside the box comes
   * near the envelope. A boolean's cost grows with the faces it is handed, so
   * fourteen faces instead of two hundred is most of the preview budget.
   * Null for a prong that is a turned or mirrored copy of an earlier one
   * (see matchingProng): it is moved into place, not cut.
   */
  seatCutter: V3[][] | null;
  /**
   * The as-cast spine, foot to cap, as a polyline whose inner corners are
   * bent: foot, knee, corner, top. From the corner the leg runs straight
   * through the gallery's wire (crossing it at `gallery`), bends at the knee
   * and goes down into the band; above the corner the post stands upright.
   * Absent without a band.
   */
  spine?: {
    points: V3[];
    /** Centreline radius of the bend at each inner point (knee, corner). */
    bends: number[];
    /** Where the leg's centreline passes the gallery. */
    gallery: V3;
    /** Lower bound on the clearance between the prong and the pavilion below girdle − d. */
    pavilionClearance: number;
    /** Whether the foot lands on band metal (a split shank's slot or a narrow band can leave it hanging). */
    footInBand: boolean;
    /** Whether the foot ends wholly inside the base, with nothing of the prong at or below its plateau (S3). */
    footInBase: boolean;
    /** How far the leg steps out under the seat, a kicked leg (S2); 0 for a straight one. */
    kick: number;
  };
};

/**
 * The upper gallery: a round wire running round the pavilion, through every
 * prong's leg.
 *
 * Its centreline is a polygon whose sides run parallel to the girdle's, each
 * set out from the pavilion by exactly what keeps the wire galleryClearance
 * from the facet below it (more on a shallow facet than a steep one, since
 * the gap is measured square to the facet). By the rule of thirds it sits
 * half way up the pavilion; where a wire of the rule's thickness would then
 * show beyond the girdle from above, it is lowered only as far as it takes to
 * hide it, and that is reported (decided by Animesh, 2026-10-07: clearance
 * and thickness protect the stone and the casting, the height gives way).
 */
export type GalleryPlan = {
  /** Centreline height above the culet, and where the rule of thirds puts it. */
  z: number;
  mid: number;
  /** Wire diameter. */
  t: number;
  /** The closed centreline, counter-clockwise. */
  path: V2[];
  /** The wire's outline seen from above (the centreline grown by t/2). */
  outer: V2[];
  /** How much further than galleryClearance from the stone the seat envelope held it, at worst. */
  seatPush: number;
};

export type HeadLayout = {
  stone: StoneProfile;
  prongs: ProngPlan[];
  /** The bench values actually built, after any engine clamp. */
  values: BenchValues;
  warnings: LayoutWarning[];
  /** The upper gallery. Null for a head without prongs, or laid out without a band. */
  gallery: GalleryPlan | null;
  /** The base and the saddle under it (S3). Null for a head without one. */
  base: BasePlan | null;
  /**
   * Why this head cannot keep clear of a stone or point it was told to
   * avoid, if it cannot: then nothing short of moving the head helps, and the
   * caller should (a three-stone opens its side stones out, see the engine).
   */
  blocked: string | null;
};

export type LayoutOptions = {
  /** The alloy's minimum prong diameter: an engine clamp never goes below it. */
  minProngDiameter?: number;
  /**
   * Other stones, as half spaces bounding them in this head's frame, that
   * every part of this head must keep `clearance` from; and points it must
   * keep `r` from. A three-stone's side heads are given the centre stone and
   * its culet: their as-cast prongs stand tall enough to reach it.
   */
  avoid?: { planes: HalfSpace[]; clearance: number }[];
  avoidPoints?: { p: V3; r: number }[];
  /** The alloy's minimum wall: a gallery is never thinned below it (see placeGallery). */
  minGalleryThickness?: number;
  /** A head that may go without a gallery where its legs cannot pass through one (a three-stone's side heads, S6's). */
  galleryOptional?: boolean;
  /**
   * Give the head a base and saddle, with every prong's foot in the base
   * (S3). The centre head of every prong setting; a three-stone's side heads
   * still stand their prongs in the band until S6.
   */
  base?: boolean;
};

/** Prong directions, unchanged from the first engine. */
export function prongAngles(cut: GemCut, prongCount: number): number[] {
  return Array.from({ length: prongCount },
    (_, i) => (i / prongCount) * Math.PI * 2 + (cut === "princess" ? Math.PI / 4 : 0));
}

/**
 * The whole as-cast head: seats, posts, legs and the upper gallery.
 *
 * Without a band probe only the seat half is laid out (girdle points, posts,
 * heights), which is all the structure audit needs to know where to measure.
 */
export function layoutHead(
  cut: GemCut, girdleR: number, prongCount: number, bench: BenchValues,
  band: BandProbe | null, opts: LayoutOptions = {},
): HeadLayout {
  const stone = stoneProfile(cut, girdleR);
  const values: BenchValues = { ...bench };
  const warnings: LayoutWarning[] = [];
  const warn = (key: BenchKey, message: string) => warnings.push({ key, kind: "engine-clamped", message });

  const angles = prongAngles(cut, prongCount);
  const b = values.bearingDepth / 100, tol = values.seatTolerance;

  const girdleAt = (a: number) => {
    const hit = radialHit(stone.girdle, a);
    const g: V2 = [hit.r * Math.cos(a), hit.r * Math.sin(a)];
    const P = stone.girdle, m = P.length;
    let n = edgeNormal(P, hit.edge);
    // On a vertex the seat is the arc between its two edges; its normal there
    // is their bisector, which is also what a burr would cut along.
    const atStart = hit.w < 1e-9, atEnd = hit.w > 1 - 1e-9;
    if (atStart || atEnd) {
      const other = edgeNormal(P, atStart ? (hit.edge - 1 + m) % m : (hit.edge + 1) % m);
      const L = Math.hypot(n[0] + other[0], n[1] + other[1]);
      n = [(n[0] + other[0]) / L, (n[1] + other[1]) / L];
    }
    return { g, n };
  };
  const seats = angles.map(girdleAt);
  const centres = (d: number) => seats.map(({ g, n }) => {
    const off = tol - b * d + d / 2;
    return [g[0] + n[0] * off, g[1] + n[1] * off] as V2;
  });

  // Prongs that would run into their neighbours are thinned until there is
  // daylight between them; a head of fused posts is not a prong head, and its
  // seats could not be measured or set one at a time.
  let d = values.prongDiameter;
  const gap = (dd: number) => {
    if (prongCount < 2) return Infinity;
    const c = centres(dd);
    let worst = Infinity;
    for (let i = 0; i < c.length; i++) {
      const j = (i + 1) % c.length;
      worst = Math.min(worst, Math.hypot(c[i][0] - c[j][0], c[i][1] - c[j][1]) - dd);
    }
    return worst;
  };
  const MIN_GAP = 0.05;
  if (gap(d) < MIN_GAP) {
    const floor = opts.minProngDiameter ?? 0;
    let lo = floor, hi = d;
    if (gap(lo) >= MIN_GAP) {
      for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (gap(mid) >= MIN_GAP) lo = mid; else hi = mid; }
      warn("prongDiameter", `Prong thickness ${fmt(d)} mm would make neighbouring prongs touch on this stone, so ${fmt(lo)} mm is used.`);
      d = lo;
    } else {
      warn("prongDiameter", `Prongs at the minimum thickness of ${fmt(floor)} mm still touch their neighbours on this stone; ${fmt(floor)} mm is used.`);
      d = floor;
    }
    values.prongDiameter = d;
  }

  const post = centres(d);
  const notch = b * d;

  // Where the crown seat stops reaching the post. Its edge along the normal
  // sits at tol − (1 − s)·support, so it clears the post's face (tol − notch)
  // once the crown has narrowed to s < 1 − notch / support.
  const env = envelopeStations(stone, tol);
  const envTop = env[env.length - 1].z, envBottom = env[0].z;
  const measureZFor = (support: number) => {
    const sStar = 1 - notch / support;
    const H = env;
    let z = envTop;
    if (scaleAt(H, envTop) < sStar) {
      let lo = stone.zGt, hi = envTop;
      for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; if (scaleAt(H, mid) >= sStar) lo = mid; else hi = mid; }
      z = hi;
    }
    return z + 0.05;
  };
  const supports = seats.map(({ g, n }) => g[0] * n[0] + g[1] * n[1]);
  const measureZ = Math.max(...supports.map(measureZFor));

  // The straight post must reach above the point its own face is measured,
  // or there is no plain post left above the seat to measure or to bend.
  const needH = measureZ + 0.1 + d / 2 - stone.zT;
  if (values.asCastProngHeight < needH) {
    warn("asCastProngHeight", `Prong height ${fmt(values.asCastProngHeight)} mm leaves no straight prong above the seat at ${fmt(d)} mm thick, so ${fmt(needH)} mm is used.`);
    values.asCastProngHeight = needH;
  }
  const tip = stone.zT + values.asCastProngHeight;

  // Where a post's whole section clears the envelope: the envelope's section
  // at z is the hull's grown by at most CORNER_FACTOR × tol, so a disc of the
  // prong's radius round c is clear once c is that far outside the hull's.
  const reach = CORNER_FACTOR * tol + d / 2 + 0.01;
  const clearAt = (c: V2, z: number) => {
    const s = scaleAt(env, z);
    if (s <= 0) return true;
    const poly = stone.girdle.map(([x, y]) => [x * s, y * s] as V2);
    return polygonDistance(poly, c) > reach;
  };
  const seatSpan = (c: V2) => {
    let low = stone.zGb;
    while (low > Math.max(envBottom, stone.zGb / 2) && !clearAt(c, low)) low -= 0.01;
    let high = stone.zGt;
    while (high < envTop && !clearAt(c, high)) high += 0.01;
    return { low, high: Math.min(high, envTop) };
  };
  const envPlanes = facePlanes(envelopeFaces(stone, tol));

  const prongs: ProngPlan[] = angles.map((angle, i) => {
    const span = seatSpan(post[i]);
    const h = d / 2 + 0.1;
    const box = boxFaces(
      [post[i][0] - h, post[i][1] - h, span.low - 0.02],
      [post[i][0] + h, post[i][1] + h, span.high + 0.02]);
    return {
      index: i, angle,
      girdlePoint: seats[i].g, normal: seats[i].n, support: supports[i],
      d, postCentre: post[i], notch,
      postTop: tip - d / 2, tip,
      measureZ: measureZFor(supports[i]),
      seatLow: span.low, seatHigh: span.high,
      seatCutter: clipConvex(box, envPlanes),
    };
  });

  // The cap must stand clear of the box the seat is cut in.
  const highest = Math.max(...prongs.map((p) => p.seatHigh + 0.02 + d / 2 + 0.05), -Infinity);
  if (prongs.length && tip - d / 2 < highest - d / 2) {
    const want = highest - stone.zT;
    warn("asCastProngHeight", `Prong height ${fmt(values.asCastProngHeight)} mm would put the prong's top inside its seat at ${fmt(d)} mm thick, so ${fmt(want)} mm is used.`);
    values.asCastProngHeight = want;
    for (const p of prongs) { p.tip = stone.zT + want; p.postTop = p.tip - d / 2; }
  }

  // Another stone in the way of a tall cast prong (a three-stone's side head
  // leaning towards the centre stone): the prongs are cast shorter, so none
  // reaches it, and that is reported.
  const avoid = opts.avoid ?? [];
  const avoidPoints = opts.avoidPoints ?? [];
  let blocked: string | null = null;
  if (prongs.length && (avoid.length || avoidPoints.length)) {
    const step = 0.05;
    const hits = (c: V3) =>
      avoid.some((o) => circleBound(o.planes, c, [0, 0, 1], d / 2) - step / 2 < o.clearance) ||
      avoidPoints.some((o) => Math.hypot(c[0] - o.p[0], c[1] - o.p[1], c[2] - o.p[2]) - d / 2 - step / 2 < o.r);
    let lowestHit = Infinity;
    for (const p of prongs) {
      // The post from below its seat to the top. Below the girdle it cannot
      // move at all; above, it can only be cast shorter.
      for (let z = p.seatLow - 0.1; z <= p.tip + 1e-9; z += step) {
        if (hits([p.postCentre[0], p.postCentre[1], z])) { lowestHit = Math.min(lowestHit, z); break; }
      }
    }
    // Never shorter than the seat needs: a post that stops in its own seat is
    // not a prong (and OCCT throws building one).
    const lowestTop = Math.max(highest, measureZ + 0.1 + d / 2);
    if (Number.isFinite(lowestHit)) {
      const want = lowestHit - 0.05 - stone.zT;
      if (stone.zT + want < lowestTop) {
        blocked = `a prong meets the next stone ${fmt(lowestHit)} mm above the culet, below the top of its own seat`;
      } else if (want < values.asCastProngHeight) {
        warn("asCastProngHeight", `Prong height ${fmt(values.asCastProngHeight)} mm would reach the next stone, so ${fmt(want)} mm is used.`);
        values.asCastProngHeight = want;
        for (const p of prongs) { p.tip = stone.zT + want; p.postTop = p.tip - d / 2; }
      }
    }
  }

  let gallery: GalleryPlan | null = null;
  let base: BasePlan | null = null;
  if (band && prongCount > 0) {
    const planes = hullPlanes(stone);
    const grow = CORNER_FACTOR * tol;
    const seatPlanes = planes.map((pl) =>
      ({ n: pl.n, h: pl.h + grow * Math.hypot(pl.n[0], pl.n[1]) + tol * Math.abs(pl.n[2]) }));

    const g = placeGallery(stone, values, planes, band, avoid, avoidPoints, opts.minGalleryThickness ?? 0);
    gallery = g.plan;
    if (g.thinned) {
      const asked = values.galleryThickness;
      values.galleryThickness = g.plan.t;
      warn("galleryThickness", g.showing == null
        ? `A gallery ${fmt(asked)} mm thick, ${fmt(values.galleryClearance)} mm off the stone, would show beyond the girdle of this stone at any height, so ${fmt(g.plan.t)} mm is used.`
        : `A gallery ${fmt(asked)} mm thick, ${fmt(values.galleryClearance)} mm off the stone, would show beyond the girdle of this stone at any height, so the minimum of ${fmt(g.plan.t)} mm is used.`);
    }
    if (g.plan.seatPush > 0.05) {
      warn("galleryClearance", `Gap between gallery and stone: ${fmt(values.galleryClearance)} mm would put the gallery inside the room left round the stone in its seat, so up to ${fmt(values.galleryClearance + g.plan.seatPush)} mm is kept.`);
    }
    if (g.showing != null) {
      warnings.push({ key: "galleryThickness", kind: "engine-clamped",
        message: `A gallery ${fmt(values.galleryThickness)} mm thick, ${fmt(values.galleryClearance)} mm off the stone, cannot be hidden under the girdle of this stone at any height; it sits ${fmt(g.lowered)} mm below the middle of the pavilion, where it shows least, ${fmt(g.showing)} mm beyond the girdle.` });
    } else if (g.lowered > 0.001) {
      // Said for the reason it was: to hide it (the thickness and gap ask
      // more room than the girdle gives at mid-pavilion), or the gap itself.
      if (!g.whyLower || g.whyLower === "it shows beyond the girdle") {
        warn("galleryThickness", `The gallery sits ${fmt(g.lowered)} mm below the middle of the pavilion so that, ${fmt(values.galleryThickness)} mm thick and ${fmt(values.galleryClearance)} mm off the stone, it stays hidden under the girdle.`);
      } else {
        warn(g.whyLower === "it comes too near the stone" ? "galleryClearance" : "galleryThickness",
          `The gallery sits ${fmt(g.lowered)} mm below the middle of the pavilion: any higher, ${fmt(values.galleryThickness)} mm thick and ${fmt(values.galleryClearance)} mm off the stone, ${g.whyLower}.`);
      }
    }
    if (g.blocked) blocked ??= g.blocked;

    const legs = (through: GalleryPlan | null) => {
      const choices: LegChoice[] = [];
      return prongs.map((p) => {
        const r = layoutLeg(p, stone, values, band, planes, through, through ? base : null, choices, avoid, avoidPoints);
        if (!choices.some((c) => c.r === r.choice.r && c.bend === r.choice.bend && c.mode === r.choice.mode &&
          c.drop === r.choice.drop && c.delta === r.choice.delta && c.wrap === r.choice.wrap &&
          c.kick === r.choice.kick && c.fall === r.choice.fall && c.straight === r.choice.straight && c.deep === r.choice.deep)) choices.push(r.choice);
        return r;
      });
    };
    let laid: ReturnType<typeof legs>;
    // The base, under the gallery: it needs the gallery's height and the
    // posts' places, and the legs then need it. Sized first where the legs
    // would land straight on through the gallery's centreline, then grown
    // until every leg keeps its gaps: on a small stone the posts stand just
    // outside the girdle above a low gallery, and a leg that has to come in
    // to a base well inside them bends round under the girdle too close to
    // the pavilion (0.25 ct round: 0.236 mm, asked 0.25). Grown 0.06 of the
    // girdle at a time, to the girdle's own size; if no size keeps every gap,
    // the one that keeps the most.
    // Scored by the legs that fit and keep every gap, then the legs that fit
    // at all, then the least gap kept.
    const score = (l: typeof laid) => [
      l.filter((r) => r.fits && r.clearanceMet && !r.otherShort).length,
      l.filter((r) => r.fits).length,
      Math.min(...l.map((r) => (r.fits ? r.spine.pavilionClearance : -1e9))),
    ];
    const better = (a: number[], b: number[]) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2] + 1e-9;
    if (opts.base && gallery) {
      // The landings first; then larger and smaller in turn, 0.06 of the
      // girdle at a time, between nothing and the girdle's own size: on a
      // 2 mm prong under a low gallery the legs run in steeply and land well
      // inside where the estimate puts them (all-max marquise, S3).
      const first = planBase(stone, values, d, band, gallery, prongs, opts.minGalleryThickness ?? 0);
      const tries = [first.sigma];
      for (let k = 1; k <= 16; k++) tries.push(first.sigma + 0.06 * k, first.sigma - 0.06 * k);
      let best: { base: BasePlan; laid: typeof laid; score: number[] } | null = null;
      const seen = new Set<string>();
      for (const at of tries.filter((x) => x >= 0 && x <= 1.05)) {
        base = at === first.sigma ? first : planBase(stone, values, d, band, gallery, prongs, opts.minGalleryThickness ?? 0, at);
        const key = base.sigma.toFixed(4);
        if (seen.has(key)) continue;
        seen.add(key);
        const l = legs(gallery), sc = score(l);
        if (!best || better(sc, best.score)) best = { base, laid: l, score: sc };
        if (sc[0] === prongs.length) break;
      }
      base = best!.base;
      laid = best!.laid;
    } else laid = legs(gallery);
    // A three-stone's side head on a small ring (0.25 ct: the side stone is
    // 0.06 ct) has no room for a 0.8 mm prong to bend through a 0.7 mm wire
    // under it. Side heads are S6's; until then such a head goes without a
    // gallery, its legs standing in the band as in S1, and says so. The
    // centre head always has its gallery.
    if (opts.galleryOptional && laid.some((r) => !r.fits)) {
      const without = legs(null);
      if (without.every((r) => r.fits)) {
        laid = without;
        gallery = null;
        warn("galleryThickness", "This stone is too small for prongs to pass through a gallery under it, so it is set without one; its prongs stand in the band.");
      }
    }
    let bendWarned = false;
    let short = Infinity;
    const kicked: number[] = [];
    prongs.forEach((p, i) => {
      const r = laid[i];
      p.spine = r.spine;
      if (r.bendClamped && !bendWarned) {
        bendWarned = true;
        warn("minBendRadius", `A bend of ${fmt(values.minBendRadius)} prong thicknesses does not fit between the seat, the gallery and the band on this stone, so ${fmt(r.bendUsed)} is used.`);
      }
      // Clamped only when the gap kept is genuinely less than the one asked:
      // the fallback can also be reached for the culet or the joint, with the
      // pavilion gap met, and must not then rewrite it upward.
      if (!r.clearanceMet && r.spine.pavilionClearance < values.pavilionClearance) {
        short = Math.min(short, r.spine.pavilionClearance);
      }
      if (r.otherShort) blocked ??= `prong ${p.index + 1}'s leg cannot keep clear of the next stone`;
      if (r.spine.kick > 0) kicked.push(p.index + 1);
      if (!r.fits) {
        warn("minBendRadius", `Prong ${p.index + 1}'s leg has no room to bend between its seat and the gallery on this stone even at the tightest bend.`);
        blocked ??= `prong ${p.index + 1}'s leg has no room to bend`;
      }
    });

    // A kicked leg is a fallback (Animesh, on S2's question 26): reported,
    // with why, every time one is laid out, and counted by the audit.
    if (kicked.length) {
      warnings.push({ key: "pavilionClearance", kind: "kicked-leg",
        message: `Prong${kicked.length > 1 ? "s" : ""} ${kicked.join(", ")} step${kicked.length > 1 ? "" : "s"} out under the seat and run${kicked.length > 1 ? "" : "s"} back in through the gallery: no straight leg keeps ${fmt(values.pavilionClearance)} mm from the pavilion on this stone.` });
    }

    // The seat cutter, cut down to a box round every part of each prong that
    // comes within reach of the envelope: the post's seat, and the bend too
    // when the bend had to start under the seat. Not for a prong that is a
    // copy: it is moved into place, not cut.
    for (const p of prongs) {
      if (matchingProng(stone, prongs, p.index)) { p.seatCutter = null; continue; }
      // The post's own span is exact in height, since the post is upright;
      // anything else near the seat gets the full margin. Kept off the bend
      // otherwise: a box reaching down into the bend hands OCCT a torus to
      // intersect, the slow case. In the frame of the girdle's normal at this
      // prong, so the box takes in only the envelope's faces the post faces.
      const m = d / 2 + 0.05;
      const u = p.normal;
      const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
      const growBox = (c: V3, mz: number) => {
        const q: V3 = [c[0] * u[0] + c[1] * u[1], -c[0] * u[1] + c[1] * u[0], c[2]];
        for (let k = 0; k < 3; k++) {
          const mk = k === 2 ? mz : m;
          lo[k] = Math.min(lo[k], q[k] - mk); hi[k] = Math.max(hi[k], q[k] + mk);
        }
      };
      growBox([p.postCentre[0], p.postCentre[1], p.seatLow - 0.05], 0.02);
      growBox([p.postCentre[0], p.postCentre[1], p.seatHigh + 0.05], 0.02);
      for (const { c, t, onPost, slack } of spineSamples(p.spine!.points, p.spine!.bends, d / 2)) {
        if (!onPost && circleBound(seatPlanes, c, t, d / 2) - slack < 0.03) growBox(c, m);
      }
      p.seatCutter = clipConvex(orientedBoxFaces(u, lo, hi), envPlanes);
    }

    // A gap the legs could not keep on this stone is clamped to the one they
    // do keep, and said so: until S3 gives the head a base, a prong standing
    // beyond the band's edge must bring its foot back under the stone, and
    // just below the seat its post is no further from the pavilion than the
    // seat put it (default ring, 0.6 mm asked: 0.432 kept, S1).
    if (Number.isFinite(short)) {
      const kept = Math.floor(short * 1000) / 1000;
      warn("pavilionClearance", `Gap between prongs and the stone below the seat: ${fmt(values.pavilionClearance)} mm cannot be guaranteed on this stone; at least ${fmt(kept)} mm is kept.`);
      values.pavilionClearance = kept;
    }
  }

  return { stone, prongs, values, warnings, gallery, base, blocked };
}

/** A rigid move about the head axis: a turn, or a reflection in a plane through the axis. */
export type HeadSymmetry = { kind: "rotate"; angle: number } | { kind: "mirror"; normal: V2 };

export function applySymmetry(t: HeadSymmetry, p: V3): V3 {
  if (t.kind === "rotate") {
    const c = Math.cos(t.angle), s = Math.sin(t.angle);
    return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
  }
  const k = 2 * (p[0] * t.normal[0] + p[1] * t.normal[1]);
  return [p[0] - k * t.normal[0], p[1] - k * t.normal[1], p[2]];
}

/**
 * An earlier prong that this one is an exact copy of, turned or reflected,
 * and the move that makes it so; null if there is none.
 *
 * Most heads are symmetric: on a round stone's six prongs only two shapes
 * occur, every other prong being one of them turned or mirrored. Building and
 * seating a prong is most of a head's cost, so a copy is moved into place
 * instead. A copy is only taken when the move carries the stone's girdle onto
 * itself and the earlier prong's whole spine onto this one's, to 1e-7 mm:
 * the cut prong is then the same solid, moved, whatever the band did to the
 * feet.
 */
export function matchingProng(
  stone: StoneProfile, prongs: ProngPlan[], j: number,
): { from: number; move: HeadSymmetry } | null {
  const pj = prongs[j];
  if (!pj.spine) return null;
  const TOL = 1e-7;
  const same = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < TOL;
  const keepsGirdle = (t: HeadSymmetry) => stone.girdle.every((v) => {
    const w = applySymmetry(t, [v[0], v[1], 0]);
    return stone.girdle.some((u) => Math.hypot(u[0] - w[0], u[1] - w[1]) < TOL);
  });
  const psi = (p: ProngPlan) => Math.atan2(p.postCentre[1], p.postCentre[0]);
  // A turn first, from any earlier prong, then a reflection: a turned copy
  // can share its original's geometry (and its mesh), a mirrored one cannot.
  for (const kind of ["rotate", "mirror"] as const) {
    for (let i = 0; i < j; i++) {
      const pi = prongs[i];
      if (!pi.spine || Math.abs(pi.d - pj.d) > TOL || pi.spine.points.length !== pj.spine.points.length ||
          pi.spine.bends.some((r, k) => Math.abs(r - pj.spine!.bends[k]) > TOL)) continue;
      const half = (psi(pi) + psi(pj)) / 2;
      const moves: HeadSymmetry[] = kind === "rotate"
        ? [{ kind: "rotate", angle: psi(pj) - psi(pi) }]
        : [{ kind: "mirror", normal: [-Math.sin(half), Math.cos(half)] },
          { kind: "mirror", normal: [Math.cos(half), Math.sin(half)] }];
      for (const move of moves) {
        const a = pi.spine, b = pj.spine;
        if (a.points.every((q, k) => same(applySymmetry(move, q), b.points[k])) && keepsGirdle(move)) {
          return { from: i, move };
        }
      }
    }
  }
  return null;
}

// --------------------------------------------------------------- gallery --

/** Where a ray from `o` along unit `u` leaves a convex polygon from inside, or first enters it from outside. */
function rayHit(poly: V2[], o: V2, u: V2): V2 | null {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const ex = bx - ax, ey = by - ay;
    const den = u[0] * ey - u[1] * ex;
    if (Math.abs(den) < 1e-15) continue;
    const t = ((ax - o[0]) * ey - (ay - o[1]) * ex) / den;
    const w = ((ax - o[0]) * u[1] - (ay - o[1]) * u[0]) / den;
    if (t > 1e-9 && w >= -1e-9 && w <= 1 + 1e-9 && t < best) best = t;
  }
  return Number.isFinite(best) ? [o[0] + u[0] * best, o[1] + u[1] * best] : null;
}

/**
 * The convex polygon inside every line n·x ≤ h, counter-clockwise, and which
 * lines give it a side. Unlike meeting each line with the next, a line that
 * the others already cut off (a gallery's bevel that would not cut its
 * corner) simply gives no side, rather than folding the outline over itself.
 */
function clipLines(lines: { n: V2; h: number }[]): { poly: V2[]; used: boolean[] } {
  const B = 1e3;
  let poly: V2[] = [[-B, -B], [B, -B], [B, B], [-B, B]];
  for (const { n, h } of lines) {
    const out: V2[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const fa = n[0] * a[0] + n[1] * a[1] - h, fb = n[0] * b[0] + n[1] * b[1] - h;
      if (fa <= 0) out.push(a);
      if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
        const w = fa / (fa - fb);
        out.push([a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]);
      }
    }
    poly = out;
  }
  // Corners closer than a tenth of a micron are one corner: a bevel that only just
  // cuts its corner would otherwise hand the loft a zero-length side.
  poly = poly.filter((p, i) => {
    const q = poly[(i + 1) % poly.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4;
  });
  const used = lines.map(() => false);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const md: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let best = -1, err = Infinity;
    lines.forEach(({ n, h }, k) => {
      const e = Math.abs(n[0] * md[0] + n[1] * md[1] - h);
      if (e < err) { err = e; best = k; }
    });
    if (best >= 0 && err < 1e-6) used[best] = true;
  }
  return { poly, used };
}

/**
 * A stone given as stacked sections (the girdle polygon scaled by s at z) as
 * flat faces: a quad per side between each pair of stations, and the end caps.
 */
function stackFaces(P: V2[], stations: Station[]): V3[][] {
  const rings = stations.map(({ z, s }) => P.map(([x, y]) => [x * s, y * s, z] as V3));
  const faces: V3[][] = [rings[0], rings[rings.length - 1]];
  for (let k = 0; k + 1 < rings.length; k++) {
    const A = rings[k], C = rings[k + 1];
    for (let i = 0; i < P.length; i++) {
      const j = (i + 1) % P.length;
      const quad = [A[i], A[j], C[j], C[i]];
      if (polygonArea(quad) > 1e-12) faces.push(quad);
    }
  }
  return faces;
}

/**
 * Whether side i of a closed centreline (from corner i to corner i + 1) is
 * long enough for a mitred round wire of radius r: each mitre takes
 * r·tan(turn / 2) of it on the inside of the bend, and two that overlap fold
 * the tube over itself. 0.01 mm to spare.
 */
export function tubeSideFits(path: V2[], i: number, r: number): boolean {
  const n = path.length;
  const turnAt = (k: number) => {
    const a = path[(k - 1 + n) % n], b = path[k], c = path[(k + 1) % n];
    const u = Math.atan2(b[1] - a[1], b[0] - a[0]), v = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let t = Math.abs(v - u);
    if (t > Math.PI) t = 2 * Math.PI - t;
    return t;
  };
  const a = path[i], b = path[(i + 1) % n];
  return Math.hypot(b[0] - a[0], b[1] - a[1]) >= r * (Math.tan(turnAt(i) / 2) + Math.tan(turnAt((i + 1) % n) / 2)) + 0.01;
}

/** A flat convex polygon with its plane worked out once, for faceDistance. */
type Face = { pts: V3[]; n: V3; h: number };

function prepareFaces(faces: V3[][]): Face[] {
  return faces.map((pts) => { const n = unitV(newell(pts)); return { pts, n, h: dot(n, pts[0]) }; });
}

/**
 * Distance from q to the nearest of the faces. A face's plane is never
 * farther than the face itself, so a face whose plane already lies beyond
 * the best found is skipped (most of them: the gallery's layout asks this
 * thousands of times a head).
 */
function facesDistance(q: V3, faces: Face[]): number {
  let best = Infinity;
  for (const { pts, n, h } of faces) {
    const d = dot(n, q) - h;
    if (Math.abs(d) >= best) continue;
    const p = sub(q, scale(n, d));
    let inside = true, edge = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const e = sub(b, a);
      if (dot(cross(e, sub(p, a)), n) < 0) inside = false;
      const L2 = dot(e, e);
      const w = L2 > 0 ? Math.min(1, Math.max(0, dot(sub(q, a), e) / L2)) : 0;
      edge = Math.min(edge, Math.hypot(...sub(q, add(a, scale(e, w)))));
    }
    best = Math.min(best, inside ? Math.abs(d) : edge);
  }
  return best;
}

/**
 * The gallery for this stone: as high as the rule of thirds puts it, or as
 * much lower as it takes to stay hidden under the girdle, off the band, clear
 * of the culet and of any neighbouring stone. See GalleryPlan.
 */
type GalleryFit = { plan: GalleryPlan; lowered: number; blocked: string | null; showing: number | null; whyLower?: string | null };

/**
 * The gallery, thinned where it must be: as planGallery at the thickness
 * asked; and where no height hides a wire that thick, the thickest wire that
 * some height does hide, never thinner than `minT` (the alloy's minimum
 * wall). Decided by Animesh, 2026-10-07: the clearance keeps the stone safe
 * and stays; the thickness gives way, reported, where the stone is too small
 * for both. Below the minimum wall it is not thinned further: it then sits at
 * that thickness where it shows least, and that is reported.
 */
function placeGallery(
  stone: StoneProfile, v: BenchValues, planes: HalfSpace[], band: BandProbe,
  avoid: { planes: HalfSpace[]; clearance: number }[], avoidPoints: { p: V3; r: number }[],
  minT: number,
): GalleryFit & { thinned: boolean } {
  const fit = (t: number) => planGallery(stone, v, t, planes, band, avoid, avoidPoints);
  const asked = fit(v.galleryThickness);
  if (asked.showing == null || v.galleryThickness <= minT + 1e-9) return { ...asked, thinned: false };
  const floor = fit(minT);
  if (floor.showing != null) return { ...floor, thinned: true };
  // Hidden at minT, not at the thickness asked: the thickest between, to
  // 0.01 mm (thinner never shows more: the wire's outer edge only moves in).
  let lo = minT, hi = v.galleryThickness, best = floor;
  while (hi - lo > 0.01) {
    const md = (lo + hi) / 2;
    const f = fit(md);
    if (f.showing == null) { lo = md; best = f; } else hi = md;
  }
  return { ...best, thinned: true };
}

function planGallery(
  stone: StoneProfile, v: BenchValues, t: number, planes: HalfSpace[], band: BandProbe,
  avoid: { planes: HalfSpace[]; clearance: number }[], avoidPoints: { p: V3; r: number }[],
): GalleryFit {
  const mid = stone.pavH * FIXED_STANDARDS.GALLERY_RULE_OF_THIRDS.value;
  const r = t / 2, gc = v.galleryClearance;
  const P = stone.girdle, m = P.length;
  const normals = P.map((_, i) => edgeNormal(P, i));

  // The seat envelope's planes: the hull's, pushed out by its growth
  // sideways and up and down (as the legs keep clear of it). The gallery
  // must stay outside them, or the seat would cut it.
  const tol = v.seatTolerance, grow = CORNER_FACTOR * tol;
  const seatPlanes = planes.map((pl) =>
    ({ n: pl.n, h: pl.h + grow * Math.hypot(pl.n[0], pl.n[1]) + tol * Math.abs(pl.n[2]) }));
  // The centreline's sides: one along each side of the girdle, and at a
  // sharp corner (a marquise's or pear's point, a step cut's corners) bevels
  // between, their normals at most 22.5° apart. Sides along the girdle alone
  // meet in a mitre, which at a marquise's 111° point reaches out
  // 1/cos(55.6°) = 1.8 times as far as the sides and showed beyond the
  // girdle on a 0.25 ct stone; the bevels follow the round corner an outward
  // offset of the outline would have (S2). A round's 22.5° corners get none.
  // Each line is set off from the stone's section at its own `anchor`: the
  // side's middle, or the corner it bevels.
  type Side = { n: V2; anchor: V2; bevel: boolean; edge: number; corner: number };
  // Corner j sits between girdle sides j − 1 and j; how many pieces its turn
  // is split into at most.
  const corners = P.map((_, j) => {
    const i = (j - 1 + m) % m;
    const a0 = Math.atan2(normals[i][1], normals[i][0]);
    let turn = Math.atan2(normals[j][1], normals[j][0]) - a0;
    while (turn <= 0) turn += 2 * Math.PI;
    const most = turn > Math.PI / 6 && turn < Math.PI ? Math.ceil(turn / (Math.PI / 8)) : 1;
    return { a0, turn, most };
  });
  const sidesFor = (pieces: number[]): Side[] => {
    const out: Side[] = [];
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      out.push({ n: normals[i], anchor: [(P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2], bevel: false, edge: i, corner: -1 });
      const { a0, turn } = corners[j];
      for (let k = 1; k < pieces[j]; k++) {
        const a = a0 + (turn * k) / pieces[j];
        out.push({ n: [Math.cos(a), Math.sin(a)], anchor: P[j], bevel: true, edge: -1, corner: j });
      }
    }
    return out;
  };
  // A step cut's section square to a side: the girdle's support distance on
  // that side times each station's scale. The wire runs along the side, so
  // its round section lies in this plane, and its gap to those facets is a
  // distance in the plane. (Bevels use exactGap, below.)
  const realGap = (support: number, u: number, z: number) => {
    const st = stone.stations!.filter((x) => x.z <= stone.zGt + 1e-9);
    let best = Infinity;
    for (let k = 0; k + 1 < st.length; k++) {
      const a: V2 = [support * st[k].s, st[k].z], b: V2 = [support * st[k + 1].s, st[k + 1].z];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const w = Math.min(1, Math.max(0, ((u - a[0]) * ex + (z - a[1]) * ey) / (ex * ex + ey * ey)));
      best = Math.min(best, Math.hypot(u - a[0] - ex * w, z - a[1] - ey * w));
    }
    return best - r;
  };
  // A bevel faces a corner, where the stone's nearest part is the ridge
  // down from it: there the planes' bound reads well short of the true gap,
  // and a bevel set off by it would stand outside the mitre it was meant to
  // cut (seen on a marquise's point). So a bevel is set off by the exact gap:
  // the round wire is the union of balls along its centreline, and its gap
  // at a point is the point's distance to the stone's faces less the radius.
  // The faces: a step cut's own sections, a brilliant's hull (which holds its
  // pavilion, so the true gap is never less).
  // Distances are unsigned: every side is set outward from the stone, so a
  // point measured here is never inside it.
  const stoneFaces = prepareFaces(stackFaces(P, stone.stations ?? stone.hull));
  const exactGap = (c: V3) => facesDistance(c, stoneFaces) - r;
  const at = (z: number) => {
    let pushed = 0;
    const s = scaleAt(stone.hull, z);
    // Each side set out until the wire's round section is the gallery
    // clearance off the stone (on a brilliant, the exact circle bound against
    // its pavilion's planes, so the gap is square to whichever facet is
    // nearest; on a step cut, its real section), and clear of the seat.
    const solved = new Map<number, number>();
    const solvedBevels = new Map<string, number>();
    const lineFor = ({ n, anchor, bevel, edge }: Side) => {
      if (!bevel && solved.has(edge)) return { n, h: solved.get(edge)! };
      const key = `${n[0]},${n[1]}`;
      if (bevel && solvedBevels.has(key)) return { n, h: solvedBevels.get(key)! };
      const tan: V3 = [-n[1], n[0], 0];
      const midPt: V2 = [s * anchor[0], s * anchor[1]];
      const base = n[0] * midPt[0] + n[1] * midPt[1];
      const support = n[0] * anchor[0] + n[1] * anchor[1];
      const pt = (h: number): V3 => [midPt[0] + n[0] * h, midPt[1] + n[1] * h, z];
      const stoneGap = (h: number) => bevel ? exactGap(pt(h))
        : stone.stations ? realGap(support, base + h, z) : circleBound(planes, pt(h), tan, r);
      const seatGap = (h: number) => circleBound(seatPlanes, pt(h), tan, r);
      const ok = (h: number, seat: boolean) => stoneGap(h) >= gc + 0.003 && (!seat || seatGap(h) >= 0.01);
      const solve = (seat: boolean) => {
        let lo = 0, hi = r + gc + 0.1;
        while (!ok(hi, seat)) hi *= 2;
        for (let k = 0; k < 24; k++) { const md = (lo + hi) / 2; if (ok(md, seat)) hi = md; else lo = md; }
        return hi;
      };
      const h = solve(true);
      pushed = Math.max(pushed, stoneGap(h) - gc);
      if (!bevel) solved.set(edge, base + h); else solvedBevels.set(key, base + h);
      return { n, h: base + h };
    };
    // A round wire turns cleanly only on an arc of its own radius or more,
    // and the clearance alone can ask a corner for a tighter one (a 0.25 ct
    // princess's: 0.27 mm, under a 0.35 mm wire). So each corner's bevels
    // are laid on an arc of radius ROUND: tangent to the sides either side
    // where the clearance allows, otherwise slid out along the corner's
    // bisector just far enough that every bevel keeps it. 0.1 mm over the
    // wire's radius leaves each piece of a 22.5° turn long enough for its
    // mitres (tubeSideFits).
    const ROUND = r + 0.1;
    const edgeSides = sidesFor(corners.map(() => 1));
    const rounded = (sides: Side[]) => {
      const lines = sides.map(lineFor);
      for (let j = 0; j < m; j++) {
        const ks = sides.map((sd, k) => (sd.bevel && sd.corner === j ? k : -1)).filter((k) => k >= 0);
        if (!ks.length) continue;
        const i = (j - 1 + m) % m;
        const hi = lineFor(edgeSides[i]).h - ROUND, hj = lineFor(edgeSides[j]).h - ROUND;
        const ni = normals[i], nj = normals[j];
        const det = ni[0] * nj[1] - ni[1] * nj[0];
        const C0: V2 = [(hi * nj[1] - hj * ni[1]) / det, (ni[0] * hj - nj[0] * hi) / det];
        const tl = Math.hypot(ni[0] + nj[0], ni[1] + nj[1]);
        const t: V2 = [(ni[0] + nj[0]) / tl, (ni[1] + nj[1]) / tl];
        let b = 0;
        for (const k of ks) {
          const n = lines[k].n;
          b = Math.max(b, (lines[k].h - (n[0] * C0[0] + n[1] * C0[1]) - ROUND) / (n[0] * t[0] + n[1] * t[1]));
        }
        const C: V2 = [C0[0] + t[0] * b, C0[1] + t[1] * b];
        for (const k of ks) lines[k] = { n: lines[k].n, h: lines[k].n[0] * C[0] + lines[k].n[1] * C[1] + ROUND };
      }
      return lines;
    };
    // A round wire cannot turn tighter than its own radius: a corner of the
    // centreline sharper than that folds the tube's inner side over itself
    // (the loft keeps its volume, so only OCCT's fuse noticed, dropping a
    // prong on a 3 ct princess). A mitre is a fold-free corner however
    // sharp, so a corner whose bevels come out too short for the wire is
    // split into fewer pieces, down to a plain mitre.
    const pieces = corners.map((c) => c.most);
    let sides = sidesFor(pieces), lines = rounded(sides), inner = clipLines(lines);
    for (let round = 0; round < 8; round++) {
      // A bevel is short and runs across the ridge, so its gap is checked
      // along the side it actually gives, not only at its anchor, and it is
      // pushed out until the whole side keeps the clearance (the sides along
      // the girdle are as before: measured, their least gap is where it is
      // set).
      for (let pass = 0; pass < 8; pass++) {
        let moved = false;
        const P2 = inner.poly, q2 = P2.length;
        lines.forEach((l, k) => {
          if (!sides[k].bevel || !inner.used[k]) return;
          let least = Infinity;
          for (let i = 0; i < q2; i++) {
            const a = P2[i], b = P2[(i + 1) % q2];
            const md: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            if (Math.abs(l.n[0] * md[0] + l.n[1] * md[1] - l.h) > 1e-6) continue;
            for (const f of [0, 0.25, 0.5, 0.75, 1]) {
              least = Math.min(least, exactGap([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z]));
            }
          }
          if (least < gc + 0.003) { l.h += gc + 0.003 - least + 1e-4; moved = true; }
        });
        if (!moved) break;
        inner = clipLines(lines);
      }
      // Every side long enough for the mitres at its two ends.
      const P2 = inner.poly, q2 = P2.length;
      const tight = new Set<number>();
      for (let i = 0; i < q2; i++) {
        const a = P2[i], b = P2[(i + 1) % q2];
        if (tubeSideFits(P2, i, r)) continue;
        const md: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const k = lines.findIndex((l) => Math.abs(l.n[0] * md[0] + l.n[1] * md[1] - l.h) < 1e-6);
        const sd = sides[k];
        const at2 = sd?.bevel ? [sd.corner] : sd ? [sd.edge, (sd.edge + 1) % m] : [];
        for (const c of at2) if (pieces[c] > 1) tight.add(c);
      }
      // One piece fewer a round, at each corner too tight for the wire.
      if (!tight.size) break;
      for (const c of tight) pieces[c]--;
      sides = sidesFor(pieces); lines = rounded(sides); inner = clipLines(lines);
    }
    const path = inner.poly;
    const outer = clipLines(lines.map((l) => ({ n: l.n, h: l.h + r }))).poly;
    // A side along the girdle that the others cut off entirely.
    const folded = sides.some((sd, k) => !sd.bevel && !inner.used[k]);
    return { path, outer, pushed, folded };
  };

  const showing = (g: { outer: V2[] }) => Math.max(...g.outer.map((q) => polygonDistance(P, q)));
  const why = (z: number, g: { path: V2[]; outer: V2[]; folded: boolean }, skip: { hide?: boolean; avoid?: boolean } = {}): string | null => {
    if (!isConvex(g.path)) return "its outline is not convex";
    // Every side along the girdle keeps a length (none folds away to nothing).
    if (g.folded) return "a side of the gallery folds away";
    const nq = g.path.length;
    // Hidden under the girdle from above.
    // 0.003 mm to spare: the wire's outline from above is exactly this
    // polygon (a mitred tube's silhouette is the mitre of its offsets).
    if (!skip.hide && showing(g) > -0.003) return "it shows beyond the girdle";
    // The whole wire keeps the gap, not only where each side is set off:
    // set low on a marquise, 0.6 mm off, its corners came to 0.577 (S2).
    // Measured to the stone's faces (a brilliant's hull, never nearer than
    // the stone itself), at every corner and along every side.
    for (let i = 0; i < nq; i++) {
      const a = g.path[i], b = g.path[(i + 1) % nq];
      for (const f of [0, 0.25, 0.5, 0.75]) {
        if (exactGap([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z]) < v.galleryClearance - 0.015) return "it comes too near the stone";
      }
    }
    // Clear of the culet, which only the band may come near.
    for (let i = 0; i < nq; i++) {
      const a = g.path[i], b = g.path[(i + 1) % nq];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const k = Math.min(1, Math.max(0, -(a[0] * ex + a[1] * ey) / (ex * ex + ey * ey)));
      if (Math.hypot(Math.hypot(a[0] + ex * k, a[1] + ey * k), z) - r < v.culetClearance + 0.01) return "it comes too near the culet";
    }
    // Clear of the band (a wire resting a hair above it is the near-tangent
    // contact OCCT fuses wrongly), and of any neighbouring stone.
    for (let i = 0; i < nq; i++) {
      for (const f of [0, 0.25, 0.5, 0.75]) {
        for (const poly of [g.path, g.outer]) {
          const a = poly[i], b = poly[(i + 1) % nq];
          const pq: V2 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          const hit = band.at(pq[0], pq[1]);
          if (hit && z - r < hit.top + 0.1) return "it would sit on the band";
        }
        if (skip.avoid) continue;
        const a = g.path[i], b = g.path[(i + 1) % nq];
        const c: V3 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, z];
        const tn = unitV([b[0] - a[0], b[1] - a[1], 0]);
        if (avoid.some((o) => circleBound(o.planes, c, tn, r) < o.clearance)) return "it meets the next stone";
        if (avoidPoints.some((o) => Math.hypot(c[0] - o.p[0], c[1] - o.p[1], c[2] - o.p[2]) - r < o.r)) return "it comes too near the next stone's culet";
      }
    }
    return null;
  };

  // Down as far as the culet and the band allow (why() keeps the wire
  // culetClearance off the culet and 0.1 mm off the band): on a 0.25 ct
  // marquise or emerald only a wire whose underside is level with the culet
  // or a little below it hides under the girdle (S2). The culet stands
  // culetClearance above the band, so this stops there.
  const heights: number[] = [];
  for (let z = mid; z - r > -v.culetClearance; z -= 0.03) heights.push(z);
  const plan = (x: { z: number; path: V2[]; outer: V2[]; pushed: number; folded: boolean }): GalleryPlan =>
    ({ z: x.z, mid, t, path: x.path, outer: x.outer, seatPush: x.pushed });
  // Highest first, worked out only as far as needed: most stones take the
  // first height tried, and each one costs a few hundred circle bounds.
  const computed: { z: number; path: V2[]; outer: V2[]; pushed: number; folded: boolean }[] = [];
  for (const z of heights) {
    let x = { z, ...at(z) };
    computed.push(x);
    if (!why(z, x)) {
      // Lowered: no lower than it must, to 0.002 mm (searched in 0.03 mm
      // steps, then halved four times). A hundredth lower cost a 0.25 ct
      // emerald's legs their way inside the joint below (S2).
      // What held it down: the reason the height just above it was refused.
      let whyLower: string | null = null;
      if (computed.length > 1) {
        const above = computed[computed.length - 2];
        let hi = above.z, lo = z;
        whyLower = why(above.z, above);
        for (let k = 0; k < 4; k++) {
          const md = (hi + lo) / 2, y = { z: md, ...at(md) };
          const w = why(md, y);
          if (!w) { lo = md; x = y; } else { hi = md; whyLower = w; }
        }
      }
      return { plan: plan(x), lowered: mid - x.z, blocked: null, showing: null, whyLower };
    }
  }
  const sections = computed;
  // Hidden somewhere, but only where it meets the next stone: moving the head
  // is the only cure (a three-stone opens its side stones out).
  const hidden = sections.find((x) => !why(x.z, x, { avoid: true }));
  if (hidden) {
    return { plan: plan(hidden), lowered: mid - hidden.z, blocked: `the gallery ${why(hidden.z, hidden)}`, showing: null };
  }
  // Hidden nowhere at this thickness and clearance (neither is given up to
  // hide it): the height that shows least, said so.
  let least: (typeof sections)[number] | null = null;
  for (const x of sections) {
    if (why(x.z, x, { hide: true, avoid: true })) continue;
    if (!least || showing(x) < showing(least) - 1e-9) least = x;
  }
  least ??= sections[0] ?? { z: mid, ...at(mid) };
  const other = why(least.z, least, { hide: true });
  return {
    plan: plan(least), lowered: mid - least.z,
    blocked: other ? `the gallery ${other}` : null,
    // Shown only if it does show: hidden here but refused for something
    // else (the band, the culet), it is not thinned for that (S2 review).
    showing: showing(least) > -0.003 ? Math.max(0, showing(least)) : null,
  };
}

// ------------------------------------------------------------------ base --

/**
 * A rounded outline: a convex core polygon grown by a disc of radius r (the
 * core's Minkowski sum with the disc). Its sides run parallel to the core's,
 * set out by r, and meet in arcs of radius r round the core's corners.
 *
 * Growing one by w is the same core at r + w, so the base's inner and outer
 * edges, the saddle's plateau and its hole are one core at four radii:
 * parallel curves, the same distance apart all round, which cannot fold. (An
 * outline offset inward folds at a marquise's points; see outlineRail in the
 * engine.) Lines and arcs extrude to planes and cylinders, which OCCT fillets
 * far more reliably than the faceted tube the gallery is.
 */
export type Rounded = { core: V2[]; r: number };

export type RoundedSegment =
  | { kind: "line"; a: V2; b: V2 }
  | { kind: "arc"; a: V2; m: V2; b: V2; c: V2 };

/** The outline as lines and arcs, counter-clockwise, each arc before the side that leaves its corner. */
export function roundedSegments(o: Rounded): RoundedSegment[] {
  const K = o.core, n = K.length;
  if (n === 1) {
    // A point grown by a disc: a circle, as two half arcs.
    const [cx, cy] = K[0];
    return [
      { kind: "arc", a: [cx + o.r, cy], m: [cx, cy + o.r], b: [cx - o.r, cy], c: K[0] },
      { kind: "arc", a: [cx - o.r, cy], m: [cx, cy - o.r], b: [cx + o.r, cy], c: K[0] },
    ];
  }
  const out: RoundedSegment[] = [];
  const at = (k: number, nrm: V2): V2 => [K[k][0] + nrm[0] * o.r, K[k][1] + nrm[1] * o.r];
  for (let k = 0; k < n; k++) {
    const before = edgeNormal(K, (k - 1 + n) % n), after = edgeNormal(K, k);
    if (o.r > 1e-9) {
      const bis = [before[0] + after[0], before[1] + after[1]];
      const L = Math.hypot(bis[0], bis[1]);
      out.push({ kind: "arc", a: at(k, before), m: at(k, [bis[0] / L, bis[1] / L]), b: at(k, after), c: K[k] });
    }
    out.push({ kind: "line", a: at(k, after), b: at((k + 1) % n, after) });
  }
  return out;
}

/** The outline sampled every `step` mm or finer along it, counter-clockwise, as a closed polygon. */
export function roundedPoints(o: Rounded, step = 0.05): V2[] {
  const pts: V2[] = [];
  for (const s of roundedSegments(o)) {
    if (s.kind === "line") {
      const n = Math.max(1, Math.ceil(Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) / step));
      for (let i = 0; i < n; i++) pts.push([s.a[0] + ((s.b[0] - s.a[0]) * i) / n, s.a[1] + ((s.b[1] - s.a[1]) * i) / n]);
    } else {
      const c = s.c, r = o.r;
      const a0 = Math.atan2(s.a[1] - c[1], s.a[0] - c[0]);
      let sweep = Math.atan2(s.b[1] - c[1], s.b[0] - c[0]) - a0;
      while (sweep <= 0) sweep += 2 * Math.PI;
      const n = Math.max(2, Math.ceil((r * sweep) / step));
      for (let i = 0; i < n; i++) pts.push([c[0] + r * Math.cos(a0 + (sweep * i) / n), c[1] + r * Math.sin(a0 + (sweep * i) / n)]);
    }
  }
  return pts;
}

/**
 * n points spread evenly by length round the outline, counter-clockwise,
 * from where its first segment starts. Two outlines grown from cores with
 * the same corners, sampled alike, correspond point for point, which is what
 * the saddle's ruled side is lofted between.
 */
export function roundedSamples(o: Rounded, n: number): V2[] {
  const dense = roundedPoints(o, 0.01);
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1];
  const out: V2[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const want = (total * k) / n;
    while (cum[j + 1] < want) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length];
    const w = (want - cum[j]) / Math.max(1e-12, cum[j + 1] - cum[j]);
    out.push([a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]);
  }
  return out;
}

/**
 * A convex polygon cut down to at most `most` corners, dropping each time
 * the corner whose loss takes least area (a convex polygon less a corner is
 * still convex, and the sharp ones, a marquise's points, cost the most and
 * stay), as many at a time as cost the same. The base and saddle are grown from it: each corner is an arc and
 * each side a plane in the solids, and every face is one more surface for
 * the fuse to intersect (a 16-cornered saddle took seconds, S3).
 */
function fewerCorners(P: V2[], most: number): V2[] {
  const Q = [...P];
  const loss = (i: number) => {
    const a = Q[(i - 1 + Q.length) % Q.length], b = Q[i], c = Q[(i + 1) % Q.length];
    return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  };
  // Corners that cost the same go together, so a symmetric girdle keeps its
  // symmetry: dropped one at a time, ties went by index and a marquise's
  // base came out lopsided, its two halves laying out different legs.
  while (Q.length > most) {
    const L = Q.map((_, i) => loss(i));
    const least = Math.min(...L), tie = 1e-9 * Math.max(...L);
    const keep = Q.filter((_, i) => L[i] > least + tie);
    if (keep.length < 3) break;
    Q.splice(0, Q.length, ...keep);
  }
  return Q;
}

/**
 * A convex polygon with every corner that does not turn (to 0.5°) left out:
 * a corner that does not turn has no arc to grow, and the saddle's two
 * outlines must have their arcs at the same corners (a marquise's girdle has
 * straight runs of three).
 */
function turningCorners(P: V2[]): V2[] {
  return P.filter((p, i) => {
    const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length];
    const u = Math.atan2(p[1] - a[1], p[0] - a[0]), w = Math.atan2(b[1] - p[1], b[0] - p[0]);
    let t = Math.abs(w - u);
    if (t > Math.PI) t = 2 * Math.PI - t;
    return t > (0.5 * Math.PI) / 180 && Math.hypot(p[0] - a[0], p[1] - a[1]) > 1e-6;
  });
}

/**
 * The head's base and the saddle it sits in (S3).
 *
 * The base is a flat ring under the stone, following its outline: every
 * prong's foot ends in it, and nothing of a prong reaches the band. It is
 * max(prongDiameter, minWall) tall and that plus 0.3 mm wide, the extra
 * giving a foot room to land square on it, and it sits low, just above the
 * band, because a head set this close to the finger has no room for a base
 * any higher: the culet is culetClearance off the band, and on a 0.25 ct
 * stone the gallery already sits a few tenths of a millimetre above the
 * culet.
 *
 * The saddle is the joint (architecture C in the S3 prompt: a saddle,
 * hollow in the middle). A solid lofted from inside the band up to a flat
 * plateau 0.15 mm above the band's highest point under the head, wide enough
 * there to carry the whole base, narrowing on the way down to what the band
 * can hold: on a 1.2 mm band it is a seat four times the band's width that
 * the band rises into, on an 8 mm band nearly a straight-sided block. The
 * base is sunk 0.1 mm into its plateau, so the two fuse with real overlap.
 * Its middle is open, down through to the band: under the culet the nearest
 * metal is still the band's own top, culetClearance away, as S1 set it, and
 * light reaches the pavilion from below as well as through the basket.
 *
 * Why a separate saddle rather than the shank's own section widened under
 * the head (architecture A): the shank is a single exact revolve on most
 * rings, and a section that changes under the head would loft every band
 * (slower to build and to show, and 0.05% out against the revolve, S0), and
 * it cannot leave the middle open for the culet. Why not a hollow cone up to
 * the stone (B, the bezel's under-gallery): there is no height for one; the
 * stone sits culetClearance above the band.
 */
export type BasePlan = {
  /** The convex core every outline of the base and saddle is grown from (see Rounded). */
  core: V2[];
  /** The base's inner and outer edges and the saddle's plateau, as radii about the core. */
  rIn: number; rOut: number; plateauR: number;
  /** The base's bottom and top, above the culet. */
  zBottom: number; zTop: number;
  /** Section thickness: the base's height and its narrowest width across. */
  height: number; width: number;
  /** The saddle's flat top. */
  plateau: number;
  /** The band's highest point under the saddle, which rises 0.03 mm through the plateau. */
  bandTop: number;
  /** The saddle's flat bottom, inside the band. */
  saddleBottom: number;
  /** The least gap from the base and saddle to the stone, and to the culet (exact distances to its faces). */
  clearance: number; culetClearance: number;
  /** Whether the base's top reaches the gallery: on a small stone the two meet. */
  touchesGallery: boolean;
  /** The core's scale of the girdle. */
  sigma: number;
};

/** Highest band top among these points (stone frame), and whether any lay off the band. */
function bandTopAmong(band: BandProbe, pts: V2[]): number {
  let top = -Infinity;
  for (const [x, y] of pts) {
    const b = band.at(x, y);
    if (b) top = Math.max(top, b.top);
  }
  return top;
}

const BASE_SINK = 0.1;          // how far the base sits into the saddle's plateau
const PLATEAU_DROP = 0.03;      // the plateau under the band's crest, which rises through it
const SADDLE_MARGIN = 0.3;      // the plateau beyond the base's outer edge

/**
 * Where the base goes. See BasePlan.
 *
 * Its size comes from the legs: each prong's run from the bottom of its post
 * through the gallery, carried on down at the same slope, lands at some
 * distance out from the axis at the base's height, and the base's middle is
 * put where those land on average, so a leg needs as little bend at its knee
 * as it can. Then it is grown until it keeps pavilionClearance from the
 * stone and culetClearance from the culet, measured exactly. Its top keeps
 * 0.25 mm below the gallery where the stone leaves the height for that; on a
 * small stone it is sunk further into the saddle, never so far that a
 * prong's foot would have less than 0.35 mm of base above the plateau to end
 * in.
 */
function planBase(
  stone: StoneProfile, v: BenchValues, d: number, band: BandProbe, gallery: GalleryPlan,
  prongs: ProngPlan[], minWall: number,
  /** The core's scale of the girdle to try, before the gaps grow it; by default, where the legs would land (see layoutHead). */
  tryScale?: number,
): BasePlan {
  const height = Math.max(d, minWall);
  const width = height + 0.3;
  // The core is the girdle scaled, its inner edge rounded by only 0.25 mm:
  // grown from a small core by a large radius, a princess's base came out
  // nearly round, and its corner prongs, standing a seventh further out than
  // the side ones, had nowhere near them to land.
  const rIn = 0.25, rOut = rIn + width;
  const faces = prepareFaces(stackFaces(stone.girdle, stone.stations ?? stone.hull));
  const G = fewerCorners(turningCorners(stone.girdle), 8);

  // A round stone's base is round: a circle, its radius the girdle's scaled
  // (its girdle's sixteen sides are the stone's facets, not a shape to follow).
  const outline = (sigma: number, r: number): Rounded => (stone.cut === "round"
    ? { core: [[0, 0]], r: r + sigma * stone.girdleR }
    : { core: G.map(([x, y]) => [x * sigma, y * sigma] as V2), r });
  const gb = gallery.z - gallery.t / 2;

  // The band's highest point under any base this head could have: the
  // girdle's own footprint, its outline and a grid inside it, which holds
  // every plateau the sizes below try. Read once: on a band the crest is on
  // the head's axis (or beside a split shank's slot) whatever the base's
  // size, and probing it for every size tried was most of the layout's time
  // (42 ms of 70 on the default ring, S3).
  const reach = roundedPoints(outline(1, rOut + SADDLE_MARGIN), 0.25);
  const bandTop = (() => {
    // Across the finger, where the crest is, every 0.05 mm (a split shank's
    // slot edge is in there), and along it and round the outline more
    // coarsely: the band only falls away along the finger.
    const a = band.axial, far = Math.max(...reach.map((p) => Math.hypot(p[0], p[1])));
    const pts: V2[] = [...reach];
    for (let t = -far; t <= far; t += 0.05) pts.push([a[0] * t, a[1] * t]);
    for (let t = -far; t <= far; t += 0.25) pts.push([-a[1] * t, a[0] * t]);
    const top = bandTopAmong(band, pts.filter((q) => polygonDistance(reach, q) <= 0));
    return Number.isFinite(top) ? top : band.topOnAxis;
  })();
  // The heights, the same for every size.
  const heights = (() => {
    const plateau = bandTop - PLATEAU_DROP;
    // Sunk BASE_SINK into the plateau. Where that leaves less than 0.25 mm
    // of daylight under the gallery, sunk further, but never so far that a
    // foot has less than 0.75 d of base above the plateau to end in (a leg
    // coming in at 45° needs 0.71 d), and never with its top above the
    // gallery's middle: there the section at the gallery's height would
    // cut the base (S3, light). On a small stone the base then meets the
    // gallery's underside.
    let zTop = Math.min(plateau - BASE_SINK + height, Math.max(gb - 0.25, plateau + 0.75 * d + 0.05));
    zTop = Math.min(zTop, gallery.z - 0.05);
    const zBottom = zTop - height;
    return { plateau, bandTop, zBottom, zTop };
  })();

  // The base's middle where the legs would land at its height, straight on
  // from the post through the gallery.
  const gr = gallery.t / 2;
  const landing = (zAt: number) => prongs.map((p) => {
    const c = p.postCentre;
    const inward: V2 = [-p.normal[0], -p.normal[1]];
    const hit = rayHit(gallery.path, c, inward) ?? c;
    const cz = p.seatLow - 0.1 - (v.minBendRadius * d + d / 2) * 0.3;
    const k = (gallery.z - zAt) / Math.max(0.2, cz - gallery.z);
    const q: V2 = [hit[0] + (hit[0] - c[0]) * k, hit[1] + (hit[1] - c[1]) * k];
    return { psi: Math.atan2(c[1], c[0]), r: Math.hypot(q[0], q[1]) };
  });
  const middle = (sigma: number, psi: number) => (stone.cut === "round"
    ? outline(sigma, rIn + width / 2).r
    : radialHit(roundedPoints(outline(sigma, rIn + width / 2), 0.2), psi).r);

  // The gaps to the stone and the culet: the base's top edges, its inner
  // wall above the plateau and the saddle's hole round its rim.
  const gaps = (sigma: number, h: typeof heights) => {
    let gap = Infinity, culet = Infinity;
    const test = (q: V3) => {
      gap = Math.min(gap, facesDistance(q, faces));
      culet = Math.min(culet, Math.hypot(q[0], q[1], q[2]));
    };
    for (const [x, y] of roundedPoints(outline(sigma, rIn), 0.15)) {
      for (let z = h.plateau; z <= h.zTop + 1e-9; z += Math.max(0.05, (h.zTop - h.plateau) / 4)) test([x, y, z]);
      test([x, y, h.zTop]);
    }
    for (const [x, y] of roundedPoints(outline(sigma, rOut), 0.15)) test([x, y, h.zTop]);
    return { gap, culet };
  };

  // sigma by the landings, then grown as the gaps need. Halved first to
  // find a sigma whose middle is near the landings: the base's middle grows
  // with sigma (and with every girdle point's distance out).
  let lo = 0, hi = 1.2;
  for (let k = 0; k < 16; k++) {
    const md = (lo + hi) / 2;
    const h = heights;
    const L = landing((h.zTop + h.plateau) / 2);
    const off = L.reduce((t, { psi, r }) => t + middle(md, psi) - r, 0) / L.length;
    if (off > 0) hi = md; else lo = md;
  }
  let sigma = Math.max(0, tryScale ?? (lo + hi) / 2);
  let h = heights, g = gaps(sigma, h);
  while ((g.gap < v.pavilionClearance || g.culet < v.culetClearance + 0.02) && sigma < 1.2) {
    sigma += 0.02;
    h = heights; g = gaps(sigma, h);
  }

  // The saddle's bottom: halfway down through the band on the axis, never
  // nearer the bore than 0.15 mm (a split shank's slot: its rails').
  const axial = band.axial;
  const onAxis = band.at(0, 0) ?? band.at(axial[0] * (band.axialMin + 0.2), axial[1] * (band.axialMin + 0.2));
  const thick = onAxis ? onAxis.top - onAxis.bottom : 1;
  const zBot = Math.max(h.bandTop - 0.5 * thick, (onAxis ? onAxis.bottom : -Infinity) + 0.15);

  const outerTop = roundedPoints(outline(sigma, rOut), 0.2).map(([x, y]) => [x, y, h.zTop] as V3);
  return {
    core: outline(sigma, 0).core, rIn: outline(sigma, rIn).r, rOut: outline(sigma, rOut).r, plateauR: outline(sigma, rOut + SADDLE_MARGIN).r,
    zBottom: h.zBottom, zTop: h.zTop, height, width,
    plateau: h.plateau, bandTop: h.bandTop, saddleBottom: zBot,
    clearance: g.gap, culetClearance: g.culet, sigma,
    touchesGallery: outerTop.some((q) => Math.hypot(polygonDistance(gallery.path, [q[0], q[1]]), q[2] - gallery.z) < gr + 0.01),
  };
}

/**
 * One prong's leg: from the bottom of its post, straight down through the
 * gallery wire, bending at a knee below it, then down into the band.
 *
 * The leg leaves the post at the corner and runs straight through the point
 * where the gallery's centreline crosses the prong's normal, so the wire and
 * the leg cross squarely. Below the gallery it bends at the knee towards its
 * foot. The foot is placed on a line out from the head axis and pulled in
 * along the finger axis until it lands on the band; the smallest distance out
 * wins that keeps
 *   - every part of the prong below girdle − d at least pavilionClearance
 *     from the stone,
 *   - every part of the prong at least culetClearance from the culet, and the
 *     foot outside a cylinder of that radius round the axis,
 *   - and, normally, the bends and legs out of the seat envelope, so the
 *     seat cut meets only the straight post (it is the fast case).
 *
 * Where the leg through the gallery's centreline would come nearer the
 * pavilion than pavilionClearance (a gallery asked to sit closer to the stone
 * than the prongs), it crosses the wire further out by the least that keeps
 * the gap, still through the wire. Where no foot position can meet all of
 * that, the post runs on lower before bending, or the bend starts right under
 * the seat (a slower cut), or the bends tighten below minBendRadius, which is
 * reported.
 */
type LegChoice = { r: number; bend: number; mode: "clear" | "under-seat"; drop: number; delta: number; wrap: number; kick: number; fall: number; straight: boolean; deep: boolean };

function layoutLeg(
  p: ProngPlan, stone: StoneProfile, v: BenchValues, band: BandProbe, planes: HalfSpace[],
  /** The gallery the leg runs through; null, a leg straight down from the post (see galleryOptional). */
  gallery: GalleryPlan | null,
  /** The base the foot ends in (S3); null, the foot stands in the band as before (a three-stone's side heads, S6's). */
  base: BasePlan | null,
  hints: LegChoice[] = [],
  avoid: { planes: HalfSpace[]; clearance: number }[] = [],
  avoidPoints: { p: V3; r: number }[] = [],
) {
  const d = p.d, half = d / 2;
  const rMin = v.culetClearance + half + 0.05;
  const target = v.pavilionClearance + 0.01;
  const culetTarget = v.culetClearance + 0.01;
  // The seat envelope is the hull grown sideways by up to CORNER_FACTOR × tol
  // and up and down by tol, so it lies inside the hull's planes each pushed
  // out by those amounts times the plane's lean. Clear of those, a point is
  // clear of the seat.
  planes = facing(planes, Math.atan2(p.postCentre[1], p.postCentre[0]));
  const grow = CORNER_FACTOR * v.seatTolerance;
  const seatPlanes = planes.map((pl) =>
    ({ n: pl.n, h: pl.h + grow * Math.hypot(pl.n[0], pl.n[1]) + v.seatTolerance * Math.abs(pl.n[2]) }));
  const outsideSeat = 0.01;
  const below = stone.zGb - d;
  const c = p.postCentre;
  const psi = Math.atan2(c[1], c[0]);
  const top: V3 = [c[0], c[1], p.postTop];
  const gr = gallery ? gallery.t / 2 : 0;

  // Where the leg crosses the gallery: on the prong's normal line, at the
  // gallery's centreline, on the side nearest the post (inward normally;
  // outward when a thick wire set well off the stone runs outside the post).
  const inward: V2 = [-p.normal[0], -p.normal[1]];
  const hits = (gallery ? [rayHit(gallery.path, p.postCentre, inward), rayHit(gallery.path, p.postCentre, p.normal)] : [c])
    .filter((h): h is V2 => h != null)
    .sort((a, b) => Math.hypot(a[0] - c[0], a[1] - c[1]) - Math.hypot(b[0] - c[0], b[1] - c[1]));
  const crossXY = hits[0] ?? (() => {
    const h = radialHit(gallery!.path, psi);
    return [h.r * Math.cos(psi), h.r * Math.sin(psi)] as V2;
  })();

  // The band's metal along the finger axis, shrunk so a whole foot fits.
  let lo = band.axialMin > 0 ? band.axialMin + half + 0.05 : 0;
  let hi = band.axialMax - half - 0.1;
  if (lo > hi) lo = hi = Math.max(0, (lo + hi) / 2);

  // The band under a foot, by its distance out: the search builds each foot
  // many times over (every drop, offset and mode at the same distance), and
  // probing the band is the dearest step of a build.
  const probes = new Map<number, ReturnType<BandProbe["at"]>>();
  const footProbe = (r: number, xy: V2) => {
    if (!probes.has(r)) probes.set(r, band.at(xy[0], xy[1]));
    return probes.get(r)!;
  };
  // On a base, the foot goes straight out from the axis towards the post,
  // as far out as the base allows: its inner and outer edges along that
  // direction, less the foot's own radius.
  const baseIn = base ? radialHit(roundedPoints({ core: base.core, r: base.rIn }, 0.05), psi).r : 0;
  const baseOut = base ? radialHit(roundedPoints({ core: base.core, r: base.rOut }, 0.05), psi).r : 0;
  const footXY = (r: number): V2 => {
    if (base) return [r * Math.cos(psi), r * Math.sin(psi)];
    const e: V2 = [Math.cos(psi), Math.sin(psi)];
    const a = band.axial;
    let along = r * (e[0] * a[0] + e[1] * a[1]);
    let perp: V2 = [r * e[0] - along * a[0], r * e[1] - along * a[1]];
    // Off the axis on one side or the other: a prong straight across the
    // finger lands beside a split shank's slot, opposite prongs on opposite sides.
    const side = Math.sign(along) || Math.sign(Math.cos(psi)) || 1;
    if (Math.abs(along) > hi) along = side * hi;
    if (Math.abs(along) < lo) along = side * lo;
    const need = Math.sqrt(Math.max(0, r * r - along * along));
    let L = Math.hypot(...perp);
    if (L < 1e-9) {
      // Straight along the finger axis (a marquise's point on four prongs):
      // step off to one side, opposite sides for opposite prongs.
      const sgn = Math.sign(Math.sin(psi)) || 1;
      perp = [-a[1] * sgn, a[0] * sgn];
      L = 1;
    }
    return [along * a[0] + (perp[0] / L) * need, along * a[1] + (perp[1] / L) * need];
  };

  type Mode = "clear" | "under-seat";
  const wantBend = v.minBendRadius * d + half;
  const tightest = BEND_MIN * d + half;     // the bench field's own minimum
  const turnOf = (a: V3, b: V3) => Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
  // tan of half the knee's turn, the turn held under 174°: a foot almost
  // straight back up the leg (a base just under a low gallery) would put the
  // knee tan(90°) away and the samples along it would never end. Such a leg
  // fails its fit either way (its knee does not fit before the foot).
  const kneeTan = (u: V3, foot: V3, knee: V3) => Math.tan(Math.min(turnOf(u, unitV(sub(foot, knee))), Math.PI - 0.1) / 2);
  // kick > 0: under the seat the leg first steps out along the prong's
  // normal by `kick` over a fall of `fall`, then runs in through the wire
  // (one bend more). For a post set so deep that, straight down, it passes
  // the pavilion closer than the gap just under girdle − d (a marquise's at
  // the deepest bearing, S2); before the gallery its leg stepped out there
  // anyway, towards a foot further out.
  let deepFoot = false;
  // straight: on a base, no knee: the run from the post through the wire
  // carries straight on into the base, the foot where it reaches it (r is
  // then not used). Where the base sits just under a low gallery there is no
  // room for a knee between them (a princess's corner prongs, S3).
  const build = (r: number, bend: number, mode: Mode, drop: number, delta: number, wrap = 1, kick = 0, fall = 0, straight = false) => {
    const midOf = (cz: number): V3 => [c[0] + p.normal[0] * kick, c[1] + p.normal[1] * kick, cz - fall];
    // Without a gallery, W is a point on the post below its seat, and the
    // leg is S1's: the post straight down, one bend, the leg to the foot.
    const W: V3 = [crossXY[0] - inward[0] * delta, crossXY[1] - inward[1] * delta,
      gallery ? gallery.z : (mode === "clear" ? p.seatLow - 0.1 : stone.zGb - 0.02) - drop - 0.3];
    const fxy = footXY(r);
    const probe = base ? null : footProbe(r, fxy);
    // How far along the leg the wire reaches either side of W.
    const through = (u: V3) => (gr + half + 0.1) / Math.max(0.2, -u[2]);
    const tanHalf = (u: V3) => Math.tan(Math.acos(Math.min(1, Math.max(-1, -u[2]))) / 2);
    let cz = Math.max(stone.zGb - 0.3, W[2] + 1);
    // On a base the foot ends just under its top, its end disc (square to
    // the leg) wholly inside it, 0.03 mm under the top at the disc's
    // highest. Or, where no leg ending there fits, deep: halfway between the
    // plateau and the base's top, the disc's room the same above and below
    // (just under the top, a 2 mm prong's legs on a 2 mm base had no length
    // left to bend in: all-max marquise, S3). footOut holds the disc inside.
    const onBase = (tilt: number) => (deepFoot ? (base!.plateau + base!.zTop - 0.02) / 2 : base!.zTop - 0.03 - half * Math.sin(tilt));
    let foot: V3 = [fxy[0], fxy[1], base ? onBase(0) : band.topOnAxis - 0.45];
    let knee: V3 = W;
    let used = bend;
    let fits = true;
    for (let k = 0; k < 8; k++) {
      fits = true;
      const corner: V3 = [c[0], c[1], cz];
      const start = kick > 0 ? midOf(cz) : corner;
      const u = unitV(sub(W, start));                      // the leg through the gallery
      // The knee: past the far side of the wire, plus room for its own bend.
      const t2 = straight ? 0 : used * kneeTan(u, foot, knee);
      knee = add(W, scale(u, wrap * through(u) + t2));
      const tilt = Math.acos(Math.min(1, Math.max(-1, -unitV(sub(foot, straight ? W : knee))[2])));
      if (straight) foot = add(W, scale(u, (W[2] - onBase(tilt)) / Math.max(1e-9, -u[2])));
      else if (base) foot = [fxy[0], fxy[1], onBase(tilt)];
      else if (probe) {
        // Seven tenths of the way through the band, never nearer its bore
        // than 0.15 mm (OCCT fuses a buried end seven times faster, S1).
        const slant = half * Math.sin(tilt);
        const embed = Math.max(0.45, 0.7 * (probe.top - probe.bottom));
        foot = [fxy[0], fxy[1], Math.max(probe.top - embed, probe.bottom + slant + 0.15)];
      }
      // Both bends at the same radius. The corner's bend ends above the wire
      // and the knee's starts below it (wrap 1), or, where a low gallery
      // leaves no room for that, both meet the leg at W (wrap 0): the leg
      // still runs straight through the wire's centre.
      // Too long even so and it tightens, never below the bench's own
      // tightest bend (a bend inside the prong's own radius folds the sweep
      // over itself): then this leg does not fit.
      const above = Math.hypot(...sub(W, start)) - wrap * through(u);
      // The bend at the top of the run through the wire: the corner's, or,
      // kicking, the one at the foot of the step out.
      const turnTop = kick > 0 ? Math.tan(turnOf(unitV(sub(start, corner)), u) / 2) : tanHalf(u);
      used = bend;
      if (bend * turnTop > above - 0.05) {
        used = Math.max(0, (above - 0.05) / Math.max(1e-9, turnTop));
        if (used < tightest - 1e-9) { used = tightest; fits = false; }
      }
      if (!straight && t2 > Math.hypot(...sub(foot, knee)) - 0.2) fits = false;
      const t1 = used * (kick > 0 ? tanHalf(unitV(sub(start, corner))) : tanHalf(u));
      // Normally the bend starts only once the post is clear of the seat all
      // round, so the cut never meets the bend (a torus against a plane is
      // the slowest intersection OCCT has).
      cz = (mode === "clear" ? p.seatLow - 0.1 : stone.zGb - 0.02) - t1 - drop;
      const floor = W[2] + wrap * (gr + half) + 0.2 + (kick > 0 ? fall : 0);
      if (cz < floor) { cz = floor; fits = false; }
    }
    // The corner has settled; the knee is put back on the line from it
    // through W (the passes above placed it from the previous corner, up to
    // 0.055 mm off the line on a 3 ct marquise), and the whole spine is then
    // checked to be one a sweep can follow.
    const corner: V3 = [c[0], c[1], cz];
    const start = kick > 0 ? midOf(cz) : corner;
    const u = unitV(sub(W, start));
    if (straight) {
      const tilt = Math.acos(Math.min(1, Math.max(-1, -u[2])));
      foot = add(W, scale(u, (W[2] - onBase(tilt)) / Math.max(1e-9, -u[2])));
    } else {
      for (let k = 0; k < 3; k++) {
        const t2 = used * kneeTan(u, foot, knee);
        knee = add(W, scale(u, wrap * through(u) + t2));
      }
    }
    const legPoints = straight ? [foot] : [foot, knee];
    const points = (kick > 0 ? [...legPoints, start, corner, top] : [...legPoints, corner, top]) as V3[];
    const bendsUsed = points.slice(2).map(() => used);
    if (!spineFits(points, bendsUsed)) fits = false;
    return { points, bends: bendsUsed, gallery: W, bend: used, inBand: !!probe, fits, wrap, kick, fall, straight, deep: deepFoot };
  };
  type Built = ReturnType<typeof build>;

  // With `need`, gives up at the first sample that falls short of it (the
  // search only asks whether a leg will do), walking down from the post,
  // where the pavilion gap is usually decided.
  type Need = { pav: number; ball: number; seat: number; culet: number };
  const measure = (s: Built, need?: Need) => {
    let pav = Infinity, ball = Infinity, seat = Infinity, culet = Infinity, other = Infinity;
    const samples = spineSamples(s.points, s.bends, half);
    if (need) samples.reverse();
    for (const { c: q, t, onPost, slack } of samples) {
      culet = Math.min(culet, Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2]) - half - slack);
      // Clear of any other stone and point: below the seat, where the
      // corner and foot go decides it (the post above was cast short enough).
      if (!onPost || q[2] < p.seatLow) {
        for (const o of avoid) other = Math.min(other, circleBound(o.planes, q, t, half, o.clearance + slack + 0.2) - slack - o.clearance);
        for (const o of avoidPoints) other = Math.min(other, Math.hypot(q[0] - o.p[0], q[1] - o.p[1], q[2] - o.p[2]) - half - slack - o.r);
      }
      // Any of this section below girdle − d? Its lowest point is half its
      // width times how far it leans from level.
      const low = q[2] - half * Math.sqrt(Math.max(0, 1 - t[2] * t[2])) - slack <= below;
      // The section's exact gap, which is the rule; and the gap of a ball of
      // the prong's radius round the centreline, never more than that and
      // what a hand check against the stone measures, which is preferred
      // (see the search below).
      // When only asked whether it will do, the ball's gap, which costs a
      // fraction of the section's and is never more, settles every sample
      // that clears by it.
      if (low) {
        const b = clearanceBound(planes, q) - half - slack;
        ball = Math.min(ball, b);
        pav = Math.min(pav, need && b >= need.pav ? b : circleBound(planes, q, t, half, target + slack + 0.2) - slack);
      }
      if (!onPost) {
        const b = need ? clearanceBound(seatPlanes, q) - half - slack : -Infinity;
        seat = Math.min(seat, need && b >= need.seat ? b : circleBound(seatPlanes, q, t, half, outsideSeat + slack + 0.2) - slack);
      }
      if (need && (pav < need.pav || ball < need.ball || seat < need.seat || culet < need.culet || other < 0)) break;
    }
    return { pav, ball, seat, culet, other };
  };
  // The foot stands outside a cylinder of culetClearance round the axis; the
  // rest of the prong is held to the culet by the exact distance above.
  // On a base: the foot's end disc wholly inside the base, its lowest point
  // above the saddle's plateau, and the whole prong above the plateau too,
  // so nothing of it reaches the saddle or the band (I6).
  const footOut = (s: Built) => {
    if (!base) return Math.hypot(s.points[0][0], s.points[0][1]) >= rMin - 1e-9;
    const f = s.points[0], u = unitV(sub(s.points[1], f));
    const r = Math.hypot(f[0], f[1]);
    // The disc's reach up and down, and in and out along the radius.
    const across = half * Math.sqrt(Math.max(0, 1 - u[2] * u[2]));
    const ur = r > 1e-9 ? (u[0] * f[0] + u[1] * f[1]) / r : 0;
    const out = half * Math.sqrt(Math.max(0, 1 - ur * ur));
    if (f[2] - across < base.plateau + 0.01 || r - out < baseIn + 0.02 || r + out > baseOut - 0.02) return false;
    return spineSamples(s.points, s.bends, half).every(({ c: q, t, slack }) =>
      q[2] - half * Math.sqrt(Math.max(0, 1 - t[2] * t[2])) - slack >= base.plateau + 0.01);
  };
  // Each run goes down: at least 0.3 mm of fall for every mm across (a
  // lowered corner once ended under its own foot, and OCCT's fuse returned
  // the prong alone, S1).
  const descends = (s: Built) => s.points.slice(0, 3).every((q, k) => {
    if (k === 0) return true;
    const lower = s.points[k - 1];
    const across = Math.hypot(q[0] - lower[0], q[1] - lower[1]);
    return q[2] - lower[2] >= Math.max(0.3, 0.3 * across);
  });
  // Where the structure audit takes the joint (I7): band top + 0.10 on the
  // axis, within 1.2 × the girdle radius. Preferred, and dropped only when
  // nothing else fits.
  const jointZ = band.topOnAxis + 0.1, jointR = 1.2 * stone.girdleR;
  let wantJoint = true;
  // Whichever straight run crosses the joint's plane: on a small stone the
  // gallery sits low and the knee falls below it (0.25 ct round, S2).
  const inJoint = (s: Built) => {
    for (let k = 0; k + 1 < s.points.length; k++) {
      const a = s.points[k], b = s.points[k + 1];
      if ((a[2] - jointZ) * (b[2] - jointZ) > 0) continue;
      const dir = unitV(sub(b, a));
      if (Math.abs(dir[2]) <= 1e-6) continue;
      const q = add(a, scale(dir, (jointZ - a[2]) / dir[2]));
      return Math.hypot(q[0], q[1]) + half / Math.max(0.2, Math.abs(dir[2])) <= jointR - 0.02;
    }
    return true;
  };
  let wantBall = true;
  const ok = (s: Built, mode: Mode) => {
    if (!s.fits || !footOut(s) || !descends(s) || (wantJoint && !inJoint(s))) return false;
    const m = measure(s, { pav: target, ball: wantBall ? target : -Infinity, seat: mode === "under-seat" ? -Infinity : outsideSeat, culet: culetTarget });
    return m.pav >= target && (!wantBall || m.ball >= target) &&
      m.culet >= culetTarget && m.other >= 0 && (mode === "under-seat" || m.seat >= outsideSeat);
  };

  const rHi = Math.hypot(c[0], c[1]) + 3 * d;
  // from, from + step, ... while not past `to`, accumulated as the loops
  // before S3 did, so a head without a base lays out exactly as it did.
  const stepped = (from: number, to: number, step: number) => {
    const xs: number[] = [];
    for (let x = from; step > 0 ? x <= to + 1e-9 : x >= to - 1e-9; x += step) xs.push(x);
    return xs;
  };
  // On a base, the distances out its width leaves a foot, nearest its middle first.
  const baseRs = base ? (() => {
    const lo = baseIn + half * 0.3, hi = baseOut - half * 0.3, mid = (lo + hi) / 2;
    return [0, -1, 1, -2, 2, -3, 3].map((k) => mid + (k * (hi - lo)) / 6);
  })() : [];
  const search = (bend: number, mode: Mode, drop: number, delta: number, wrap: number, kick = 0, fall = 0) => {
    const at = (r: number) => ({ ...build(r, bend, mode, drop, delta, wrap, kick, fall), r, drop, delta });
    if (base) {
      // Straight on into the base first: one bend fewer.
      const st = build(baseRs[0], bend, mode, drop, delta, wrap, kick, fall, true);
      if (ok(st, mode)) return { ...st, r: baseRs[0], drop, delta };
      for (const r of baseRs) if (ok(build(r, bend, mode, drop, delta, wrap, kick, fall), mode)) return at(r);
      return null;
    }
    if (ok(build(rMin, bend, mode, drop, delta, wrap, kick, fall), mode)) return at(rMin);
    let prev = rMin;
    for (let x = rMin + 0.4; x <= rHi + 0.4 - 1e-9; x += 0.4) {
      const xx = Math.min(x, rHi);
      if (ok(build(xx, bend, mode, drop, delta, wrap, kick, fall), mode)) {
        let a = prev, b = xx;
        for (let k = 0; k < 9; k++) { const md = (a + b) / 2; if (ok(build(md, bend, mode, drop, delta, wrap, kick, fall), mode)) b = md; else a = md; }
        return at(b);
      }
      prev = xx;
    }
    return null;
  };

  const bends = [wantBend];
  for (let f = 0.75; wantBend * f > tightest; f *= 0.75) bends.push(wantBend * f);
  if (bends[bends.length - 1] > tightest) bends.push(tightest);
  // How far out along the normal the leg may cross the wire and still pass
  // through it with real overlap: 0.2 mm of the two sections overlapping,
  // measured square to the wire. A post near a step cut's corner crosses
  // the gallery's corner side at 45°, where a step along the normal moves
  // the leg only 0.71 of it off the wire (and held to the normal step, an
  // emerald's corner prongs had to slant in close by the chamfer, S2).
  const perpMax = gallery ? Math.max(0, gr + half - 0.2) : 0;
  const offWire = (delta: number) =>
    Math.abs(polygonDistance(gallery!.path, [crossXY[0] - inward[0] * delta, crossXY[1] - inward[1] * delta]));
  let deltaMax = perpMax;
  if (gallery && perpMax > 0) {
    let lo = perpMax, hi = 2 * perpMax;
    if (offWire(hi) <= perpMax) lo = hi;
    else for (let k = 0; k < 30; k++) { const md = (lo + hi) / 2; if (offWire(md) <= perpMax) lo = md; else hi = md; }
    deltaMax = lo;
  }
  // Without a gallery the leg leaves the post itself, as in S1: no offset.
  const deltas = gallery
    ? [0, 0.1, 0.2, 0.35, 0.5, 0.7, 1, 1.4].filter((x) => x < deltaMax).concat(deltaMax > 0 ? [deltaMax] : [])
    : [0];

  type Chosen = Built & { r: number; drop: number; delta: number };
  let chosen: Chosen | null = null, mode: Mode = "clear";
  // A twin prong's answer first: a symmetric head lays out its prongs alike,
  // and the copies are then moved into place rather than rebuilt.
  for (const h of hints) {
    deepFoot = h.deep;
    const s = build(h.r, h.bend, h.mode, h.drop, h.delta, h.wrap, h.kick, h.fall, h.straight);
    if (Math.abs(s.bend - h.bend) < 1e-9 && ok(s, h.mode)) { chosen = { ...s, r: h.r, drop: h.drop, delta: h.delta }; mode = h.mode; break; }
  }
  // Then the requested bend high under the seat, then lower down the post;
  // through the gallery's centreline first, then further out on the wire.
  // First a leg that also meets the ball's gap, at the bend asked (the
  // default ring's legs do, crossing the wire a little further out); then
  // the section's exact gap alone, as in S1, which is what an oval's posts,
  // standing close beside the pavilion just under the seat, can keep. Only
  // when nothing does, the bends reaching into the wire (a small stone's low
  // gallery left no room round it: a three-stone's side stone, 0.62 × the
  // default ring's; and on a 0.25 ct round the knee fell below the joint,
  // and the leg crossed it half outside the disc the joint is measured in).
  const drops = [0, 0.5, 1, 1.5, 2, 3];
  // A leg that steps out under the seat (see build), as near the post as
  // keeps the gap: tried only once no straight leg does, first inside the
  // joint (stepping out clears the pavilion, and the run in through the
  // wire is then steep enough to land inside it: a 0.25 ct princess's
  // corner prongs, S2), and again, outside it, before the fallback.
  const kicked = (joint: boolean) => {
    if (!gallery) return null;
    wantJoint = joint; wantBall = false;
    for (const kick of [0.25, 0.35, 0.45, 0.6]) {
      for (const fall of [0.6, 0.8, 1.0, 1.3]) {
        for (const bend of bends) {
          for (const delta of deltas) {
            for (const wrap of [1, 0]) {
              for (const m of ["clear", "under-seat"] as Mode[]) {
                const found = search(bend, m, 0, delta, wrap, kick, fall);
                if (found) { mode = m; return found; }
              }
            }
          }
        }
      }
    }
    return null;
  };
  const tiers: ([boolean, boolean, number] | "kicked-joint" | "kicked")[] =
    [[true, true, 1], [true, false, 1], [true, false, 0], "kicked-joint", [false, false, 1], [false, false, 0], "kicked"];
  for (const deep of base ? [false, true] : [false]) {
  if (chosen) break;
  deepFoot = deep;
  for (const tier of tiers) {
    if (chosen) break;
    if (tier === "kicked-joint" || tier === "kicked") { chosen = kicked(tier === "kicked-joint"); continue; }
    const [joint, ball, wrap] = tier;
    wantJoint = joint; wantBall = ball;
    search:
    for (const bend of ball ? bends.slice(0, 1) : bends) {
      for (const delta of deltas) {
        for (const drop of drops) {
          for (const m of ["clear", "under-seat"] as Mode[]) {
            if (m === "under-seat" && drop > 0) continue;
            chosen = search(bend, m, drop, delta, wrap);
            if (chosen) { mode = m; break search; }
          }
        }
      }
    }
  }
  }
  wantJoint = false; wantBall = false;
  let clearanceMet = true;
  if (!chosen) {
    // Nothing meets every rule: keep the culet clear and the bend as asked,
    // and come as close to the pavilion clearance as the stone allows; the
    // head reports the gap it could keep (see layoutHead). Among legs within
    // a hair of the best, one that crosses the joint inside its disc.
    clearanceMet = false;
    let bestPav = -Infinity, bestJoint = false;
    // Only as far out along the normal as the overlap allows square to it:
    // the wider reach of an oblique crossing (see deltaMax) is for legs that
    // keep the gap with it; here, where none does, it only took the leg
    // further from the joint for a gap still short (a 0.25 ct emerald, S2).
    for (const deep of base ? [false, true] : [false]) {
    deepFoot = deep;
    for (const wrap of [1, 0]) {
      if (chosen) break;
      for (const delta of deltas.filter((x) => x <= perpMax + 1e-9)) {
        for (const drop of drops) {
          for (const x of base ? baseRs : stepped(rMin, rHi, 0.2)) {
            for (const m of ["clear", "under-seat"] as Mode[]) {
              if (m === "under-seat" && drop > 0) continue;
              for (const straight of base ? [true, false] : [false]) {
              const s = build(x, wantBend, m, drop, delta, wrap, 0, 0, straight);
              if (!(s.fits && footOut(s) && descends(s))) continue;
              const ms = measure(s);
              if (ms.culet < culetTarget || ms.other < 0 || (m === "clear" && ms.seat < outsideSeat)) continue;
              const j = inJoint(s);
              if (ms.pav > bestPav + 0.005 || (ms.pav > bestPav - 0.005 && j && !bestJoint)) {
                bestPav = Math.max(bestPav, ms.pav); bestJoint = j; chosen = { ...s, r: x, drop, delta }; mode = m;
              }
              }
            }
          }
        }
      }
    }
    if (chosen) break;
    }
    // Nothing keeps the culet and seat rules at all: any spine a sweep can
    // follow, tightest bend, bends in the wire; else the last one tried,
    // which layoutHead reports and the engine refuses to sweep.
    if (!chosen) {
      deepFoot = !!base;
      for (const x of base ? baseRs : stepped(rHi, rMin, -0.2)) {
        const s = build(x, tightest, "under-seat", 0, 0, 0);
        if (s.fits && (!base || footOut(s))) { chosen = { ...s, r: x, drop: 0, delta: 0 }; mode = "under-seat"; break; }
      }
    }
    const last = base ? baseRs[0] : rHi;
    if (!chosen) { chosen = { ...build(last, tightest, "under-seat", 0, 0, 0), r: last, drop: 0, delta: 0 }; mode = "under-seat"; }
  }
  const m = measure(chosen);
  return {
    choice: { r: chosen.r, bend: chosen.bend, mode, drop: chosen.drop, delta: chosen.delta, wrap: chosen.wrap, kick: chosen.kick, fall: chosen.fall, straight: chosen.straight, deep: chosen.deep } as LegChoice,
    fits: chosen.fits,
    spine: {
      points: chosen.points, bends: chosen.bends, gallery: chosen.gallery,
      pavilionClearance: m.pav,
      footInBand: chosen.inBand,
      footInBase: !!base && footOut(chosen),
      kick: chosen.kick,
    },
    mode,
    clearanceMet,
    otherShort: m.other < 0,
    bendClamped: chosen.bend < wantBend - 1e-9,
    bendUsed: (chosen.bend - half) / d,
  };
}

/**
 * Whether a sweep can follow this spine: at every inner point the bend's
 * tangent runs fit the straight runs either side of it, with 0.02 mm of
 * straight between two bends, 0.2 mm at the foot and 0.05 mm under the cap.
 * Two bends whose runs overlap make the path double back on itself, and OCCT
 * dies sweeping it (a 0.25 ct cushion three-stone's side head, S2 review).
 */
export function spineFits(points: V3[], bends: number[]): boolean {
  const n = points.length;
  const t = points.map((p, k) => {
    if (k === 0 || k === n - 1) return 0;
    const a = unitV(sub(points[k + 1], p)), b = unitV(sub(points[k - 1], p));
    const phi = Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
    return phi > Math.PI - 1e-6 ? 0 : bends[k - 1] / Math.tan(phi / 2);
  });
  for (let k = 0; k + 1 < n; k++) {
    const len = Math.hypot(...sub(points[k + 1], points[k]));
    const margin = k === 0 ? 0.2 : k + 1 === n - 1 ? 0.05 : 0.02;
    if (!(t[k] + t[k + 1] <= len - margin)) return false;
  }
  return true;
}

/**
 * Points along the prong's centreline with its direction there, foot to cap:
 * each straight run and each bend of the polyline `points` (bent at every
 * inner point by the matching radius in `bends`). The last run is the post.
 * `slack` is how far the round section of radius r at this point can be from
 * the sections either side (half the step, plus the turn through a bend), so
 * a bound taken at the samples and reduced by it holds for the whole tube.
 */
export function spineSamples(
  points: V3[], bends: number[], r: number, step = 0.05,
): { c: V3; t: V3; onPost: boolean; slack: number }[] {
  const out: { c: V3; t: V3; onPost: boolean; slack: number }[] = [];
  const line = (a: V3, b: V3, onPost: boolean) => {
    const L = Math.hypot(...sub(b, a));
    if (L < 1e-12) return;
    const n = Math.max(2, Math.ceil(L / step));
    const t = unitV(sub(b, a));
    for (let k = 0; k <= n; k++) out.push({ c: lerp(a, b, k / n), t, onPost, slack: L / n / 2 });
  };
  let from = points[0];
  for (let k = 1; k < points.length - 1; k++) {
    const toTop = unitV(sub(points[k + 1], points[k])), toFoot = unitV(sub(points[k - 1], points[k]));
    const arc = filletArc(points[k], toTop, toFoot, bends[k - 1]);
    line(from, arc.onLeg, false);
    const arcN = 32;
    const turn = Math.PI - Math.acos(Math.min(1, Math.max(-1, dot(toTop, toFoot))));
    const arcSlack = ((arc.tangentLength > 0 ? bends[k - 1] : 0) + r) * (turn / arcN) / 2;
    for (const { p, t } of arc.samples(arcN)) out.push({ c: p, t, onPost: false, slack: arcSlack });
    from = arc.onPost;
  }
  line(from, points[points.length - 1], true);
  return out;
}

/**
 * A lower bound on the distance from the stone to a whole round section of
 * the prong (centre c, axis t, radius r): the smallest, over the circle, of
 * the hull-plane bound clearanceBound gives at each point.
 *
 * Exact, not sampled. Round the circle each plane's signed distance is a
 * sinusoid, g + r(a cos θ + b sin θ), and the bound is the largest of them;
 * the lowest point of a maximum of sinusoids is either the lowest point of
 * one of them or a place where two cross, so those are the only angles to
 * try. Only planes within 2r of the best at the centre can ever be the
 * largest anywhere on the circle, which keeps it to a handful. (Eight points
 * round the circle, tried first, missed the true minimum by up to 0.03 mm.)
 */
let G = new Float64Array(256);
/**
 * `enough`: when even the crude bound (the centre's, less r) already reaches
 * it, that is returned without the exact work; a caller asking "is it at
 * least this far?" gets the same answer, much sooner. Planes are tried in
 * the order given, so a caller that puts the likeliest first stops sooner.
 */
export function circleBound(planes: HalfSpace[], c: V3, t: V3, r: number, enough = Infinity): number {
  const n = planes.length;
  if (G.length < n) G = new Float64Array(n * 2);
  let gmax = -Infinity;
  for (let j = 0; j < n; j++) {
    const p = planes[j];
    const v = p.n[0] * c[0] + p.n[1] * c[1] + p.n[2] * c[2] - p.h;
    // Every point of the circle is within r of c, and the bound moves no
    // faster than the point does, so v − r holds everywhere on it.
    if (v - r >= enough) return v - r;
    G[j] = v;
    if (v > gmax) gmax = v;
  }
  const a0 = Math.abs(t[2]) < 0.9 ? [0, 0, 1] as V3 : [1, 0, 0] as V3;
  const u = unitV(cross(t, a0)), w = cross(t, u);
  // Only planes within 2r of the best at the centre can be the largest
  // anywhere on the circle.
  let k = 0;
  for (let j = 0; j < n; j++) {
    if (G[j] >= gmax - 2 * r - 1e-12) {
      const pn = planes[j].n;
      CG[k] = G[j];
      CA[k] = r * (pn[0] * u[0] + pn[1] * u[1] + pn[2] * u[2]);
      CB[k] = r * (pn[0] * w[0] + pn[1] * w[1] + pn[2] * w[2]);
      if (++k === CG.length) break;
    }
  }
  const F = (th: number) => {
    const cs = Math.cos(th), sn = Math.sin(th);
    let m = -Infinity;
    for (let q = 0; q < k; q++) { const v = CG[q] + CA[q] * cs + CB[q] * sn; if (v > m) m = v; }
    return m;
  };
  let best = Infinity;
  for (let q = 0; q < k; q++) best = Math.min(best, F(Math.atan2(-CB[q], -CA[q])));
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const da = CA[i] - CA[j], db = CB[i] - CB[j];
      const R = Math.hypot(da, db), C = CG[j] - CG[i];
      if (R < 1e-15 || Math.abs(C) > R) continue;
      const phi = Math.atan2(db, da), off = Math.acos(C / R);
      best = Math.min(best, F(phi + off), F(phi - off));
    }
  }
  return best;
}
const CG = new Float64Array(64), CA = new Float64Array(64), CB = new Float64Array(64);

/** The planes, likeliest nearest first for a prong standing in direction psi. */
function facing(planes: HalfSpace[], psi: number): HalfSpace[] {
  const ux = Math.cos(psi), uy = Math.sin(psi);
  return [...planes].sort((a, b) => (b.n[0] * ux + b.n[1] * uy) - (a.n[0] * ux + a.n[1] * uy));
}

/**
 * The bend at a corner between two straight runs, as a circular arc tangent
 * to both. `a` and `b` are unit vectors pointing away from the corner along
 * each run. Shared with the engine so the swept prong and the clearance check
 * describe the same curve.
 */
export function filletArc(corner: V3, a: V3, b: V3, radius: number) {
  const cosPhi = Math.min(1, Math.max(-1, dot(a, b)));
  const phi = Math.acos(cosPhi);                  // the angle between the two runs
  const straight = phi > Math.PI - 1e-6 || radius <= 0;
  const t = straight ? 0 : radius / Math.tan(phi / 2);
  const onPost = add(corner, scale(a, t));
  const onLeg = add(corner, scale(b, t));
  const bis = unitV(add(a, b));
  const centre = straight ? corner : add(corner, scale(bis, radius / Math.sin(phi / 2)));
  const mid = straight ? corner : add(centre, scale(bis, -radius));
  return {
    onPost, onLeg, centre, mid, tangentLength: t,
    /** Points along the arc from the leg side to the post side, with tangents pointing post-wards. */
    samples(n: number): { p: V3; t: V3 }[] {
      if (straight) return [];
      const u0 = unitV(sub(onLeg, centre)), u1 = unitV(sub(onPost, centre));
      const ang = Math.acos(Math.min(1, Math.max(-1, dot(u0, u1))));
      const N = unitV(cross(u0, u1));            // the arc's plane
      const res: { p: V3; t: V3 }[] = [];
      for (let k = 0; k <= n; k++) {
        const s = k / n;
        const w0 = Math.sin((1 - s) * ang) / Math.sin(ang), w1 = Math.sin(s * ang) / Math.sin(ang);
        const r = unitV(add(scale(u0, w0), scale(u1, w1)));
        res.push({ p: add(centre, scale(r, radius)), t: cross(N, r) });
      }
      return res;
    },
  };
}

// ------------------------------------------------------------- vectors --

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitV = (a: V3): V3 => { const L = Math.hypot(...a) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
const lerp = (a: V3, b: V3, t: number): V3 =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const fmt = (n: number) => String(+n.toFixed(3));
