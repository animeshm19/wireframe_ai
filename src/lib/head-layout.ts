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
import type { BenchKey, BenchValues } from "./setting-standards";

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

export type LayoutWarning = { key: BenchKey; kind: "engine-clamped"; message: string };

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
  /** The as-cast spine, foot to cap: a straight leg, one bend, a vertical post. Absent without a band. */
  spine?: {
    foot: V3;
    corner: V3;
    top: V3;
    /** Centreline radius of the bend at the corner. */
    bendRadius: number;
    /** Lower bound on the clearance between the prong and the pavilion below girdle − d. */
    pavilionClearance: number;
    /** Whether the foot lands on band metal (a split shank's slot or a narrow band can leave it hanging). */
    footInBand: boolean;
  };
};

/**
 * The interim rail (S2 replaces it): a flat ring of square section, its
 * centre `centreR` out and `z` up, `half` either side of that in both.
 * Clearances are taken to its corners, `half × √2` out.
 */
export type RailPlan = { z: number; centreR: number; half: number };

export type HeadLayout = {
  stone: StoneProfile;
  prongs: ProngPlan[];
  /** The bench values actually built, after any engine clamp. */
  values: BenchValues;
  warnings: LayoutWarning[];
  /** The interim gallery rail (S2 replaces it). Null for a head without prongs. */
  rail: RailPlan | null;
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
  /**
   * Where the interim rail must run, when something else hangs off it: a
   * halo's bearers (round, radius `bearer`) run out from the head at height
   * `z` and are carried by the rail. The posts then stay straight down past it.
   */
  railAt?: { z: number; bearer: number };
};

/** Prong directions, unchanged from the first engine. */
export function prongAngles(cut: GemCut, prongCount: number): number[] {
  return Array.from({ length: prongCount },
    (_, i) => (i / prongCount) * Math.PI * 2 + (cut === "princess" ? Math.PI / 4 : 0));
}

/**
 * The whole as-cast head: seats, posts, legs and the interim rail.
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

  let rail: RailPlan | null = null;
  if (band && prongCount > 0) {
    const planes = hullPlanes(stone);
    let bendWarned = false;
    const grow = CORNER_FACTOR * tol;
    const seatPlanes = planes.map((pl) =>
      ({ n: pl.n, h: pl.h + grow * Math.hypot(pl.n[0], pl.n[1]) + tol * Math.abs(pl.n[2]) }));
    const choices: LegChoice[] = [];
    let short = Infinity;
    for (const p of prongs) {
      const r = layoutLeg(p, stone, values, band, planes, choices, avoid, avoidPoints,
        opts.railAt == null ? null : opts.railAt.z + opts.railAt.bearer * 0.5 - 0.34 * d * Math.SQRT2 - 0.1);
      if (!choices.some((c) => c.r === r.choice.r && c.bend === r.choice.bend && c.mode === r.choice.mode && c.drop === r.choice.drop)) choices.push(r.choice);
      p.spine = r.spine;
      if (r.bendClamped && !bendWarned) {
        bendWarned = true;
        warn("minBendRadius", `A bend of ${fmt(values.minBendRadius)} prong thicknesses does not fit between the seat and the band on this stone, so ${fmt(r.bendUsed)} is used.`);
      }
      if (!r.clearanceMet) short = Math.min(short, r.spine.pavilionClearance);
      if (r.otherShort) blocked ??= `prong ${p.index + 1}'s leg cannot keep clear of the next stone`;
      // The seat cutter, cut down to a box round every part of this prong
      // that comes within reach of the envelope: the post's seat, and the
      // bend too when the bend had to start under the seat.
      if (matchingProng(stone, prongs, p.index)) { p.seatCutter = null; continue; }
      // The post's own span is exact in height, since the post is upright;
      // anything else near the seat (a bend started under it) gets the full
      // margin. Kept off the bend otherwise: a box reaching down into the
      // bend hands OCCT a torus to intersect, the slow case.
      // In the frame of the girdle's normal at this prong, so the box takes
      // in only the envelope's faces the post faces, not its neighbours'
      // (fewer faces, a quicker cut).
      const m = d / 2 + 0.05;
      const u = p.normal;
      const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
      const grow = (c: V3, mz: number) => {
        const q: V3 = [c[0] * u[0] + c[1] * u[1], -c[0] * u[1] + c[1] * u[0], c[2]];
        for (let k = 0; k < 3; k++) {
          const mk = k === 2 ? mz : m;
          lo[k] = Math.min(lo[k], q[k] - mk); hi[k] = Math.max(hi[k], q[k] + mk);
        }
      };
      grow([p.postCentre[0], p.postCentre[1], p.seatLow - 0.05], 0.02);
      grow([p.postCentre[0], p.postCentre[1], p.seatHigh + 0.05], 0.02);
      for (const { c, t, onPost, slack } of spineSamples(r.spine.foot, r.spine.corner, r.spine.top, r.spine.bendRadius, d / 2)) {
        if (!onPost && circleBound(seatPlanes, c, t, d / 2) - slack < 0.03) grow(c, m);
      }
      p.seatCutter = clipConvex(orientedBoxFaces(u, lo, hi), envPlanes);
    }

    // A gap the legs could not keep on this stone is clamped to the one they
    // do keep, and said so: until S3 gives the head a base, a prong standing
    // beyond the band's edge must bring its foot back under the stone, and
    // just below the seat its post is no further from the pavilion than the
    // seat put it (default ring, 0.6 mm asked: 0.327 kept at 60°).
    if (Number.isFinite(short)) {
      const kept = Math.floor(short * 1000) / 1000;
      warn("pavilionClearance", `Gap between prongs and the stone below the seat: ${fmt(values.pavilionClearance)} mm cannot be kept on this stone, so ${fmt(kept)} mm is used.`);
      values.pavilionClearance = kept;
    }

    // The interim rail, at the height the first engine's rail sat as a share
    // of its prong (55% of the way up from a base 0.6 mm below the culet),
    // but never up in the legs' bends: a torus crossing a torus is the
    // slowest intersection OCCT has, and the merge took 1.2 s on that one
    // fuse when the rail crossed the bends (S1). It crosses the straight legs.
    // Square section, about the old round wire's area; tubeR is how far its
    // corners reach, which every clearance below is taken to.
    const half = 0.34 * d;
    const tubeR = half * Math.SQRT2;
    const oldZ = -0.6 + 0.55 * (stone.zGt + stone.crownH / 2 + 0.6);
    const bendBottom = Math.min(...prongs.map((p) => {
      const sp = p.spine!;
      return filletArc(sp.corner, [0, 0, 1], unitV(sub(sp.foot, sp.corner)), sp.bendRadius).onLeg[2];
    }));
    const footTop = Math.max(...prongs.map((p) => p.spine!.foot[2]));
    let z = Math.max(footTop + tubeR + 0.3, Math.min(oldZ, bendBottom - tubeR - 0.05));
    if (opts.railAt) {
      // Through the bearers, but with the rail's flat top and bottom well off
      // the bearers' own top and bottom: level with them is a tangent contact,
      // and on a 1 ct cushion halo (bearer radius 0.284, rail half 0.284) the
      // fuse sealed two specks of air inside the metal, which STEP then
      // writes as a solid with voids rather than one manifold solid (S1).
      const { z: zb, bearer: rb } = opts.railAt;
      const clean = (dz: number) => Math.abs(dz + half - rb) > 0.06 && Math.abs(dz - half + rb) > 0.06 &&
        Math.abs(dz + half + rb) > 0.06 && Math.abs(dz - half - rb) > 0.06;
      const shift = [0, 0.1, -0.1, 0.15, -0.15, 0.2, -0.2].map((k) => k * Math.max(rb, half) * 2)
        .find((dz) => Math.abs(dz) < rb + half - 0.1 && clean(dz)) ?? 0;
      z = zb + shift;
    }
    const radiusAt = (zz: number) => {
      const radii = prongs.map((p) => spineRadiusAt(p.spine!, zz));
      return radii.reduce((t, x) => t + x, 0) / radii.length;
    };
    // Never grazing the band: a torus resting a hair above a curved band is a
    // near-tangent contact, and that is where OCCT's fuse fails (a three-stone
    // side rail came back at −147 mm³, S1). Lifted clear of the band under it.
    for (let k = 0; k < 3; k++) {
      const r = radiusAt(z);
      let under = -Infinity;
      for (let q = 0; q < 48; q++) {
        const a = (q / 48) * Math.PI * 2;
        for (const rr of [r - tubeR, r, r + tubeR]) {
          const hit = band.at(rr * Math.cos(a), rr * Math.sin(a));
          if (hit) under = Math.max(under, hit.top);
        }
      }
      if (under + tubeR + 0.1 <= z) break;
      z = under + tubeR + 0.1;
    }
    const centreR = radiusAt(z);
    // The envelope's widest over the whole height of the tube, not at its centre.
    const widest = Math.max(...[-1, -0.5, 0, 0.5, 1].map((k) => scaleAt(env, z + k * tubeR)));
    const hullR = widest * Math.max(...stone.girdle.map(([x, y]) => Math.hypot(x, y)));
    // Kept clear of the seat envelope all the way round rather than cut by
    // it. Through the legs of a round stone it is clear anyway; on a long
    // stone a circle at the legs' mean radius runs through the narrow sides,
    // and OCCT cutting a torus by the envelope's planes failed outright there
    // (marquise: 5.334 → −0.123 mm³, S1). Pushed out, it can only miss the
    // stone, which the audit checks; S2 replaces it with a rail that follows
    // the stone.
    const clear = hullR + CORNER_FACTOR * tol + tubeR + 0.05;
    // A rail must cross each prong cleanly or miss it cleanly: a torus that
    // only grazes a prong is a near-tangent contact, the case OCCT's fuse
    // gets wrong (a 3 ct emerald's rail, pushed out to clear the long stone,
    // passed 0.13 mm from two legs and the fuse dropped it, S1). And it must
    // cross at least one, or it is a loose ring of metal.
    const fit = (zz: number, RR: number) => {
      let crosses = 0;
      for (const p of prongs) {
        let dmin = Infinity;
        for (const { c } of spineSamples(p.spine!.foot, p.spine!.corner, p.spine!.top, p.spine!.bendRadius, d / 2, 0.05)) {
          const radial = Math.hypot(c[0], c[1]) - RR;
          dmin = Math.min(dmin, Math.hypot(radial, c[2] - zz));
        }
        // Crossing is judged on the section's flat sides, missing on its corners.
        if (dmin > half + d / 2 - 0.3 && dmin < tubeR + d / 2 + 0.15) return false;
        if (dmin <= half + d / 2 - 0.3) crosses++;
      }
      return crosses > 0;
    };
    // Outward from where it would sit, in 0.05 mm steps, to the first radius
    // that fits; if none within 2 mm does, it stays where it was.
    let R = Math.max(centreR, clear);
    for (let k = 0; k <= 40; k++) { if (fit(z, R + k * 0.05)) { R += k * 0.05; break; } }
    // And clear of any other stone or point. If the rail cannot be, it moves
    // up or down the legs to where it is; failing that this head goes without
    // it, which is safe only because every foot stands in the band.
    const railClear = (zz: number, RR: number) => {
      for (let q = 0; q < 48; q++) {
        const a = (q / 48) * Math.PI * 2;
        const c: V3 = [RR * Math.cos(a), RR * Math.sin(a), zz];
        const t: V3 = [-Math.sin(a), Math.cos(a), 0];
        const slack = (RR + tubeR) * (Math.PI / 48);
        if (avoid.some((o) => circleBound(o.planes, c, t, tubeR) - slack < o.clearance)) return false;
        if (avoidPoints.some((o) => Math.hypot(c[0] - o.p[0], c[1] - o.p[1], c[2] - o.p[2]) - tubeR - slack < o.r)) return false;
      }
      return true;
    };
    if (railClear(z, R)) {
      rail = { z, centreR: R, half };
    } else {
      const lo = footTop + tubeR + 0.3, hi = bendBottom - tubeR - 0.05;
      for (let k = 1; k * 0.1 <= Math.max(z - lo, hi - z) + 1e-9 && !rail; k++) {
        for (const zz of [z + k * 0.1, z - k * 0.1]) {
          if (zz < lo || zz > hi) continue;
          const RR = Math.max(radiusAt(zz), clear);
          if (railClear(zz, RR)) { rail = { z: zz, centreR: RR, half }; break; }
        }
      }
      if (!rail && prongs.some((p) => !p.spine!.footInBand)) {
        // A prong with no foot in the band needs the rail to hold it.
        rail = { z, centreR: R, half };
        blocked ??= "the rail cannot keep clear of the next stone, and a prong needs it";
      }
    }
  }

  return { stone, prongs, values, warnings, rail, blocked };
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
      if (!pi.spine || Math.abs(pi.d - pj.d) > TOL || Math.abs(pi.spine.bendRadius - pj.spine.bendRadius) > TOL) continue;
      const half = (psi(pi) + psi(pj)) / 2;
      const moves: HeadSymmetry[] = kind === "rotate"
        ? [{ kind: "rotate", angle: psi(pj) - psi(pi) }]
        : [{ kind: "mirror", normal: [-Math.sin(half), Math.cos(half)] },
          { kind: "mirror", normal: [Math.cos(half), Math.sin(half)] }];
      for (const move of moves) {
        const a = pi.spine, b = pj.spine;
        if (same(applySymmetry(move, a.foot), b.foot) && same(applySymmetry(move, a.corner), b.corner) &&
            same(applySymmetry(move, a.top), b.top) && keepsGirdle(move)) {
          return { from: i, move };
        }
      }
    }
  }
  return null;
}

/** How far the spine's centreline is from the head axis at height z. */
function spineRadiusAt(s: NonNullable<ProngPlan["spine"]>, z: number): number {
  if (z >= s.corner[2]) return Math.hypot(s.corner[0], s.corner[1]);
  const t = (z - s.foot[2]) / (s.corner[2] - s.foot[2]);
  const q = lerp(s.foot, s.corner, Math.min(1, Math.max(0, t)));
  return Math.hypot(q[0], q[1]);
}

/**
 * One prong's leg: from the bottom of its post, straight down to a foot in
 * the band, bending once.
 *
 * The leg leans in as far as the stone allows. Its foot is placed on a line
 * out from the head axis, and pulled in along the finger axis until it lands
 * on the band. The smallest distance out wins that keeps
 *   - every part of the prong below girdle − d at least pavilionClearance
 *     from the stone,
 *   - every part of the prong at least culetClearance from the culet, so the
 *     band alone is nearest it, and the foot outside a cylinder of that
 *     radius round the axis,
 *   - and, normally, the bend and leg out of the seat envelope, so the seat
 *     cut meets only the straight post (it is the fast case, see below).
 *
 * Where no foot position can meet all of that (a 2 mm prong on the narrow
 * side of a marquise, with a 0.6 mm gap and the gentlest bend: the post is
 * still beside the pavilion where the gap is first measured), the bend is
 * allowed to start right under the seat instead, and the seat is cut through
 * it, which is slower but exact. Failing that the bend is tightened below
 * minBendRadius, and that is reported.
 */
type LegChoice = { r: number; bend: number; mode: "clear" | "under-seat"; drop: number };

function layoutLeg(
  p: ProngPlan, stone: StoneProfile, v: BenchValues, band: BandProbe, planes: HalfSpace[],
  hints: LegChoice[] = [],
  avoid: { planes: HalfSpace[]; clearance: number }[] = [],
  avoidPoints: { p: V3; r: number }[] = [],
  /** If set, the post runs straight down at least to here before it bends. */
  straightTo: number | null = null,
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

  // The band's metal along the finger axis, shrunk so a whole foot fits.
  let lo = band.axialMin > 0 ? band.axialMin + half + 0.05 : 0;
  let hi = band.axialMax - half - 0.1;
  if (lo > hi) lo = hi = Math.max(0, (lo + hi) / 2);

  const footXY = (r: number): V2 => {
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
  const build = (r: number, bend: number, mode: Mode, drop = 0) => {
    const fxy = footXY(r);
    const probe = band.at(fxy[0], fxy[1]);
    let cz = stone.zGb - 0.3;
    let foot: V3 = [fxy[0], fxy[1], band.topOnAxis - 0.45];
    let used = bend;
    for (let k = 0; k < 6; k++) {
      const corner: V3 = [c[0], c[1], cz];
      const dir = unitV(sub(foot, corner));
      const tilt = Math.acos(Math.min(1, Math.max(-1, -dir[2])));
      if (probe) {
        // Seven tenths of the way through the band, never nearer its bore
        // than 0.15 mm. Deep rather than just under the surface on purpose:
        // OCCT fuses a leg into a domed band seven times faster when its end
        // is well inside (S1, default ring: 0.45 mm in, 343 ms; 1.15 mm in,
        // 58 ms), and the foot holds more metal in the band either way.
        const slant = half * Math.sin(tilt);
        const embed = Math.max(0.45, 0.7 * (probe.top - probe.bottom));
        foot = [fxy[0], fxy[1], Math.max(probe.top - embed, probe.bottom + slant + 0.15)];
      }
      const legLen = Math.hypot(...sub(foot, corner));
      used = bend;
      let t1 = used * Math.tan(tilt / 2);
      if (t1 > legLen - 0.2) {
        t1 = Math.max(0, legLen - 0.2);
        used = Math.tan(tilt / 2) > 1e-9 ? t1 / Math.tan(tilt / 2) : bend;
      }
      // Normally the bend starts only once the post is clear of the seat all
      // round, so the cut never meets the bend: a torus against a plane is
      // the slowest intersection OCCT has (28 ms a prong when measured).
      cz = (mode === "clear" ? p.seatLow - 0.1 : stone.zGb - 0.02) - t1 - drop;
    }
    return { foot, corner: [c[0], c[1], cz] as V3, bend: used, inBand: !!probe };
  };
  type Built = ReturnType<typeof build>;

  const measure = (s: Built) => {
    let pav = Infinity, seat = Infinity, culet = Infinity, other = Infinity;
    for (const { c: q, t, onPost, slack } of spineSamples(s.foot, s.corner, top, s.bend, half)) {
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
      if (low) pav = Math.min(pav, circleBound(planes, q, t, half, target + slack + 0.2) - slack);
      if (!onPost) seat = Math.min(seat, circleBound(seatPlanes, q, t, half, outsideSeat + slack + 0.2) - slack);
    }
    return { pav, seat, culet, other };
  };
  // The foot stands outside a cylinder of culetClearance round the axis; the
  // rest of the prong is held to the culet by the exact distance above.
  const footOut = (s: Built) => Math.hypot(s.foot[0], s.foot[1]) >= rMin - 1e-9;
  // A leg goes down to its foot: at least 0.3 mm of fall for every mm across
  // (a lowered corner once ended under its own foot, the "leg" climbing back
  // up into the band, and OCCT's fuse returned the prong alone).
  const descends = (s: Built) => {
    const across = Math.hypot(s.foot[0] - s.corner[0], s.foot[1] - s.corner[1]);
    return s.corner[2] - s.foot[2] >= Math.max(0.3, 0.3 * across);
  };
  // Where the structure audit takes the joint (I7): band top + 0.10 on the
  // axis, within 1.2 × the girdle radius. Legs that cross it inside that disc
  // carry their whole section into the measure, as the first engine's did;
  // preferred, and dropped only when nothing else fits.
  const jointZ = band.topOnAxis + 0.1, jointR = 1.2 * stone.girdleR;
  let wantJoint = true;
  const inJoint = (s: Built) => {
    const dir = unitV(sub(s.corner, s.foot));
    if (dir[2] <= 1e-6 || s.foot[2] > jointZ) return true;
    const t = (jointZ - s.foot[2]) / dir[2];
    const q = add(s.foot, scale(dir, t));
    return Math.hypot(q[0], q[1]) + half / Math.max(0.2, dir[2]) <= jointR - 0.02;
  };
  const straight = (s: Built) => straightTo == null || s.corner[2] + (s.bend * Math.tan(
    Math.acos(Math.min(1, Math.max(-1, -unitV(sub(s.foot, s.corner))[2]))) / 2)) <= straightTo + 1e-9;
  const ok = (s: Built, mode: Mode) => {
    if (!footOut(s) || !descends(s) || !straight(s) || (wantJoint && !inJoint(s))) return false;
    const m = measure(s);
    return m.pav >= target && m.culet >= culetTarget && m.other >= 0 && (mode === "under-seat" || m.seat >= outsideSeat);
  };

  const rHi = Math.hypot(c[0], c[1]) + 3 * d;
  const search = (bend: number, mode: Mode, drop: number): (Built & { r: number; drop: number }) | null => {
    const at = (r: number) => ({ ...build(r, bend, mode, drop), r, drop });
    if (ok(build(rMin, bend, mode, drop), mode)) return at(rMin);
    let prev = rMin;
    for (let x = rMin + 0.4; x <= rHi + 0.4 - 1e-9; x += 0.4) {
      const xx = Math.min(x, rHi);
      if (ok(build(xx, bend, mode, drop), mode)) {
        let a = prev, b = xx;
        for (let k = 0; k < 9; k++) { const mid = (a + b) / 2; if (ok(build(mid, bend, mode, drop), mode)) b = mid; else a = mid; }
        return at(b);
      }
      prev = xx;
    }
    return null;
  };

  const wantBend = v.minBendRadius * d + half;
  const tightest = 0.5 * d + half;          // the bench field's own minimum
  const bends = [wantBend];
  for (let f = 0.75; wantBend * f > tightest; f *= 0.75) bends.push(wantBend * f);
  if (bends[bends.length - 1] > tightest) bends.push(tightest);

  let chosen: (Built & { r?: number; drop?: number }) | null = null, mode: Mode = "clear";
  // A twin prong's answer first: a symmetric head lays out its prongs alike,
  // and the copies are then moved into place rather than rebuilt.
  for (const h of hints) {
    const s = build(h.r, h.bend, h.mode, h.drop);
    if (Math.abs(s.bend - h.bend) < 1e-9 && ok(s, h.mode)) { chosen = { ...s, r: h.r, drop: h.drop }; mode = h.mode; break; }
  }
  // Then the requested bend high under the seat, then lower down the post:
  // a prong standing beyond the band's edge has to tuck its foot back under
  // the stone, and a leg that leaves the post high runs close along the
  // pavilion to get there (default ring, prongs at 60°, 0.6 mm asked: 0.31
  // reachable). Keeping the post straight until the pavilion has narrowed
  // clears it. Only then the seat-side bend, then a tighter bend.
  const drops = [0, 0.5, 1, 1.5, 2, 3];
  for (const joint of [true, false]) {
    wantJoint = joint;
    search:
    for (const bend of chosen ? [] : bends) {
      for (const drop of drops) {
        for (const m of ["clear", "under-seat"] as Mode[]) {
          if (m === "under-seat" && drop > 0) continue;
          chosen = search(bend, m, drop);
          if (chosen) { mode = m; break search; }
        }
      }
    }
    if (chosen) break;
  }
  wantJoint = false;
  let clearanceMet = true;
  if (!chosen) {
    // Nothing meets every rule: keep the culet clear and the bend as asked,
    // and come as close to the pavilion clearance as the stone allows; the
    // head reports the gap it could keep (see layoutHead).
    clearanceMet = false;
    // Inside the joint disc if any such leg exists, as the main search prefers.
    for (const joint of [true, false]) {
      let bestPav = -Infinity;
      for (const drop of drops) {
        for (let x = rMin; x <= rHi + 1e-9; x += 0.2) {
          const s = build(x, wantBend, "clear", drop);
          if (joint && !inJoint(s)) continue;
          const ms = measure(s);
          if (ms.culet >= culetTarget && ms.other >= 0 && ms.seat >= outsideSeat && footOut(s) && descends(s) &&
              straight(s) && ms.pav > bestPav + 1e-9) {
            bestPav = ms.pav; chosen = { ...s, r: x, drop }; mode = "clear";
          }
        }
      }
      if (chosen) break;
    }
    chosen ??= { ...build(rHi, tightest, "under-seat"), r: rHi, drop: 0 };
  }
  const m = measure(chosen);
  return {
    choice: { r: chosen.r ?? rMin, bend: chosen.bend, mode, drop: chosen.drop ?? 0 } as LegChoice,
    spine: {
      foot: chosen.foot, corner: chosen.corner, top, bendRadius: chosen.bend,
      pavilionClearance: m.pav,
      footInBand: chosen.inBand,
    },
    mode,
    clearanceMet,
    otherShort: m.other < 0,
    bendClamped: chosen.bend < wantBend - 1e-9,
    bendUsed: (chosen.bend - half) / d,
  };
}

/**
 * Points along the prong's centreline with its direction there: the leg, the
 * bend and the post, foot to cap. `slack` is how far the round section of
 * radius r at this point can be from the sections either side (half the
 * step, plus the turn through the bend), so a bound taken at the samples and
 * reduced by it holds for the whole tube between them.
 */
export function spineSamples(
  foot: V3, corner: V3, top: V3, bend: number, r: number, step = 0.05,
): { c: V3; t: V3; onPost: boolean; slack: number }[] {
  const out: { c: V3; t: V3; onPost: boolean; slack: number }[] = [];
  const legDir = unitV(sub(foot, corner));
  const up: V3 = unitV(sub(top, corner));
  const arc = filletArc(corner, up, legDir, bend);
  const legLen = Math.hypot(...sub(foot, arc.onLeg));
  const n = Math.max(2, Math.ceil(legLen / step));
  const legSlack = legLen / n / 2;
  for (let k = 0; k <= n; k++) out.push({ c: lerp(foot, arc.onLeg, k / n), t: legDir, onPost: false, slack: legSlack });
  const arcN = 32;
  const turn = Math.PI - Math.acos(Math.min(1, Math.max(-1, dot(up, legDir))));
  const arcSlack = ((arc.tangentLength > 0 ? bend : 0) + r) * (turn / arcN) / 2;
  for (const { p, t } of arc.samples(arcN)) out.push({ c: p, t, onPost: false, slack: arcSlack });
  const postLen = top[2] - arc.onPost[2];
  const m = Math.max(2, Math.ceil(postLen / step));
  const postSlack = postLen / m / 2;
  for (let k = 0; k <= m; k++) out.push({ c: lerp(arc.onPost, top, k / m), t: up, onPost: true, slack: postSlack });
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
