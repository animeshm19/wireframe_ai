/**
 * B-rep geometry engine (OCCT via replicad).
 *
 * The mesh engine in cad-engine.ts produces triangles. Triangles are fine for a
 * picture and useless for manufacturing: a caster's CAD package wants surfaces
 * it can edit — offset a wall, re-cut a seat, fillet an edge — and a faceted
 * STL gives it none of that. This engine builds the same ring as real boundary
 * representation, so the STEP that leaves the app carries exact cylinders,
 * surfaces of revolution and planar facets rather than a tessellation wearing a
 * STEP extension.
 *
 * It deliberately shares every dimension, proportion and facet plan with the
 * mesh engine by importing them. Two kernels each carrying their own copy of
 * the maths would drift, and the first anyone would know is a STEP file that
 * does not match the render the customer signed off.
 */
import {
  setOC, draw, drawCircle, drawEllipse, makeLine, makeFace, makeSolid,
  assembleWire, makeCylinder, makeSphere, makeCircle, measureVolume, exportSTEP, loft,
  makeCompound,
  Plane, Sketch,
  type Shape3D, type AnyShape, type Wire,
} from "replicad";
import {
  brilliantTopology, gemDims, gemOutline, radiusAtAngle, outlineRadius, girdleRadiusFor,
  type GemCut, type SettingStyle, type BandProfile, type V3, type Pt,
} from "./cad-engine.js";
import { prongDiameterFor } from "./setting-standards.js";

// ------------------------------------------------------------------ kernel --

/**
 * MEMORY: this kernel leaks, and it cannot be fixed from here.
 *
 * WebAssembly has no garbage collector reaching into OCCT, so every shape,
 * edge, wire and sketch stays allocated until something deletes it. A ring is
 * hundreds of those — a faceted brilliant alone is 73 faces built from lines —
 * and deleting the handful this module returns recovers almost none of it:
 * measured at 1.9MB per preview and 15MB per merge either way. Tracking every
 * intermediate was tried and moved the number by 1%.
 *
 * So the worker that runs this is recycled instead. See useBrepWorker: it
 * counts builds and replaces the preview worker during an idle moment, which
 * frees the entire WASM heap at once and costs one kernel boot nobody sees.
 * Tests never caught this because every test is a fresh process; a customer
 * would have caught it as a tab dying after a few hundred slider movements,
 * reporting only "null function or function signature mismatch".
 */
let booting: Promise<void> | null = null;

/**
 * Boots the OCCT WebAssembly kernel. Idempotent and safe to call from anywhere;
 * every caller waits on the same boot.
 *
 * `loadWasm` is injected rather than imported because the three places this
 * runs — a Vite worker, a Node test, a bundled build — each hand over the
 * binary differently, and hard-coding any one of them makes the other two
 * untestable.
 */
export function initKernel(
  /**
   * Either the wasm bytes, or a URL for the kernel to fetch itself. A URL is
   * preferable in a browser — the module streams and compiles it while it
   * downloads — and the bytes are what Node has.
   */
  source: () => Promise<ArrayBuffer | Uint8Array> | string,
): Promise<void> {
  if (!booting) {
    booting = (async () => {
      const mod: any = await import("replicad-opencascadejs");
      const factory = mod.default ?? mod;
      const got = await source();
      const OC = typeof got === "string"
        ? await factory({ locateFile: () => got })
        : await factory({ wasmBinary: got });
      // Held so the heap can be measured. Every caller must come through here:
      // a second boot path that calls setOC itself leaves this null, and the
      // leak harness then reports a flat zero and passes for the wrong reason.
      oc = OC;
      setOC(OC);
    })();
  }
  return booting;
}

export function kernelReady(): boolean {
  return booting !== null;
}

let oc: any = null;

/**
 * The kernel's own heap, in MB.
 *
 * The only number that means anything when chasing this leak. OCCT allocates
 * inside the WASM module's linear memory, which `performance.memory` does not
 * count — a tab can be a gigabyte into the leak while its JS heap sits flat at
 * forty megabytes, which is exactly what makes the crash look like it came from
 * nowhere.
 */
export function kernelHeapMB(): number {
  // This build exposes `wasmMemory` and not the usual emscripten HEAP* views,
  // so read the WebAssembly.Memory directly. Returns -1 rather than 0 when it
  // cannot be read: a leak harness that reports a flat zero because it is
  // measuring nothing would pass every time, which is worse than no harness.
  const buf = (oc as any)?.wasmMemory?.buffer;
  return buf ? buf.byteLength / 1048576 : -1;
}

// -------------------------------------------------------------------- band --

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The band, as a surface of revolution.
 *
 * The mesh engine approximates a comfort-fit dome with fourteen straight
 * segments and revolves that through 128 steps — eighteen hundred facets
 * standing in for one surface. Here the profile is a single exact arc and the
 * revolve is one surface of revolution, so the shank a caster receives is the
 * shape that was designed rather than a polygon count.
 */
export type BandSection = {
  innerR: number;
  width: number;
  thickness: number;
  profile: BandProfile;
  /** Axial shift of the whole section. Two rails at ±shift make a split shank. */
  shift: number;
  /** Rotation of the section about the ring's tangent, in radians. */
  twist: number;
};

/**
 * The band's cross-section, in (radius, axial) coordinates.
 *
 * One definition, used by both the revolve and the loft. When these were two
 * copies the uniform and varying bands were subtly different shapes, and the
 * only way anyone would have found out is by measuring a cast ring.
 */
function sectionDrawing(s: BandSection) {
  const halfW = s.width / 2;
  const outerR = s.innerR + s.thickness;

  switch (s.profile) {
    case "flat":
      return draw([s.innerR, -halfW])
        .lineTo([outerR, -halfW]).lineTo([outerR, halfW]).lineTo([s.innerR, halfW])
        .close();

    case "knife":
      // A true ridge: two straight flanks meeting at a sharp outer edge.
      return draw([s.innerR, -halfW])
        .lineTo([outerR, 0]).lineTo([s.innerR, halfW])
        .close();

    case "round":
      // Rounded inside and out — an exact ellipse, not a 28-gon.
      return drawEllipse(s.thickness / 2, halfW)
        .translate((s.innerR + outerR) / 2, 0);

    case "comfort":
    default:
      // Domed outside, flat bore that seats on the finger.
      //
      // A half ELLIPSE, not a circular arc. The dome is as deep as the band is
      // thick and as long as the band is wide, and those two are independent —
      // a 6mm band 2.6mm thick is a shallow sweep, a 2mm band the same
      // thickness is nearly a half-round. A circular arc has only one radius to
      // spend on both, so it gets the shape wrong the moment width and
      // thickness diverge, which on a wide band came out 22% off in metal
      // volume and would have quoted the customer the wrong weight in platinum.
      return draw([s.innerR, -halfW])
        // sweep=true is load-bearing: without it the arc takes the other half
        // of the ellipse and domes INWARD, into the finger bore. It still
        // builds, still exports, and is 24% light — a silently wrong ring.
        .halfEllipseTo([s.innerR, halfW], s.thickness, true)
        .close();
  }
}

/** A uniform band, as an exact surface of revolution. */
export function buildBand(
  innerR: number, width: number, thickness: number, profile: BandProfile
): Shape3D {
  return sectionDrawing({ innerR, width, thickness, profile, shift: 0, twist: 0 })
    .sketchOnPlane("XZ")
    .revolve([0, 0, 1]) as Shape3D;
}

/**
 * A band whose cross-section is free to change as it goes round the finger.
 *
 * Lofted through a ring of stations rather than revolved, because a revolve can
 * only ever sweep ONE section — and a shank that is the same all the way round
 * is the one thing a jeweller almost never makes. Tapered shoulders, split
 * shanks, twisted bands, a stretch widened to carry pavé, and every local edit
 * the lasso tool will apply are all the same thing underneath: a section that
 * depends on where you are around the ring.
 *
 * The uniform case still uses buildBand above. The revolve is EXACT — 0.00%
 * against closed form — where 120 lofted stations land at 0.05%, and there is
 * no reason to pay even that for a band that does not vary.
 *
 * The last station repeats the first so the loft closes into a ring rather than
 * a tube with two ends. Any twist therefore has to come back to where it
 * started: a whole number of turns, or the surface will not meet itself.
 */
export function buildVariableBand(
  sectionAt: (theta: number) => BandSection,
  stations = 120
): Shape3D {
  const wires: Wire[] = [];

  for (let i = 0; i <= stations; i++) {
    const closing = i === stations;
    const theta = (i / stations) * Math.PI * 2;
    const s = sectionAt(closing ? 0 : theta);

    let d = sectionDrawing(s);
    if (s.shift) d = d.translate(0, s.shift);
    if (s.twist) {
      // Twist about the section's own centre, not the finger axis, or the band
      // corkscrews away from the hand instead of rotating in place.
      d = d.rotate((s.twist * 180) / Math.PI, [s.innerR + s.thickness / 2, 0]);
    }

    // The section plane contains the radius and the finger axis; its normal is
    // the direction of travel round the ring.
    const c = Math.cos(theta), sn = Math.sin(theta);
    const plane = new Plane([0, 0, 0], [c, sn, 0], [-sn, c, 0]);
    wires.push((d.sketchOnPlane(plane) as Sketch).wire);
  }

  return loft(wires);
}

// -------------------------------------------------------------- shank style --

export type ShankStyle = "plain" | "tapered" | "split" | "twisted";

/**
 * How much the shank has "opened up" at this angle around the finger.
 *
 * 0 at the bottom of the ring, 1 at the head. Raised to a power so the change
 * happens across the shoulders rather than creeping all the way round: a split
 * that begins at the bottom of the finger is not a split shank, it is two rings.
 */
function shoulderBlend(theta: number, sharpness = 2.2): number {
  const up = Math.max(0, Math.sin(theta));      // theta is measured from +X, head at +Y
  return Math.pow(up, sharpness);
}


/* ------------------------------------------------------------------ regions */

/**
 * A local edit to one stretch of the shank.
 *
 * Addressed by ANGLE, never by face or triangle. The ring is rebuilt from its
 * spec on every parameter change, and the OCCT faces that come out of a rebuild
 * are different objects with different indices; an edit stored against one
 * silently reattaches itself somewhere else a few edits later. An angle is a
 * property of the design rather than of any particular build of it, so a region
 * picked today still means the same stretch of metal after the carat changes,
 * after a reload, and in the exported STEP.
 */
export type RegionOverride = {
  /** Radians from +X, head at +Y. start > end means the region wraps the seam. */
  start: number;
  end: number;
  widthScale?: number;
  thicknessScale?: number;
  profile?: BandProfile;
  /** Half-width of the ease at each end, radians. */
  blend?: number;
};

/** Into [0, 2pi). */
function norm(a: number): number {
  const t = Math.PI * 2;
  return ((a % t) + t) % t;
}

/**
 * How strongly a region applies at one angle: 1 inside, 0 outside, eased across
 * `blend` at both ends.
 *
 * The ease is not decoration. A step change in section is a crease in the
 * lofted surface, and a crease in a cast ring is a stress riser and a place the
 * polisher cannot reach. Smoothstep gives a tangent-continuous blend, which is
 * what a bench jeweller's file would leave.
 */
function regionWeight(theta: number, r: RegionOverride): number {
  const blend = Math.max(1e-4, r.blend ?? 0.16);
  const start = norm(r.start), end = norm(r.end);
  // Measure everything from the region's start, so a region that wraps the seam
  // is simply a long one. Comparing against a seam that may sit *inside* the
  // region is how every wrap bug in this kind of code gets written.
  const span = norm(end - start);
  if (span <= 0) return 0;

  const ease = Math.min(blend, span / 2);
  const x = norm(theta - start);

  // One signed coordinate for both sides: how far inside the region this angle
  // is, negative when outside. Smoothstep across +/- ease then gives exactly
  // 1 well inside, 0.5 on the boundary and 0 well outside, with no seam between
  // two separately-written branches to disagree about the edge.
  const inside = x <= span
    ? Math.min(x, span - x)
    : -Math.min(norm(theta - end), norm(start - theta));

  const u = clamp((inside + ease) / (2 * ease), 0, 1);
  return u * u * (3 - 2 * u);
}

/**
 * Layers region overrides onto a base section function.
 *
 * Overlapping regions multiply rather than fight: two edits that both narrow a
 * stretch narrow it twice, which is what dragging two sliders looks like.
 */
export function applyRegions(
  base: (theta: number) => BandSection,
  regions: RegionOverride[] | undefined
): (theta: number) => BandSection {
  if (!regions?.length) return base;
  return (theta) => {
    const s = { ...base(theta) };
    for (const r of regions) {
      const w = regionWeight(theta, r);
      if (w <= 0) continue;
      if (r.widthScale != null) s.width *= 1 + (r.widthScale - 1) * w;
      if (r.thicknessScale != null) s.thickness *= 1 + (r.thicknessScale - 1) * w;
      // A profile cannot be blended — a section is one shape or the other — so
      // it changes over the half of the ease where the region dominates.
      if (r.profile && w > 0.5) s.profile = r.profile;
    }
    return s;
  };
}

/** Does this design vary around the ring? Decides revolve vs loft. */
export function hasRegionEdits(regions: RegionOverride[] | undefined): boolean {
  return !!regions?.some((r) =>
    (r.widthScale != null && r.widthScale !== 1) ||
    (r.thicknessScale != null && r.thicknessScale !== 1) ||
    r.profile != null);
}

/** The section a shank sweeps, as a function of angle. */
export function shankSection(
  style: ShankStyle, innerR: number, width: number, thickness: number,
  profile: BandProfile
): (theta: number) => BandSection {
  const base: BandSection = { innerR, width, thickness, profile, shift: 0, twist: 0 };

  switch (style) {
    case "tapered":
      // Narrow at the back of the finger, broadening to carry the head. The
      // commonest shank there is, and the one a plain revolve cannot make.
      return (t) => ({ ...base, width: width * (0.62 + 0.38 * shoulderBlend(t, 1.6)) });

    case "twisted":
      // Two full turns: it has to come back to where it started or the loft
      // cannot close the ring.
      return (t) => ({ ...base, twist: 2 * t });

    case "plain":
    default:
      return () => base;
  }
}

/**
 * The slot that divides a split shank.
 *
 * A split shank is made by CUTTING, not by building two rails and joining them.
 * Two rails have to be coincident over the whole bottom of the ring so they read
 * as one band there, and a boolean between two solids sharing that much surface
 * is the worst case OCCT has: fusing them took fifty-two seconds.
 *
 * The tool is a flat-sided prism, and that is the whole trick. OCCT intersects
 * planes cheaply and curved surfaces expensively — the same slot as a lofted
 * solid costs 3.8 seconds and as a swept ellipsoid 1.4, where this is 0.4. The
 * taper that closes the slot at both ends is built into the prism's outline
 * rather than into a swept section, so it costs nothing: the inner boundary
 * simply rises out of the metal towards the ends, and where it clears the
 * surface the rails rejoin.
 */
function splitSlot(
  innerR: number, width: number, thickness: number, stations = 20
) {
  const outerR = innerR + thickness;
  const halfW = (width * 0.34) / 2;
  const reach = thickness + 1.2;

  const lo: [number, number][] = [];
  const hi: [number, number][] = [];
  for (let i = 0; i <= stations; i++) {
    const th = (i / stations) * Math.PI;            // the upper half of the ring
    const depth = Math.pow(Math.max(0, Math.sin(th)), 2.2) * reach;
    const rb = outerR + 0.5 - depth;
    lo.push([Math.cos(th) * rb, Math.sin(th) * rb]);
    hi.push([Math.cos(th) * (outerR + 3), Math.sin(th) * (outerR + 3)]);
  }

  const pts = [...lo, ...hi.reverse()];
  let d = draw(pts[0]);
  for (let i = 1; i < pts.length; i++) d = d.lineTo(pts[i]);
  return d.close().sketchOnPlane("XY", -halfW).extrude(2 * halfW) as Shape3D;
}

// --------------------------------------------------------------------- gem --

/**
 * The stone, as exact planar faces.
 *
 * Each facet becomes one OCCT planar face bounded by straight edges, sewn into
 * a solid — so a girdle edge in the STEP is a line a jeweller can select and
 * measure, not the seam between two triangles. The vertex and face lists come
 * from brilliantTopology, shared with the mesh engine.
 */
const PLANAR_TOL = 1e-4;   // mm

/** How far the worst vertex of a face sits off the plane of its first three. */
function outOfPlane(pts: V3[]): number {
  if (pts.length < 4) return 0;
  const [a, b, c] = pts;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const L = Math.hypot(n[0], n[1], n[2]);
  if (!L) return Infinity;
  let worst = 0;
  for (let i = 3; i < pts.length; i++) {
    const d = Math.abs(
      ((pts[i][0] - a[0]) * n[0] + (pts[i][1] - a[1]) * n[1] + (pts[i][2] - a[2]) * n[2]) / L
    );
    if (d > worst) worst = d;
  }
  return worst;
}

function polyFace(pts: V3[]) {
  const edges = pts.map((p, i) => makeLine(p, pts[(i + 1) % pts.length]));
  return makeFace(assembleWire(edges));
}

/**
 * The stone, as exact planar faces.
 *
 * Each facet becomes one OCCT planar face bounded by straight edges, sewn into
 * a solid — so a girdle edge in the STEP is a line a jeweller can select and
 * measure, not the seam between two triangles.
 *
 * A round brilliant's facets are planar to machine precision, so every one is a
 * single face. A stretched girdle is a different matter: on an oval, pear or
 * marquise the pavilion mains genuinely cannot stay flat while reaching from a
 * non-circular girdle to a single culet, and they are not cut flat either —
 * they are split, and the resulting geometry is exactly what produces the
 * bowtie those shapes are known for. So a warped quad is divided rather than
 * forced, which matches the real stone instead of fighting it.
 */
function buildFacetedGem(cut: GemCut, girdleR: number): Shape3D {
  const { points, faces } = brilliantTopology(cut, girdleR);
  const occFaces = [];
  for (const f of faces) {
    const pts: V3[] = f.map((i) => points[i]);
    if (pts.length <= 3 || outOfPlane(pts) <= PLANAR_TOL) {
      // OCCT's own flatness test is tighter than PLANAR_TOL, so a quad this
      // check calls flat can still be refused. On a pear it is: one lower
      // girdle facet sits 8.5e-5mm out of plane at 0.25ct, and every pear from
      // 0.05 to 0.40ct failed to build at all with "Failed to build the face".
      // A refused quad is divided exactly as a warped one is below; a stone
      // whose faces all build takes the first branch and is unchanged.
      try {
        occFaces.push(polyFace(pts));
        continue;
      } catch (e) {
        // A triangle that will not build is degenerate; there is nothing to divide.
        if (pts.length <= 3) throw e;
      }
    }
    for (let i = 1; i < pts.length - 1; i++) {
      occFaces.push(polyFace([pts[0], pts[i], pts[i + 1]]));
    }
  }
  return makeSolid(occFaces);
}

/** Step cuts are concentric planar steps, so they loft between scaled outlines. */
function buildStepGem(cut: GemCut, girdleR: number): Shape3D {
  const o: Pt[] = gemOutline(cut);
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const zG = pavH, zGt = pavH + girdleH;

  const steps: { z: number; s: number }[] = [{ z: 0, s: 0.10 }];
  const PAV = [0.10, 0.34, 0.63, 0.85];
  PAV.forEach((s, k) => steps.push({ z: (zG * (k + 1)) / (PAV.length + 1), s }));
  steps.push({ z: zG, s: 1 }, { z: zGt, s: 1 });
  [0.86, 0.71].forEach((s, k) => steps.push({ z: zGt + (crownH * (k + 1)) / 3, s }));
  steps.push({ z: zGt + crownH, s: 0.57 });

  const wires: Wire[] = steps.map(({ z, s }) => {
    const ring = o.map(([x, y]) => [x * girdleR * s, y * girdleR * s, z] as V3);
    return assembleWire(ring.map((p, i) => makeLine(p, ring[(i + 1) % ring.length])));
  });
  return loft(wires);
}

export function buildGem(cut: GemCut, girdleR: number): Shape3D {
  return cut === "emerald" || cut === "princess"
    ? buildStepGem(cut, girdleR)
    : buildFacetedGem(cut, girdleR);
}

// ------------------------------------------------------------ shank stones --

export type ShankStones = "none" | "pave" | "half_eternity" | "eternity";

/**
 * Where the shank's accent stones sit, and how big they are.
 *
 * Sizes follow the band rather than a fixed number: pavé on a 2mm band uses
 * roughly 1.3mm stones and on a 5mm band roughly 1.7mm, because what stays
 * constant in real pavé is the proportion of the shank the stones occupy, not
 * the stone. Spacing is centre-to-centre at 1.12 diameters, which is as tight
 * as they can sit and still leave metal between them to raise a bead from.
 */
export function shankStoneLayout(
  kind: ShankStones, outerR: number, bandWidth: number
) {
  const stoneD = clamp(bandWidth * 0.48, 1.0, 2.2);
  const stoneR = stoneD / 2;

  // The girdle sits just below the surface; the stone looks out of the metal
  // rather than perching on it.
  const girdleDepth = stoneR * 0.34;
  const seatCentre = outerR - girdleDepth;

  const span =
    kind === "eternity" ? Math.PI * 2 :
    kind === "half_eternity" ? Math.PI :
    1.85;                                  // pavé: the shoulders only

  const pitch = stoneD * 1.2;
  const count = Math.max(0, Math.floor((span * seatCentre) / pitch));
  const step = count > 1 ? span / (kind === "eternity" ? count : count - 1) : 0;

  const angleAt = (i: number) =>
    kind === "eternity"
      ? i * step
      : Math.PI / 2 + (i - (count - 1) / 2) * step;

  return { stoneR, seatCentre, count, angleAt };
}

/**
 * A pavé seat: a conical pocket, opening at the surface and tapering inward.
 *
 * Deliberately NOT a sphere. A ball-burr pocket is the intuitive shape and it
 * undercuts — its widest point sits below the surface — so two neighbouring
 * pockets eat the metal out from under the ridge between them while leaving the
 * ridge itself. The band then falls into pieces, which it duly did: cutting the
 * *second* seat of a pavé run split the shank in two.
 *
 * A cone cannot undercut. It is also the honest shape, being the pavilion the
 * stone actually has to drop into, and it takes the taper down to a point the
 * way a setter's hart burr does.
 */
export function paveSeat(
  angle: number, outerR: number, seatCentre: number, stoneR: number
): Shape3D {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dir: V3 = [-c, -s, 0];                   // inward, toward the finger
  const mouth: V3 = [c * (outerR + 0.05), s * (outerR + 0.05), 0];
  // Depth is the stone, not a round number. The girdle sits 0.34 radii below
  // the surface and the pavilion runs 0.43 diameters below that, so the culet
  // lands about 0.6 diameters deep; a little clearance under it and the seat is
  // done. Cutting a full diameter — which this did — takes twice the metal it
  // needs and leaves a 2.5mm band too thin to carry the finger.
  const depth = stoneR * 1.3;
  const tip: V3 = [c * (outerR + 0.05 - depth), s * (outerR + 0.05 - depth), 0];
  void dir; void seatCentre;
  return loft([
    assembleWire([makeCircle(stoneR * 1.10, mouth, [c, s, 0])]),
    assembleWire([makeCircle(stoneR * 0.10, tip, [c, s, 0])]),
  ]);
}

/**
 * Accent stones, cut once and placed many times.
 *
 * Every accent in a run is the same stone, and building a faceted brilliant is
 * the expensive part — 73 planar faces sewn into a solid, about 32ms each.
 * Building forty-four of them takes 1.4 seconds; cloning one and moving it
 * forty-four times takes 66. Transforms in OCCT are a matrix on an existing
 * shape, not a rebuild, and the master survives being copied, so there is no
 * reason to ever pay for the same stone twice.
 */
export function placeAccents(
  count: number, stoneR: number,
  place: (i: number) => { angle: number; radius: number },
): Shape3D[] {
  if (count <= 0) return [];
  const master = buildGem("round", stoneR);
  const d = gemDims(stoneR);
  const out: Shape3D[] = [];
  for (let i = 0; i < count; i++) {
    const { angle, radius } = place(i);
    // Built along +Z with the culet at the origin. Stand it on the radius so it
    // looks outward, then slide it until the girdle sits at the seat.
    out.push(master.clone()
      .rotate(90, [0, 0, 0], [0, 1, 0])
      .rotate((angle * 180) / Math.PI, [0, 0, 0], [0, 0, 1])
      .translate([
        Math.cos(angle) * (radius - d.pavH),
        Math.sin(angle) * (radius - d.pavH),
        0,
      ]) as Shape3D);
  }
  return out;
}

// ------------------------------------------------------------------- roles --

/**
 * What each unfused part is, so the structure audit can ask questions of the
 * right solid: how far a prong sinks into the band, whether the gallery
 * reaches every prong, whether a stone overlaps the metal holding it.
 *
 * A parallel array rather than a field on the shape, because the shapes are
 * OCCT handles that booleans consume and return anew; a tag stored on one
 * would not survive the fuse. Same length and order as the array it labels.
 */
export type HeadName = "centre" | "side-left" | "side-right";
export type PartRoleName =
  | "band" | "prong" | "gallery" | "base" | "bridge" | "strut" | "collar"
  | "halo-seat" | "halo-rail" | "bearer" | "other";
export type PartRole = { role: PartRoleName; head?: HeadName; index?: number };

/**
 * A stone's role, and where its culet and axis ended up in the ring's frame.
 *
 * The culet and the culet-to-table axis are carried rather than recovered
 * from the solid afterwards: a step cut has a culet face, not a point, and
 * which way a stone faces is a fact about how it was placed, not something to
 * guess from its facets.
 */
export type StoneRole = {
  role: "centre" | "side" | "halo" | "accent";
  head?: HeadName;
  culet: V3;
  axis: V3;
};

/** A head's own frame in the ring: culet at the origin, table up its axis. */
export type HeadFrame = {
  head: HeadName;
  culet: V3;
  axis: V3;
  /** The head's local +X, where prong 0 points on every cut but the princess. */
  xDir: V3;
  cut: GemCut;
  girdleR: number;
  prongCount: number;
  /** Prong directions about the axis, radians from xDir. */
  prongAngles: number[];
  style: SettingStyle;
};

/**
 * A placement, written once and applied to shapes and points alike.
 *
 * The audit needs to know where a head's culet and axis went, and the only
 * way that stays true is if the points move by the very steps the shapes do.
 * Two hand-written copies of a rotate-then-translate drift the first time
 * someone edits one of them.
 */
type Step = { rot: number; about: V3 } | { move: V3 };

function placeShape<T extends Shape3D>(sh: T, steps: Step[]): T {
  let out = sh;
  for (const st of steps) {
    out = ("rot" in st
      ? out.rotate(st.rot, [0, 0, 0], st.about)
      : out.translate(st.move)) as T;
  }
  return out;
}

/** The same steps on a point, or on a direction (which ignores translation). */
function placePoint(p: V3, steps: Step[], direction = false): V3 {
  let [x, y, z] = p;
  for (const st of steps) {
    if ("move" in st) {
      if (!direction) { x += st.move[0]; y += st.move[1]; z += st.move[2]; }
      continue;
    }
    // Rodrigues, right-handed about a unit axis through the origin, which is
    // what OCCT's gp_Trsf.SetRotation does for shape.rotate(deg, origin, axis).
    const t = (st.rot * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t);
    const L = Math.hypot(...st.about);
    const [kx, ky, kz] = [st.about[0] / L, st.about[1] / L, st.about[2] / L];
    const dot = kx * x + ky * y + kz * z;
    const cx = ky * z - kz * y, cy = kz * x - kx * z, cz = kx * y - ky * x;
    [x, y, z] = [
      x * c + cx * sn + kx * dot * (1 - c),
      y * c + cy * sn + ky * dot * (1 - c),
      z * c + cz * sn + kz * dot * (1 - c),
    ];
  }
  return [x, y, z];
}

// -------------------------------------------------------------------- head --

/**
 * A gallery rail that follows the stone's outline.
 *
 * The mesh engine puts a circular torus here, sized to `outlineRadius`, which
 * returns the outline's MAXIMUM radius. On a round stone that is right. On an
 * oval it puts the rail at 4.98mm while the halo seats sit between 3.49 and
 * 4.94 — so the rail sails past the narrow ends without touching the very
 * stones it is supposed to carry, and a halo that is not attached to anything
 * is not a halo.
 *
 * Built instead as a closed band between two copies of the outline, one offset
 * out and one in, extruded to depth. It follows the stone, so a pear gets a
 * pear-shaped rail. A flat rail rather than a round wire is also how a gallery
 * is usually made.
 */
function outlineRail(
  o: Pt[], girdleR: number, offset: number, halfWidth: number,
  z: number, depth: number
): Shape3D {
  // Scaled copies of the outline, NOT copies offset by a fixed distance.
  //
  // Pushing every point out along its own radius by a constant looks equivalent
  // and is not: on a shape with sharp ends — a marquise, a pear — the inner
  // copy folds through itself at the tips, and the self-intersecting profile
  // produces a degenerate solid that poisons the whole fuse. A marquise halo
  // came out as three slivers totalling 1.5mm3 instead of a ring. Uniform
  // scaling of a simple polygon about an interior point is always simple, so
  // this cannot fold however extreme the outline gets. The rail ends up
  // slightly wider at the tips than at the sides, which is what a real one
  // does too.
  const mean = o.reduce((t, [x, y]) => t + Math.hypot(x, y), 0) / o.length;
  const centre = 1 + offset / (mean * girdleR);
  const w = halfWidth / (mean * girdleR);

  const ring = (scale: number) => {
    const pts = o.map(([x, y]) => [x * girdleR * scale, y * girdleR * scale] as [number, number]);
    let d = draw(pts[0]);
    for (let i = 1; i < pts.length; i++) d = d.lineTo(pts[i]);
    return d.close();
  };
  return ring(centre + w)
    .cut(ring(centre - w))
    .sketchOnPlane("XY", z - depth / 2)
    .extrude(depth) as Shape3D;
}

/**
 * A torus, as a revolved circle.
 *
 * OCCT has no torus primitive exposed here, and it does not need one: a torus
 * IS a circle swept about an axis, so revolving the tube section gives the
 * exact surface rather than an approximation of it.
 */
function torus(tubeR: number, centreR: number, z: number): Shape3D {
  return drawCircle(tubeR)
    .translate(centreR, 0)
    .sketchOnPlane("XZ")
    .revolve([0, 0, 1])
    .translate([0, 0, z]) as Shape3D;
}

/**
 * A tapered strut: the shoulders that carry a cathedral setting.
 *
 * Lofted between two circles rather than approximated by a stepped cylinder, so
 * the taper is one exact conical surface. These are the arches a cathedral
 * setting is named for, and they are the part a customer actually looks at from
 * the side.
 */
function strut(a: V3, b: V3, r0: number, r1: number): Shape3D {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const dir: V3 = [d[0] / len, d[1] / len, d[2] / len];
  return loft([
    assembleWire([makeCircle(r0, a, dir)]),
    assembleWire([makeCircle(r1, b, dir)]),
  ]);
}

/**
 * A prong: a shaft leaning out to the stone's edge, with a rounded tip.
 *
 * Built as one revolved profile rather than a cylinder fused to a sphere. The
 * shape is the same and the boolean is not: a revolve is a couple of
 * milliseconds, a fuse is closer to ten, and six prongs are rebuilt on every
 * parameter change. Free speed for identical geometry is worth the extra six
 * lines.
 */
function prong(base: V3, tip: V3, radius: number): Shape3D {
  const d: V3 = [tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const r = radius, cap = radius * 1.15;
  const capsule = draw([0, 0])
    .lineTo([r, 0])
    .lineTo([r, len - cap * 0.4])
    .threePointsArcTo([0, len + cap * 0.6], [cap * 0.72, len + cap * 0.1])
    .close()
    .sketchOnPlane("XZ")
    .revolve([0, 0, 1]) as Shape3D;

  // Stand the capsule up along the prong's own axis.
  const zx = d[0] / len, zy = d[1] / len, zz = d[2] / len;
  const tilt = (Math.acos(Math.max(-1, Math.min(1, zz))) * 180) / Math.PI;
  const azim = (Math.atan2(zy, zx) * 180) / Math.PI;
  return capsule
    .rotate(tilt, [0, 0, 0], [0, 1, 0])
    .rotate(azim, [0, 0, 0], [0, 0, 1])
    .translate(base) as Shape3D;
}

/** A closed wire around a cut's outline, scaled and lifted. */
function outlineWire(o: Pt[], girdleR: number, scale: number, z: number): Wire {
  const ring: V3[] = o.map(([x, y]) => [x * girdleR * scale, y * girdleR * scale, z]);
  return assembleWire(ring.map((p, i) => makeLine(p, ring[(i + 1) % ring.length])));
}

/**
 * The setting.
 *
 * Ported dimension for dimension from the mesh engine, deliberately. That head
 * has been looked at, adjusted and signed off; inventing a new one here would
 * mean re-litigating every proportion and would make the differential test
 * meaningless — it could no longer tell a kernel bug from an intentional change.
 * The prongs lean out to the stone's real edge in each direction, so a marquise
 * gets claws on its points and a princess on its corners, and the gallery rail
 * carries them at the height they actually need support.
 */
export type BuiltHead = {
  metal: Shape3D[];
  stones: Shape3D[];
  /** Parallel to metal; `head` is left for the caller, who knows which head. */
  metalRoles: PartRole[];
  /** Parallel to stones, in the head's own frame. */
  stoneRoles: StoneRole[];
  prongAngles: number[];
};

export function buildHead(
  cut: GemCut, girdleR: number, prongCount: number, style: SettingStyle
): BuiltHead {
  const o = gemOutline(cut);
  const { pavH, girdleH, crownH } = gemDims(girdleR);
  const centre = buildGem(cut, girdleR);
  // Every stone is built culet-down at the origin, table up +Z.
  const centreRole: StoneRole = { role: "centre", culet: [0, 0, 0], axis: [0, 0, 1] };

  if (style === "bezel") {
    // A collar following the stone's outline, wrapping the girdle: the outer
    // skin minus the bore, so the seat is the exact surface the stone sits in.
    const outer = loft([
      outlineWire(o, girdleR, 1.02, pavH * 0.55),
      outlineWire(o, girdleR, 1.16, pavH + girdleH + crownH * 0.30),
    ]);
    const inner = loft([
      outlineWire(o, girdleR, 0.88, pavH * 0.45),
      outlineWire(o, girdleR, 1.03, pavH + girdleH + crownH * 0.35),
    ]);
    const collar = outer.cut(inner) as Shape3D;
    // An under-gallery flaring from the shank up to the collar's bore.
    //
    // The seat used to be a narrow cylinder floating in the middle of the
    // collar, touching neither it nor the band: the "ring" fused into three
    // separate solids and could not have been cast. It looked right from
    // outside, which is exactly why nothing caught it.
    //
    // Hollow, not solid. A solid cone joins the collar to the shank perfectly
    // well and turns the ring into a metal funnel with the diamond buried
    // inside it — no light reaches the pavilion, and from most angles there is
    // no stone to see at all. A real gallery is a wall with a hole in it, for
    // exactly that reason.
    // 0.8mm floor: the strictest wall any of the common alloys asks for apart
    // from sterling, which the manufacturability check catches separately.
    const wallT = Math.max(0.8, girdleR * 0.14);
    const gallery = strut(
      [0, 0, -0.6], [0, 0, pavH * 0.95],
      girdleR * 0.42, girdleR * 1.05
    ).cut(strut(
      [0, 0, -0.65], [0, 0, pavH * 0.95 + 0.05],
      Math.max(0.15, girdleR * 0.42 - wallT), girdleR * 1.05 - wallT
    )) as Shape3D;
    // The under-gallery is tagged "base", not "gallery": it is what carries
    // the collar up from the shank, and the gallery rules (rule-of-thirds
    // height, a rail every prong touches) are rules for a prong head's rail.
    return {
      metal: [collar, gallery], stones: [centre],
      metalRoles: [{ role: "collar" }, { role: "base" }],
      stoneRoles: [centreRole],
      prongAngles: [],
    };
  }

  const prongR = prongDiameterFor(girdleR) / 2;
  const baseZ = -0.6;
  const topZ = pavH + girdleH + crownH * 0.5;

  const metal: Shape3D[] = [];
  const stones: Shape3D[] = [centre];
  const metalRoles: PartRole[] = [];
  const stoneRoles: StoneRole[] = [centreRole];
  const prongAngles: number[] = [];
  const add = (s: Shape3D, role: PartRole) => { metal.push(s); metalRoles.push(role); };

  for (let i = 0; i < prongCount; i++) {
    const a = (i / prongCount) * Math.PI * 2 + (cut === "princess" ? Math.PI / 4 : 0);
    const edge = radiusAtAngle(o, a) * girdleR;
    const baseR = edge * 0.30;
    const c = Math.cos(a), sn = Math.sin(a);
    add(prong([baseR * c, baseR * sn, baseZ], [edge * 0.98 * c, edge * 0.98 * sn, topZ], prongR),
      { role: "prong", index: i });
    prongAngles.push(a);
  }

  // Gallery rail, at the radius the prongs occupy at that height.
  const meanEdge = outlineRadius(o) * girdleR;
  add(torus(
    prongR * 0.75,
    meanEdge * 0.30 + (meanEdge * 0.98 - meanEdge * 0.30) * 0.55,
    baseZ + (topZ - baseZ) * 0.55
  ), { role: "gallery" });

  if (style === "halo") {
    // A ring of accent stones following the centre stone's outline — so a pear
    // gets a pear-shaped halo, not a circle round a pear. Each sits on its own
    // seat, and a rail underneath carries them: a halo is real metal work, not
    // gems floating at a radius.
    const haloR = girdleR * 0.22;
    const count = Math.max(10, Math.round(outlineRadius(o) * girdleR * 3.2));
    const hd = gemDims(haloR);
    const seatZ = pavH + girdleH - hd.pavH;
    // One master accent, cloned into place — see placeAccents for why.
    const accent = buildGem("round", haloR);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radiusAtAngle(o, a) * girdleR + haloR * 1.15;
      const c = Math.cos(a), sn = Math.sin(a);
      stones.push(accent.clone().translate([r * c, r * sn, seatZ]) as Shape3D);
      stoneRoles.push({ role: "halo", culet: [r * c, r * sn, seatZ], axis: [0, 0, 1] });
      add(makeCylinder(
        haloR * 0.85, haloR * 1.1,
        [r * c, r * sn, seatZ - haloR * 0.35], [0, 0, 1]
      ), { role: "halo-seat", index: i });
    }
    const railZ = pavH + girdleH - girdleR * 0.30;
    add(outlineRail(o, girdleR, haloR * 1.15, haloR * 0.55, railZ, haloR * 1.1),
      { role: "halo-rail" });

    // Bearers from the centre basket out to the halo rail.
    //
    // Without them the halo is a separate solid: a ring of stones and metal
    // hovering around the centre stone, touching nothing. It renders perfectly
    // and cannot be made. Real halos are carried on exactly these — short bars
    // from the basket out under the accent stones.
    const bearerN = 4;
    for (let i = 0; i < bearerN; i++) {
      const a = (i / bearerN) * Math.PI * 2 + Math.PI / bearerN;
      const c = Math.cos(a), sn = Math.sin(a);
      // Start well inside the basket and run past the rail's centreline rather
      // than stopping at its wall. A bearer that merely touches gives OCCT a
      // tangent intersection to resolve, which is where its booleans are least
      // reliable; one that passes through gives it a clean volume.
      const inner = girdleR * 0.30;
      const outerR2 = radiusAtAngle(o, a) * girdleR + haloR * 1.15;
      const len = outerR2 - inner + haloR * 0.55;
      // A plain cylinder, not a loft. These bearers have the same radius at
      // both ends, so lofting between two identical circles buys nothing and
      // costs robustness: the lofted solid's seam made OCCT's boolean return
      // just the tool, silently deleting a 207mm3 ring and leaving a 0.5mm3
      // sliver. The collapse only showed up on a marquise, which is exactly the
      // kind of bug that ships.
      add(makeCylinder(haloR * 0.42, len, [c * inner, sn * inner, railZ], [c, sn, 0]),
        { role: "bearer", index: i });
    }
  }

  return { metal, stones, metalRoles, stoneRoles, prongAngles };
}

/**
 * Side stones for a three-stone ring, each on its own little head.
 *
 * Proportion first: side stones are conventionally a quarter to a third of the
 * centre by weight, and weight goes as the cube of the diameter, so a 0.62
 * radius ratio gives roughly a quarter carat beside a one-carat centre. Scaling
 * them by anything linear — half the radius, say — produces side stones an
 * eighth the weight, which reads as a solitaire someone dropped chips next to.
 *
 * Four prongs each rather than six: at this size six claws cover more of the
 * stone than they hold, and no bench jeweller would cut them.
 *
 * Splay is 0.45 rad, not the 0.52 that the arc length alone suggests. The two
 * stones sit at different radii — the centre is lifted onto its head while the
 * sides sit down on the shoulder — so the straight-line gap between their
 * girdles is wider than the arc between their centres. At 0.52 they stood a
 * millimetre apart, which reads as three separate rings rather than one.
 */
function buildSideStones(
  girdleR: number, outerR: number, splay: number
): {
  metal: Shape3D[]; stones: Shape3D[];
  metalRoles: PartRole[]; stoneRoles: StoneRole[]; heads: HeadFrame[];
} {
  const sideR = girdleR * 0.62;
  const metal: Shape3D[] = [];
  const stones: Shape3D[] = [];
  const metalRoles: PartRole[] = [];
  const stoneRoles: StoneRole[] = [];
  const heads: HeadFrame[] = [];

  for (const sgn of [-1, 1]) {
    const theta = Math.PI / 2 + sgn * splay;
    // sgn -1 lands at +X, sgn +1 at -X; named as the ring is seen from +Z.
    const name: HeadName = sgn < 0 ? "side-right" : "side-left";
    const head = buildHead("round", sideR, 4, "prong");
    // Stand it on the shank's radius, looking outward — the same move the pavé
    // accents make, because a side stone is set into the shoulder, not perched
    // on top of the ring like the centre.
    const steps: Step[] = [
      { rot: 90, about: [0, 1, 0] },
      { rot: (theta * 180) / Math.PI, about: [0, 0, 1] },
      { move: [Math.cos(theta) * (outerR - 0.3), Math.sin(theta) * (outerR - 0.3), 0] },
    ];
    const place = <T extends Shape3D>(sh: T): T => placeShape(sh, steps);

    metal.push(...head.metal.map(place));
    stones.push(...head.stones.map(place));
    metalRoles.push(...head.metalRoles.map((r) => ({ ...r, head: name })));
    stoneRoles.push(...head.stoneRoles.map((r) => ({
      ...r, role: "side" as const, head: name,
      culet: placePoint(r.culet, steps), axis: placePoint(r.axis, steps, true),
    })));
    heads.push({
      head: name, culet: placePoint([0, 0, 0], steps),
      axis: placePoint([0, 0, 1], steps, true), xDir: placePoint([1, 0, 0], steps, true),
      cut: "round", girdleR: sideR, prongCount: 4, prongAngles: head.prongAngles, style: "prong",
    });
  }
  return { metal, stones, metalRoles, stoneRoles, heads };
}

// -------------------------------------------------------------------- ring --

export type RingDims = {
  innerR: number; outerR: number; bandWidth: number; thickness: number;
  girdleR: number; stoneHeight: number;
  /** The stone's actual footprint, mm. Equal for a round; not for the others. */
  stoneL: number; stoneW: number;
  caratActual: number;
};

export type RingMetrics = {
  innerDiameter: number; outerDiameter: number;
  bandWidth: number; bandThickness: number;
  girdleDiameter: number; stoneHeight: number;
  /**
   * The stone's real length and width. A single diameter is only meaningful for
   * a round; quoting 6.5mm for a marquise that is 9.4 x 3.9mm describes a stone
   * that does not exist.
   */
  stoneLength: number; stoneWidth: number;
  /** What the stone actually weighs, from its volume — not what was asked for. */
  caratActual: number;
  volumeMm3: number; stoneVolumeMm3: number; stoneCount: number;
  /**
   * How many disconnected pieces the metal fused into. Anything but 1 cannot be
   * cast as one ring, and is the single most expensive thing to discover after
   * a file has been sent to a caster. A mesh kernel cannot answer this — it has
   * no notion of a solid — which is how bezel and halo settings shipped for
   * months as two and three floating pieces that rendered perfectly.
   */
  solidCount: number;
};

export type RingParts = {
  metalParts: Shape3D[];
  stones: Shape3D[];
  /** What each metal part is; same length and order as metalParts. */
  metalRoles: PartRole[];
  /** What each stone is and where it faces; same length and order as stones. */
  stoneRoles: StoneRole[];
  /** Every head's frame in the ring, centre first. */
  heads: HeadFrame[];
  dims: RingDims;
};

export type BuildOptions = {
  /**
   * Cut the pavé seats. Off for the live preview, on for the merge.
   *
   * Seats cost between three and eleven seconds depending on how far the stones
   * run, which is unusable on a slider and perfectly fine in the background. The
   * preview simply omits them, and nothing is visible either way: every seat is
   * underneath the stone that sits in it. The merged solid — the one that gets
   * measured, checked and exported — always has them.
   */
  seats?: boolean;
};

/**
 * Phase one: every solid the ring is made of, unfused.
 *
 * Splitting the build in two is not premature optimisation, it is the whole
 * reason this kernel is usable live. OCCT booleans are cheap when the solids
 * miss each other and expensive when they meet: fusing six disjoint prongs
 * costs 12ms, and fusing the one rail that crosses all six costs 591ms. Joining
 * the head to the band costs another 900ms. So a fully merged ring is around
 * two seconds, which is fine to wait for once and hopeless to drag a slider
 * against.
 *
 * Unfused, the same ring is a few tens of milliseconds, and it renders
 * identically — the solids are coincident metal, and the seams between them are
 * buried inside the piece. So the viewport gets these parts immediately and the
 * merge happens once the design stops moving.
 *
 * (OCCT does offer "commonFace" and "sameFace" boolean optimisations that halve
 * the merge time. They are not used: on the prong-and-rail case they return a
 * volume of 18.14 against the correct 16.86, so they are buying speed with
 * wrong answers, and this number ends up on a quote.)
 */
export function buildRingParts(p: any, opts: BuildOptions = {}): RingParts {
  const ringSize = clamp(Number(p?.ringSize) || 6, 3, 16);
  const bandWidth = clamp(Number(p?.bandWidth) || 2.5, 1.2, 8);
  const gemSize = clamp(Number(p?.gemSize) || 1, 0.05, 15);
  const prongCount = clamp(Math.round(Number(p?.prongCount) || 6), 3, 8);
  const profile = (p?.bandProfile || "comfort") as BandProfile;
  const cut = (p?.gemShape || "round") as GemCut;
  const style = (p?.setting || "prong") as SettingStyle;

  // Identical to the mesh engine, on purpose: US size to inner diameter,
  // 16.51mm at size 6, 0.8128mm per size.
  const innerR = (11.63 + ringSize * 0.8128) / 2;
  const thickness = clamp(bandWidth * 0.62, 1.2, 2.6);
  const outerR = innerR + thickness;
  const girdleR = girdleRadiusFor(cut, gemSize);
  const d = gemDims(girdleR);

  const shankStones = (p?.shankStones || "none") as ShankStones;
  const shankStyle = (p?.shankStyle || "plain") as ShankStyle;
  const regions: RegionOverride[] = Array.isArray(p?.regions) ? p.regions : [];
  const varied = hasRegionEdits(regions);

  // A plain shank keeps the exact revolve; anything that varies has to be
  // lofted. Worth the branch: the revolve is exact where the loft is 0.05% out,
  // and most rings are plain.
  const section = applyRegions(
    shankSection(shankStyle, innerR, bandWidth, thickness, profile), regions);

  let bands: Shape3D[] = (shankStyle === "plain" || shankStyle === "split") && !varied
    ? [buildBand(innerR, bandWidth, thickness, profile)]
    : [buildVariableBand(section)];

  if (shankStyle === "split") {
    bands = [bands[0].cut(splitSlot(innerR, bandWidth, thickness)) as Shape3D];
  }
  let band = bands[0];
  const accents: Shape3D[] = [];
  const accentRoles: StoneRole[] = [];

  if (shankStones !== "none") {
    const L = shankStoneLayout(shankStones, outerR, bandWidth);
    if (opts.seats) {
      // Seats go into every rail: on a split shank the stones run down both.
      bands = bands.map((bd) => cutAll(bd, L.count,
        (i) => paveSeat(L.angleAt(i), outerR, L.seatCentre, L.stoneR)));
      band = bands[0];
    }
    accents.push(...placeAccents(L.count, L.stoneR,
      (i) => ({ angle: L.angleAt(i), radius: L.seatCentre })));
    // placeAccents stands each stone on its radius looking outward, culet
    // pavH inside the seat centre.
    const pavH = gemDims(L.stoneR).pavH;
    for (let i = 0; i < L.count; i++) {
      const a = L.angleAt(i);
      accentRoles.push({
        role: "accent",
        culet: [Math.cos(a) * (L.seatCentre - pavH), Math.sin(a) * (L.seatCentre - pavH), 0],
        axis: [Math.cos(a), Math.sin(a), 0],
      });
    }
  }

  const head = buildHead(cut, girdleR, prongCount, style === "three_stone" ? "prong" : style);

  // Stand the head up at +Y on top of the band: rotate its Z axis onto +Y, then
  // lift it to sit on the shank.
  const standSteps: Step[] = [
    { rot: -90, about: [1, 0, 0] },
    { move: [0, outerR - 0.35, 0] },
  ];
  const stand = <T extends Shape3D>(sh: T): T => placeShape(sh, standSteps);

  const metalParts = [...bands, ...head.metal.map(stand)];
  const metalRoles: PartRole[] = [
    ...bands.map((): PartRole => ({ role: "band" })),
    ...head.metalRoles.map((r): PartRole => ({ ...r, head: "centre" })),
  ];
  const heads: HeadFrame[] = [{
    head: "centre",
    culet: placePoint([0, 0, 0], standSteps),
    axis: placePoint([0, 0, 1], standSteps, true),
    xDir: placePoint([1, 0, 0], standSteps, true),
    cut, girdleR, prongCount: style === "bezel" ? 0 : prongCount,
    prongAngles: head.prongAngles, style,
  }];
  void band;

  if (style === "three_stone") {
    const sides = buildSideStones(girdleR, outerR, 0.45);
    metalParts.push(...sides.metal);
    metalRoles.push(...sides.metalRoles);
    accents.push(...sides.stones);
    accentRoles.push(...sides.stoneRoles);
    heads.push(...sides.heads);
  }

  if (style === "cathedral") {
    // Shoulders sweeping up from the shank to meet the head. Built in the
    // ring's own frame rather than the head's, because they belong to the band:
    // they start on its shoulder and rise to the stone.
    const a = (42 * Math.PI) / 180;
    for (const sgn of [-1, 1]) {
      metalParts.push(strut(
        [sgn * outerR * Math.sin(a), outerR * Math.cos(a) - 0.4, 0],
        [sgn * girdleR * 0.42, outerR + d.pavH * 0.55, 0],
        bandWidth * 0.30, bandWidth * 0.18
      ));
      metalRoles.push({ role: "strut", head: "centre", index: sgn < 0 ? 0 : 1 });
    }
  }

  return {
    metalParts,
    // Head stones stand up with the head; shank accents are already in the
    // ring's own frame and must not be moved with it.
    stones: [...head.stones.map(stand), ...accents],
    metalRoles,
    stoneRoles: [
      ...head.stoneRoles.map((r): StoneRole => ({
        ...r, head: "centre",
        culet: placePoint(r.culet, standSteps), axis: placePoint(r.axis, standSteps, true),
      })),
      ...accentRoles,
    ],
    heads,
    dims: {
      innerR, outerR, bandWidth, thickness,
      girdleR, stoneHeight: d.totalH,
      // From the cut's own outline, so the footprint reported is the footprint
      // built. Length is the long axis; for a round the two are equal.
      ...(() => {
        const o = gemOutline(cut, 128);
        const xs = o.map((pt) => pt[0]), ys = o.map((pt) => pt[1]);
        const a = (Math.max(...ys) - Math.min(...ys)) * girdleR;
        const b = (Math.max(...xs) - Math.min(...xs)) * girdleR;
        return { stoneL: Math.max(a, b), stoneW: Math.min(a, b) };
      })(),
      caratActual: 0,
    },
  };
}

export type Mesh = {
  vertices: Float32Array;
  normals: Float32Array;
  triangles: Uint32Array;
};

/**
 * Tessellates the parts and concatenates them into one mesh.
 *
 * Note what this does NOT do: build a compound. makeCompound consumes the
 * shapes it is given — they come back deleted — so composing a preview that way
 * would destroy the very parts the merge still needs, and the failure surfaces
 * later and elsewhere as "This object has been deleted". Merging the triangles
 * instead leaves every part intact for phase two, skips building a shape nobody
 * renders, and is the cheaper of the two anyway.
 */
export function previewMesh(parts: Shape3D[], deflection = 0.02): Mesh {
  const meshes = parts.map((p) => tessellate(p, deflection));
  const nv = meshes.reduce((t, m) => t + m.vertices.length, 0);
  const nt = meshes.reduce((t, m) => t + m.triangles.length, 0);

  const vertices = new Float32Array(nv);
  const normals = new Float32Array(nv);
  const triangles = new Uint32Array(nt);

  let vo = 0, to = 0;
  for (const m of meshes) {
    vertices.set(m.vertices, vo);
    normals.set(m.normals, vo);
    // Indices are per-part, so each block shifts by the vertices already placed.
    const base = vo / 3;
    for (let i = 0; i < m.triangles.length; i++) triangles[to + i] = m.triangles[i] + base;
    vo += m.vertices.length;
    to += m.triangles.length;
  }
  return { vertices, normals, triangles };
}

/** Exact edge curves for the wireframe and section display modes. */
export function previewEdges(parts: Shape3D[], deflection = 0.02): Float32Array {
  const all: number[][] = parts.map((p) => tessellateEdges(p, deflection).lines as number[]);
  const n = all.reduce((t, a) => t + a.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const a of all) { out.set(a, o); o += a.length; }
  return out;
}

export type FuseResult = { metal: Shape3D; dropped: number };

/**
 * Cuts many tools out of one solid, in validated batches.
 *
 * Cutting seats one at a time costs about 290ms each, so a full eternity band
 * is nearly eleven seconds. Handing OCCT all of them at once as a compound is
 * two and a half times faster — and sometimes returns a solid of volume ZERO,
 * which is how a half-eternity band silently became nothing at all. Same failure
 * mode as the fuse: the boolean does not throw, it just hands back the wrong
 * answer.
 *
 * So the tools go in batches, each batch checked before it is kept. A cut can
 * only remove material and must never remove all of it, so a result that is
 * larger than the input, or empty, is a failed boolean by definition. A failed
 * batch falls back to cutting its own tools one at a time, which costs the
 * speed-up for that batch only.
 *
 * Tools come from a factory rather than an array because makeCompound consumes
 * what it is given: after a failed batch the originals are already deleted, and
 * the fallback has nothing left to cut with unless it can rebuild them.
 */
export function cutAll(
  base: Shape3D, count: number, toolAt: (i: number) => Shape3D, batch = 8
): Shape3D {
  let out = base;

  for (let start = 0; start < count; start += batch) {
    const end = Math.min(count, start + batch);
    const before = measureVolume(out);

    let next: Shape3D | null = null;
    let nv = -1;
    try {
      const tools: Shape3D[] = [];
      for (let i = start; i < end; i++) tools.push(toolAt(i));
      next = out.cut(tools.length === 1 ? tools[0] : (makeCompound(tools) as any)) as Shape3D;
      nv = measureVolume(next);
    } catch { next = null; }

    if (next && nv > 1e-6 && nv <= before + 1e-6) { out = next; continue; }

    for (let i = start; i < end; i++) {
      const b0 = measureVolume(out);
      try {
        const one = out.cut(toolAt(i)) as Shape3D;
        const v1 = measureVolume(one);
        if (v1 > 1e-6 && v1 <= b0 + 1e-6) out = one;
      } catch { /* a seat that will not cut is left uncut rather than fatal */ }
    }
  }
  return out;
}

/**
 * Phase two: the real merge.
 *
 * This is the shape that gets measured, checked for manufacturability and
 * written to STEP. A compound is not a substitute — measuring one counts every
 * overlap twice (25.13 where the truth is 16.86), which would quote a customer
 * for half again as much platinum as the ring contains.
 *
 * Every step is checked, because OCCT booleans can fail by returning the wrong
 * shape rather than by throwing. Fusing one 0.5mm3 bearer into a finished
 * 207mm3 marquise halo returned just the bearer — the entire ring silently
 * deleted, no error, a valid solid handed back. It only happened on one cut, so
 * it would have reached a customer.
 *
 * A union cannot remove material, so any step that comes back smaller than what
 * went into it is a failed boolean by definition. Those steps are discarded and
 * the part is counted as dropped rather than allowed to destroy the piece.
 * Dropping a part usually leaves the metal in more than one piece, which
 * solidCount then reports and the manufacturability check refuses — a loud,
 * checkable failure instead of a quiet catastrophic one.
 */
export function fuseMetal(parts: Shape3D[]): FuseResult {
  let out = parts[0];
  let vol = measureVolume(out);
  let dropped = 0;

  for (let i = 1; i < parts.length; i++) {
    let next: Shape3D | null = null;
    try { next = out.fuse(parts[i]) as Shape3D; } catch { next = null; }

    let nv = -1;
    if (next) { try { nv = measureVolume(next); } catch { nv = -1; } }

    // Tolerance, not equality: a legitimate union of overlapping solids lands
    // within rounding of the larger input, never meaningfully below it.
    if (next && nv >= vol - 1e-6) { out = next; vol = nv; }
    else dropped++;
  }
  return { metal: out, dropped };
}

export function ringMetrics(
  metal: Shape3D, stones: Shape3D[], d: RingDims
): RingMetrics {
  return {
    innerDiameter: +(d.innerR * 2).toFixed(2),
    outerDiameter: +(d.outerR * 2).toFixed(2),
    bandWidth: +d.bandWidth.toFixed(2),
    bandThickness: +d.thickness.toFixed(2),
    girdleDiameter: +(d.girdleR * 2).toFixed(2),
    stoneHeight: +d.stoneHeight.toFixed(2),
    stoneLength: +d.stoneL.toFixed(2),
    stoneWidth: +d.stoneW.toFixed(2),
    // Weighed from the centre stone's own volume at 3.52 g/cm3, so the number
    // shown is the one a scale would read, not the one that was typed in.
    caratActual: +(stones.length ? measureVolume(stones[0]) * 3.52 / 200 : 0).toFixed(2),
    volumeMm3: +measureVolume(metal).toFixed(1),
    // Summed, not fused. The stones never touch each other, so their volumes
    // add exactly — and fusing a dozen halo accents to ask a question addition
    // already answers would cost more than the rest of the build.
    stoneVolumeMm3: +stones.reduce((t, s) => t + measureVolume(s), 0).toFixed(2),
    stoneCount: stones.length,
    solidCount: metal.solids.length,
  };
}

/** Convenience for tests and one-shot builds: both phases, in order. */
export function buildRing(
  p: any,
  report: (pct: number, stage: string) => void = () => {}
): { metal: Shape3D; stones: Shape3D[]; metrics: RingMetrics } {
  report(25, "Shaping band");
  const { metalParts, stones, dims } = buildRingParts(p, { seats: true });
  report(72, "Merging solids");
  const { metal } = fuseMetal(metalParts);
  return { metal, stones, metrics: ringMetrics(metal, stones, dims) };
}

// ------------------------------------------------------------------ export --

/**
 * STEP AP214, in millimetres.
 *
 * Metal and stones ship as separate named solids, because they are separate
 * things to everyone downstream: one gets cast, the other gets bought by the
 * carat and set by hand.
 */
export function toSTEP(metal: AnyShape, stones: AnyShape[] | AnyShape | null): Blob {
  const list = stones == null ? [] : Array.isArray(stones) ? stones : [stones];
  const shapes: any[] = [{ shape: metal, name: "metal" }];
  list.forEach((s, i) => shapes.push({
    shape: s, name: list.length === 1 ? "stones" : `stone_${i + 1}`,
  }));
  return exportSTEP(shapes, { unit: "mm" });
}

/**
 * STL, from the same merged solid the STEP comes from.
 *
 * Still worth offering: every printer and every casting bureau takes STL, and
 * plenty of workflows want nothing else. The difference from before is what it
 * is tessellated FROM — a real solid at a chosen deflection, rather than being
 * the only thing that ever existed.
 */
export function toSTL(metal: AnyShape, deflection = 0.01): Blob {
  return (metal as any).blobSTL({ tolerance: deflection, angularTolerance: 8 });
}

/** Tessellation for the viewport. Deflection is in millimetres. */
export function tessellate(shape: AnyShape, deflection = 0.02) {
  return shape.mesh({ tolerance: deflection, angularTolerance: 12 });
}

/** Exact edge curves for the wireframe and section display modes. */
export function tessellateEdges(shape: AnyShape, deflection = 0.02) {
  return shape.meshEdges({ tolerance: deflection, angularTolerance: 12 });
}
