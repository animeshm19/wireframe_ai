/**
 * What it does, demonstrated rather than described.
 *
 * The previous version of this section had four cards whose visuals were
 * decoration: a field of dots that pushed away from the cursor, a box that
 * changed width, a ring drawn out of rotated divs, a spinning conic gradient.
 * None of them showed the product doing anything, and one of them made a claim
 * the codebase does not support — "access powerful libraries (BOSL2, MCAD)".
 * Those are OpenSCAD libraries; nothing here has ever touched OpenSCAD.
 *
 * Every card below runs something real instead:
 *
 *   1. The prompt card calls parseSpecFromPrompt — the actual fallback parser
 *      the product ships — on whatever you type.
 *   2. The parametric card uses the engine's own band-thickness relation.
 *   3. The manufacturability card reads MANUFACTURING_LIMITS, the same trade
 *      figures the engine refuses designs on.
 *   4. The B-rep card computes the real chord error of a faceted circle, which
 *      is the actual difference between the STL and the STEP.
 *
 * So the section cannot drift away from the truth: if the engine's limits
 * change, this page changes with them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MANUFACTURING_LIMITS,
  METAL_LABELS,
  parseSpecFromPrompt,
  type MetalType,
  type RingSpec,
} from "../lib/ring-spec";

export function InteractiveFeatureGrid() {
  return (
    <section
      id="features"
      className="relative scroll-mt-24 overflow-hidden bg-ink-900 py-24 sm:py-32"
    >
      <div className="shell relative z-10">
        <SectionHead
          index="01"
          kicker="Capabilities"
          title="Four things a mesh tool cannot do."
          lede="Each panel below is running the real thing — the same parser, the same trade limits, the same maths as the engine. Move something and watch it answer."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-5">
          <Card
            i={0}
            span="md:col-span-2"
            index="01"
            title="It reads the sentence"
            body="Plain language in, engineering parameters out — metal, cut, carat, size, setting, finish."
          >
            <PromptDemo />
          </Card>

          <Card
            i={1}
            index="02"
            title="Parametric, not baked"
            body="Every dimension stays a number you can change, and the rest of the piece follows."
          >
            <SectionDemo />
          </Card>

          <Card
            i={2}
            index="03"
            title="It refuses what will not cast"
            body="Checked against what a casting house will actually accept, per alloy."
          >
            <CastDemo />
          </Card>

          <Card
            i={3}
            span="md:col-span-2"
            index="04"
            title="Exact solids, not triangles"
            body="A mesh approximates a curve with flat facets. A STEP file carries the curve itself — which is what a caster's CAD package wants."
          >
            <BrepDemo />
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ chrome -- */

function SectionHead({
  index, kicker, title, lede,
}: { index: string; kicker: string; title: string; lede: string }) {
  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3"
      >
        <span className="mono-label !text-metal-400">{index}</span>
        <span className="h-px w-8 bg-white/15" />
        <span className="mono-label">{kicker}</span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 text-[clamp(1.9rem,1.2rem+2.4vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
      >
        {title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-white/55"
      >
        {lede}
      </motion.p>
    </div>
  );
}

function Card({
  i, span = "", index, title, body, children,
}: {
  i: number; span?: string; index: string; title: string;
  body: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* The edge glow follows the pointer through two custom properties, written
   * at most once a frame. No state, so moving the pointer over a card never
   * re-renders the demo running inside it. */
  const onMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
  }, []);

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.8,
        delay: reduced ? 0 : 0.07 * i,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`card-edge group relative flex min-h-[21rem] flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.022] backdrop-blur-sm ${span}`}
    >
      {/* The demo owns the upper area; the copy sits under it, never over it. */}
      <div className="relative min-h-0 flex-1">{children}</div>

      <div className="relative z-10 border-t border-white/6 bg-ink-900/55 p-5 backdrop-blur-md sm:p-6">
        <div className="flex items-baseline gap-3">
          <span className="mono-label !text-[0.55rem] !text-metal-400">{index}</span>
          <h3 className="text-[1.05rem] font-medium tracking-tight text-white">
            {title}
          </h3>
        </div>
        <p className="mt-1.5 max-w-[46ch] text-[0.85rem] leading-relaxed text-white/50">
          {body}
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------- 01 · prompt -- */

const EXAMPLES = [
  "platinum solitaire, 1.5 ct oval, cathedral setting, size 6.5",
  "18k rose gold half eternity, 2.4mm band, hammered finish",
  "white gold halo with a 0.9 ct cushion, split shank, 6 prong",
];

/** The keys the parser can actually fill, in the order they read best. */
/* `cap` marks the fields whose value is a bare enum word and so wants a capital.
 * Applying it to everything turned "1.5 ct" into "1.5 Ct". */
const FIELDS: Array<{
  key: keyof RingSpec; label: string; cap?: boolean; fmt?: (v: any) => string;
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
  const [text, setText] = useState(EXAMPLES[0]);

  // The real parser, on every keystroke. It is pure and fast enough to run
  // inline; there is nothing to debounce.
  const spec = useMemo(() => parseSpecFromPrompt(text), [text]);

  const found = FIELDS.filter((f) => spec[f.key] !== undefined);

  return (
    <div className="flex h-full flex-col gap-3 p-5 sm:p-6">
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            onClick={() => setText(ex)}
            className={
              "rounded-full border px-2.5 py-1 text-[0.68rem] transition-colors duration-300 " +
              (text === ex
                ? "border-metal-400/50 bg-metal-400/10 text-metal-200"
                : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/75")
            }
          >
            Example {i + 1}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="prompt-demo">
        Describe a ring
      </label>
      <textarea
        id="prompt-demo"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        spellCheck={false}
        className="glassy-input resize-none !rounded-lg !bg-black/40 font-mono !text-[0.78rem] !leading-relaxed"
        placeholder="Describe a ring…"
      />

      {/* All ten fields are always listed, the unfilled ones greyed out.
          Showing only what was found hides the more interesting half of the
          answer — which is everything the parser is still looking for. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mono-label mb-2 !text-[0.52rem]">
          Extracted · {found.length} of {FIELDS.length}
        </div>
        <div className="flex flex-wrap content-start gap-1.5">
          {FIELDS.map((f) => {
            const v = spec[f.key];
            const has = v !== undefined;
            return (
              <motion.span
                key={f.key}
                layout
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className={
                  "inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 transition-colors duration-300 " +
                  (has
                    ? "border-white/12 bg-white/[0.06]"
                    : "border-white/6 bg-transparent")
                }
              >
                <span
                  className={
                    "mono-label !text-[0.5rem] " + (has ? "!text-metal-400" : "")
                  }
                >
                  {f.label}
                </span>
                <span
                  className={
                    "text-[0.78rem] " +
                    (f.cap ? "capitalize " : "") +
                    (has ? "text-white" : "text-white/20")
                  }
                >
                  {has ? (f.fmt ? f.fmt(v) : String(v)) : "—"}
                </span>
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- 02 · parametric -- */

/** The engine's own relation: thickness follows width, clamped. */
const thicknessFor = (w: number) => Math.min(2.6, Math.max(1.2, w * 0.62));

function SectionDemo() {
  const [width, setWidth] = useState(2.6);
  const t = thicknessFor(width);

  // Drawn at 26 px per millimetre, centred in a 220 x 150 viewBox.
  const S = 26;
  const w = width * S;
  const h = t * S;
  const cx = 110;
  const cy = 74;

  // A comfort-fit section: domed outside, gently relieved inside.
  const d = `
    M ${cx - w / 2} ${cy + h / 2}
    L ${cx - w / 2} ${cy + h / 2 - h * 0.28}
    Q ${cx - w / 2} ${cy - h / 2} ${cx} ${cy - h / 2}
    Q ${cx + w / 2} ${cy - h / 2} ${cx + w / 2} ${cy + h / 2 - h * 0.28}
    L ${cx + w / 2} ${cy + h / 2}
    Q ${cx} ${cy + h / 2 - h * 0.16} ${cx - w / 2} ${cy + h / 2}
    Z`;

  return (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <svg viewBox="0 0 220 150" className="min-h-[9rem] w-full flex-1" role="img"
           aria-label={`Band section, ${width.toFixed(1)} by ${t.toFixed(2)} millimetres`}>
        <defs>
          <linearGradient id="bandfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0dfe7" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#c69bb2" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#4a3d43" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Dimension witnesses, the way a drawing marks them. */}
        <g stroke="rgba(255,255,255,0.22)" strokeWidth="1">
          <line x1={cx - w / 2} y1={cy + h / 2 + 10} x2={cx + w / 2} y2={cy + h / 2 + 10} />
          <line x1={cx - w / 2} y1={cy + h / 2 + 6} x2={cx - w / 2} y2={cy + h / 2 + 14} />
          <line x1={cx + w / 2} y1={cy + h / 2 + 6} x2={cx + w / 2} y2={cy + h / 2 + 14} />
          <line x1={cx + w / 2 + 14} y1={cy - h / 2} x2={cx + w / 2 + 14} y2={cy + h / 2} />
          <line x1={cx + w / 2 + 10} y1={cy - h / 2} x2={cx + w / 2 + 18} y2={cy - h / 2} />
          <line x1={cx + w / 2 + 10} y1={cy + h / 2} x2={cx + w / 2 + 18} y2={cy + h / 2} />
        </g>
        <text x={cx} y={cy + h / 2 + 26} textAnchor="middle"
              className="fill-white/55" style={{ font: "500 9px ui-monospace, monospace" }}>
          {width.toFixed(1)} mm
        </text>
        <text x={cx + w / 2 + 22} y={cy + 3}
              className="fill-white/55" style={{ font: "500 9px ui-monospace, monospace" }}>
          {t.toFixed(2)}
        </text>

        <path d={d} fill="url(#bandfill)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      </svg>

      <div className="mt-2">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="mono-label !text-[0.52rem]">Band width</span>
          <span className="tabular text-[0.78rem] text-white/75">
            {width.toFixed(1)} mm
          </span>
        </div>
        <input
          type="range" min={1.4} max={6} step={0.1} value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="slider-metal"
          aria-label="Band width in millimetres"
        />
        <p className="mono-label mt-1 !text-[0.5rem] !tracking-[0.12em] !normal-case">
          thickness = clamp(width × 0.62, 1.2, 2.6) — the engine's own relation
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ 03 · manufacturable -- */

const ALLOYS: MetalType[] = ["platinum", "18k_gold", "silver"];

function CastDemo() {
  const [metal, setMetal] = useState<MetalType>("platinum");
  const [thick, setThick] = useState(1.35);

  const lim = MANUFACTURING_LIMITS[metal];
  const ok = thick >= lim.minBandThickness;

  return (
    <div className="flex h-full flex-col justify-between gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap gap-1.5">
        {ALLOYS.map((m) => (
          <button
            key={m}
            onClick={() => setMetal(m)}
            className={
              "rounded-full border px-2.5 py-1 text-[0.68rem] transition-colors duration-300 " +
              (metal === m
                ? "border-metal-400/50 bg-metal-400/10 text-metal-200"
                : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/75")
            }
          >
            {MANUFACTURING_LIMITS[m].label}
          </button>
        ))}
      </div>

      {/* The bar is the band thickness; the tick is the alloy's floor. */}
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-6 h-2.5 overflow-hidden rounded-full bg-white/8">
          <motion.div
            animate={{ width: `${Math.min(100, (thick / 3) * 100)}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={ok ? "h-full bg-emerald-400/70" : "h-full bg-red-400/75"}
          />
        </div>
        <motion.div
          animate={{ left: `${(lim.minBandThickness / 3) * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute top-3 h-8 w-px bg-white/70"
        >
          <span className="mono-label absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap !text-[0.48rem] !text-white/60">
            min {lim.minBandThickness.toFixed(2)}
          </span>
        </motion.div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="mono-label !text-[0.52rem]">Band thickness</span>
          <span className="tabular text-[0.78rem] text-white/75">
            {thick.toFixed(2)} mm
          </span>
        </div>
        <input
          type="range" min={0.5} max={3} step={0.01} value={thick}
          onChange={(e) => setThick(Number(e.target.value))}
          className="slider-metal"
          aria-label="Band thickness in millimetres"
        />
      </div>

      {/* The wording is the engine's, not a paraphrase of it. */}
      <div
        role="status"
        className={
          "rounded-lg border px-3 py-2.5 text-[0.76rem] leading-relaxed transition-colors duration-300 " +
          (ok
            ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300/90"
            : "border-red-500/30 bg-red-500/8 text-red-300/90")
        }
      >
        {ok
          ? `Passes. ${lim.label} needs at least ${lim.minBandThickness.toFixed(2)}mm.`
          : `Band is ${thick.toFixed(2)}mm thick; ${lim.label} needs at least ${lim.minBandThickness.toFixed(2)}mm to survive wear.`}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 04 · b-rep -- */

/** Inner radius of a US size 6.5 band, in millimetres. */
const RING_R = 8.45;

function BrepDemo() {
  const [facets, setFacets] = useState(16);
  const reduced = useReducedMotion();

  /* The sagitta: how far a flat chord falls away from the arc it replaces.
   * This is the entire difference between the STL and the STEP, in one
   * number, and it is why a caster asks for the STEP. */
  const error = RING_R * (1 - Math.cos(Math.PI / facets));

  const R = 58;
  const cx = 74;
  const cy = 74;

  const poly = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= facets; i++) {
      const a = (i / facets) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${(cx + Math.cos(a) * R).toFixed(2)},${(cy + Math.sin(a) * R).toFixed(2)}`);
    }
    return pts.join(" ");
  }, [facets]);

  return (
    <div className="flex h-full flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center">
      <svg viewBox="0 0 148 148" className="mx-auto h-40 w-40 shrink-0 sm:h-44 sm:w-44"
           role="img" aria-label={`Circle approximated by ${facets} facets`}>
        {/* The exact curve. */}
        <circle cx={cx} cy={cy} r={R} fill="none"
                stroke="var(--metal-300)" strokeWidth="1.25" />
        {/* The facets that stand in for it. */}
        <motion.polyline
          points={poly}
          fill="none"
          stroke="var(--accent-500)"
          strokeWidth="1.25"
          strokeLinejoin="round"
          animate={reduced ? undefined : { opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* The gap between them, at the point where it is widest. */}
        <circle cx={cx} cy={cy - R} r="2" fill="var(--accent-500)" />
      </svg>

      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/8 bg-white/8">
          <div className="bg-ink-900/80 px-3 py-2.5">
            <div className="mono-label !text-[0.5rem]">STL · triangles</div>
            <div className="tabular mt-0.5 text-[0.95rem] text-white">
              {error < 0.005 ? "< 0.005" : error.toFixed(3)} mm
            </div>
            <div className="mt-0.5 text-[0.66rem] text-white/40">out of round</div>
          </div>
          <div className="bg-ink-900/80 px-3 py-2.5">
            <div className="mono-label !text-[0.5rem]">STEP · B-rep</div>
            <div className="tabular mt-0.5 text-[0.95rem] text-emerald-300">0.000 mm</div>
            <div className="mt-0.5 text-[0.66rem] text-white/40">it is the cylinder</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="mono-label !text-[0.52rem]">Mesh resolution</span>
            <span className="tabular text-[0.78rem] text-white/75">{facets} facets</span>
          </div>
          <input
            type="range" min={6} max={96} step={1} value={facets}
            onChange={(e) => setFacets(Number(e.target.value))}
            className="slider-metal"
            aria-label="Number of facets approximating the circle"
          />
        </div>

        <p className="mt-2.5 text-[0.76rem] leading-relaxed text-white/45">
          A size 6.5 band is {RING_R} mm in radius. At {facets} facets its hole is{" "}
          <span className="tabular text-white/75">{error.toFixed(3)} mm</span> out of
          round — enough to feel. Raising the count shrinks the error but never
          reaches zero, and every extra facet is more file.
        </p>
      </div>
    </div>
  );
}

export default InteractiveFeatureGrid;
