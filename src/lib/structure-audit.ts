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
  draw, makeCircle, makeCompound, makeFace, makeLine, makePolygon, makeSphere, makeVertex,
  assembleWire, measureArea, measureDistanceBetween, measureShapeVolumeProperties,
  measureVolume, Plane,
  type Shape3D, type AnyShape,
} from "replicad";
import {
  buildRingParts, resolveRing, toSTEP, toSTL, BLEND_JOINTS,
  type PartRole, type StoneRole, type HeadFrame, type HeadName, type BlendJoint, type BlendPath,
} from "./cad-engine-brep.js";
import { gemDims } from "./cad-engine.js";
import { polygonDistance, radialHit, roundedPoints } from "./head-layout.js";
import { benchBounds, resolveBench, type BenchValues, type ResolvedBench } from "./setting-standards.js";
import { MANUFACTURING_LIMITS, type MetalType } from "./ring-spec.js";
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
  /**
   * What the design ASKED for (resolveBench, before any engine clamp), for
   * judging the numbers above; d is the prong as built, whose own value I13
   * judges. Judging against the engine's clamped values instead would let an
   * over-eager clamp pass every check (found in S1's review).
   */
  expected: { d: number; notch: number; top: number; zT: number; seatTolerance: number; pavilionClearance: number };
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
  /** The values this head was asked for (resolveBench alone): the invariants judge against these. */
  requested: { galleryClearance: number; galleryThickness: number };
  /** Where the layout put the gallery's centreline, from the culet, and how far below the rule that is. */
  planHeight: number;
  lowered: number;
  /** Whether a lowering was reported as an engine clamp. */
  loweredReported: boolean;
  /** Whether a thinner wire than asked was reported as an engine clamp (see placeGallery). */
  thinnedReported: boolean;
  /** The alloy's minimum wall (galleryThickness's lower bound): no gallery is thinned below it. */
  minWall: number;
  /**
   * I5b: how far the gallery reaches out beyond the girdle, seen from above,
   * at its worst over 360 directions (negative: that much inside the girdle).
   * Probed at the gallery's own height, where a round wire is widest.
   */
  beyondGirdle: number;
};

/**
 * A head's base (S3): the flat ring its prongs end in, and the saddle under
 * it. Measured on the base part alone, from the untouched build.
 */
export type BaseAudit = {
  head: HeadName;
  part: number;
  /** I12: the smaller of the base's height and width, read off its section in a half-plane between prong 0 and prong 1. */
  thickness: number;
  /** What it must be at least: max(prongDiameter built, the alloy's minimum wall). */
  need: number;
  /** Least distance from the base, and from the saddle, to the stone it holds. */
  clearanceToStone: number;
  saddleClearanceToStone: number;
  /** Where the layout put it, above the culet: its bottom and top, and the saddle's plateau. */
  zBottom: number; zTop: number; plateau: number;
  /** Whether its top meets the gallery's underside (small stones). */
  touchesGallery: boolean;
};

/**
 * The centre head's blends (S3): which path each joint took, and what the
 * merged metal shows of it. A filleted joint's radius is read off its fillet
 * faces (a cylinder's or torus's own radius; any other surface, the circle
 * through three points across it); a flared one's off the flare built.
 */
export type BlendAudit = {
  paths: Partial<Record<BlendJoint, BlendPath>>;
  /** Joints whose fillet failed its check, and why, before their flare was built. */
  failed: { joint: BlendJoint; why: string }[];
  /** The radius each joint was laid out with (filletRadius, held to what the parts can take). */
  planned: Record<BlendJoint, number> | null;
  /** The radius each joint's flare is built at, if flared. */
  flarePlanned: Record<BlendJoint, number> | null;
  /** Measured, per joint: the least and greatest fillet radius in its sections, or the flare's added radius, and how many were read. */
  measured: Partial<Record<BlendJoint, { min: number; max: number; faces: number }>>;
};

export type StructureAudit = {
  spec: Record<string, unknown>;
  /** The centre head's values as built: resolveBench, then any engine clamp. */
  bench: ResolvedBench;
  /** The centre head's values as asked: resolveBench alone. The invariants judge against these. */
  requested: BenchValues;
  /** Microscopic sealed cavities the merge filled (fuseMetal → sealVoids). */
  voidsFilled: number;
  /** Fuses OCCT got wrong that a retry 0.001 mm over got right (see fuseMetal). */
  shiftedRetries: number;
  blend: BlendAudit;
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
  bases: BaseAudit[];
  /** Centre prongs laid out as kicked legs (S2's fallback; Animesh's decision on question 26: counted). */
  kickedLegs: number;
  joint: {
    /** Metal section at band-top + 0.10 mm, within the centre head's saddle plate (S3; before, girdleR × 1.2 of the head axis). */
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
  // The merge as the app makes it: fused, and the head's joints blended (S3).
  const resolved = resolveRing(spec);
  const fused = resolved.parts;
  const t1 = performance.now();
  const { metal, dropped, voidsFilled, shiftedRetries } = resolved;
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
  const askedFor = (girdleR: number): BenchValues => resolveBench(spec.bench as Record<string, unknown> | undefined, {
    alloy: (spec.metalType as MetalType) ?? "platinum", girdleR, pavH: gemDims(girdleR).pavH,
  }).values;
  const requested = askedFor(dims.girdleR);

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
  // The band's top under the head, as the engine read it to place the culet
  // (outerR unless a lasso edit thins or thickens the band there). Reports
  // before S3 took outerR.
  const bandTop = dims.headBandTop ?? dims.outerR;
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
  const bridgeIdx = idx((r) => r.role === "bridge");
  const stoneFor = (head: HeadName | undefined) =>
    stoneRoles.findIndex((r) => r.head === head && (r.role === "centre" || r.role === "side"));
  const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);

  // Sliced before any other boolean touches these parts (see the second build).
  const sections = galleryIdx.map((g) => {
    const r = metalRoles[g];
    return sectionThickness(metalParts[g], heads.find((h) => h.head === r.head)!, `${r.head} gallery ${g}`);
  });
  // A prong head's base (S3; a bezel's under-gallery is tagged base too, and
  // is not one).
  const prongBaseIdx = baseIdx.filter((b) => heads.find((h) => h.head === metalRoles[b].head)?.style !== "bezel");
  const baseSections = prongBaseIdx.map((b) => {
    const r = metalRoles[b];
    return sectionThickness(metalParts[b], heads.find((h) => h.head === r.head)!, `${r.head} base ${b}`);
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
      bearings.push(measureBearing(metalParts[i], stones[stoneFor(r.head)], frame, plan, r.head!, r.index!, askedFor(frame.girdleR)));
    } catch (e) {
      errors.push(`${tag}: ${(e as Error)?.message ?? e}`);
      bearings.push({
        head: r.head!, index: r.index!, notchFloor: NaN, postFace: NaN, notch: NaN, postWidth: NaN,
        stoneEdge: NaN, seatGap: NaN, top: NaN, pavilionClearance: NaN,
        expected: expectedFor(frame, plan, askedFor(frame.girdleR)),
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
    const asked = askedFor(frame.girdleR);
    const plan = frame.layout.gallery;
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
      requested: { galleryClearance: asked.galleryClearance, galleryThickness: asked.galleryThickness },
      planHeight: plan ? plan.z : NaN,
      lowered: plan ? plan.mid - plan.z : NaN,
      loweredReported: frame.bench.warnings.some((w) => w.kind === "engine-clamped" && /below the middle of the pavilion/.test(w.message)),
      thinnedReported: frame.bench.warnings.some((w) => w.kind === "engine-clamped" && w.key === "galleryThickness" && /would show beyond the girdle/.test(w.message)),
      beyondGirdle: plan ? beyondGirdle(part, frame, plan.z, tag) : NaN,
      minWall: benchBounds("galleryThickness", ((spec.metalType as MetalType) ?? "platinum")).min,
    };
  });

  /**
   * See GalleryAudit.beyondGirdle. One exact section of the gallery by the
   * plane at its height (a disc face, as the joint is measured), its edges
   * sampled every 0.01 mm or finer, and 360 rays out from the head axis run
   * against that outline in plain arithmetic. A probe line per direction was
   * 360 OCCT booleans a gallery, and on a three-stone the leaking kernel ran
   * out of memory before the audit finished (S2).
   */
  function beyondGirdle(part: Shape3D, frame: HeadFrame, z: number, tag: string): number {
    try {
      const girdle = frame.layout.stone.girdle;
      const disc = makeFace(assembleWire([makeCircle(frame.girdleR * 3, toRing(frame, [0, 0, z]), frame.axis)]));
      const section = part.intersect(disc as unknown as Shape3D);
      const segs: [number, number, number, number][] = [];
      for (const e of section.edges) {
        const n = Math.max(8, Math.ceil(e.length / 0.01));
        let prev: V3 | null = null;
        for (let k = 0; k <= n; k++) {
          const v = e.pointAt(k / n);
          const q = toHead(frame, [v.x, v.y, v.z]);
          if (prev) segs.push([prev[0], prev[1], q[0], q[1]]);
          prev = q;
        }
      }
      if (!segs.length) { errors.push(`${tag}: empty section at the gallery's height`); return NaN; }
      let worst = -Infinity;
      for (let k = 0; k < 360; k++) {
        const a = (k / 360) * Math.PI * 2;
        const ux = Math.cos(a), uy = Math.sin(a);
        let far = -Infinity;
        for (const [ax, ay, bx, by] of segs) {
          // Ray from the axis along u against the segment a→b.
          const ex = bx - ax, ey = by - ay;
          const den = ux * ey - uy * ex;
          if (Math.abs(den) < 1e-15) continue;
          const t = (ax * ey - ay * ex) / den;
          const w = (ax * uy - ay * ux) / den;
          if (t > 0 && w >= 0 && w <= 1) far = Math.max(far, t);
        }
        if (Number.isFinite(far)) worst = Math.max(worst, far - radialHit(girdle, a).r);
      }
      if (!Number.isFinite(worst)) { errors.push(`${tag}: no ray met the gallery's section`); return NaN; }
      return worst;
    } catch (e) {
      errors.push(`${tag}: girdle section threw ${(e as Error)?.message ?? e}`);
      return NaN;
    }
  }

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

  const baseAudits: BaseAudit[] = prongBaseIdx.map((b, k) => {
    const r = metalRoles[b];
    const frame = heads.find((h) => h.head === r.head)!;
    const held = stones[stoneFor(r.head)];
    const plan = frame.layout.base;
    const saddle = bridgeIdx.find((i) => metalRoles[i].head === r.head);
    const lim = (MANUFACTURING_LIMITS[(spec.metalType as MetalType) ?? "platinum"] ?? MANUFACTURING_LIMITS.platinum).minWall;
    return {
      head: r.head!, part: b,
      thickness: baseSections[k],
      need: Math.max(frame.bench.values.prongDiameter, lim),
      clearanceToStone: distance(metalParts[b], held, `${r.head} base to stone`),
      saddleClearanceToStone: saddle == null ? NaN : distance(metalParts[saddle], held, `${r.head} saddle to stone`),
      zBottom: plan ? plan.zBottom : NaN, zTop: plan ? plan.zTop : NaN, plateau: plan ? plan.plateau : NaN,
      touchesGallery: !!plan?.touchesGallery,
    };
  });
  const kickedLegs = centreFrame.layout.prongs.filter((p) => (p.spine?.kick ?? 0) > 0).length;

  // -------------------------------------------------------------- joint --
  let joint: StructureAudit["joint"] = null;
  if (centreFrame.prongCount > 0) {
    try {
      // The plane through band-top + 0.10 on the head axis, as a disc face;
      // a solid ∩ face is the section itself, so its area is exact.
      const s = bandTop + 0.10 - dot(centreFrame.culet, centreFrame.axis);
      const at = add(centreFrame.culet, centreFrame.axis, s);
      // Within the centre head's own footprint (open question 14, decided in
      // S3): its saddle's plate where it has one, which is the metal under
      // the head; else the disc of 1.2 girdle radii the audit always took. On
      // a small stone with thick prongs the base outgrew that disc, and the
      // disc counted a fraction of the very joint it was there to measure
      // (0.25 ct, all-max: 13.6 mm² of a joint that carries the base whole).
      const plan = centreFrame.layout.base;
      const disc = plan
        ? makePolygon(roundedPoints(plan.plate, 0.05).map(([x, y]) => toRing(centreFrame, [x, y, s]) as V3))
        : makeFace(assembleWire([makeCircle(dims.girdleR * 1.2, at, centreFrame.axis)]));
      const area = measureArea(metal.intersect(disc as unknown as Shape3D) as Shape3D);
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

  // ------------------------------------------------------------- blends --
  const plan = centreFrame.layout.base;
  const measured: BlendAudit["measured"] = {};
  for (const j of BLEND_JOINTS) {
    if (resolved.blend.paths[j] === "fillet") {
      const radii = filletSections(j, metal, centreFrame, errors, dims.bandWidth / 2).filter((x) => Number.isFinite(x));
      measured[j] = { min: Math.min(...radii), max: Math.max(...radii), faces: radii.length };
    } else if (resolved.blend.paths[j] === "flare" && plan) {
      const r = flareRadius(j, resolved.blend.flares[j] ?? [], centreFrame, errors);
      measured[j] = { min: Math.min(...r), max: Math.max(...r), faces: r.length };
    }
  }
  const blend: BlendAudit = {
    paths: resolved.blend.paths, failed: resolved.blend.failed,
    planned: plan ? plan.blend : null, flarePlanned: plan ? plan.flare : null, measured,
  };

  const t3 = performance.now();
  return {
    spec, bench, requested, voidsFilled, shiftedRetries, blend,
    solidCount: metal.solids.length,
    dropped,
    metalVolume: vol(metal),
    partCount: metalParts.length,
    stones: stoneAudits,
    centre,
    prongs: prongAudits,
    bearings,
    galleries: galleryAudits,
    bases: baseAudits,
    kickedLegs,
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

function expectedFor(frame: HeadFrame, plan: { d: number }, asked: BenchValues) {
  const zT = frame.layout.stone.zT;
  return {
    d: plan.d, notch: (asked.bearingDepth / 100) * plan.d, top: zT + asked.asCastProngHeight, zT,
    seatTolerance: asked.seatTolerance, pavilionClearance: asked.pavilionClearance,
  };
}

function measureBearing(
  prong: Shape3D, stone: Shape3D, frame: HeadFrame,
  plan: HeadFrame["layout"]["prongs"][number], head: HeadName, index: number, asked: BenchValues,
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
  // Nothing of the prong below girdle − d (a foot ending high in a 2 mm
  // base, S3): the rule has nothing to hold, so the gap is unbounded, not
  // unmeasured.
  const pavilionClearance = measureVolume(lower) > 1e-9 ? measureDistanceBetween(lower, stone) : Infinity;

  return {
    head, index, notchFloor, postFace, notch: notchFloor - postFace, postWidth,
    stoneEdge, seatGap: notchFloor - stoneEdge, top, pavilionClearance,
    expected: expectedFor(frame, plan, asked),
  };
}

// --------------------------------------------------------------- blends --

/**
 * A filleted joint's radius, as a section through it shows it: the merged
 * metal cut by planes square to the joint, and in each section the curve
 * that runs from one part's surface to the other's, the circle through its
 * two ends and middle. On a fillet that is the rolling ball's own circle.
 * (Read off the faces instead, OCCT's B-spline fillet patches where a
 * fillet runs past another feature read anywhere from 0.001 to 400 mm.)
 *   feet   per prong, the plane holding its run into the base and the head's
 *          axis: from the base's top (or a wall) to the prong's surface;
 *   base   the plane through the axis between prong 0 and prong 1: from the
 *          plateau to the base's inner and outer walls;
 *   shank  the planes through the axis across and along the finger: from
 *          the saddle's wall or underside to the band.
 */
function filletSections(joint: BlendJoint, metal: Shape3D, frame: HeadFrame, errors: string[], bandHalfWidth?: number): number[] {
  const b = frame.layout.base!;
  const T = 3e-3;
  const plateOut = densePoly(b.plate.core, b.plate.r), wallIn = densePoly(b.core, b.rIn), wallOut = densePoly(b.core, b.rOut);
  const onPoly = (poly: [number, number][], p: V3) => Math.abs(polyDistance(poly, [p[0], p[1]])) < T;
  const radiusOf = (a: V3, m: V3, c: V3) => {
    const ab = Math.hypot(...add(m, a, -1)), bc = Math.hypot(...add(c, m, -1)), ca = Math.hypot(...add(a, c, -1));
    const area = Math.hypot(...cross(add(m, a, -1), add(c, a, -1))) / 2;
    return area > 1e-12 ? (ab * bc * ca) / (4 * area) : Infinity;
  };
  // The section of the metal by the plane through `at` (head frame) square
  // to `normal`, its curves as [start, middle, end] in the head's frame.
  const section = (at: V3, normal: V3) => {
    const R = frame.girdleR * 3;
    const disc = makeFace(assembleWire([makeCircle(R, toRing(frame, at), dirToRing(frame, normal))]));
    const cut = metal.intersect(disc as unknown as Shape3D);
    return cut.edges.map((e) => {
      const at = (t: number) => { const v = e.pointAt(t); return toHead(frame, [v.x, v.y, v.z]); };
      return Object.assign([at(0), at(0.5), at(1)] as [V3, V3, V3], { at, len: e.length });
    });
  };
  const out: number[] = [];
  try {
    if (joint === "feet") {
      for (const p of frame.layout.prongs) {
        const F = p.spine!.points[0], u = unit(add(p.spine!.points[1], F, -1));
        const E = add(F, u, (b.zTop - F[2]) / u[2]);
        let n = cross(u, [0, 0, 1]);
        if (Math.hypot(...n) < 1e-6) n = [-E[1], E[0], 0];
        const half = p.d / 2;
        const onProng = (q: V3) => {
          const w = add(q, F, -1), t = dot(w, u);
          return Math.abs(Math.hypot(...add(w, u, -t)) - half) < T;
        };
        const onBase = (q: V3) => Math.abs(q[2] - b.zTop) < T || onPoly(wallIn, q) || onPoly(wallOut, q);
        for (const [a, m, c] of section(E, unit(n))) {
          if (Math.hypot(...add(m, E, -1)) > 3 * b.blend.feet + p.d) continue;
          if ((onBase(a) && onProng(c)) || (onBase(c) && onProng(a))) out.push(radiusOf(a, m, c));
        }
      }
    } else if (joint === "base") {
      // Square to each wall, where the ray between prong 0 and prong 1
      // meets it: on a straight side, a plane through the axis at a slant
      // to the wall cuts the fillet in an ellipse and reads it large.
      const n = frame.prongAngles.length;
      const ang = n >= 2 ? (frame.prongAngles[0] + frame.prongAngles[1]) / 2 : 0;
      const onPlate = (q: V3) => Math.abs(q[2] - b.plateau) < T;
      for (const wall of [wallIn, wallOut]) {
        const hit = rayOnPoly(wall, ang);
        const at: V3 = [hit.p[0], hit.p[1], b.plateau];
        for (const [a, m, c] of section(at, [hit.t[0], hit.t[1], 0])) {
          if (Math.hypot(a[0] - at[0], a[1] - at[1]) > 3 * b.blend.base && Math.hypot(c[0] - at[0], c[1] - at[1]) > 3 * b.blend.base) continue;
          if ((onPlate(a) && onPoly(wall, c)) || (onPlate(c) && onPoly(wall, a))) out.push(radiusOf(a, m, c));
        }
      }
    } else {
      // On the saddle's wall only: its underside meeting the band is not
      // filleted (see jointEdges), and a curve off it is the band's flank.
      const onSaddle = (q: V3) => onPoly(plateOut, q) && q[2] <= b.plateau + T && q[2] > b.saddleBottom + T;
      // Where the wall is met along the band and across it on the axis, and
      // along each side of the band (a split shank's band is two rails either
      // side of a slot, where the middle finds no band); each square to the
      // wall (on a round plate a plane along the band at the side cuts the
      // wall at a slant, and the fillet read large).
      // Off the axis the band's top slopes across the wall, so the fillet's
      // line on the wall climbs: the plane is turned square to that line,
      // found from where the fillet leaves the wall in two sections 0.05 mm
      // apart along it.
      const side = 0.6 * (bandHalfWidth ?? 0);
      const reachX = Math.max(...plateOut.map(([x]) => Math.abs(x)));
      const cuts: [V3, V3][] = [];
      // Off the saddle, below its plateau, and not the foot of its wall
      // (where a split shank's slot leaves the wall standing to its bottom).
      const off = (q: V3) => !onSaddle(q) && q[2] < b.plateau - T && !(onPoly(plateOut, q) && Math.abs(q[2] - b.saddleBottom) < T);
      const near = (q: V3, at: V3) => Math.hypot(q[0] - at[0], q[1] - at[1]) < 0.5;
      const leaves = (at: V3, n: V3) => {
        for (const [a, , c] of section(at, n)) {
          if (onSaddle(a) && off(c) && near(a, at)) return a;
          if (onSaddle(c) && off(a) && near(c, at)) return c;
        }
        return null;
      };
      const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      for (const sgnX of [1, -1]) for (const sgnY of [1, -1]) angles.push(Math.atan2(sgnY * side, sgnX * reachX));
      for (const ang of angles) {
        const hit = rayOnPoly(plateOut, ang);
        const t: V3 = [hit.t[0], hit.t[1], 0], at: V3 = [hit.p[0], hit.p[1], 0];
        const z0 = leaves(at, t), z1 = leaves(add(at, t, 0.05), t);
        // Through where the fillet leaves the wall: tilted, a plane through
        // the plate's middle height would meet the wall elsewhere.
        cuts.push(z0 && z1 ? [z0, unit(add(z1, z0, -1))] : [at, t]);
      }
      for (const [p0, n] of cuts) {
        for (const curve of section(p0, n)) {
          // One end on the saddle's wall or underside, the other off the
          // saddle and below its plateau: on the band. The curve can carry
          // on past the fillet down the band's flank as one edge, so the
          // radius is the curve's own where it leaves the saddle: the circle
          // through the end and the points a fifth and two fifths of the
          // fillet's quarter turn along (taken from the edge's length).
          const [a, , c] = curve;
          const fromA = onSaddle(a) && off(c) && near(a, p0), fromC = onSaddle(c) && off(a) && near(c, p0);
          if (!fromA && !fromC) continue;
          const step = Math.min(0.2, (0.2 * Math.PI * b.blend.shank) / 2 / Math.max(1e-9, curve.len));
          const t0 = fromA ? 0 : 1, sgn = fromA ? 1 : -1;
          out.push(radiusOf(curve.at(t0), curve.at(t0 + sgn * step), curve.at(t0 + 2 * sgn * step)));
        }
      }
    }
  } catch (e) {
    errors.push(`${joint} fillet section threw ${(e as Error)?.message ?? e}`);
  }
  return out;
}

/** A rounded outline's length round. */
function platePerimeter(o: { core: [number, number][]; r: number }): number {
  const K = o.core;
  let per = 2 * Math.PI * o.r;
  if (K.length > 1) for (let i = 0; i < K.length; i++) per += Math.hypot(K[(i + 1) % K.length][0] - K[i][0], K[(i + 1) % K.length][1] - K[i][1]);
  return per;
}

/** Where a ray from the axis at angle a crosses a closed polygon, and the polygon's unit direction there. */
function rayOnPoly(poly: [number, number][], a: number): { p: [number, number]; t: [number, number] } {
  const h = radialHit(poly, a);
  const p0 = poly[h.edge], p1 = poly[(h.edge + 1) % poly.length];
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  return { p: [h.r * Math.cos(a), h.r * Math.sin(a)], t: [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L] };
}

/** A rounded outline (head-layout's Rounded), sampled every 0.01 mm. */
function densePoly(core: [number, number][], r: number): [number, number][] {
  return roundedPoints({ core, r }, 0.01);
}
const polyDistance = (poly: [number, number][], q: [number, number]) => polygonDistance(poly, q);
/** A head-frame direction in the ring's frame. */
function dirToRing(frame: HeadFrame, d: V3): V3 {
  const y = cross(frame.axis, frame.xDir);
  return add(add(frame.xDir.map((x) => x * d[0]) as V3, y, d[1]), frame.axis, d[2]);
}

/**
 * A flared joint's added radius, read off the flare solids the merge fused
 * in (S3's fallback):
 *   feet   each flared foot's section at its foot, its radius less the
 *          prong's footprint on the base's top;
 *   base   the base flare's section 0.002 mm over the plateau: its area less
 *          the base ring's, over the two walls' length;
 *   shank  the skirt's section at its foot, less the plate's own area, over
 *          the plate's outline.
 */
function flareRadius(joint: BlendJoint, flares: Shape3D[], frame: HeadFrame, errors: string[]): number[] {
  const b = frame.layout.base!;
  const sectionArea = (part: Shape3D, at: V3, normal: V3, R: number) => {
    const disc = makeFace(assembleWire([makeCircle(R, at, normal)]));
    return measureArea(part.intersect(disc as unknown as Shape3D) as Shape3D);
  };
  const area = (core: [number, number][], r: number) => {
    if (core.length === 1) return Math.PI * r * r;
    let a = 0;
    for (let i = 0; i < core.length; i++) a += core[i][0] * core[(i + 1) % core.length][1] - core[(i + 1) % core.length][0] * core[i][1];
    return Math.abs(a) / 2 + platePerimeter({ core, r: 0 }) * r + Math.PI * r * r;
  };
  try {
    if (joint === "feet") {
      // The flare's section just over the base's top, its radius less the
      // prong's footprint there (its radius over the leg's lean).
      return frame.layout.prongs.map((p, k) => {
        const F = p.spine!.points[0], u = unit(add(p.spine!.points[1], F, -1));
        const uz = Math.max(0.3, u[2]);
        const E = add(F, u, (b.zTop - F[2]) / uz);
        // Just under the base's top (see flaredFoot), where it is its full
        // width: higher, it has already narrowed by its taper.
        const z = b.zTop - 0.019;
        return Math.sqrt(sectionArea(flares[k], toRing(frame, [E[0], E[1], z]), frame.axis, 3) / Math.PI) - p.d / 2 / uz;
      });
    }
    if (joint === "base") {
      const A = sectionArea(flares[0], toRing(frame, [0, 0, b.plateau + 0.002]), frame.axis, 20);
      const ring = area(b.core, b.rOut) - area(b.core, b.rIn);
      return [(A - ring) / (platePerimeter({ core: b.core, r: b.rOut }) + platePerimeter({ core: b.core, r: b.rIn }))];
    }
    const zLow = Math.max(b.saddleBottom, b.bandUnderEdge - 0.05);
    const A = sectionArea(flares[0], toRing(frame, [0, 0, zLow + 0.002]), frame.axis, 20);
    return [(A - area(b.plate.core, b.plate.r)) / platePerimeter(b.plate)];
  } catch (e) {
    errors.push(`${joint} flare section threw ${(e as Error)?.message ?? e}`);
    return [NaN];
  }
}
