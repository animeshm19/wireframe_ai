/**
 * The Production Engine — Interactive Feature Showcase.
 *
 * Demonstrates the fundamental divide between generic polygon mesh generators
 * (which produce warped, uncastable triangle soup) and Wireframe's analytical
 * B-rep kernel (which produces watertight, micron-accurate manufacturing CAD).
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  BAND_PROFILES,
  MANUFACTURING_LIMITS,
  METAL_LABELS,
  parseSpecFromPrompt,
  type MetalType,
  type RingSpec,
} from "../lib/ring-spec";
import type { BandProfile } from "../lib/cad-engine";

/* ------------------------------------------------------------------ types -- */

type StoneCut = "oval" | "cushion" | "emerald" | "pear";

interface StoneData {
  name: string;
  carat: number;
  width: number;
  length: number;
  depth: number;
  path: string; // SVG path for top-down stone
}

const CUTS: Record<StoneCut, StoneData> = {
  oval: {
    name: "Oval Brilliant",
    carat: 1.5,
    width: 6.8,
    length: 8.8,
    depth: 4.2,
    path: "M 0,-34 C 24,-34 38,-16 38,0 C 38,16 24,34 0,34 C -24,34 -38,16 -38,0 C -38,-16 -24,-34 0,-34 Z",
  },
  cushion: {
    name: "Cushion Modified",
    carat: 1.8,
    width: 7.2,
    length: 7.2,
    depth: 4.5,
    path: "M -26,-32 Q 0,-35 26,-32 Q 35,-26 32,0 Q 35,26 26,32 Q 0,35 -26,32 Q -35,26 -32,0 Q -35,-26 -26,-32 Z",
  },
  emerald: {
    name: "Emerald Step-Cut",
    carat: 2.0,
    width: 6.2,
    length: 8.5,
    depth: 4.6,
    path: "M -22,-34 L 22,-34 L 32,-24 L 32,24 L 22,34 L -22,34 L -32,24 L -32,-24 Z",
  },
  pear: {
    name: "Pear Brilliant",
    carat: 1.75,
    width: 6.5,
    length: 9.5,
    depth: 4.3,
    path: "M 0,-38 C 18,-18 32,4 32,20 C 32,32 18,36 0,36 C -18,36 -32,32 -32,20 C -32,4 -18,-18 0,-38 Z",
  },
};

/* ------------------------------------------------------------- main component -- */

export function InteractiveFeatureGrid() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <section
      ref={ref}
      id="features"
      className="relative scroll-mt-24 overflow-hidden bg-ink-900 py-24 sm:py-32"
    >
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(75% 50% at 50% 10%, rgba(198,155,178,0.08), transparent 68%)," +
            "radial-gradient(60% 45% at 85% 85%, rgba(225,40,130,0.05), transparent 60%)",
        }}
      />

      <div className="shell relative z-10">
        <SectionHead />

        {/* Flagship Production Duel & Deconstruction Console */}
        <div className="mt-12">
          <MasterInspectionSuite />
        </div>

        {/* Precision Engineering Benches in Bento Format */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Panel
            i={0}
            p={scrollYProgress}
            reduced={!!reduced}
            n="01"
            title="Natural Language to B-Rep"
            body="Conversational prompts parsed directly into an algebraic boundary-representation model with verified manifold topology."
          >
            <PromptDemo />
          </Panel>

          <Panel
            i={1}
            p={scrollYProgress}
            reduced={!!reduced}
            n="02"
            title="Parametric Band Lofting"
            body="Continuous cross-sectional profiles evaluated along 3D swept rails with dynamic thickness compensation."
          >
            <SectionDemo />
          </Panel>

          <Panel
            i={2}
            p={scrollYProgress}
            reduced={!!reduced}
            n="03"
            title="Curvature Truth (Zero Sagitta)"
            body="Meshes approximate curves with lossy flat chords. B-rep solids preserve exact analytical arcs that CNCs and printers demand."
          >
            <BrepDemo />
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ section head -- */

function SectionHead() {
  const rise = {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
  } as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-14">
      <div>
        <motion.div
          {...rise}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          <span className="mono-label !text-metal-400 font-semibold">02</span>
          <span className="h-px w-8 bg-white/20" />
          <span className="mono-label !text-white/80 font-medium">The Production Engine</span>
        </motion.div>

        <motion.h2
          {...rise}
          transition={{ duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 max-w-[20ch] text-[clamp(2.1rem,1.4rem+2.6vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
        >
          Where meshes tear, B-rep solidifies.
        </motion.h2>
      </div>

      <motion.p
        {...rise}
        transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md text-[0.92rem] leading-relaxed text-white/85 lg:pb-1.5"
      >
        Generic 3D generators produce triangle meshes that distort when resized and crack in the casting mold.
        Wireframe synthesizes exact mathematical solids with micron-accurate parametric history.
      </motion.p>
    </div>
  );
}

/* ----------------------------------------------------- flagship console suite -- */

function MasterInspectionSuite() {
  const [mode, setMode] = useState<"duel" | "xray">("duel");

  return (
    <div className="card-edge card-sheen relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.04] to-white/[0.015] shadow-2xl backdrop-blur-xl">
      {/* Blueprint grid texture */}
      <span aria-hidden="true" className="blueprint pointer-events-none absolute inset-0 opacity-40" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="mono-label !text-[0.62rem] !text-white font-semibold">
            ATELIER BENCH VERIFICATION
          </span>
          <span className="hidden sm:inline-block h-3.5 w-px bg-white/15" />
          <span className="hidden sm:inline-block mono-label !text-[0.55rem] !text-white/70">
            OCCT 7.8 · STEP AP214 VALIDATOR
          </span>
        </div>

        {/* Console Mode Switcher */}
        <div className="flex items-center rounded-full border border-white/15 bg-black/40 p-1">
          <button
            onClick={() => setMode("duel")}
            className={
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-300 " +
              (mode === "duel"
                ? "bg-white text-ink-950 shadow-md"
                : "text-white/70 hover:text-white")
            }
          >
            The Parametric Duel
          </button>
          <button
            onClick={() => setMode("xray")}
            className={
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-300 " +
              (mode === "xray"
                ? "bg-metal-300 text-ink-950 shadow-md"
                : "text-white/70 hover:text-white")
            }
          >
            Casting X-Ray &amp; Deconstruction
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative z-10 p-5 sm:p-7">
        <AnimatePresence mode="wait">
          {mode === "duel" ? (
            <motion.div
              key="duel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ParametricDuelInteractive />
            </motion.div>
          ) : (
            <motion.div
              key="xray"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <CastingXRayInteractive />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- mode a: parametric duel -- */

function ParametricDuelInteractive() {
  const [size, setSize] = useState(6.5);
  const [cut, setCut] = useState<StoneCut>("oval");
  const [stressScale, setStressScale] = useState(false);

  // Size 6.5 diameter is 16.92mm. Calculate current inner diameter in mm.
  const innerDia = 11.63 + size * 0.814;
  const currentStone = CUTS[cut];

  // In legacy mesh, scaling changes everything proportionally (stretching).
  // In B-rep, wall thickness and stone dimensions stay constant while radius changes.
  const baseSize = 6.5;
  const scaleRatio = size / baseSize;
  const meshDistortionPct = Math.abs(Math.round((scaleRatio - 1) * 60));
  const meshWallThickness = (1.8 / Math.sqrt(scaleRatio)).toFixed(2);
  const brepWallThickness = "1.80";

  return (
    <div>
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        {/* Stone Selection */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-label !text-[0.55rem] !text-white/80">Stone Cut:</span>
          {(Object.keys(CUTS) as StoneCut[]).map((c) => (
            <button
              key={c}
              onClick={() => setCut(c)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors duration-300 " +
                (cut === c
                  ? "border-metal-400 bg-metal-400/20 text-white font-semibold"
                  : "border-white/12 text-white/75 hover:border-white/30 hover:text-white")
              }
            >
              {CUTS[c].name}
            </button>
          ))}
        </div>

        {/* Ring Size Slider */}
        <div className="flex items-center gap-3">
          <span className="mono-label !text-[0.55rem] !text-white/80">Finger Size:</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={4}
              max={11}
              step={0.5}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="slider-metal w-28 sm:w-36"
              aria-label="Ring size"
            />
            <span className="tabular mono-label !text-white font-semibold min-w-16 text-right">
              US {size.toFixed(1)} ({innerDia.toFixed(1)}mm)
            </span>
          </div>
        </div>

        {/* Stress Mode Button */}
        <button
          onClick={() => setStressScale((s) => !s)}
          className={
            "flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-medium transition-all duration-300 " +
            (stressScale
              ? "border-amber-400/60 bg-amber-400/20 text-amber-200"
              : "border-white/15 bg-white/[0.04] text-white/80 hover:border-white/30 hover:text-white")
          }
        >
          <span>{stressScale ? "🔥 Stress Load Active" : "Simulate Resizing Strain"}</span>
        </button>
      </div>

      {/* Side-by-Side Torture Duel */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Left: Traditional Polygon Mesh (The Failure) */}
        <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-b from-red-500/[0.06] to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <h4 className="text-sm font-semibold tracking-tight text-red-200">
                Legacy Mesh / SubD CAD
              </h4>
            </div>
            <span className="mono-label rounded border border-red-500/30 bg-red-500/15 px-2 py-0.5 !text-[0.52rem] !text-red-300 font-semibold">
              TRIANGULATED MESH
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-white/75">
            Scales vertices as a rigid polygon mesh. Stone seats warp into ovals, prong diameter stretches unevenly, and the wall collapses below casting threshold.
          </p>

          {/* Mesh Graphic Visualizer */}
          <div className="relative mt-4 flex h-60 items-center justify-center overflow-hidden rounded-lg border border-red-500/20 bg-black/60">
            <svg
              viewBox="0 0 300 220"
              className="h-full w-full"
              role="img"
              aria-label="Distorted polygon mesh representation"
            >
              {/* Center Ring Silhouette with Distorted Mesh Wireframe */}
              <g transform="translate(150, 120)">
                {/* Out-of-round warped inner hole */}
                <ellipse
                  cx={0}
                  cy={0}
                  rx={55 * (scaleRatio + (stressScale ? 0.15 : 0))}
                  ry={52 * (1 / scaleRatio - (stressScale ? 0.12 : 0))}
                  fill="none"
                  stroke="rgba(248, 113, 113, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Stretched polygon chords */}
                {Array.from({ length: 16 }).map((_, i) => {
                  const angle = (i / 16) * Math.PI * 2;
                  const nextAngle = ((i + 1) / 16) * Math.PI * 2;
                  const rx = 65 * (scaleRatio + (stressScale ? 0.15 : 0));
                  const ry = 62 * (1 / scaleRatio - (stressScale ? 0.12 : 0));
                  const x1 = Math.cos(angle) * rx;
                  const y1 = Math.sin(angle) * ry;
                  const x2 = Math.cos(nextAngle) * rx;
                  const y2 = Math.sin(nextAngle) * ry;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(248, 113, 113, 0.85)"
                      strokeWidth="1.2"
                    />
                  );
                })}

                {/* Warped Center Stone */}
                <g transform={`translate(0, -68) scale(${1 + (scaleRatio - 1) * 0.8}, ${1 - (scaleRatio - 1) * 0.6})`}>
                  <path
                    d={currentStone.path}
                    fill="rgba(239, 68, 68, 0.15)"
                    stroke="rgba(248, 113, 113, 0.9)"
                    strokeWidth="1.2"
                  />
                  {/* Facet distortion cross lines */}
                  <line x1="-20" y1="-10" x2="20" y2="10" stroke="rgba(248, 113, 113, 0.5)" strokeWidth="0.8" />
                  <line x1="-20" y1="10" x2="20" y2="-10" stroke="rgba(248, 113, 113, 0.5)" strokeWidth="0.8" />
                </g>

                {/* Warped Prongs */}
                {[-22, 22].map((x) => (
                  <circle
                    key={x}
                    cx={x * (scaleRatio > 1 ? 1.25 : 0.85)}
                    cy="-68"
                    r={stressScale ? 2.2 : 3}
                    fill="rgba(239, 68, 68, 0.6)"
                    stroke="rgba(254, 202, 202, 0.9)"
                    strokeWidth="1"
                  />
                ))}

                {/* Distortion Callout Vectors */}
                <g stroke="rgba(248, 113, 113, 0.9)" strokeWidth="1">
                  <line x1="0" y1="35" x2="0" y2="55" />
                  <line x1="-5" y1="50" x2="0" y2="55" />
                  <line x1="5" y1="50" x2="0" y2="55" />
                </g>
                <text
                  x="0"
                  y="72"
                  textAnchor="middle"
                  className="fill-red-300"
                  style={{ font: "600 9px ui-monospace, monospace" }}
                >
                  Wall Thins: {meshWallThickness} mm
                </text>
              </g>
            </svg>

            {/* Error Overlay Banner */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between rounded-md border border-red-500/30 bg-red-950/85 px-3 py-1.5 backdrop-blur-md">
              <span className="mono-label !text-[0.52rem] !text-red-300 font-semibold">
                SEAT DEFORMATION: {meshDistortionPct}%
              </span>
              <span className="mono-label !text-[0.52rem] !text-red-400 font-bold">
                ❌ CAST REJECT
              </span>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-red-500/20 bg-black/40 p-2.5">
              <div className="mono-label !text-[0.5rem] !text-white/70">Wall Integrity</div>
              <div className="mt-1 font-semibold text-red-300">
                {meshWallThickness} mm (Limit 1.2mm)
              </div>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-black/40 p-2.5">
              <div className="mono-label !text-[0.5rem] !text-white/70">Topology State</div>
              <div className="mt-1 font-semibold text-red-300">
                {Math.round(size * 4)} Non-manifold Edges
              </div>
            </div>
          </div>
        </div>

        {/* Right: Wireframe Analytical B-Rep (The Solution) */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h4 className="text-sm font-semibold tracking-tight text-emerald-200">
                Wireframe Parametric B-Rep
              </h4>
            </div>
            <span className="mono-label rounded border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 !text-[0.52rem] !text-emerald-300 font-semibold">
              CLOSED OCCT SOLID
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-white/75">
            Maintains independent parametric dependencies. The inner diameter updates analytically while the stone seat, prong claw angle, and shank thickness stay locked.
          </p>

          {/* B-Rep Clean Graphic Visualizer */}
          <div className="relative mt-4 flex h-60 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/20 bg-black/60">
            <svg
              viewBox="0 0 300 220"
              className="h-full w-full"
              role="img"
              aria-label="Clean parametric B-rep solid representation"
            >
              <defs>
                <radialGradient id="brepGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--metal-300)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>

              <g transform="translate(150, 120)">
                {/* Glow ring */}
                <circle cx={0} cy={0} r={55 * scaleRatio} fill="url(#brepGlow)" />

                {/* Perfect Analytical Inner Circle */}
                <circle
                  cx={0}
                  cy={0}
                  r={55 * scaleRatio}
                  fill="none"
                  stroke="var(--metal-300)"
                  strokeWidth="1.5"
                />

                {/* Perfect Analytical Outer Band (Offset by constant thickness) */}
                <circle
                  cx={0}
                  cy={0}
                  r={55 * scaleRatio + 14}
                  fill="none"
                  stroke="var(--metal-200)"
                  strokeWidth="2.2"
                />

                {/* Optical Center Stone (Perfect Dimensions Unchanged) */}
                <g transform="translate(0, -70)">
                  <path
                    d={currentStone.path}
                    fill="rgba(52, 211, 153, 0.15)"
                    stroke="var(--metal-200)"
                    strokeWidth="1.5"
                  />
                  {/* Facet reflection curves */}
                  <path
                    d="M -16,-20 L 0,-10 L 16,-20 M 0,-10 L 0,20 M -16,20 L 0,10 L 16,20"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth="0.8"
                  />
                </g>

                {/* Parametric Prongs at true 0.85mm diameter */}
                {[-22, 22].map((x) => (
                  <g key={x}>
                    <circle
                      cx={x}
                      cy="-70"
                      r="4.2"
                      fill="var(--metal-400)"
                      stroke="#fff"
                      strokeWidth="1.2"
                    />
                    <circle cx={x} cy="-70" r="1.5" fill="#fff" />
                  </g>
                ))}

                {/* Dimension Witness Line */}
                <g stroke="rgba(52, 211, 153, 0.8)" strokeWidth="1">
                  <line x1={-(55 * scaleRatio)} y1="0" x2={55 * scaleRatio} y2="0" />
                  <circle cx={-(55 * scaleRatio)} cy="0" r="2" fill="var(--metal-300)" />
                  <circle cx={55 * scaleRatio} cy="0" r="2" fill="var(--metal-300)" />
                </g>
                <text
                  x="0"
                  y="-8"
                  textAnchor="middle"
                  className="fill-emerald-300 font-semibold"
                  style={{ font: "600 9.5px ui-monospace, monospace" }}
                >
                  Ø {innerDia.toFixed(2)} mm (Exact)
                </text>
              </g>
            </svg>

            {/* Verification Success Banner */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-950/85 px-3 py-1.5 backdrop-blur-md">
              <span className="mono-label !text-[0.52rem] !text-emerald-300 font-semibold">
                TOLERANCE: 0.000 mm (True Arc)
              </span>
              <span className="mono-label !text-[0.52rem] !text-emerald-300 font-bold">
                ✓ 100% PRODUCTION READY
              </span>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-emerald-500/20 bg-black/40 p-2.5">
              <div className="mono-label !text-[0.5rem] !text-white/70">Wall Thickness</div>
              <div className="mt-1 font-semibold text-emerald-300">
                {brepWallThickness} mm (Locked Constant)
              </div>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-black/40 p-2.5">
              <div className="mono-label !text-[0.5rem] !text-white/70">Solid Topology</div>
              <div className="mt-1 font-semibold text-emerald-300">
                Watertight B-Rep (STEP AP214)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- mode b: casting x-ray -- */

function CastingXRayInteractive() {
  const [activeLayer, setActiveLayer] = useState<number>(1);
  const [alloy, setAlloy] = useState<MetalType>("platinum");

  const layers = [
    {
      id: 1,
      name: "01. Centerline Rails",
      desc: "Mathematical guide curves and 3D sweeps driving the shank geometry.",
      detail: "Analytical 3rd-order NURBS splines ensuring G2 surface continuity.",
    },
    {
      id: 2,
      name: "02. Negative Azures",
      desc: "Boolean cutters hollowing the gallery for light entry and weight balance.",
      detail: "Cuts diamond-shaped under-bezel cavities to prevent casting porosity.",
    },
    {
      id: 3,
      name: "03. Stone Bearing Seats",
      desc: "Automatic 45° bearing angles, prong claw overlap, and culet clearance.",
      detail: "0.35 mm claw overlap calibrated to gemological facet girdle tolerance.",
    },
    {
      id: 4,
      name: "04. Thermal Shrinkage",
      desc: "Alloy-specific cooling compensation calculated before mold export.",
      detail: `${METAL_LABELS[alloy]} contracts at ${
        alloy === "platinum" ? "1.2%" : alloy === "18k_gold" ? "1.8%" : "2.3%"
      } during cooling. The kernel auto-expands the wax file.`,
    },
  ];

  return (
    <div>
      {/* Layer Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {layers.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveLayer(l.id)}
            className={
              "rounded-xl border p-3 text-left transition-all duration-300 " +
              (activeLayer === l.id
                ? "border-metal-400 bg-metal-400/20 shadow-lg"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]")
            }
          >
            <div className="mono-label !text-[0.52rem] !text-metal-300 font-semibold">
              LAYER {String(l.id).padStart(2, "0")}
            </div>
            <div className="mt-1 text-xs font-semibold text-white">{l.name.slice(4)}</div>
          </button>
        ))}
      </div>

      {/* Main Interactive Inspector Display */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Visualizer Canvas */}
        <div className="relative flex min-h-[19rem] items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-black/60 p-6 lg:col-span-2">
          <svg viewBox="0 0 360 240" className="h-full w-full" role="img" aria-label="X-Ray deconstruction layer visualizer">
            {/* Base Ring Guide */}
            <g transform="translate(180, 130)">
              {/* Layer 1: Skeleton */}
              {activeLayer === 1 && (
                <g>
                  <circle cx="0" cy="0" r="65" fill="none" stroke="var(--metal-300)" strokeWidth="1.5" strokeDasharray="6 3" />
                  <circle cx="0" cy="0" r="82" fill="none" stroke="var(--metal-400)" strokeWidth="1.2" strokeDasharray="3 3" />
                  {/* Tangent vectors */}
                  {[-65, 0, 65].map((x, i) => (
                    <g key={i}>
                      <circle cx={x} cy={x === 0 ? -65 : 0} r="3" fill="#fff" />
                      <line x1={x} y1={x === 0 ? -65 : 0} x2={x + 15} y2={(x === 0 ? -65 : 0) - 15} stroke="var(--accent-400)" strokeWidth="1.2" />
                    </g>
                  ))}
                  <text x="0" y="5" textAnchor="middle" className="fill-metal-200" style={{ font: "600 10px ui-monospace, monospace" }}>
                    G2 Tangent Rails
                  </text>
                </g>
              )}

              {/* Layer 2: Negative Space Cutters (Azures) */}
              {activeLayer === 2 && (
                <g>
                  {/* Solid band base */}
                  <circle cx="0" cy="0" r="70" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="16" />
                  {/* Glowing Laser Cutters for Azures */}
                  {[-30, -15, 0, 15, 30].map((deg, i) => {
                    const rad = (deg * Math.PI) / 180;
                    const x = Math.sin(rad) * 70;
                    const y = -Math.cos(rad) * 70;
                    return (
                      <g key={i}>
                        <polygon
                          points={`${x - 5},${y - 8} ${x + 5},${y - 8} ${x + 7},${y + 8} ${x - 7},${y + 8}`}
                          fill="rgba(225, 40, 130, 0.4)"
                          stroke="var(--accent-400)"
                          strokeWidth="1.5"
                        />
                        <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke="#fff" strokeWidth="0.8" strokeDasharray="2 2" />
                      </g>
                    );
                  })}
                  <text x="0" y="5" textAnchor="middle" className="fill-accent-300 font-semibold" style={{ font: "600 10px ui-monospace, monospace" }}>
                    Negative Boolean Azures Active
                  </text>
                </g>
              )}

              {/* Layer 3: Stone Seating & Prongs */}
              {activeLayer === 3 && (
                <g>
                  <circle cx="0" cy="0" r="70" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="14" />
                  {/* Center Stone in Head */}
                  <g transform="translate(0, -78)">
                    {/* 45° Seat Cutout Notch */}
                    <polygon points="-24,-5 0,16 24,-5 16,-12 -16,-12" fill="rgba(52, 211, 153, 0.2)" stroke="var(--metal-300)" strokeWidth="1.2" />
                    {/* Prongs */}
                    <circle cx="-22" cy="-4" r="4.5" fill="var(--metal-400)" stroke="#fff" strokeWidth="1.2" />
                    <circle cx="22" cy="-4" r="4.5" fill="var(--metal-400)" stroke="#fff" strokeWidth="1.2" />
                    {/* Bearing Seat Callout Line */}
                    <line x1="22" y1="-4" x2="55" y2="-20" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                    <text x="60" y="-18" className="fill-white font-semibold" style={{ font: "600 9px ui-monospace, monospace" }}>
                      45° bearing seat
                    </text>
                  </g>
                </g>
              )}

              {/* Layer 4: Thermal Shrinkage & Alloy Simulation */}
              {activeLayer === 4 && (
                <g>
                  {/* Heatmap false-color band */}
                  <circle cx="0" cy="0" r="70" fill="none" stroke="rgba(52, 211, 153, 0.85)" strokeWidth="16" />
                  <path d="M -35,-60 A 70 70 0 0 1 35,-60" fill="none" stroke="rgba(251, 191, 36, 0.95)" strokeWidth="18" />
                  <circle cx="0" cy="-70" r="8" fill="rgba(239, 68, 68, 0.85)" />

                  <text x="0" y="5" textAnchor="middle" className="fill-emerald-300 font-semibold" style={{ font: "600 10px ui-monospace, monospace" }}>
                    Wall &gt; 1.4mm (Safe Solidification)
                  </text>
                  <text x="0" y="-90" textAnchor="middle" className="fill-amber-300" style={{ font: "600 9px ui-monospace, monospace" }}>
                    Heavy mass node (+{alloy === "platinum" ? "1.2%" : alloy === "18k_gold" ? "1.8%" : "2.3%"} shrinkage)
                  </text>
                </g>
              )}
            </g>
          </svg>

          {/* Current Layer Tag */}
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-2.5 py-1">
            <span className="mono-label !text-[0.52rem] !text-metal-300 font-semibold">
              INSPECTION MODE:
            </span>
            <span className="text-xs font-semibold text-white">
              {layers[activeLayer - 1].name}
            </span>
          </div>
        </div>

        {/* Layer Details & Metallurgy Controls */}
        <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div>
            <h4 className="text-base font-semibold text-white">
              {layers[activeLayer - 1].name}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-white/80">
              {layers[activeLayer - 1].desc}
            </p>
            <div className="mt-3 rounded-lg border border-white/8 bg-black/40 p-3 text-xs leading-relaxed text-metal-200">
              {layers[activeLayer - 1].detail}
            </div>

            {/* Alloy Selection for Layer 4 */}
            {activeLayer === 4 && (
              <div className="mt-4">
                <div className="mono-label mb-2 !text-[0.52rem] !text-white/80">
                  Target Alloy Metallurgy:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["platinum", "18k_gold", "silver"] as MetalType[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setAlloy(m)}
                      className={
                        "rounded-full border px-2.5 py-1 text-xs transition-colors duration-300 " +
                        (alloy === m
                          ? "border-metal-400 bg-metal-400/20 text-white font-semibold"
                          : "border-white/12 text-white/70 hover:text-white")
                      }
                    >
                      {METAL_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-white/8 pt-4">
            <div className="mono-label flex items-center justify-between !text-[0.52rem]">
              <span className="!text-white/70">EXPORT FORMAT</span>
              <span className="!text-emerald-400 font-semibold">ISO 10303-21 STEP</span>
            </div>
            <div className="mono-label mt-1 flex items-center justify-between !text-[0.52rem]">
              <span className="!text-white/70">SURFACE CONTINUITY</span>
              <span className="!text-white font-semibold">G2 Curvature Continuous</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- bento panel wrapper -- */

function Panel({
  i,
  p,
  reduced,
  n,
  title,
  body,
  children,
}: {
  i: number;
  p: MotionValue<number>;
  reduced: boolean;
  n: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drift = useTransform(p, [0, 1], [i % 2 ? 16 : -12, i % 2 ? -16 : 12]);

  const onMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
  }, []);

  return (
    <motion.div style={reduced ? undefined : { y: drift }}>
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.75, delay: reduced ? 0 : 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
        className="card-edge card-sheen group relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.045] to-white/[0.012]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        <span
          aria-hidden="true"
          className="ghost-numeral pointer-events-none absolute -right-2 -top-4 z-0 select-none text-[6.5rem] sm:text-[7.5rem]"
        >
          {n}
        </span>

        <div className="relative z-10 min-h-0 flex-1">{children}</div>

        <div className="relative z-10 border-t border-white/8 bg-ink-900/60 p-5 backdrop-blur-md sm:p-6">
          <div className="flex items-baseline gap-3">
            <span className="mono-label !text-[0.55rem] !text-metal-400 font-semibold">{n}</span>
            <h3 className="text-[1.05rem] font-semibold tracking-tight text-white">
              {title}
            </h3>
          </div>
          <p className="mt-1.5 text-[0.85rem] leading-relaxed text-white/80">
            {body}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative flex h-full flex-col ${className}`}>
      <span aria-hidden="true" className="blueprint pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex h-full flex-col p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------- 01 · prompt demo -- */

const EXAMPLES = [
  "platinum solitaire, 1.5 ct oval, cathedral setting, size 6.5",
  "18k rose gold half eternity, 2.4mm band, hammered finish",
  "white gold halo, 0.9 ct cushion, split shank, 6 prong, size 7",
];

const FIELDS: Array<{
  key: keyof RingSpec;
  label: string;
  cap?: boolean;
  fmt?: (v: any) => string;
}> = [
  { key: "metalType", label: "Metal", fmt: (v) => METAL_LABELS[v] ?? String(v) },
  { key: "gemShape", label: "Cut", cap: true },
  { key: "gemSize", label: "Carat", fmt: (v) => `${v} ct` },
  { key: "setting", label: "Setting", cap: true, fmt: (v) => String(v).replace(/_/g, " ") },
  { key: "ringSize", label: "Size", fmt: (v) => `US ${v}` },
  { key: "bandWidth", label: "Band", fmt: (v) => `${v} mm` },
  { key: "shankStyle", label: "Shank", cap: true },
  { key: "shankStones", label: "Accents", cap: true, fmt: (v) => String(v).replace(/_/g, " ") },
  { key: "finish", label: "Finish", cap: true },
  { key: "prongCount", label: "Prongs", fmt: (v) => `${v}` },
];

function PromptDemo() {
  const [text, setText] = useState("");
  const [taken, setTaken] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (taken || reduced) {
      if (reduced && !text) setText(EXAMPLES[0]);
      return;
    }

    let alive = true;
    let timer = 0;
    let visible = false;

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) run();
      },
      { threshold: 0.25 }
    );
    if (boxRef.current) io.observe(boxRef.current);

    let ex = 0;
    let i = 0;
    let phase: "typing" | "holding" | "clearing" = "typing";

    const step = () => {
      if (!alive || !visible) return;
      const full = EXAMPLES[ex];

      if (phase === "typing") {
        i += 1;
        setText(full.slice(0, i));
        if (i >= full.length) {
          phase = "holding";
          timer = window.setTimeout(step, 2600);
          return;
        }
        timer = window.setTimeout(step, 24 + Math.random() * 32);
        return;
      }

      if (phase === "holding") {
        phase = "clearing";
        timer = window.setTimeout(step, 30);
        return;
      }

      i -= 3;
      if (i <= 0) {
        i = 0;
        setText("");
        ex = (ex + 1) % EXAMPLES.length;
        phase = "typing";
        timer = window.setTimeout(step, 420);
        return;
      }
      setText(full.slice(0, i));
      timer = window.setTimeout(step, 14);
    };

    const run = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(step, 300);
    };

    return () => {
      alive = false;
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [taken, reduced]);

  const spec = useMemo(() => parseSpecFromPrompt(text), [text]);
  const hits = FIELDS.filter((f) => spec[f.key] !== undefined).length;

  const takeOver = (next: string) => {
    setTaken(true);
    setText(next);
  };

  return (
    <Stage>
      <div ref={boxRef} className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => takeOver(ex)}
              className={
                "rounded-full border px-2.5 py-1 text-[0.68rem] transition-colors duration-300 " +
                (text === ex
                  ? "border-metal-400/50 bg-metal-400/15 text-metal-200 font-semibold"
                  : "border-white/12 text-white/80 hover:border-white/25 hover:text-white")
              }
            >
              Preset {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3">
        <textarea
          value={text}
          onChange={(e) => takeOver(e.target.value)}
          onFocus={() => setTaken(true)}
          rows={2}
          spellCheck={false}
          className="glassy-input resize-none !rounded-lg !border-white/15 !bg-black/55 font-mono !text-[0.78rem] !leading-relaxed"
          placeholder="Describe a ring in natural language…"
        />
      </div>

      {/* Extracted AST Parameters */}
      <div className="mt-3.5">
        <div className="mono-label mb-2 flex items-center justify-between !text-[0.52rem] !text-white/80">
          <span>EXTRACTED TOKENS</span>
          <span className="tabular font-semibold text-metal-400">
            {String(hits).padStart(2, "0")} / {FIELDS.length} FIELDS
          </span>
        </div>

        <div className="flex flex-wrap content-start gap-1.5">
          {FIELDS.map((f) => {
            const v = spec[f.key];
            const has = v !== undefined;
            return (
              <span
                key={f.key}
                className={
                  "inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 transition-colors duration-300 " +
                  (has
                    ? "border-metal-400/35 bg-metal-400/[0.12]"
                    : "border-white/6 bg-transparent")
                }
              >
                <span className={"mono-label !text-[0.5rem] " + (has ? "!text-metal-300 font-semibold" : "!text-white/50")}>
                  {f.label}
                </span>
                <span
                  className={
                    "text-[0.76rem] " +
                    (f.cap ? "capitalize " : "") +
                    (has ? "text-white font-semibold" : "text-white/40")
                  }
                >
                  {has ? (f.fmt ? f.fmt(v) : String(v)) : "—"}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Generated Replicad/OCCT B-Rep Construction Stream */}
      <div className="mt-3.5 flex min-h-0 flex-1 flex-col">
        <div className="mono-label mb-1.5 flex items-center justify-between !text-[0.52rem] !text-white/80">
          <span>PARSED TOPOLOGY OBJECT</span>
          <span className="!text-emerald-400 font-semibold">VALIDATED</span>
        </div>
        <pre className="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[0.68rem] leading-[1.6] text-white/90">
{hits === 0 ? "// Waiting for input..." : JSON.stringify(spec, null, 2)}
        </pre>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------- 02 · section demo -- */

const thicknessFor = (w: number) => Math.min(2.6, Math.max(1.2, w * 0.62));

const PROFILE_LABELS: Record<BandProfile, string> = {
  comfort: "Comfort-Fit",
  flat: "Flat Band",
  round: "D-Shape",
  knife: "Knife-Edge",
};

function profilePath(profile: BandProfile, cx: number, cy: number, w: number, h: number) {
  const l = cx - w / 2,
    r = cx + w / 2,
    t = cy - h / 2,
    b = cy + h / 2;
  switch (profile) {
    case "flat":
      return `M ${l} ${t} L ${r} ${t} L ${r} ${b} L ${l} ${b} Z`;
    case "round":
      return `M ${l} ${b} L ${l} ${cy} Q ${l} ${t} ${cx} ${t} Q ${r} ${t} ${r} ${cy} L ${r} ${b} Z`;
    case "knife":
      return `M ${l} ${b} L ${cx} ${t} L ${r} ${b} Z`;
    default:
      return `M ${l} ${b} L ${l} ${b - h * 0.28} Q ${l} ${t} ${cx} ${t} Q ${r} ${t} ${r} ${b - h * 0.28} L ${r} ${b} Q ${cx} ${b - h * 0.18} ${l} ${b} Z`;
  }
}

function SectionDemo() {
  const [width, setWidth] = useState(2.6);
  const [profile, setProfile] = useState<BandProfile>("comfort");
  const t = thicknessFor(width);

  const S = 25,
    cx = 110,
    cy = 68;
  const w = width * S,
    h = t * S;
  const d = profilePath(profile, cx, cy, w, h);

  return (
    <Stage>
      <div className="flex flex-wrap gap-1.5">
        {BAND_PROFILES.map((p) => (
          <button
            key={p}
            onClick={() => setProfile(p)}
            className={
              "rounded-full border px-2.5 py-1 text-[0.66rem] transition-colors duration-300 " +
              (profile === p
                ? "border-metal-400/50 bg-metal-400/15 text-metal-200 font-semibold"
                : "border-white/12 text-white/80 hover:border-white/25 hover:text-white")
            }
          >
            {PROFILE_LABELS[p]}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 220 136"
        className="mt-2 min-h-[8.5rem] w-full flex-1"
        role="img"
        aria-label={`${PROFILE_LABELS[profile]} band cross-section`}
      >
        <defs>
          <pattern
            id="hatch"
            width="6"
            height="6"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="var(--metal-400)"
              strokeWidth="1.1"
              strokeOpacity="0.55"
            />
          </pattern>
          <marker
            id="arrow"
            viewBox="0 0 8 8"
            refX="4"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 4 L 0 7 z" fill="rgba(255,255,255,0.85)" />
          </marker>
        </defs>

        {/* Center line */}
        <line
          x1={cx}
          y1={14}
          x2={cx}
          y2={120}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          strokeDasharray="7 3 2 3"
        />

        <motion.path
          d={d}
          fill="url(#hatch)"
          stroke="var(--metal-200)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          initial={false}
          animate={{ d }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />

        {/* Dimension Lines */}
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="0.9">
          <line x1={cx - w / 2} y1={cy + h / 2 + 3} x2={cx - w / 2} y2={cy + h / 2 + 20} />
          <line x1={cx + w / 2} y1={cy + h / 2 + 3} x2={cx + w / 2} y2={cy + h / 2 + 20} />
          <line
            x1={cx - w / 2}
            y1={cy + h / 2 + 15}
            x2={cx + w / 2}
            y2={cy + h / 2 + 15}
            markerStart="url(#arrow)"
            markerEnd="url(#arrow)"
          />
          <line x1={cx + w / 2 + 3} y1={cy - h / 2} x2={cx + w / 2 + 26} y2={cy - h / 2} />
          <line x1={cx + w / 2 + 3} y1={cy + h / 2} x2={cx + w / 2 + 26} y2={cy + h / 2} />
          <line
            x1={cx + w / 2 + 21}
            y1={cy - h / 2}
            x2={cx + w / 2 + 21}
            y2={cy + h / 2}
            markerStart="url(#arrow)"
            markerEnd="url(#arrow)"
          />
        </g>
        <text
          x={cx}
          y={cy + h / 2 + 30}
          textAnchor="middle"
          className="fill-white font-semibold"
          style={{ font: "600 9.5px ui-monospace, monospace" }}
        >
          {width.toFixed(1)} mm
        </text>
        <text
          x={cx + w / 2 + 30}
          y={cy + 3}
          className="fill-white font-semibold"
          style={{ font: "600 9.5px ui-monospace, monospace" }}
        >
          {t.toFixed(2)}
        </text>
      </svg>

      <div className="mt-2">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="mono-label !text-[0.55rem] !text-white/80">Band width</span>
          <span className="tabular text-[0.82rem] font-semibold text-white">{width.toFixed(1)} mm</span>
        </div>
        <input
          type="range"
          min={1.4}
          max={6}
          step={0.1}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="slider-metal"
          aria-label="Band width in millimetres"
        />
        <div className="mono-label mt-1 flex items-center justify-between !text-[0.48rem] !text-white/70">
          <span>thickness = clamp(w × 0.62, 1.2, 2.6)</span>
          <span className="text-metal-300 font-semibold">{t.toFixed(2)} mm</span>
        </div>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------- 03 · brep demo -- */

const RING_R = 8.45; // Size 6.5 radius (16.90 mm diameter)

function BrepDemo() {
  const [facets, setFacets] = useState(16);
  const error = RING_R * (1 - Math.cos(Math.PI / facets));

  const R = 52,
    cx = 70,
    cy = 70;

  const poly = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= facets; i++) {
      const a = (i / facets) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${(cx + Math.cos(a) * R).toFixed(2)},${(cy + Math.sin(a) * R).toFixed(2)}`);
    }
    return pts.join(" ");
  }, [facets]);

  const half = Math.PI / facets;
  const zoom = 16;

  return (
    <Stage className="sm:flex-row">
      <div className="relative mx-auto shrink-0">
        <svg
          viewBox="0 0 140 140"
          className="h-44 w-44 sm:h-52 sm:w-52"
          role="img"
          aria-label={`A circle approximated by ${facets} facets`}
        >
          <defs>
            <clipPath id="lens">
              <circle cx={cx} cy={22} r="21" />
            </clipPath>
          </defs>

          {/* Exact circle */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--metal-300)" strokeWidth="1.4" />
          {/* Faceted polygon chord */}
          <polyline
            points={poly}
            fill="none"
            stroke="var(--accent-500)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Magnifying Loupe */}
          <g clipPath="url(#lens)">
            <g transform={`translate(${cx} ${22}) scale(${zoom}) translate(${-cx} ${-(cy - R)})`}>
              <circle
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke="var(--metal-300)"
                strokeWidth={1.2 / zoom}
              />
              <polyline
                points={poly}
                fill="none"
                stroke="var(--accent-500)"
                strokeWidth={1.2 / zoom}
                strokeLinejoin="round"
              />
              <line
                x1={cx}
                y1={cy - R}
                x2={cx}
                y2={cy - R * Math.cos(half)}
                stroke="#fff"
                strokeWidth={1.5 / zoom}
                strokeLinecap="round"
              />
            </g>
          </g>
          <circle cx={cx} cy={22} r="21" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line
            x1={cx}
            y1={43}
            x2={cx}
            y2={cy - R}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        </svg>
        <span className="mono-label absolute inset-x-0 -bottom-1 text-center !text-[0.48rem] !text-white/80">
          ×{zoom} optical loupe
        </span>
      </div>

      <div className="mt-5 min-w-0 flex-1 sm:mt-0 sm:pl-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
          <div className="bg-ink-900/80 px-3 py-2.5">
            <div className="mono-label !text-[0.52rem] !text-white/80">STL · polygon</div>
            <div className="tabular mt-0.5 text-[1rem] font-semibold text-white">
              {error < 0.0005 ? "< 0.001" : error.toFixed(3)} mm
            </div>
            <div className="mt-0.5 text-[0.68rem] text-red-300 font-medium">out of round</div>
          </div>
          <div className="bg-ink-900/80 px-3 py-2.5">
            <div className="mono-label !text-[0.52rem] !text-white/80">STEP · B-rep</div>
            <div className="tabular mt-0.5 text-[1rem] font-semibold text-emerald-300">0.000 mm</div>
            <div className="mt-0.5 text-[0.68rem] text-emerald-400 font-medium">exact cylinder</div>
          </div>
        </div>

        <div className="mt-3.5">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="mono-label !text-[0.55rem] !text-white/80">STL Facet Resolution</span>
            <span className="tabular text-[0.82rem] font-semibold text-white">{facets} chords</span>
          </div>
          <input
            type="range"
            min={8}
            max={128}
            step={8}
            value={facets}
            onChange={(e) => setFacets(Number(e.target.value))}
            className="slider-metal"
            aria-label="Number of polygon facets"
          />
        </div>

        <p className="mt-2.5 text-[0.78rem] leading-relaxed text-white/80">
          A size 6.5 band is {RING_R} mm in radius. At {facets} facets its hole is{" "}
          <span className="tabular text-white font-medium">{error.toFixed(3)} mm</span> out of
          round. B-rep surfaces preserve the exact circular arc for CNC milling and casting molds.
        </p>
      </div>
    </Stage>
  );
}

export default InteractiveFeatureGrid;
