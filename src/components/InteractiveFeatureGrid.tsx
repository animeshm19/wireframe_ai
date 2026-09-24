/**
 * What it does, demonstrated rather than described.
 *
 * Four panels, numbered, each running something the product actually runs —
 * the same parser, the same trade limits, the same arithmetic as the engine.
 * If the engine's numbers change, this page changes with them, which is the
 * only way a marketing section stays true.
 *
 * (It replaced a set of decorative visuals, one of which claimed the product
 * gives you "BOSL2, MCAD". Those are OpenSCAD libraries and nothing here has
 * ever touched OpenSCAD.)
 *
 * The panels are a sequence, not a set: sentence, then parameters, then the
 * check, then the file. They are numbered like drawing sheets, offset from
 * each other so the grid is not a rigid rectangle, and drift at slightly
 * different rates as they pass.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion, useReducedMotion, useScroll, useTransform, type MotionValue,
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
      {/* One pool of light behind the whole section, so the panels sit in
          something rather than floating on flat black. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 45% at 22% 8%, rgba(198,155,178,0.07), transparent 62%)," +
            "radial-gradient(60% 45% at 85% 92%, rgba(225,40,130,0.05), transparent 62%)",
        }}
      />

      <div className="shell relative z-10">
        <SectionHead />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          <Panel i={0} p={scrollYProgress} reduced={!!reduced} span="md:col-span-2"
                 n="01" title="It reads the sentence"
                 body="Plain language in, engineering parameters out — metal, cut, carat, size, setting, finish.">
            <PromptDemo />
          </Panel>

          <Panel i={1} p={scrollYProgress} reduced={!!reduced} offset
                 n="02" title="Parametric, not baked"
                 body="Every dimension stays a number you can change, and the rest of the piece follows.">
            <SectionDemo />
          </Panel>

          <Panel i={2} p={scrollYProgress} reduced={!!reduced}
                 n="03" title="It refuses what will not cast"
                 body="Checked against what a casting house will actually accept, alloy by alloy.">
            <CastDemo />
          </Panel>

          <Panel i={3} p={scrollYProgress} reduced={!!reduced} offset span="md:col-span-2"
                 n="04" title="Exact solids, not triangles"
                 body="A mesh approximates a curve with flat facets. A STEP file carries the curve itself — which is what a caster's CAD package wants."
          >
            <BrepDemo />
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ chrome -- */

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
          <span className="mono-label !text-metal-400">01</span>
          <span className="h-px w-8 bg-white/15" />
          <span className="mono-label">Capabilities</span>
        </motion.div>

        <motion.h2
          {...rise}
          transition={{ duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 max-w-[16ch] text-[clamp(1.9rem,1.2rem+2.4vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
        >
          Four things a mesh tool cannot do.
        </motion.h2>
      </div>

      <motion.p
        {...rise}
        transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm text-[0.92rem] leading-relaxed text-white/80 lg:pb-1.5"
      >
        Every panel is running the real thing — the same parser, the same trade
        limits, the same arithmetic as the engine. Move something and watch it
        answer.
      </motion.p>
    </div>
  );
}

function Panel({
  i, p, reduced, n, title, body, children, span = "", offset = false,
}: {
  i: number;
  p: MotionValue<number>;
  reduced: boolean;
  n: string;
  title: string;
  body: string;
  children: React.ReactNode;
  span?: string;
  offset?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* A little parallax, different per panel. Four cards moving as one slab is
   * what makes a grid feel like a table of contents; a few pixels of
   * disagreement between them is what makes it feel composed. */
  const drift = useTransform(p, [0, 1], [i % 2 ? 26 : -18, i % 2 ? -26 : 18]);

  /* The edge glow follows the pointer through two custom properties, written
   * at most once a frame. No state, so moving the pointer over a panel never
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
      style={reduced ? undefined : { y: drift }}
      className={`${span} ${offset ? "md:mt-8" : ""}`}
    >
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.85, delay: reduced ? 0 : 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
        className="card-edge card-sheen group relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.045] to-white/[0.012]"
      >
        {/* A one-pixel highlight along the top edge — the panel catching the
            light in the section's ceiling. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent"
        />

        <span
          aria-hidden="true"
          className="ghost-numeral pointer-events-none absolute -right-2 -top-4 z-0 select-none text-[6.5rem] sm:text-[8rem]"
        >
          {n}
        </span>

        <div className="relative z-10 min-h-0 flex-1">{children}</div>

        <div className="relative z-10 border-t border-white/6 bg-ink-900/45 p-5 backdrop-blur-md sm:p-6">
          <div className="flex items-baseline gap-3">
            <span className="mono-label !text-[0.55rem] !text-metal-400">{n}</span>
            <h3 className="text-[1.05rem] font-medium tracking-tight text-white">
              {title}
            </h3>
          </div>
          <p className="mt-1.5 max-w-[48ch] text-[0.85rem] leading-relaxed text-white/80">
            {body}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Wraps a demo in drafting paper. */
function Stage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative flex h-full flex-col ${className}`}>
      <span aria-hidden="true" className="blueprint pointer-events-none absolute inset-0" />
      <div className="relative flex h-full flex-col p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------- 01 · prompt -- */

const EXAMPLES = [
  "platinum solitaire, 1.5 ct oval, cathedral setting, size 6.5",
  "18k rose gold half eternity, 2.4mm band, hammered finish",
  "white gold halo, 0.9 ct cushion, split shank, 6 prong, size 7",
];

/* `cap` marks the fields whose value is a bare enum word and so wants a
 * capital. Applying it to everything turned "1.5 ct" into "1.5 Ct". */
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
  const [text, setText] = useState("");
  const [taken, setTaken] = useState(false);   // has a person taken over?
  const boxRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* The panel demonstrates itself.
   *
   * Left to a static example, the most interesting card on the page looks like
   * a text box. So until someone touches it, it types an example, holds it
   * long enough to read the parse, clears it and moves on. The moment anyone
   * types or picks an example, the loop stops for good and never fights them
   * for the caret.
   *
   * It only runs while on screen: there is no reason to drive a typewriter
   * for a section nobody is looking at. */
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
        // Irregular, because an even cadence reads as a marquee, not typing.
        timer = window.setTimeout(step, 26 + Math.random() * 34);
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
    // text is deliberately not a dependency: the loop owns it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taken, reduced]);

  // The real parser, on every keystroke. Pure and cheap; nothing to debounce.
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
                  ? "border-metal-400/50 bg-metal-400/15 text-metal-200 font-medium"
                  : "border-white/12 text-white/80 hover:border-white/25 hover:text-white")
              }
            >
              Example {i + 1}
            </button>
          ))}
        </div>
        {!taken && !reduced && (
          <span className="mono-label hidden shrink-0 !text-[0.52rem] !text-white/70 sm:inline">
            demo · type to take over
          </span>
        )}
      </div>

      <label className="sr-only" htmlFor="prompt-demo">Describe a ring</label>
      <div className="relative mt-3">
        <textarea
          id="prompt-demo"
          value={text}
          onChange={(e) => takeOver(e.target.value)}
          onFocus={() => setTaken(true)}
          rows={2}
          spellCheck={false}
          className="glassy-input resize-none !rounded-lg !border-white/12 !bg-black/45 font-mono !text-[0.78rem] !leading-relaxed"
          placeholder="Describe a ring…"
        />
        {!taken && !reduced && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 h-3 w-[2px] animate-pulse bg-accent-500"
          />
        )}
      </div>

      {/* All ten fields are always listed, the unfilled ones greyed. Showing
          only the hits hides the more interesting half of the answer, which is
          everything the parser is still looking for. */}
      <div className="mt-4">
        <div className="mono-label mb-2 flex items-center gap-2 !text-[0.52rem]">
          <span>Extracted</span>
          <span className="h-px flex-1 bg-white/10" />
          <span className="tabular !text-metal-400">
            {String(hits).padStart(2, "0")} / {FIELDS.length}
          </span>
        </div>

        <div className="flex flex-wrap content-start gap-1.5">
          {FIELDS.map((f) => {
            const v = spec[f.key];
            const has = v !== undefined;
            return (
              <motion.span
                key={f.key}
                layout
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={
                  "inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 transition-colors duration-300 " +
                  (has
                    ? "border-metal-400/25 bg-metal-400/[0.07]"
                    : "border-white/6 bg-transparent")
                }
              >
                <span className={"mono-label !text-[0.5rem] " + (has ? "!text-metal-400" : "")}>
                  {f.label}
                </span>
                <span
                  className={
                    "text-[0.78rem] " + (f.cap ? "capitalize " : "") +
                    (has ? "text-white font-medium" : "text-white/55")
                  }
                >
                  {has ? (f.fmt ? f.fmt(v) : String(v)) : "—"}
                </span>
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* What actually leaves the parser. Chips are the readable version of
          this; this is the thing itself, and it is the more convincing of the
          two to anyone who has to consume it. */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="mono-label mb-2 flex items-center gap-2 !text-[0.52rem]">
          <span>Partial&lt;RingSpec&gt;</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <pre className="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/8 bg-black/45 px-3 py-2.5 font-mono text-[0.7rem] leading-[1.6] text-white/90">
{hits === 0 ? "{}" : JSON.stringify(spec, null, 2)}
        </pre>
      </div>
    </Stage>
  );
}

/* ---------------------------------------------------------- 02 · parametric -- */

/** The engine's own relation: thickness follows width, clamped. */
const thicknessFor = (w: number) => Math.min(2.6, Math.max(1.2, w * 0.62));

const PROFILE_LABELS: Record<BandProfile, string> = {
  comfort: "Comfort", flat: "Flat", round: "D-shape", knife: "Knife",
};

/** The section a jeweller would draw for each profile, as an SVG path. */
function profilePath(profile: BandProfile, cx: number, cy: number, w: number, h: number) {
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
  switch (profile) {
    case "flat":
      return `M ${l} ${t} L ${r} ${t} L ${r} ${b} L ${l} ${b} Z`;
    case "round":
      return `M ${l} ${b} L ${l} ${cy} Q ${l} ${t} ${cx} ${t} Q ${r} ${t} ${r} ${cy} L ${r} ${b} Z`;
    case "knife":
      return `M ${l} ${b} L ${cx} ${t} L ${r} ${b} Z`;
    default: // comfort fit: domed outside, relieved inside
      return `M ${l} ${b} L ${l} ${b - h * 0.28} Q ${l} ${t} ${cx} ${t}
              Q ${r} ${t} ${r} ${b - h * 0.28} L ${r} ${b}
              Q ${cx} ${b - h * 0.18} ${l} ${b} Z`;
  }
}

function SectionDemo() {
  const [width, setWidth] = useState(2.6);
  const [profile, setProfile] = useState<BandProfile>("comfort");
  const t = thicknessFor(width);

  const S = 25, cx = 110, cy = 70;
  const w = width * S, h = t * S;
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
                ? "border-metal-400/50 bg-metal-400/15 text-metal-200 font-medium"
                : "border-white/12 text-white/80 hover:border-white/25 hover:text-white")
            }
          >
            {PROFILE_LABELS[p]}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 220 140" className="mt-2 min-h-[8.5rem] w-full flex-1"
           role="img" aria-label={`${PROFILE_LABELS[profile]} band section, ${width.toFixed(1)} by ${t.toFixed(2)} millimetres`}>
        <defs>
          {/* Section hatching, the drafting convention for cut material. */}
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)"
                   patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--metal-400)"
                  strokeWidth="1.1" strokeOpacity="0.55" />
          </pattern>
          <marker id="arrow" viewBox="0 0 8 8" refX="4" refY="4"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1 L 8 4 L 0 7 z" fill="rgba(255,255,255,0.75)" />
          </marker>
        </defs>

        {/* Centre line, as a drawing has. */}
        <line x1={cx} y1={18} x2={cx} y2={118} stroke="rgba(255,255,255,0.25)"
              strokeWidth="1" strokeDasharray="7 3 2 3" />

        <motion.path
          d={d}
          fill="url(#hatch)"
          stroke="var(--metal-200)"
          strokeWidth="1.3"
          strokeLinejoin="round"
          initial={false}
          animate={{ d }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />

        {/* Witness lines and dimensions. */}
        <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.9">
          <line x1={cx - w / 2} y1={cy + h / 2 + 3} x2={cx - w / 2} y2={cy + h / 2 + 20} />
          <line x1={cx + w / 2} y1={cy + h / 2 + 3} x2={cx + w / 2} y2={cy + h / 2 + 20} />
          <line x1={cx - w / 2} y1={cy + h / 2 + 15} x2={cx + w / 2} y2={cy + h / 2 + 15}
                markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1={cx + w / 2 + 3} y1={cy - h / 2} x2={cx + w / 2 + 26} y2={cy - h / 2} />
          <line x1={cx + w / 2 + 3} y1={cy + h / 2} x2={cx + w / 2 + 26} y2={cy + h / 2} />
          <line x1={cx + w / 2 + 21} y1={cy - h / 2} x2={cx + w / 2 + 21} y2={cy + h / 2}
                markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        </g>
        <text x={cx} y={cy + h / 2 + 31} textAnchor="middle" className="fill-white/90"
              style={{ font: "600 9.5px ui-monospace, monospace" }}>
          {width.toFixed(1)}
        </text>
        <text x={cx + w / 2 + 30} y={cy + 3} className="fill-white/90"
              style={{ font: "600 9.5px ui-monospace, monospace" }}>
          {t.toFixed(2)}
        </text>
      </svg>

      <div className="mt-1">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="mono-label !text-[0.55rem] !text-white/80">Band width</span>
          <span className="tabular text-[0.82rem] font-semibold text-white">{width.toFixed(1)} mm</span>
        </div>
        <input type="range" min={1.4} max={6} step={0.1} value={width}
               onChange={(e) => setWidth(Number(e.target.value))}
               className="slider-metal" aria-label="Band width in millimetres" />
        <p className="mono-label mt-1 !text-[0.48rem] !normal-case !tracking-[0.1em]">
          thickness = clamp(width × 0.62, 1.2, 2.6)
        </p>
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------ 03 · manufacturable -- */

const ALLOYS: MetalType[] = ["platinum", "18k_gold", "silver"];

function CastDemo() {
  const [metal, setMetal] = useState<MetalType>("platinum");
  const [thick, setThick] = useState(1.35);

  const lim = MANUFACTURING_LIMITS[metal];
  const ok = thick >= lim.minBandThickness;
  const MAX = 3;

  return (
    <Stage>
      <div className="flex flex-wrap gap-1.5">
        {ALLOYS.map((m) => (
          <button
            key={m}
            onClick={() => setMetal(m)}
            className={
              "rounded-full border px-2.5 py-1 text-[0.66rem] transition-colors duration-300 " +
              (metal === m
                ? "border-metal-400/50 bg-metal-400/15 text-metal-200 font-medium"
                : "border-white/12 text-white/80 hover:border-white/25 hover:text-white")
            }
          >
            {MANUFACTURING_LIMITS[m].label}
          </button>
        ))}
      </div>

      {/* The band in section, thinning as you drag — the consequence, not a
          bar chart of it. The dashed line is the alloy's floor. */}
      <div className="relative mt-4 flex flex-1 items-center justify-center">
        <svg viewBox="0 0 220 176" className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img"
             aria-label={`Band section at ${thick.toFixed(2)} millimetres`}>
          {(() => {
            const base = 150, span = 118;
            const yMin = base - (lim.minBandThickness / MAX) * span;
            const yTop = base - (thick / MAX) * span;
            return (
              <>
                <line x1="12" y1={base} x2="208" y2={base}
                      stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <line x1="12" y1={yMin} x2="208" y2={yMin}
                      stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeDasharray="4 4" />
                <text x="12" y={yMin - 5} className="fill-white/85"
                      style={{ font: "600 8.5px ui-monospace, monospace" }}>
                  min {lim.minBandThickness.toFixed(2)} mm
                </text>
                <motion.rect
                  x="80" width="100" rx="3"
                  animate={{ y: yTop, height: base - yTop }}
                  transition={{ type: "spring", stiffness: 300, damping: 32 }}
                  fill={ok ? "rgba(52,211,153,0.22)" : "rgba(248,113,113,0.22)"}
                  stroke={ok ? "rgba(52,211,153,0.95)" : "rgba(248,113,113,0.95)"}
                  strokeWidth="1.2"
                />
                <motion.text
                  x="188" animate={{ y: yTop + (base - yTop) / 2 + 3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 32 }}
                  className="fill-white" style={{ font: "600 9.5px ui-monospace, monospace" }}
                >
                  {thick.toFixed(2)}
                </motion.text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* The rest of the alloy's limits, because the check uses all of them. */}
      <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/8 bg-white/8">
        {[
          ["Min wall", lim.minWall],
          ["Min prong Ø", lim.minProngDia],
          ["Min band", lim.minBandThickness],
        ].map(([label, v]) => (
          <div key={label as string} className="bg-ink-900/70 px-2.5 py-2">
            <div className="mono-label !text-[0.48rem] !text-white/80">{label as string}</div>
            <div className="tabular mt-0.5 text-[0.82rem] font-semibold text-white">
              {(v as number).toFixed(2)} mm
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="mono-label !text-[0.55rem] !text-white/80">Band thickness</span>
          <span className="tabular text-[0.82rem] font-semibold text-white">{thick.toFixed(2)} mm</span>
        </div>
        <input type="range" min={0.5} max={3} step={0.01} value={thick}
               onChange={(e) => setThick(Number(e.target.value))}
               className="slider-metal" aria-label="Band thickness in millimetres" />
      </div>

      {/* The wording is the engine's, not a paraphrase of it. */}
      <div
        role="status"
        className={
          "mt-3 rounded-lg border px-3 py-2.5 text-[0.75rem] leading-relaxed transition-colors duration-300 " +
          (ok
            ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300/90"
            : "border-red-500/30 bg-red-500/8 text-red-300/90")
        }
      >
        {ok
          ? `Passes. ${lim.label} needs at least ${lim.minBandThickness.toFixed(2)}mm.`
          : `Band is ${thick.toFixed(2)}mm thick; ${lim.label} needs at least ${lim.minBandThickness.toFixed(2)}mm to survive wear.`}
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------- 04 · b-rep -- */

/** Inner radius of a US size 6.5 band, in millimetres. */
const RING_R = 8.45;

function BrepDemo() {
  const [facets, setFacets] = useState(16);

  /* The sagitta: how far a flat chord falls away from the arc it replaces.
   * This is the entire difference between the STL and the STEP, in one number,
   * and it is why a caster asks for the STEP. */
  const error = RING_R * (1 - Math.cos(Math.PI / facets));

  const R = 52, cx = 70, cy = 70;

  const poly = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= facets; i++) {
      const a = (i / facets) * Math.PI * 2 - Math.PI / 2;
      pts.push(`${(cx + Math.cos(a) * R).toFixed(2)},${(cy + Math.sin(a) * R).toFixed(2)}`);
    }
    return pts.join(" ");
  }, [facets]);

  // Where the chord falls furthest from the arc: the midpoint of a facet.
  const half = Math.PI / facets;
  const zoom = 16;

  return (
    <Stage className="sm:flex-row">
      <div className="relative mx-auto shrink-0">
        <svg viewBox="0 0 140 140" className="h-44 w-44 sm:h-52 sm:w-52" role="img"
             aria-label={`A circle approximated by ${facets} facets`}>
          <defs>
            <clipPath id="lens">
              <circle cx={cx} cy={22} r="21" />
            </clipPath>
          </defs>

          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--metal-300)" strokeWidth="1.2" />
          <polyline points={poly} fill="none" stroke="var(--accent-500)"
                    strokeWidth="1.2" strokeLinejoin="round" />

          {/* A loupe over the widest gap, because at any usable facet count the
              error is too small to see at this scale — which is the point, and
              also why it slips through unnoticed until a caster measures it. */}
          <g clipPath="url(#lens)">
            <g transform={`translate(${cx} ${22}) scale(${zoom}) translate(${-cx} ${-(cy - R)})`}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--metal-300)"
                      strokeWidth={1.2 / zoom} />
              <polyline points={poly} fill="none" stroke="var(--accent-500)"
                        strokeWidth={1.2 / zoom} strokeLinejoin="round" />
              <line
                x1={cx} y1={cy - R}
                x2={cx} y2={cy - R * Math.cos(half)}
                stroke="#fff" strokeWidth={1.4 / zoom} strokeLinecap="round"
              />
            </g>
          </g>
          <circle cx={cx} cy={22} r="21" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1={cx} y1={43} x2={cx} y2={cy - R} stroke="rgba(255,255,255,0.18)"
                strokeWidth="1" strokeDasharray="2 3" />
        </svg>
        <span className="mono-label absolute inset-x-0 -bottom-1 text-center !text-[0.46rem]">
          ×{zoom} loupe
        </span>
      </div>

      <div className="mt-5 min-w-0 flex-1 sm:mt-0 sm:pl-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/8 bg-white/8">
          <div className="bg-ink-900/70 px-3 py-2.5">
            <div className="mono-label !text-[0.52rem] !text-white/80">STL · triangles</div>
            <div className="tabular mt-0.5 text-[1rem] font-semibold text-white">
              {error < 0.0005 ? "< 0.001" : error.toFixed(3)} mm
            </div>
            <div className="mt-0.5 text-[0.68rem] text-white/75 font-medium">out of round</div>
          </div>
          <div className="bg-ink-900/70 px-3 py-2.5">
            <div className="mono-label !text-[0.52rem] !text-white/80">STEP · B-rep</div>
            <div className="tabular mt-0.5 text-[1rem] font-semibold text-emerald-300">0.000 mm</div>
            <div className="mt-0.5 text-[0.68rem] text-emerald-400/90 font-medium">it is the cylinder</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="mono-label !text-[0.52rem]">Mesh resolution</span>
            <span className="tabular text-[0.78rem] text-white/75">{facets} facets</span>
          </div>
          <input type="range" min={6} max={96} step={1} value={facets}
                 onChange={(e) => setFacets(Number(e.target.value))}
                 className="slider-metal" aria-label="Number of facets approximating the circle" />
        </div>

        <p className="mt-2.5 text-[0.78rem] leading-relaxed text-white/80">
          A size 6.5 band is {RING_R} mm in radius. At {facets} facets its hole is{" "}
          <span className="tabular text-white font-medium">{error.toFixed(3)} mm</span> out of
          round. Raising the count shrinks that but never reaches zero, and every
          extra facet is more file — which is the trade a mesh format makes and a
          B-rep does not have to.
        </p>
      </div>
    </Stage>
  );
}

export default InteractiveFeatureGrid;
