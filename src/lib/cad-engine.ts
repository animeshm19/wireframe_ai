/**
 * Shared ring geometry engine (P1-S1).
 *
 * One module, used by the browser Web Worker today and usable unchanged in Node
 * if a server path is reintroduced. All dimensions are millimetres.
 *
 * Frame: the finger hole runs along Z, the band lies in the XY plane, and the
 * stone sits at +Y — so the ring stands upright as it would on a hand.
 */
import {
  primitives, booleans, transforms, extrusions, geometries, maths, utils, measurements,
} from "@jscad/modeling";

const { cylinder, cylinderElliptic, sphere, torus, cuboid } = primitives;
const { union, subtract } = booleans;
const { translate, rotateX, rotateY, rotateZ, scale } = transforms;
const { extrudeFromSlices, extrudeRotate, slice } = extrusions;
const { geom2 } = geometries;
const { degToRad } = utils;
const mat4 = maths.mat4;

export type Pt = [number, number];
export type GemCut =
  | "round" | "princess" | "oval" | "emerald" | "cushion" | "marquise" | "pear";
export type SettingStyle = "prong" | "bezel" | "halo" | "cathedral";
export type BandProfile = "comfort" | "flat" | "round" | "knife";

// ---------------------------------------------------------------- outlines --

/**
 * Girdle outline for a cut, as a closed counter-clockwise loop normalised to
 * roughly unit radius. Scaled by the girdle radius at build time, so every cut
 * flows through the same lofting machinery.
 */
export function gemOutline(cut: GemCut, n = 64): Pt[] {
  const ring = (rx: number, ry: number, count = n): Pt[] =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return [rx * Math.cos(a), ry * Math.sin(a)] as Pt;
    });

  switch (cut) {
    case "princess": {
      const h = 0.80;
      return [[h, h], [-h, h], [-h, -h], [h, -h]];
    }

    case "oval":
      return ring(0.82, 1.28);

    case "emerald": {
      // Rectangle with the corners cut off — the classic step cut.
      const a = 0.82, b = 1.22, c = 0.30;
      return [
        [a, b - c], [a - c, b], [-(a - c), b], [-a, b - c],
        [-a, -(b - c)], [-(a - c), -b], [a - c, -b], [a, -(b - c)],
      ];
    }

    case "cushion": {
      // Superellipse: square-ish with generously rounded corners.
      const e = 0.625; // 2/3.2
      return Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        return [
          Math.sign(c) * Math.pow(Math.abs(c), e) * 1.02,
          Math.sign(s) * Math.pow(Math.abs(s), e) * 1.02,
        ] as Pt;
      });
    }

    case "marquise": {
      // Pointed lens: zero width at both tips.
      const half = Math.max(8, Math.floor(n / 2));
      const pts: Pt[] = [];
      for (let i = 0; i <= half; i++) {
        const t = -1 + (2 * i) / half;
        pts.push([0.60 * (1 - t * t), 1.45 * t]);
      }
      for (let i = half - 1; i > 0; i--) {
        const t = -1 + (2 * i) / half;
        pts.push([-0.60 * (1 - t * t), 1.45 * t]);
      }
      return pts;
    }

    case "pear": {
      // Circular at one end, tapering to a point at the other.
      const half = Math.max(8, Math.floor(n / 2));
      const w = (y: number) =>
        y <= 0 ? 0.92 * Math.sqrt(Math.max(0, 1 - y * y)) : 0.92 * Math.pow(1 - y, 0.75);
      const pts: Pt[] = [];
      for (let i = 0; i <= half; i++) {
        const y = -1 + (2 * i) / half;
        pts.push([w(y), y * 1.25]);
      }
      for (let i = half - 1; i > 0; i--) {
        const y = -1 + (2 * i) / half;
        pts.push([-w(y), y * 1.25]);
      }
      return pts;
    }

    case "round":
    default:
      // 16 facets reads as a brilliant without looking like a cylinder.
      return ring(1, 1, 16);
  }
}

/** Largest distance from the centre to the outline — used to place prongs and halos. */
export function outlineRadius(o: Pt[]): number {
  return Math.max(...o.map(([x, y]) => Math.hypot(x, y)));
}

/** Outline radius in a given direction, so prongs sit on the stone's actual edge. */
export function radiusAtAngle(o: Pt[], angle: number): number {
  let best = 0;
  let bestDot = -Infinity;
  const ux = Math.cos(angle), uy = Math.sin(angle);
  for (const [x, y] of o) {
    const len = Math.hypot(x, y) || 1e-6;
    const dot = (x * ux + y * uy) / len;
    if (dot > bestDot) { bestDot = dot; best = len; }
  }
  return best;
}

// --------------------------------------------------------------------- gem --

/** Round-brilliant proportions, as fractions of girdle DIAMETER. */
const TABLE = 0.57, CROWN = 0.145, GIRDLE = 0.03, PAVILION = 0.43;

export type GemDims = {
  girdleR: number; pavH: number; girdleH: number; crownH: number; totalH: number;
};

export function gemDims(girdleR: number): GemDims {
  const d = girdleR * 2;
  const pavH = d * PAVILION, girdleH = d * GIRDLE, crownH = d * CROWN;
  return { girdleR, pavH, girdleH, crownH, totalH: pavH + girdleH + crownH };
}

function loft(outline: Pt[], steps: { z: number; s: number }[], girdleR: number) {
  return extrudeFromSlices({
    numberOfSlices: steps.length,
    callback: (_p: number, i: number) => {
      const { z, s } = steps[i];
      return slice.transform(
        mat4.fromTranslation(mat4.create(), [0, 0, z]),
        slice.fromPoints(outline.map(([x, y]) => [x * girdleR * s, y * girdleR * s]))
      );
    },
  }, {} as any);
}

/** A faceted stone of any cut, culet at z = 0, table up. */
// ------------------------------------------------------------- faceting --

/**
 * A true 57-facet round brilliant.
 *
 * A lofted cone is smooth, and smooth is exactly what a diamond is not. All the
 * life in a brilliant comes from discrete planar facets bouncing light at each
 * other: every facet is a separate mirror, so a stone shows dozens of distinct
 * bright and dark patches that shift as it turns. That scintillation is what
 * the eye reads as "diamond". Model it as a cone and you get a glass pyramid.
 *
 * Facet plan (GIA round brilliant, 57 facets + 16 girdle facets):
 *   crown    1 table + 8 star + 8 bezel (kite) + 16 upper girdle  = 33
 *   pavilion 16 lower girdle + 8 pavilion mains                   = 24
 *
 * The same facet topology builds the whole brilliant family — oval, pear,
 * marquise, cushion are modified brilliants: identical facet arrangement
 * stretched onto a different girdle outline. That is how they are actually cut,
 * so driving the azimuthal radius from `radiusAtAngle` is not an approximation.
 */
const STAR_LEN = 0.55;   // star facet length, fraction of table edge → girdle
const LOWER_LEN = 0.77;  // lower-half facet length, fraction girdle → culet

type V3 = [number, number, number];

/** Newell normal of a face. */
function faceNormal(pts: V3[]): V3 {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [nx, ny, nz];
}

/**
 * Builds a polyhedron, orienting every face outward by testing its normal
 * against the direction from the solid's centre. Cheaper than reasoning about
 * winding order for seventy-odd faces, and it cannot silently get one wrong.
 */
function facetedSolid(points: V3[], faces: number[][], centre: V3) {
  const oriented = faces.map((f) => {
    const pts = f.map((i) => points[i]);
    const n = faceNormal(pts);
    const c: V3 = [0, 0, 0];
    for (const p of pts) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length; }
    const d = (c[0] - centre[0]) * n[0] + (c[1] - centre[1]) * n[1] + (c[2] - centre[2]) * n[2];
    return d < 0 ? [...f].reverse() : f;
  });
  return primitives.polyhedron({ points, faces: oriented, orientation: "outward" } as any);
}

export function buildBrilliant(cut: GemCut, girdleR: number) {
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const N = 16;                                   // azimuthal divisions
  const outline = gemOutline(cut, 256);           // fine, so the girdle radius is exact
  const ang = (i: number) => ((i % N) / N) * Math.PI * 2;
  const rAt = (i: number) => radiusAtAngle(outline, ang(i)) * girdleR;
  const at = (i: number, k: number, z: number): V3 =>
    [rAt(i) * k * Math.cos(ang(i)), rAt(i) * k * Math.sin(ang(i)), z];

  const zGb = pavH, zGt = pavH + girdleH, zT = pavH + girdleH + crownH;
  const zS = zGt + crownH * (1 - STAR_LEN);
  const rS = TABLE + STAR_LEN * (1 - TABLE);

  const P: V3[] = [];
  const push = (v: V3) => P.push(v) - 1;

  const culet = push([0, 0, 0]);
  const Gb: number[] = [], Gt: number[] = [], Tb: number[] = [], St: number[] = [], Lo: number[] = [];
  for (let i = 0; i < N; i++) { Gb.push(push(at(i, 1, zGb))); Gt.push(push(at(i, 1, zGt))); }
  for (let j = 0; j < N / 2; j++) {
    Tb.push(push(at(2 * j, TABLE, zT)));                              // table corner
    St.push(push(at(2 * j + 1, rS, zS)));                             // star point
    // Lower-girdle junction: slides toward the culet in radius and height
    // together, which is what keeps the pavilion mains planar.
    Lo.push(push(at(2 * j + 1, 1 - LOWER_LEN, zGb * (1 - LOWER_LEN))));
  }

  const F: number[][] = [];
  F.push(Tb.slice());                                                 // table
  for (let j = 0; j < 8; j++) {
    const jn = (j + 1) % 8, jp = (j + 7) % 8;
    F.push([Tb[j], St[j], Tb[jn]]);                                   // star
    F.push([Tb[j], St[jp], Gt[2 * j], St[j]]);                        // bezel kite
    F.push([St[j], Gt[2 * j], Gt[2 * j + 1]]);                        // upper girdle
    F.push([St[j], Gt[2 * j + 1], Gt[(2 * j + 2) % N]]);
    F.push([Gb[2 * j], Lo[j], Gb[2 * j + 1]]);                        // lower girdle
    F.push([Gb[2 * j + 1], Lo[j], Gb[(2 * j + 2) % N]]);
    F.push([Gb[2 * j], Lo[j], culet, Lo[jp]]);                        // pavilion main
  }
  for (let i = 0; i < N; i++) {                                       // girdle band
    const i2 = (i + 1) % N;
    F.push([Gt[i], Gb[i], Gb[i2], Gt[i2]]);
  }

  return facetedSolid(P, F, [0, 0, zGb]);
}

/**
 * Step cuts (emerald, princess) are built the other way round: concentric
 * planar steps, not radiating facets. The loft already produces flat quads
 * between slices, so a step cut is just a loft with the real number of steps —
 * three on the crown, four on the pavilion — instead of one long taper.
 */
function buildStepCut(cut: GemCut, girdleR: number) {
  const o = gemOutline(cut);
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const zG = pavH, zGt = pavH + girdleH;
  const steps: { z: number; s: number }[] = [];
  const PAV = [0.10, 0.34, 0.63, 0.85];             // pavilion step scales, culet up
  steps.push({ z: 0, s: 0.10 });
  PAV.forEach((s, k) => steps.push({ z: (zG * (k + 1)) / (PAV.length + 1), s }));
  steps.push({ z: zG, s: 1 });
  steps.push({ z: zGt, s: 1 });
  const CR = [0.86, 0.71];                          // crown steps, girdle up
  CR.forEach((s, k) => steps.push({ z: zGt + (crownH * (k + 1)) / (CR.length + 1), s }));
  steps.push({ z: zGt + crownH, s: TABLE });
  return loft(o, steps, girdleR);
}

export function buildGem(cut: GemCut, girdleR: number) {
  // Step cuts and brilliant cuts are different machines, not different settings.
  return cut === "emerald" || cut === "princess"
    ? buildStepCut(cut, girdleR)
    : buildBrilliant(cut, girdleR);
}

// -------------------------------------------------------------------- band --

/**
 * Band cross-sections, revolved around the finger axis. Points are
 * [radius, position across the band], so each profile is exact rather than
 * approximated with booleans.
 */
function bandSection(profile: BandProfile, innerR: number, outerR: number, halfW: number): Pt[] {
  switch (profile) {
    case "flat":
      return [[innerR, -halfW], [outerR, -halfW], [outerR, halfW], [innerR, halfW]];

    case "knife": {
      // Sharp ridge at the outer edge.
      return [[innerR, -halfW], [outerR, 0], [innerR, halfW]];
    }

    case "round": {
      // Fully elliptical section — rounded inside and out.
      const cx = (innerR + outerR) / 2, rx = (outerR - innerR) / 2;
      return Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return [cx + rx * Math.cos(a), halfW * Math.sin(a)] as Pt;
      });
    }

    case "comfort":
    default: {
      // Domed outside, flat bore that seats on the finger.
      const pts: Pt[] = [[innerR, -halfW]];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const t = -1 + (2 * i) / steps;
        pts.push([innerR + (outerR - innerR) * Math.sqrt(Math.max(0, 1 - t * t)), halfW * t]);
      }
      pts.push([innerR, halfW]);
      return pts;
    }
  }
}

export function buildBand(
  innerR: number, width: number, thickness: number, profile: BandProfile
) {
  const section = geom2.fromPoints(bandSection(profile, innerR, innerR + thickness, width / 2) as any);
  return extrudeRotate({ segments: 128, angle: Math.PI * 2 }, section as any);
}

// ----------------------------------------------------------------- setting --

export type SettingOpts = {
  cut: GemCut;
  girdleR: number;
  prongCount: number;
  style: SettingStyle;
};

export type Head = { metal: any; stones: any[] };

/**
 * Setting plus stone(s), built along +Z with the culet at the origin.
 *
 * Metal and stones are kept as SEPARATE bodies, not welded into one solid:
 * a casting file must contain only the metal, and the renderer needs to give
 * the stones a refractive material. Fusing them — as the original code did —
 * makes both impossible and inflates any metal-weight estimate by the volume
 * of the diamond.
 */
export function buildHead({ cut, girdleR, prongCount, style }: SettingOpts): Head {
  const o = gemOutline(cut);
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const stones: any[] = [buildGem(cut, girdleR)];
  const parts: any[] = [];

  if (style === "bezel") {
    // A collar following the stone's outline, wrapping the girdle.
    const outer = loft(o, [
      { z: pavH * 0.55, s: 1.02 },
      { z: pavH + girdleH + crownH * 0.30, s: 1.16 },
    ], girdleR);
    const inner = loft(o, [
      { z: pavH * 0.45, s: 0.88 },
      { z: pavH + girdleH + crownH * 0.35, s: 1.03 },
    ], girdleR);
    parts.push(subtract(outer as any, inner as any) as any);
    // Seat connecting the collar down to the band.
    parts.push(translate([0, 0, pavH * 0.3], cylinder({
      radius: girdleR * 0.55, height: pavH * 0.8, segments: 48,
    }) as any) as any);
    return { metal: union(...parts), stones };
  }

  // Prong-based settings: each prong sits on the stone's real edge in its own
  // direction, so non-round cuts get prongs on their corners and tips.
  const prongR = 0.28 + girdleR * 0.045;
  const baseZ = -0.6;
  const topZ = pavH + girdleH + crownH * 0.5;

  for (let i = 0; i < prongCount; i++) {
    const angle = (i / prongCount) * Math.PI * 2 + (cut === "princess" ? Math.PI / 4 : 0);
    const edge = radiusAtAngle(o, angle) * girdleR;
    const baseR = edge * 0.30;
    const dx = edge * 0.98 - baseR;
    const dz = topZ - baseZ;
    const len = Math.hypot(dx, dz);

    let shaft: any = cylinder({ radius: prongR, height: len, segments: 16 });
    shaft = translate([0, 0, len / 2], shaft);
    shaft = rotateY(Math.atan2(dx, dz), shaft);
    shaft = translate([baseR, 0, baseZ], shaft);
    const tip = translate([edge * 0.98, 0, topZ],
      sphere({ radius: prongR * 1.15, segments: 16 }) as any);
    parts.push(rotateZ(angle, union(shaft, tip as any) as any));
  }

  // Gallery rail, at the radius the prongs occupy at that height.
  const meanEdge = outlineRadius(o) * girdleR;
  parts.push(translate([0, 0, baseZ + (topZ - baseZ) * 0.55], torus({
    innerRadius: prongR * 0.75,
    outerRadius: meanEdge * 0.30 + (meanEdge * 0.98 - meanEdge * 0.30) * 0.55,
    innerSegments: 12, outerSegments: 48,
  }) as any) as any);

  if (style === "halo") {
    // A ring of small stones following the centre stone's outline.
    const haloR = girdleR * 0.22;
    const count = Math.max(10, Math.round(outlineRadius(o) * girdleR * 3.2));
    const hd = gemDims(haloR);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radiusAtAngle(o, a) * girdleR + haloR * 1.15;
      stones.push(translate([r * Math.cos(a), r * Math.sin(a), pavH + girdleH - hd.pavH],
        buildGem("round", haloR) as any));
      // A seat under each accent stone so the halo is real metal, not floating gems.
      parts.push(translate(
        [r * Math.cos(a), r * Math.sin(a), pavH + girdleH - hd.pavH - haloR * 0.35],
        cylinder({ radius: haloR * 0.85, height: haloR * 1.1, segments: 12 }) as any
      ) as any);
    }
    // Rail carrying the halo seats.
    parts.push(translate([0, 0, pavH + girdleH - girdleR * 0.30], torus({
      innerRadius: haloR * 0.55,
      outerRadius: outlineRadius(o) * girdleR + haloR * 1.15,
      innerSegments: 10, outerSegments: 56,
    }) as any) as any);
  }

  return { metal: union(...parts), stones };
}

// ------------------------------------------------------------------- ring --

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A tapered strut between two points — used for cathedral shoulders. */
function strut(a: [number, number, number], b: [number, number, number], r0: number, r1: number) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  let c: any = cylinderElliptic({
    height: len, startRadius: [r0, r0], endRadius: [r1, r1], segments: 24,
  });
  c = translate([0, 0, len / 2], c);
  c = rotateY(Math.acos(clamp(d[2] / len, -1, 1)), c);
  c = rotateZ(Math.atan2(d[1], d[0]), c);
  return translate(a, c);
}

export type RingParams = {
  ringSize?: number;
  bandWidth?: number;
  bandProfile?: BandProfile;
  gemShape?: GemCut;
  gemSize?: number;
  prongCount?: number;
  setting?: SettingStyle;
};

export type RingMetrics = {
  innerDiameter: number; outerDiameter: number;
  bandWidth: number; bandThickness: number;
  girdleDiameter: number; stoneHeight: number;
  /** Metal only — excludes the stones, so weight estimates are honest. */
  volumeMm3: number;
  stoneVolumeMm3: number;
  stoneCount: number;
};

/** Builds the complete ring. `report` receives 0-100 progress with a stage name. */
export function buildRing(
  p: RingParams,
  report: (pct: number, stage: string) => void = () => {}
): { metal: any; stones: any; metrics: RingMetrics } {
  const ringSize = clamp(Number(p?.ringSize) || 6, 3, 16);
  const bandWidth = clamp(Number(p?.bandWidth) || 2.5, 1.2, 8);
  const gemSize = clamp(Number(p?.gemSize) || 1, 0.05, 15);
  const prongCount = clamp(Math.round(Number(p?.prongCount) || 6), 3, 8);
  const profile = (p?.bandProfile || "comfort") as BandProfile;
  const cut = (p?.gemShape || "round") as GemCut;
  const style = (p?.setting || "prong") as SettingStyle;

  // US size to inner diameter: size 6 = 16.51mm, 0.8128mm per size.
  const innerR = (11.63 + ringSize * 0.8128) / 2;
  const thickness = clamp(bandWidth * 0.62, 1.2, 2.6);
  const outerR = innerR + thickness;
  const girdleR = 3.25 * Math.cbrt(gemSize);

  report(25, "Shaping band");
  const band = buildBand(innerR, bandWidth, thickness, profile);

  report(50, "Cutting stone and setting");
  const head = buildHead({ cut, girdleR, prongCount, style });

  report(72, "Merging solids");
  // Stand the head up at +Y on top of the band.
  const stand = (g: any) => translate([0, outerR - 0.35, 0], rotateX(degToRad(-90), g) as any);
  const parts: any[] = [band as any, stand(head.metal) as any];
  const stoneParts: any[] = head.stones.map(stand);

  if (style === "cathedral") {
    const { pavH } = gemDims(girdleR);
    const a = degToRad(42);
    for (const sgn of [-1, 1]) {
      parts.push(strut(
        [sgn * outerR * Math.sin(a), outerR * Math.cos(a) - 0.4, 0],
        [sgn * girdleR * 0.42, outerR + pavH * 0.55, 0],
        bandWidth * 0.30, bandWidth * 0.18
      ) as any);
    }
  }

  const d = gemDims(girdleR);
  const metal = union(...parts);
  const stones = stoneParts.length > 1 ? union(...stoneParts) : stoneParts[0];
  return {
    metal,
    stones,
    metrics: {
      innerDiameter: +(innerR * 2).toFixed(2),
      outerDiameter: +(outerR * 2).toFixed(2),
      bandWidth: +bandWidth.toFixed(2),
      bandThickness: +thickness.toFixed(2),
      girdleDiameter: +(girdleR * 2).toFixed(2),
      stoneHeight: +d.totalH.toFixed(2),
      volumeMm3: +(measurements.measureVolume(metal) as number).toFixed(1),
      stoneVolumeMm3: +(measurements.measureVolume(stones) as number).toFixed(2),
      stoneCount: stoneParts.length,
    },
  };
}

// --------------------------------------------------------- manufacturability --

export type MetalKey = "platinum" | "white_gold" | "18k_gold" | "14k_rose" | "silver";

/**
 * Minimum safe dimensions for casting and daily wear, in millimetres.
 *
 * Sources are standard trade practice: casting houses generally refuse walls
 * below ~0.8mm in gold and ~0.7mm in platinum, and prongs below ~0.8mm diameter
 * bend or snap in wear. Silver is softer and needs more material.
 */
export const MANUFACTURING_LIMITS: Record<MetalKey, {
  minWall: number; minProngDia: number; minBandThickness: number; label: string;
}> = {
  platinum:   { minWall: 0.70, minProngDia: 0.80, minBandThickness: 1.00, label: "Platinum" },
  white_gold: { minWall: 0.80, minProngDia: 0.85, minBandThickness: 1.10, label: "18k White Gold" },
  "18k_gold": { minWall: 0.80, minProngDia: 0.85, minBandThickness: 1.10, label: "18k Yellow Gold" },
  "14k_rose": { minWall: 0.80, minProngDia: 0.85, minBandThickness: 1.10, label: "14k Rose Gold" },
  silver:     { minWall: 1.00, minProngDia: 1.00, minBandThickness: 1.30, label: "Sterling Silver" },
};

export type Issue = {
  severity: "error" | "warning";
  code: string;
  message: string;
};

/**
 * Checks a design against manufacturing limits.
 *
 * "error" means a caster would reject it or it would fail in wear; "warning"
 * means it is makeable but inadvisable. Nothing here silently adjusts the
 * design — the caller decides what to do.
 */
export function checkManufacturability(
  p: RingParams & { metalType?: string },
  metrics: RingMetrics
): Issue[] {
  const issues: Issue[] = [];
  const metal = (p.metalType && p.metalType in MANUFACTURING_LIMITS
    ? p.metalType : "platinum") as MetalKey;
  const lim = MANUFACTURING_LIMITS[metal];

  if (metrics.bandThickness < lim.minBandThickness) {
    issues.push({
      severity: "error",
      code: "band_too_thin",
      message: `Band is ${metrics.bandThickness}mm thick; ${lim.label} needs at least ${lim.minBandThickness}mm to survive wear.`,
    });
  }

  const girdleR = metrics.girdleDiameter / 2;
  const prongDia = (0.28 + girdleR * 0.045) * 2;
  if ((p.setting ?? "prong") !== "bezel" && prongDia < lim.minProngDia) {
    issues.push({
      severity: "error",
      code: "prongs_too_thin",
      message: `Prongs are ${prongDia.toFixed(2)}mm across; ${lim.label} needs at least ${lim.minProngDia}mm or they will bend.`,
    });
  }

  if (metrics.girdleDiameter > metrics.innerDiameter * 0.85) {
    issues.push({
      severity: "warning",
      code: "stone_overwhelms_band",
      message: `A ${metrics.girdleDiameter}mm stone on a ${metrics.innerDiameter}mm finger is top-heavy and will spin.`,
    });
  }

  if (metrics.bandWidth < 1.6 && metrics.girdleDiameter > 6.5) {
    issues.push({
      severity: "warning",
      code: "shank_underbuilt",
      message: `A ${metrics.bandWidth}mm shank is light for a ${metrics.girdleDiameter}mm stone; consider 2mm or more.`,
    });
  }

  if (metrics.stoneHeight > metrics.innerDiameter * 0.55) {
    issues.push({
      severity: "warning",
      code: "setting_very_tall",
      message: `The stone sits ${metrics.stoneHeight}mm proud, which catches on clothing.`,
    });
  }

  return issues;
}
