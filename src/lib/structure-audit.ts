/**
 * The structure audit: measures how a ring's head is actually built.
 *
 * Kernel-side, compiled into .brepcheck with the engine and driven one design
 * per Node process by scripts/structure-audit.mjs. It returns plain numbers
 * and no verdicts: whether a number passes is the invariant table's business
 * (scripts/structure-invariants.mjs), so moving a threshold never means
 * re-measuring, and a report from one prompt can be judged by the next.
 *
 * Everything measured here is measured, never inferred from parameters. The
 * engine already knew where it put the culet; what nobody knew until an
 * independent audit was that the culet sat 0.35mm inside the band. Every
 * question below is asked of the solids themselves, with OCCT's own booleans
 * and distance queries, and every boolean is checked the way fuseMetal checks
 * its own: an intersection can never be larger than either input, and one
 * that is has failed without saying so.
 *
 * Distances in mm, volumes in mm³, areas in mm², times in ms.
 */
import {
  draw, makeCircle, makeCompound, makeFace, makeLine, makeSphere, makeVertex,
  assembleWire, measureArea, measureDistanceBetween, measureShapeVolumeProperties,
  measureVolume, Plane,
  type Shape3D, type AnyShape,
} from "replicad";
import {
  buildRingParts, fuseMetal, toSTEP, toSTL,
  type PartRole, type StoneRole, type HeadFrame, type HeadName,
} from "./cad-engine-brep.js";
import { gemDims } from "./cad-engine.js";
import type { ResolvedBench } from "./setting-standards.js";
import { checkStl, type StlCheck } from "./stl-check.js";

type V3 = [number, number, number];

export type StoneAudit = {
  index: number;
  role: StoneRole["role"];
  head?: HeadName;
  volume: number;
  /** Volume of merged metal ∩ this stone. */
  overlapWithMetal: number;
  /**
   * Signed: the distance from the culet to the merged metal, or, when the
   * culet is inside the metal, minus its distance to the metal's surface.
   */
  culetClearance: number;
  culetInside: boolean;
};

export type ProngAudit = {
  head: HeadName;
  index: number;
  inBand: number;
  inStone: number;
  inGallery: number;
  inBase: number;
  /** 0 when touching or overlapping. */
  clearanceToStone: number;
};

/**
 * One prong's seat and as-cast shape, measured with straight-line probes in
 * the plane that holds the head axis and the girdle's normal at the prong,
 * through the post's centre. Positions along the normal (u) are measured from
 * the stone's girdle point, outward positive.
 */
export type BearingAudit = {
  head: HeadName;
  index: number;
  /** Innermost prong metal across the girdle band: the seat's floor. */
  notchFloor: number;
  /** Innermost prong metal at measureZ, where the crown seat no longer reaches. */
  postFace: number;
  /** notchFloor − postFace: how deep the seat is cut into the prong. */
  notch: number;
  /** The post's width along the normal at measureZ: its diameter. */
  postWidth: number;
  /** The stone's outermost point along the same line, mid-girdle. */
  stoneEdge: number;
  /** notchFloor − stoneEdge: the room round the stone in its seat. */
  seatGap: number;
  /** The prong's highest point above the culet, along the head axis. */
  top: number;
  /** Distance from the stone to the part of the prong below girdle − d. */
  pavilionClearance: number;
  /** What this head was built to, for judging the numbers above. */
  expected: { d: number; notch: number; top: number; seatTolerance: number; pavilionClearance: number };
};

export type GalleryAudit = {
  head: HeadName;
  part: number;
  inStone: number;
  clearanceToStone: number;
  /** The gallery's centroid, measured up the head axis from the culet. */
  centreHeightAboveCulet: number;
  /** Where the fixed rule puts it: halfway from culet to girdle. */
  ruleOfThirdsHeight: number;
  /** Smallest dimension of its section in a half-plane between two prongs. */
  thicknessEstimate: number;
  /** Prongs of the same head with more than 0.02 mm³ inside it. */
  prongsTouched: number;
  prongCount: number;
  /**
   * The bench values this head is judged by. Automatic values follow the
   * stone, so a three-stone's side head (0.62 × the centre's girdle) gets its
   * own gallery thickness rather than the centre stone's.
   */
  bench: { galleryClearance: number; galleryThickness: number };
};

export type StructureAudit = {
  spec: Record<string, unknown>;
  bench: ResolvedBench;
  solidCount: number;
  dropped: number;
  metalVolume: number;
  partCount: number;
  stones: StoneAudit[];
  centre: {
    culetClearance: number;
    culetInside: boolean;
    /** Culet height above the band's top along the head axis; negative is inside the band. */
    culetAboveBandTop: number;
    culet: V3;
    bandTop: number;
  };
  prongs: ProngAudit[];
  bearings: BearingAudit[];
  galleries: GalleryAudit[];
  joint: {
    /** Metal section at band-top + 0.10 mm, within girdleR × 1.2 of the head axis. */
    jointSectionArea: number;
    prongSectionSum: number;
    prongDiameter: number;
    ratio: number;
  } | null;
  /** Pairwise stone ∩ stone, every pair whose boxes meet. */
  stonePairs: { a: number; b: number; volume: number }[];
  maxStoneStoneOverlap: number;
  stl: StlCheck | null;
  step: {
    manifoldSolidBreps: number;
    /** MANIFOLD_SOLID_BREP in a metal-only export. */
    metalSolidBreps: number;
    advancedFaces: number;
    metalAdvancedFaces: number;
    triangulated: number;
    names: string[];
  } | null;
  timing: { buildMs: number; fuseMs: number; measureMs: number; totalMs: number };
  /** Booleans that failed or returned impossible answers. Never swallowed. */
  errors: string[];
};

/** STL and STEP checks of the merged metal, exactly as the app exports it. */
async function exportChecks(
  metal: Shape3D, stones: Shape3D[], opts: AuditOptions, errors: string[],
): Promise<{ stl: StlCheck | null; step: StructureAudit["step"] }> {
  let stl: StlCheck | null = null;
  if (opts.stl !== false) {
    try {
      stl = checkStl(new Uint8Array(await toSTL(metal, opts.stlTolerance ?? 0.01).arrayBuffer()));
    } catch (e) { errors.push(`STL threw ${(e as Error)?.message ?? e}`); }
  }

  let step: StructureAudit["step"] = null;
  if (opts.step !== false) {
    try {
      const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;
      const full = await toSTEP(metal, stones).text();
      // A metal-only file too, so "metal is one solid" is read from the STEP
      // rather than assumed from which entity came first in the combined one.
      const alone = await toSTEP(metal, null).text();
      step = {
        manifoldSolidBreps: count(full, /MANIFOLD_SOLID_BREP/g),
        metalSolidBreps: count(alone, /MANIFOLD_SOLID_BREP/g),
        advancedFaces: count(full, /ADVANCED_FACE/g),
        metalAdvancedFaces: count(alone, /ADVANCED_FACE/g),
        triangulated: count(full, /TRIANGULATED_FACE|TESSELLATED_\w+|FACETED_BREP/g),
        names: [...full.matchAll(/PRODUCT\('([^']*)'/g)].map((m) => m[1]),
      };
    } catch (e) { errors.push(`STEP threw ${(e as Error)?.message ?? e}`); }
  }
  return { stl, step };
}

export type AuditOptions = {
  stl?: boolean;
  step?: boolean;
  /** toSTL deflection; the app's export uses 0.01. */
  stlTolerance?: number;
};

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (a: V3): V3 => { const L = Math.hypot(...a); return [a[0] / L, a[1] / L, a[2] / L]; };

export async function auditStructure(
  spec: Record<string, unknown>, opts: AuditOptions = {},
): Promise<StructureAudit> {
  const errors: string[] = [];
  const t0 = performance.now();
  const fused = buildRingParts(spec, { seats: true });
  const t1 = performance.now();
  const { metal, dropped } = fuseMetal(fused.metalParts);
  const t2 = performance.now();

  // The files first, straight off the fuse, as the app exports them: every
  // boolean the audit runs afterwards can retune tolerances on the shapes it
  // touches, and the STL and STEP measured must be the ones a customer gets.
  const { stl, step } = await exportChecks(metal, fused.stones, opts, errors);

  // A second, untouched build for the per-part questions. OCCT's fuse adjusts
  // tolerances on its INPUTS: measured in S0, slicing a gallery after
  // fuseMetal had seen it returned an empty section on a pear cathedral and a
  // 0.25 ct oval halo, where the same slice of a fresh part read 0.6389 and
  // 0.5556 mm. The build is deterministic, so this is the same ring.
  const parts = buildRingParts(spec, { seats: true });
  const { metalParts, metalRoles, stoneRoles, heads, dims } = parts;
  // Stones from the fused build: the culet and overlap questions are asked of
  // the merged metal, which is the fused build's.
  const stones = fused.stones;
  // The values the engine actually built with: resolveBench's clamps and
  // then any engine clamp (since S1), as the engine reports them.
  const bench = parts.bench;

  const vol = (s: Shape3D) => measureVolume(s);
  const vols = new Map<AnyShape, number>();
  const volOf = (s: Shape3D) => { let v = vols.get(s); if (v === undefined) { v = vol(s); vols.set(s, v); } return v; };

  const common = (a: Shape3D, b: Shape3D, what: string): number => {
    try { return overlapVolume(a, b, volOf); } catch (e) {
      errors.push(`${what}: ${(e as Error)?.message ?? e}`);
      return NaN;
    }
  };
  const distance = (a: AnyShape, b: AnyShape, what: string): number => {
    try { return measureDistanceBetween(a, b); } catch (e) {
      errors.push(`${what}: distance threw ${(e as Error)?.message ?? e}`);
      return NaN;
    }
  };

  // Built once: every culet inside the metal is measured against it.
  let skin: AnyShape | null = null;
  const culetOf = (culet: V3, what: string) => {
    try {
      const r = signedDepth(culet, metal, (skin ??= skinOf(metal)));
      return { clearance: r.depth, inside: r.inside };
    } catch (e) {
      errors.push(`${what} culet: ${(e as Error)?.message ?? e}`);
      return { clearance: NaN, inside: false };
    }
  };

  // ------------------------------------------------------------- stones --
  const stoneAudits: StoneAudit[] = stones.map((s, i) => {
    const r = stoneRoles[i];
    const c = culetOf(r.culet, `stone ${i}`);
    return {
      index: i, role: r.role, head: r.head,
      volume: volOf(s),
      overlapWithMetal: common(metal, s, `metal ∩ stone ${i}`),
      culetClearance: c.clearance, culetInside: c.inside,
    };
  });

  const centreFrame = heads[0];
  const bandTop = dims.outerR;
  const centre = {
    culetClearance: stoneAudits[0].culetClearance,
    culetInside: stoneAudits[0].culetInside,
    // The centre head's axis runs out from the finger's axis through the
    // top of the band, so the band's top on it is simply outerR along it.
    culetAboveBandTop: dot(centreFrame.culet, centreFrame.axis) - bandTop,
    culet: centreFrame.culet,
    bandTop,
  };

  // -------------------------------------------------------------- parts --
  const idx = (pred: (r: PartRole) => boolean) =>
    metalRoles.map((r, i) => (pred(r) ? i : -1)).filter((i) => i >= 0);
  const bandIdx = idx((r) => r.role === "band");
  const galleryIdx = idx((r) => r.role === "gallery");
  const baseIdx = idx((r) => r.role === "base");
  const stoneFor = (head: HeadName | undefined) =>
    stoneRoles.findIndex((r) => r.head === head && (r.role === "centre" || r.role === "side"));
  const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);

  // Sliced before any other boolean touches these parts (see the second build).
  const sections = galleryIdx.map((g) => {
    const r = metalRoles[g];
    return sectionThickness(metalParts[g], heads.find((h) => h.head === r.head)!, `${r.head} gallery ${g}`);
  });

  const prongAudits: ProngAudit[] = [];
  // Centre head first, then each side head, as the roles already order them.
  for (const i of idx((r) => r.role === "prong")) {
    const r = metalRoles[i];
    const p = metalParts[i];
    const held = stones[stoneFor(r.head)];
    const tag = `${r.head} prong ${r.index}`;
    prongAudits.push({
      head: r.head!, index: r.index!,
      inBand: sum(bandIdx.map((b) => common(p, metalParts[b], `${tag} ∩ band`))),
      inStone: common(p, held, `${tag} ∩ stone`),
      inGallery: sum(galleryIdx.map((g) => common(p, metalParts[g], `${tag} ∩ gallery ${g}`))),
      inBase: sum(baseIdx.map((b) => common(p, metalParts[b], `${tag} ∩ base ${b}`))),
      clearanceToStone: distance(p, held, `${tag} to stone`),
    });
  }

  // ----------------------------------------------------------- bearings --
  const bearings: BearingAudit[] = [];
  for (const i of idx((r) => r.role === "prong")) {
    const r = metalRoles[i];
    const frame = heads.find((h) => h.head === r.head)!;
    const plan = frame.layout.prongs[r.index!];
    if (!plan) continue;
    const tag = `${r.head} prong ${r.index} bearing`;
    try {
      bearings.push(measureBearing(metalParts[i], stones[stoneFor(r.head)], frame, plan, r.head!, r.index!));
    } catch (e) {
      errors.push(`${tag}: ${(e as Error)?.message ?? e}`);
      bearings.push({
        head: r.head!, index: r.index!, notchFloor: NaN, postFace: NaN, notch: NaN, postWidth: NaN,
        stoneEdge: NaN, seatGap: NaN, top: NaN, pavilionClearance: NaN,
        expected: expectedFor(frame, plan),
      });
    }
  }

  const galleryAudits: GalleryAudit[] = galleryIdx.map((g, k) => {
    const r = metalRoles[g];
    const part = metalParts[g];
    const frame = heads.find((h) => h.head === r.head)!;
    const held = stones[stoneFor(r.head)];
    const tag = `${r.head} gallery ${g}`;
    const fgd = gemDims(frame.girdleR);
    const centroid = measureShapeVolumeProperties(part).centerOfMass as V3;
    const inProngs = prongAudits.filter((p) => p.head === r.head);
    const own = frame.bench.values;
    return {
      head: r.head!, part: g,
      inStone: common(part, held, `${tag} ∩ stone`),
      clearanceToStone: distance(part, held, `${tag} to stone`),
      centreHeightAboveCulet: dot(add(centroid, frame.culet, -1), frame.axis),
      ruleOfThirdsHeight: fgd.pavH * 0.5,
      thicknessEstimate: sections[k],
      prongsTouched: inProngs.filter((p) => p.inGallery > 0.02).length,
      prongCount: frame.prongCount,
      bench: { galleryClearance: own.galleryClearance, galleryThickness: own.galleryThickness },
    };
  });

  /**
   * The gallery cut by a thin slab lying in the half-plane between prong 0
   * and prong 1, measured across and along the head axis. A round wire gives
   * its diameter twice; a flat rail gives its smaller side.
   */
  function sectionThickness(part: Shape3D, frame: HeadFrame, tag: string): number {
    try {
      const n = frame.prongAngles.length;
      const a = n >= 2 ? (frame.prongAngles[0] + frame.prongAngles[1]) / 2 : 0;
      const y = cross(frame.axis, frame.xDir);
      const u = unit(add(frame.xDir.map((x) => x * Math.cos(a)) as V3, y, Math.sin(a)));
      const normal = unit(cross(u, frame.axis));
      const T = 0.01, R = frame.girdleR * 3, L = frame.girdleR * 4;
      const plane = new Plane(add(frame.culet, normal, -T / 2), u, normal);
      const slab = draw([0, -L]).lineTo([R, -L]).lineTo([R, L]).lineTo([0, L]).close()
        .sketchOnPlane(plane).extrude(T) as Shape3D;
      const cut = part.intersect(slab);
      const v = cut.mesh({ tolerance: 0.002, angularTolerance: 5 }).vertices;
      if (!v.length) { errors.push(`${tag}: empty section`); return NaN; }
      let uMin = Infinity, uMax = -Infinity, zMin = Infinity, zMax = -Infinity;
      for (let k = 0; k < v.length; k += 3) {
        const q: V3 = [v[k] - frame.culet[0], v[k + 1] - frame.culet[1], v[k + 2] - frame.culet[2]];
        const du = dot(q, u), dz = dot(q, frame.axis);
        uMin = Math.min(uMin, du); uMax = Math.max(uMax, du);
        zMin = Math.min(zMin, dz); zMax = Math.max(zMax, dz);
      }
      return Math.min(uMax - uMin, zMax - zMin);
    } catch (e) {
      errors.push(`${tag}: section threw ${(e as Error)?.message ?? e}`);
      return NaN;
    }
  }

  // -------------------------------------------------------------- joint --
  let joint: StructureAudit["joint"] = null;
  if (centreFrame.prongCount > 0) {
    try {
      // The plane through band-top + 0.10 on the head axis, as a disc face;
      // a solid ∩ face is the section itself, so its area is exact.
      const s = bandTop + 0.10 - dot(centreFrame.culet, centreFrame.axis);
      const at = add(centreFrame.culet, centreFrame.axis, s);
      const disc = makeFace(assembleWire([makeCircle(dims.girdleR * 1.2, at, centreFrame.axis)]));
      const area = measureArea(metal.intersect(disc) as Shape3D);
      const pd = bench.values.prongDiameter;
      const prongSectionSum = centreFrame.prongCount * Math.PI * (pd / 2) ** 2;
      joint = { jointSectionArea: area, prongSectionSum, prongDiameter: pd, ratio: area / prongSectionSum };
    } catch (e) {
      errors.push(`joint section threw ${(e as Error)?.message ?? e}`);
    }
  }

  // ------------------------------------------------------ stone ∩ stone --
  const stonePairs: StructureAudit["stonePairs"] = [];
  for (let a = 0; a < stones.length; a++) {
    for (let b = a + 1; b < stones.length; b++) {
      if (stones[a].boundingBox.isOut(stones[b].boundingBox)) continue;
      stonePairs.push({ a, b, volume: common(stones[a], stones[b], `stone ${a} ∩ stone ${b}`) });
    }
  }

  const t3 = performance.now();
  return {
    spec, bench,
    solidCount: metal.solids.length,
    dropped,
    metalVolume: vol(metal),
    partCount: metalParts.length,
    stones: stoneAudits,
    centre,
    prongs: prongAudits,
    bearings,
    galleries: galleryAudits,
    joint,
    stonePairs,
    maxStoneStoneOverlap: stonePairs.reduce((m, p) => Math.max(m, p.volume || 0), 0),
    stl, step,
    timing: { buildMs: t1 - t0, fuseMs: t2 - t1, measureMs: t3 - t2, totalMs: t3 - t0 },
    errors,
  };
}

/**
 * Volume of a ∩ b, checked.
 *
 * An intersection can be no larger than either input, so one that is has
 * failed without throwing, which OCCT booleans do, unless the smaller input is
 * wholly inside the other (checked below). A failure throws here instead of
 * being reported as a number. Skips the boolean when the boxes are apart,
 * which is most pairs and costs nothing to know.
 */
export function overlapVolume(
  a: Shape3D, b: Shape3D, volOf: (s: Shape3D) => number = measureVolume,
): number {
  if (a.boundingBox.isOut(b.boundingBox)) return 0;
  const v = measureVolume(a.intersect(b));
  const limit = Math.min(volOf(a), volOf(b));
  if (!(v >= 0)) throw new Error(`intersection volume ${v}`);
  if (v <= limit + 1e-6) return v;
  // Larger than the smaller input. Either the boolean failed, or the smaller
  // solid lies wholly inside the other and OCCT's volume of the result is a
  // hair off: an accent buried under the head of an eternity band measured
  // 0.35961 mm³ against its own 0.35921 (S0). The complementary cut decides
  // which, rather than a looser tolerance: if nothing of the smaller solid is
  // left outside the other, the overlap is all of it.
  const [small, big] = volOf(a) <= volOf(b) ? [a, b] : [b, a];
  const outside = measureVolume(small.cut(big));
  if (outside >= 0 && outside <= limit * 1e-3) return limit;
  throw new Error(`intersection ${v} exceeds the smaller input ${limit} and ${outside} of it lies outside`);
}

/**
 * A solid's skin: its faces with no inside. Distance to a solid is zero from
 * anywhere within it; distance to its skin is how deep the point is.
 */
export function skinOf(solid: Shape3D): AnyShape {
  return makeCompound(solid.faces) as AnyShape;
}

const PROBE_R = 0.01;

/**
 * How far a point is from a solid, signed: positive outside, and inside, minus
 * its distance to the solid's surface. This is the culet clearance the audit
 * reports, exported so it can be proved against shapes with a known answer.
 *
 * Inside is decided by a 0.01 mm probe sphere: more than half of it in the
 * solid means the point is in. A point exactly on the surface reads as
 * outside at distance 0, which is the right answer for a culet touching
 * metal.
 */
export function signedDepth(
  point: V3, solid: Shape3D, skin: AnyShape = skinOf(solid),
): { depth: number; inside: boolean } {
  const probe = makeSphere(PROBE_R).translate(point) as Shape3D;
  const pv = measureVolume(probe);
  const inVol = solid.boundingBox.isOut(probe.boundingBox) ? 0 : measureVolume(probe.intersect(solid));
  if (!(inVol >= 0) || inVol > pv + 1e-9) {
    throw new Error(`probe intersection ${inVol} exceeds the probe ${pv}`);
  }
  const inside = inVol > pv * 0.5;
  const v = makeVertex(point);
  const depth = inside ? -measureDistanceBetween(v, skin) : measureDistanceBetween(v, solid);
  return { depth, inside };
}

// ------------------------------------------------------------- bearings --

/** A head-frame point (culet at origin, +z up the stone) in the ring's frame. */
function toRing(frame: HeadFrame, p: V3): V3 {
  const y = cross(frame.axis, frame.xDir);
  return add(add(add(frame.culet, frame.xDir, p[0]), y, p[1]), frame.axis, p[2]);
}
/** A ring-frame point in the head's frame. */
function toHead(frame: HeadFrame, p: V3): V3 {
  const q = add(p, frame.culet, -1);
  return [dot(q, frame.xDir), dot(q, cross(frame.axis, frame.xDir)), dot(q, frame.axis)];
}

/**
 * Where a straight line from `a` to `b` passes through a solid, as the end
 * points of the pieces inside it. OCCT's common of a solid and an edge is the
 * part of the edge inside the solid, so this is exact, not sampled.
 */
export function probeSpan(solid: AnyShape, a: V3, b: V3): V3[] {
  // An edge is not a Shape3D to replicad's types, but OCCT's common takes any
  // two shapes; the result is a compound of the inside pieces.
  const line = makeLine(a, b) as unknown as Shape3D;
  const inside = (solid as Shape3D).intersect(line);
  return inside.edges.flatMap((e) => [e.startPoint, e.endPoint]).map((p) => [p.x, p.y, p.z] as V3);
}

function expectedFor(frame: HeadFrame, plan: { d: number; notch: number; tip: number }) {
  const v = frame.bench.values;
  return {
    d: plan.d, notch: plan.notch, top: plan.tip,
    seatTolerance: v.seatTolerance, pavilionClearance: v.pavilionClearance,
  };
}

function measureBearing(
  prong: Shape3D, stone: Shape3D, frame: HeadFrame,
  plan: HeadFrame["layout"]["prongs"][number], head: HeadName, index: number,
): BearingAudit {
  const st = frame.layout.stone;
  const n: V3 = [plan.normal[0], plan.normal[1], 0];
  const g: V3 = [plan.girdlePoint[0], plan.girdlePoint[1], 0];
  const c: V3 = [plan.postCentre[0], plan.postCentre[1], 0];
  const reach = st.girdleR + 4;
  // Along the normal through the post's centre, at height z; u from the girdle point.
  const across = (s: AnyShape, z: number) => {
    const a = toRing(frame, add(add(c, n, -reach), [0, 0, 1], z));
    const b = toRing(frame, add(add(c, n, reach), [0, 0, 1], z));
    return probeSpan(s, a, b).map((p) => dot(add(toHead(frame, p), g, -1), n));
  };
  const min = (xs: number[]) => (xs.length ? Math.min(...xs) : NaN);
  const max = (xs: number[]) => (xs.length ? Math.max(...xs) : NaN);

  // The seat's floor across the girdle band, where the seat is upright.
  const band = [0.15, 0.35, 0.5, 0.65, 0.85].map((f) => st.zGb + (st.zGt - st.zGb) * f);
  const notchFloor = min(band.map((z) => min(across(prong, z))));
  const at = across(prong, plan.measureZ);
  const postFace = min(at), postWidth = max(at) - min(at);
  const stoneEdge = max(across(stone, (st.zGb + st.zGt) / 2));

  // Highest point: straight up the post's centreline.
  const up = probeSpan(prong, toRing(frame, add(c, [0, 0, 1], st.zGb)), toRing(frame, add(c, [0, 0, 1], plan.tip + 2)));
  const top = max(up.map((p) => toHead(frame, p)[2]));

  // Everything of the prong below girdle − d, by a half space under that plane.
  const cutZ = st.zGb - plan.d;
  const big = reach * 4;
  const plane = new Plane(toRing(frame, [0, 0, cutZ]), frame.xDir, frame.axis);
  const below = draw([-big, -big]).lineTo([big, -big]).lineTo([big, big]).lineTo([-big, big]).close()
    .sketchOnPlane(plane).extrude(-big) as Shape3D;
  const lower = prong.intersect(below) as Shape3D;
  const pavilionClearance = measureVolume(lower) > 1e-9 ? measureDistanceBetween(lower, stone) : NaN;

  return {
    head, index, notchFloor, postFace, notch: notchFloor - postFace, postWidth,
    stoneEdge, seatGap: notchFloor - stoneEdge, top, pavilionClearance,
    expected: expectedFor(frame, plan),
  };
}
