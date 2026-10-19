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
  measureVolume, Plane, getOC,
  type Shape3D, type AnyShape, type Face,
} from "replicad";
import {
  buildRingParts, resolveRing, toSTEP, toSTL, BLEND_JOINTS,
  type PartRole, type StoneRole, type HeadFrame, type HeadName, type BlendJoint, type BlendPath,
} from "./cad-engine-brep.js";
import { gemDims } from "./cad-engine.js";
import { centrelineOffset, padProfile, polygonDistance, radialHit, roundedPoints, spineSamples } from "./head-layout.js";
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
  /** Metal of this prong inside its head's saddle, mm³ (centre head; NaN elsewhere). */
  inBridge: number;
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
  /** Least distance from the lower gallery, and from its pad, to the stone it holds. */
  clearanceToStone: number;
  padClearanceToStone: number;
  /** Where the layout put it, above the culet: the wire's bottom and top, and the pad's top. */
  zBottom: number; zTop: number; padTop: number;
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
  /** resolveRing found the blended metal still meshing open with every filleted joint flared. */
  meshOpen: boolean;
  /** S3's foot flares that stood as columns beside a flat base (q. 34); always false since S3b. */
  flareColumn: boolean;
};

export type StructureAudit = {
  spec: Record<string, unknown>;
  /** The centre head's values as built: resolveBench, then any engine clamp. */
  bench: ResolvedBench;
  /** The centre head's values as asked: resolveBench alone. The invariants judge against these. */
  requested: BenchValues;
  /**
   * The bounds of the fields an engine clamp may hold by the stone's size,
   * for this design's alloy, from setting-standards and not from the engine:
   * the invariants accept a reported hold only inside them (review).
   */
  bounds: Record<"culetClearance" | "galleryClearance" | "basketTaper" | "prongDiameter", { min: number; max: number }>;
  /** Microscopic sealed cavities the merge filled (fuseMetal → sealVoids). */
  voidsFilled: number;
  /** Fuses OCCT got wrong that a retry 0.001 mm over got right (see fuseMetal). */
  shiftedRetries: number;
  /** Overlaps the audit read as none that a retry 0.001 mm over found (see common). */
  commonRetries: number;
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
    /** The base's surface inside its saddle, mm² (S3, review): where the base is held. NaN with no base. */
    baseSeat: number;
    /** The band's surface inside the saddle, mm²: where the band holds the saddle. NaN with no base. */
    saddleSeat: number;
  } | null;
  /** The head below the stone (S3b): see measureBasket. Null without a lower gallery. */
  basket: {
    overhang: number; overhangAt: string; outside: number; outsideAt: string; legsOut: number; legsOutAt: string;
    opening: number; padOpening: number;
    headMetal: number; tapers: number[]; taper: number; crestInside: boolean;
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

  // OCCT's intersector can miss an overlap at one exact placement and find
  // it 0.001 mm either way (fuseMetal's retry, S2): a common of two parts
  // that touch is read again with the second moved 0.001 mm along each axis
  // in turn, the largest taken, and the retry counted (S3b: two of a
  // marquise's six feet read 0 in a wire the merge had joined them to).
  let commonRetries = 0;
  const common = (a: Shape3D, b: Shape3D, what: string): number => {
    try {
      const v = overlapVolume(a, b, volOf);
      if (v > 1e-9 || a.boundingBox.isOut(b.boundingBox) || !(measureDistanceBetween(a, b) < 1e-6)) return v;
      let most = v;
      for (const dlt of [[1e-3, 0, 0], [-1e-3, 0, 0], [0, 1e-3, 0], [0, -1e-3, 0], [0, 0, 1e-3], [0, 0, -1e-3]] as V3[]) {
        const moved = b.clone().translate(dlt) as Shape3D;
        most = Math.max(most, measureVolume(a.clone().intersect(moved) as Shape3D));
      }
      if (most > v) commonRetries++;
      return most;
    } catch (e) {
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
      // Into its own head's saddle (S3, review): a flared foot's column
      // stands 0.01 mm into the plateau beside the base. Recorded, not yet
      // judged (see S3.md).
      inBridge: r.head === "centre" ? sum(bridgeIdx.filter((b) => metalRoles[b].head === r.head).map((b) => common(p, metalParts[b], `${tag} ∩ saddle`))) : NaN,
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
      padClearanceToStone: saddle == null ? NaN : distance(metalParts[saddle], held, `${r.head} pad to stone`),
      zBottom: plan ? plan.zBottom : NaN, zTop: plan ? plan.zTop : NaN, padTop: plan ? plan.pad.top : NaN,
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
        ? makePolygon(plan.pad.plan.map(([x, y]) => toRing(centreFrame, [x, y, s]) as V3))
        : makeFace(assembleWire([makeCircle(dims.girdleR * 1.2, at, centreFrame.axis)]));
      const area = measureArea(metal.intersect(disc as unknown as Shape3D) as Shape3D);
      const pd = bench.values.prongDiameter;
      const prongSectionSum = centreFrame.prongCount * Math.PI * (pd / 2) ** 2;
      // The plane above is the S3 prompt's, and on this head (a base sunk in
      // a saddle whose plateau is just under the band's top) it cuts the base
      // itself, so it shows the base is big enough, not that anything holds
      // it (review). The two links that carry it, as the areas they meet
      // over: the base's surface inside the saddle, and the band's.
      let baseSeat = NaN, saddleSeat = NaN;
      const bi = baseIdx.find((i) => metalRoles[i].head === "centre"), si = bridgeIdx.find((i) => metalRoles[i].head === "centre");
      if (plan && bi != null && si != null) {
        baseSeat = measureArea(metalParts[si].intersect(skinOf(metalParts[bi]) as unknown as Shape3D) as Shape3D);
        saddleSeat = sum(bandIdx.map((k) => measureArea(metalParts[si].intersect(skinOf(metalParts[k]) as unknown as Shape3D) as Shape3D)));
      }
      joint = { jointSectionArea: area, prongSectionSum, prongDiameter: pd, ratio: area / prongSectionSum, baseSeat, saddleSeat };
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
      const radii = filletRadii(j, resolved.blend.faces[j] ?? [], errors).filter((x) => Number.isFinite(x));
      measured[j] = { min: Math.min(...radii), max: Math.max(...radii), faces: radii.length };
    } else if (resolved.blend.paths[j] === "flare" && plan) {
      const r = flareRadius(j, resolved.blend.flares[j] ?? [], centreFrame, errors);
      measured[j] = { min: Math.min(...r), max: Math.max(...r), faces: r.length };
    }
  }
  const blend: BlendAudit = {
    paths: resolved.blend.paths, failed: resolved.blend.failed, meshOpen: !!resolved.blend.meshOpen,
    flareColumn: !!plan?.flareColumn,
    planned: plan ? plan.blend : null, flarePlanned: plan ? plan.flare : null, measured,
  };


  // ------------------------------------------------------- basket (S3b) --
  // I15, I16, I17 and basketTaper's I13: what the head below the stone is,
  // measured on the parts and the merged metal (see BasketAudit).
  let basket: StructureAudit["basket"] = null;
  const cb = centreFrame.layout.base;
  const bi = baseIdx.find((i) => metalRoles[i].head === "centre"), pi = bridgeIdx.find((i) => metalRoles[i].head === "centre");
  if (cb && bi != null && pi != null && centreFrame.band) {
    try {
      basket = measureBasket(centreFrame, metal, metalParts[bi], metalParts[pi],
        idx((r) => r.role === "prong" && r.head === "centre").map((i) => metalParts[i]),
        bandIdx.map((i) => metalParts[i]), errors);
    } catch (e) {
      errors.push(`basket measure threw ${(e as Error)?.message ?? e}`);
    }
  }

  const t3 = performance.now();
  return {
    spec, bench, requested, voidsFilled, shiftedRetries, commonRetries, blend, basket,
    bounds: {
      culetClearance: benchBounds("culetClearance", (spec.metalType as MetalType) ?? "platinum"),
      galleryClearance: benchBounds("galleryClearance", (spec.metalType as MetalType) ?? "platinum"),
      basketTaper: benchBounds("basketTaper", (spec.metalType as MetalType) ?? "platinum"),
      prongDiameter: benchBounds("prongDiameter", (spec.metalType as MetalType) ?? "platinum"),
    },
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
  // unmeasured. Only where the prong's box agrees that nothing reaches below
  // the plane, though: an empty common is also how a boolean fails without
  // throwing, and that stays NaN, a failure (review). The box is the loose
  // one, so it can only send a real "nothing there" to NaN, never the other
  // way.
  const [lo3, hi3] = prong.boundingBox.bounds;
  const lowest = Math.min(...[0, 1, 2, 3, 4, 5, 6, 7].map((k) =>
    toHead(frame, [(k & 1 ? hi3 : lo3)[0], (k & 2 ? hi3 : lo3)[1], (k & 4 ? hi3 : lo3)[2]])[2]));
  const pavilionClearance = measureVolume(lower) > 1e-9 ? measureDistanceBetween(lower, stone)
    : lowest > cutZ ? Infinity : NaN;

  return {
    head, index, notchFloor, postFace, notch: notchFloor - postFace, postWidth,
    stoneEdge, seatGap: notchFloor - stoneEdge, top, pavilionClearance,
    expected: expectedFor(frame, plan, asked),
  };
}

// --------------------------------------------------------------- blends --

/**
 * A filleted joint's radius, read off the fillet faces resolveRing made at
 * that joint (S3b). OCCT's fillet surface runs its U parameter across the
 * fillet, round the rolling ball's own circle (seen on the default ring: the
 * U lines of every fillet face read 0.3000 for a 0.3 fillet, the V lines the
 * joint's own curve), so the circle through a U line's ends and middle is
 * the radius. Taken only where the line is that circle: the same circle
 * through its first half, to 0.001 mm. A patch where a fillet runs past
 * another feature, whose U line is not one arc (S3 read anywhere from 0.001
 * to 400 mm off such patches), is left out; if none is left, NaN.
 */
function filletRadii(joint: BlendJoint, faces: Face[], errors: string[]): number[] {
  const oc = getOC();
  const out: number[] = [];
  for (const f of faces) {
    const ad = new oc.BRepAdaptor_Surface(f.wrapped, true);
    try {
      const u0 = ad.FirstUParameter(), u1 = ad.LastUParameter(), v0 = ad.FirstVParameter(), v1 = ad.LastVParameter();
      const P = (u: number, v: number): V3 => { const p = ad.Value(u, v); const q: V3 = [p.X(), p.Y(), p.Z()]; p.delete(); return q; };
      for (const v of [v0 + (v1 - v0) * 0.25, (v0 + v1) / 2, v0 + (v1 - v0) * 0.75]) {
        const um = (u0 + u1) / 2;
        const full = circumradius(P(u0, v), P(um, v), P(u1, v)), half = circumradius(P(u0, v), P((u0 + um) / 2, v), P(um, v));
        if (Number.isFinite(full) && Math.abs(full - half) < 1e-3) out.push(full);
      }
    } catch (e) {
      errors.push(`${joint} fillet face threw ${(e as Error)?.message ?? e}`);
    } finally {
      ad.delete();
    }
  }
  return out.length ? out : [NaN];
}

function circumradius(a: V3, b: V3, c: V3): number {
  const ab = add(b, a, -1), ac = add(c, a, -1);
  const cr = cross(ab, ac), A = Math.hypot(...cr) / 2;
  if (A < 1e-12) return Infinity;
  return (Math.hypot(...ab) * Math.hypot(...ac) * Math.hypot(...add(c, b, -1))) / (4 * A);
}

/**
 * A flared joint's added radius, measured on the flare built (resolveRing
 * hands them over before fusing them in):
 *   feet   the flare's section square to its run, at the foot: its radius
 *          less the prong's;
 *   base   in the plane through the head's axis along the band, how far
 *          down the pad's outer face the flare reaches from where that face
 *          leaves the wire, which the flare runs 2r;
 *   shank  in the same plane, how far the flare stands out beyond the pad's
 *          outer face, which it does by r.
 */
function flareRadius(joint: BlendJoint, flares: Shape3D[], frame: HeadFrame, errors: string[]): number[] {
  const b = frame.layout.base!;
  try {
    if (joint === "feet") {
      return frame.layout.prongs.map((p, k) => {
        const F = p.spine!.points[0], u = unit(add(p.spine!.points[1], F, -1));
        const ring = (q: V3) => toRing(frame, q);
        const n = unit(add(ring(add(F, u)), ring(F), -1));
        const disc = makeFace(assembleWire([makeCircle(3, ring(F), n)]));
        const A = measureArea(flares[k].intersect(disc as unknown as Shape3D) as Shape3D);
        return Math.sqrt(A / Math.PI) - p.d / 2;
      });
    }
    // The flare's section in the plane through the axis along +x (the band).
    const X = b.rOut + 4, lo = b.pad.bottom - 1, hi = b.zTop + 1;
    const plane = makePolygon([[0, 0, lo], [X, 0, lo], [X, 0, hi], [0, 0, hi]].map((q) => toRing(frame, q as V3)));
    const section = flares[0].intersect(plane as unknown as Shape3D);
    const pts: [number, number][] = [];
    for (const e of section.edges) {
      for (let k = 0; k <= 20; k++) {
        const v = e.pointAt(k / 20), q = toHead(frame, [v.x, v.y, v.z]);
        pts.push([centrelineOffset(b, q), q[2]]);
      }
    }
    if (!pts.length) throw new Error("empty section");
    const { A, B, V, C } = padProfile(b.pad);
    if (joint === "shank") {
      // The outer face, V down to C: its offset at height z.
      // The most it stands out beyond that face at any height: the flare is
      // built into the pad (padOutline), whose own bottom corner, further
      // out than the flare, is on the face.
      const faceAt = (z: number) => V[0] + ((C[0] - V[0]) * (V[1] - z)) / Math.max(1e-9, V[1] - C[1]);
      return [Math.max(...pts.filter((p) => p[1] <= V[1] && p[1] >= C[1]).map((p) => p[0] - faceAt(p[1])))];
    }
    // Where the outer face, B down to V, leaves the wire, and the flare's
    // lowest point on that side.
    let t0 = 0, t1 = 1;
    const inside = (t: number) => Math.hypot((B[0] + (V[0] - B[0]) * t) / b.wide, (B[1] + (V[1] - B[1]) * t - b.z) / b.tube) < 1;
    for (let k = 0; k < 40; k++) { const m = (t0 + t1) / 2; if (inside(m)) t0 = m; else t1 = m; }
    const K: [number, number] = [B[0] + (V[0] - B[0]) * t1, B[1] + (V[1] - B[1]) * t1];
    const low = pts.filter((p) => p[0] > A[0] / 2 + B[0] / 2).reduce((m, p) => (p[1] < m[1] ? p : m));
    return [Math.hypot(low[0] - K[0], low[1] - K[1]) / 2];
  } catch (e) {
    errors.push(`${joint} flare section threw ${(e as Error)?.message ?? e}`);
    return [NaN];
  }
}

// --------------------------------------------------------- basket (S3b) --

/**
 * The head below the stone, measured (S3b):
 *   overhang  I15: on sections square to the band at the joint's front,
 *             middle and back (x = −L, 0, L, L the wire's reach along the
 *             band), how far any of the merged metal at or under the band's
 *             line stands beyond the band's flank. The flank: the band's own
 *             edge at that x, from the band as built; the line: the band's
 *             top 0.1 mm inside it. The most over the three, both sides.
 *   outside   I16: how far the wire or the pad, above the band's surface,
 *             stands outside the feet's footprint grown by a prong diameter.
 *             The footprint: the stone's outline scaled to the feet, which
 *             is the wire's centreline (the S3b prompt: the base follows "the
 *             outline scaled to the feet"; a hull of the feet alone left a
 *             3-prong ring's wire and a marquise's points outside it). Read
 *             on their own meshes (0.02 mm).
 *   legsOut   I16, the legs: a leg crosses the upper gallery as far out as
 *             the gallery is, so no footprint near the feet holds it there;
 *             what makes the basket a basket is that below the gallery each
 *             leg only comes in. Per centre prong, along the spine it was
 *             swept on (every 0.05 mm, bends included), from the gallery's
 *             bottom down to the foot: how far its centreline ever moves
 *             further out from the axis. (Read off its mesh in slices, a
 *             straight run's few vertices showed jumps of a millimetre that
 *             were not there.)
 *   opening   I16: the least distance from the culet to the wire, and to
 *             the pad above the band: the centre is open as far as the
 *             culet's clearance needs (read in plan from the axis, a 1.5 mm
 *             culet gap failed against a wire 1.58 mm from the culet).
 *   headMetal I17: the volume of the wire and the pad less the band, as
 *             built: the metal the head adds below its prongs.
 *   tapers    I13: each foot's distance out ÷ the girdle's in that direction.
 *             The foot: the middle of the prong's end disc, read off its
 *             part inside the wire as the mesh points furthest back along
 *             its last run. (That part's centroid sits out from the foot by
 *             the leg's lean: 0.49 for a 0.45 taper.)
 */
function measureBasket(
  frame: HeadFrame, metal: Shape3D, wire: Shape3D, pad: Shape3D, prongs: Shape3D[], bands: Shape3D[], errors: string[],
): NonNullable<StructureAudit["basket"]> {
  const b = frame.layout.base!, band = frame.band!;
  const flank = (x: number, sd: 1 | -1) => {
    for (let y = band.axialMax + 0.6; y >= 0; y -= 0.005) {
      if (!band.at(x, sd * y)) continue;
      const t = band.at(x, sd * Math.max(0, y - 0.1));
      return { edge: y, line: t ? t.top : -Infinity };
    }
    return null;
  };
  const line = roundedPoints({ core: b.core, r: b.rc }, 0.05);
  const L = Math.max(...line.map(([x]) => Math.abs(x)));
  let overhang = -Infinity, overhangAt = "";
  for (const x0 of [-L, 0, L]) {
    const R = frame.girdleR * 4;
    const face = makePolygon(([[x0, -R, -R], [x0, R, -R], [x0, R, R], [x0, -R, R]] as V3[]).map((q) => toRing(frame, q)));
    const section = metal.intersect(face as unknown as Shape3D);
    for (const sd of [1, -1] as const) {
      const f = flank(x0, sd);
      if (!f) continue;
      for (const e of section.edges) {
        const n = Math.max(8, Math.ceil(e.length / 0.01));
        for (let k = 0; k <= n; k++) {
          const v = e.pointAt(k / n), q = toHead(frame, [v.x, v.y, v.z]);
          if (sd * q[1] <= 0 || q[2] > f.line) continue;
          const over = sd * q[1] - f.edge;
          if (over > overhang) { overhang = over; overhangAt = `x ${x0.toFixed(2)}, ${sd > 0 ? "+" : "−"}y, z ${q[2].toFixed(3)}`; }
        }
      }
    }
  }

  const d = frame.layout.prongs[0]?.d ?? frame.bench.values.prongDiameter;
  const gBottom = frame.layout.gallery ? frame.layout.gallery.z - frame.layout.gallery.t / 2 : Infinity;
  const vertsOf = (s: Shape3D) => {
    const v = s.mesh({ tolerance: 0.02, angularTolerance: 10 }).vertices, out: V3[] = [];
    for (let k = 0; k < v.length; k += 3) out.push(toHead(frame, [v[k], v[k + 1], v[k + 2]]));
    return out;
  };
  const aboveBand = (q: V3) => { const t = band.at(q[0], q[1]); return !t || q[2] > t.top + 0.01; };
  let outside = -Infinity, outsideAt = "";
  for (const [name, s] of [["the wire", wire], ["the pad", pad]] as [string, Shape3D][]) {
    for (const q of vertsOf(s)) {
      if (q[2] >= gBottom || !aboveBand(q)) continue;
      const o = centrelineOffset(b, q, line) - d;
      if (o > outside) { outside = o; outsideAt = `${name} at (${q.map((x) => x.toFixed(2)).join(", ")})`; }
    }
  }
  let legsOut = -Infinity, legsOutAt = "";
  frame.layout.prongs.forEach((pl, k) => {
    if (!pl.spine) return;
    // Foot to top; walked from the top down, below the gallery's bottom.
    const pts = spineSamples(pl.spine.points, pl.spine.bends, pl.d / 2).map((x) => x.c).reverse().filter((c) => c[2] < gBottom);
    let prev = Infinity;
    for (const c of pts) {
      const r = Math.hypot(c[0], c[1]);
      if (Number.isFinite(prev) && r - prev > legsOut) { legsOut = r - prev; legsOutAt = `prong ${k} at z ${c[2].toFixed(2)}`; }
      prev = Math.min(prev, r);
    }
  });
  void prongs;
  const openingOf = (s: Shape3D, keep: (q: V3) => boolean) => Math.min(...vertsOf(s).filter(keep).map((q) => Math.hypot(...q)));
  const opening = openingOf(wire, () => true);
  const padOpening = openingOf(pad, aboveBand);

  let head = wire.clone().fuse(pad.clone()) as Shape3D;
  for (const bd of bands) head = head.cut(bd.clone()) as Shape3D;
  const headMetal = measureVolume(head);

  const tapers = prongs.map((p, k) => {
    const inWire = p.clone().intersect(wire.clone()) as Shape3D;
    const spine = frame.layout.prongs[k]?.spine;
    if (!(measureVolume(inWire) > 1e-6) || !spine) { errors.push(`centre prong ${k}: nothing in the wire for its taper`); return NaN; }
    const u = unit(add(spine.points[1], spine.points[0], -1));
    const vs = vertsOf(inWire), along = vs.map((q) => dot(q, u)), least = Math.min(...along);
    const disc = vs.filter((_, i) => along[i] <= least + 0.005);
    const c: V3 = [0, 1, 2].map((j) => disc.reduce((t, q) => t + q[j], 0) / disc.length) as V3;
    const a = Math.atan2(c[1], c[0]);
    const g = frame.cut === "round" ? frame.girdleR : radialHit(frame.layout.stone.girdle, a).r;
    return Math.hypot(c[0], c[1]) / g;
  });
  return {
    overhang, overhangAt, outside, outsideAt, legsOut, legsOutAt, opening, padOpening, headMetal, tapers,
    taper: tapers.reduce((t, x) => t + x, 0) / tapers.length,
    crestInside: b.crestInside,
  };
}

function convexHull2(pts: [number, number][]): [number, number][] {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: [number, number], a: [number, number], c: [number, number]) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
  const half = (list: [number, number][]) => {
    const h: [number, number][] = [];
    for (const p of list) { while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], p) <= 1e-12) h.pop(); h.push(p); }
    return h;
  };
  return [...half(P).slice(0, -1), ...half([...P].reverse()).slice(0, -1)];
}
