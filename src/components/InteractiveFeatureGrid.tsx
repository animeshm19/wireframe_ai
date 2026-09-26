/**
 * "How it works": a resize test (scaled mesh against rebuilt solid) and three
 * small working demos. Every figure comes from duel-model.ts or ring-spec.ts.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  BAND_PROFILES,
  MANUFACTURING_LIMITS,
  METALS,
  METAL_LABELS,
  parseSpecFromPrompt,
  type RingSpec,
} from "../lib/ring-spec";
import type { BandProfile } from "../lib/cad-engine";
import { BASE, duelAt, chordError, innerDiameter, type Column, type Verdict } from "./duel-model";
import { useRise } from "./motion";

export function InteractiveFeatureGrid() {
  const rise = useRise();
  const [card, setCard] = useState(0);

  const cards = [
    {
      title: "From a sentence to a solid",
      body: "Your description is read into a ring spec: metal, cut, carat, setting, size, band.",
      demo: <PromptDemo />,
    },
    {
      title: "Band profiles",
      body: "Comfort fit, flat, D-shape or knife-edge. Thickness follows the width, between 1.20 and 2.60 mm.",
      demo: <SectionDemo />,
    },
    {
      title: "Round means round",
      body: "A mesh draws the finger hole with flat sides. In the STEP file it is an exact circle.",
      demo: <BrepDemo />,
    },
  ];

  return (
    <section id="how" className="relative scroll-mt-24 border-t border-white/5 bg-ink-900 py-16 md:py-28">
      {/* Old links pointed here. */}
      <span id="features" className="absolute -top-24" aria-hidden="true" />

      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end lg:gap-14">
          <div>
            <motion.p {...rise(0)} className="eyebrow">How it works</motion.p>
            <motion.h2 {...rise(0.04)} className="h-section mt-3 max-w-[20ch]">
              Why a mesh fails at the casting house
            </motion.h2>
          </div>
          <motion.p {...rise(0.08)} className="text-white/80">
            Most 3D generators output triangle meshes. Resize one and the stone seat,
            prongs and wall all scale with it. Wireframe builds a solid from your spec,
            so a new size is a new build.
          </motion.p>
        </div>

        <motion.div {...rise(0.1)} className="mt-10 md:mt-12">
          <Inspection />
        </motion.div>

        {/* Phones get one demo at a time. */}
        <div role="tablist" aria-label="Demos" className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {cards.map((c, i) => (
            <button
              key={c.title}
              type="button"
              role="tab"
              aria-selected={card === i}
              onClick={() => setCard(i)}
              className={
                "tap shrink-0 rounded-full border px-4 text-sm transition-colors " +
                (card === i ? "border-metal-400 bg-white/10 text-white" : "border-white/12 text-white/75")
              }
            >
              {c.title}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-3">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              {...rise(0.05 * i)}
              className={
                "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] " +
                (card === i ? "" : "hidden lg:flex")
              }
            >
              <div className="flex-1 p-5 sm:p-6">{c.demo}</div>
              <div className="border-t border-white/8 p-5 sm:p-6">
                <h3 className="h-card">{c.title}</h3>
                <p className="mt-1.5 text-[0.9rem] text-white/78">{c.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ inspection -- */

function Inspection() {
  const [mode, setMode] = useState<"resize" | "limits">("resize");
  const tabs = [
    { id: "resize" as const, label: "Resize test" },
    { id: "limits" as const, label: "Casting limits" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.025]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 sm:px-7">
        <p className="text-sm text-white/80">
          {mode === "resize"
            ? "The same 1.50 ct platinum solitaire, resized two ways."
            : "The minimums the Studio checks before export."}
        </p>
        <div role="tablist" aria-label="Inspection" className="flex rounded-full border border-white/15 bg-black/40 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => setMode(t.id)}
              className={
                "tap rounded-full px-4 py-1.5 text-sm transition-colors " +
                (mode === t.id ? "bg-white font-medium text-ink-950" : "text-white/75 hover:text-white")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-7">{mode === "resize" ? <ResizeTest /> : <CastingLimits />}</div>
    </div>
  );
}

function ResizeTest() {
  const [size, setSize] = useState<number>(BASE.size);
  const d = duelAt(size, "platinum");
  const L = MANUFACTURING_LIMITS.platinum;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label htmlFor="duel-size" className="label text-sm">
          Ring size
        </label>
        <input
          id="duel-size"
          type="range"
          min={4}
          max={11}
          step={0.5}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="slider-metal w-full max-w-xs flex-1"
          aria-valuetext={`US ${size}, inner diameter ${d.innerDia.toFixed(2)} millimetres`}
        />
        <span className="measure text-sm text-white">
          US {size.toFixed(1)} · Ø {d.innerDia.toFixed(2)} mm
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <DuelColumn
          title="Scaled as a mesh"
          note={d.k === 1 ? "Every length times 1.000" : `Every length times ${d.k.toFixed(3)}`}
          innerDia={d.innerDia}
          col={d.mesh}
          verdict={d.meshVerdict}
          limits={L}
        />
        <DuelColumn
          title="Rebuilt from the spec"
          note="Only the inner diameter changes"
          innerDia={d.innerDia}
          col={d.brep}
          verdict={d.brepVerdict}
          limits={L}
        />
      </div>
      <p className="mt-4 text-sm text-white/65">
        Checked against platinum minimums: prongs {L.minProngDia.toFixed(2)} mm, band {L.minBandThickness.toFixed(2)} mm.
      </p>
    </div>
  );
}

function DuelColumn({
  title, note, innerDia, col, verdict, limits,
}: {
  title: string;
  note: string;
  innerDia: number;
  col: Column;
  verdict: Verdict;
  limits: { minProngDia: number; minBandThickness: number };
}) {
  const seatOff = Math.abs(col.seat - BASE.seat) > 0.05;
  const prongLow = col.prong < limits.minProngDia;
  const wallLow = col.wall < limits.minBandThickness;

  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="h-card">{title}</h3>
        <span className="text-xs text-white/60">{note}</span>
      </div>

      <RingDrawing innerDia={innerDia} col={col} />

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Figure label="Seat" value={`${col.seat.toFixed(2)} mm`} bad={seatOff} hint={`stone ${BASE.seat.toFixed(2)} mm`} />
        <Figure label="Stone for this seat" value={`${col.carat.toFixed(2)} ct`} bad={seatOff} />
        <Figure label="Prongs" value={`${col.prong.toFixed(2)} mm`} bad={prongLow} />
        <Figure label="Wall" value={`${col.wall.toFixed(2)} mm`} bad={wallLow} />
      </dl>

      <VerdictLine v={verdict} />
    </div>
  );
}

function Figure({ label, value, bad, hint }: { label: string; value: string; bad?: boolean; hint?: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={"measure mt-0.5 " + (bad ? "text-red-300" : "text-white")}>
        {value}
        {hint && <span className="ml-1.5 text-white/50">({hint})</span>}
      </dd>
    </div>
  );
}

function VerdictLine({ v }: { v: Verdict }) {
  if (v.kind === "same")
    return <p className="mt-4 border-t border-white/8 pt-3 text-sm text-white/70">Same ring. Move the slider.</p>;
  if (v.kind === "ok")
    return (
      <p className="mt-4 flex items-start gap-2 border-t border-white/8 pt-3 text-sm text-emerald-300">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Stone fits. Prongs and wall as specified.
      </p>
    );
  return (
    <p className="mt-4 flex items-start gap-2 border-t border-white/8 pt-3 text-sm text-red-300">
      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {v.text}
    </p>
  );
}

/** Front view to one scale for both columns: band, stone and two prongs. */
function RingDrawing({ innerDia, col }: { innerDia: number; col: Column }) {
  const S = 4.4; // px per mm
  const cx = 120;
  const ri = (innerDia / 2) * S;
  const ro = ri + col.wall * S;
  const sr = (col.seat / 2) * S;
  const cy = 196 - ro;
  const stoneY = cy - ro - sr * 0.55;
  const pr = (col.prong / 2) * S;

  return (
    <svg viewBox="0 0 240 200" className="mt-3 h-44 w-full" role="img"
         aria-label={`Band ${col.wall.toFixed(2)} millimetres thick, seat ${col.seat.toFixed(2)} millimetres`}>
      <circle cx={cx} cy={cy} r={(ri + ro) / 2} fill="none" stroke="var(--metal-400)" strokeOpacity="0.55" strokeWidth={ro - ri} />
      <circle cx={cx} cy={cy} r={ri} fill="none" stroke="var(--metal-300)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={ro} fill="none" stroke="var(--metal-300)" strokeWidth="1" />
      <circle cx={cx} cy={stoneY} r={sr} fill="rgba(255,255,255,0.06)" stroke="var(--metal-200)" strokeWidth="1.2" />
      {[-1, 1].map((s) => (
        <circle key={s} cx={cx + s * (sr + pr * 0.3)} cy={stoneY} r={pr} fill="var(--metal-300)" />
      ))}
    </svg>
  );
}

function CastingLimits() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/15">
              <th className="py-2 pr-4 font-medium text-white">Alloy</th>
              <th className="py-2 pr-4 font-medium text-white">Band</th>
              <th className="py-2 pr-4 font-medium text-white">Prongs</th>
              <th className="py-2 font-medium text-white">Wall behind a seat</th>
            </tr>
          </thead>
          <tbody className="text-white/85">
            {METALS.map((m) => {
              const L = MANUFACTURING_LIMITS[m];
              return (
                <tr key={m} className="border-b border-white/8">
                  <td className="py-2 pr-4">{METAL_LABELS[m]}</td>
                  <td className="measure py-2 pr-4">{L.minBandThickness.toFixed(2)} mm</td>
                  <td className="measure py-2 pr-4">{L.minProngDia.toFixed(2)} mm</td>
                  <td className="measure py-2">{L.minWall.toFixed(2)} mm</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2.5 text-sm text-white/80">
        <li>A stretch of shank you edited on its own is checked on its own.</li>
        <li>Stones set into the band must leave enough metal behind each seat.</li>
        <li>The metal must come out as one piece.</li>
        <li>Nothing is changed for you. The Studio says what failed and by how much.</li>
      </ul>
    </div>
  );
}

/* -------------------------------------------------------- 1 · prompt demo -- */

const EXAMPLES = [
  { label: "Platinum cathedral oval", text: "platinum solitaire, 1.5 ct oval, cathedral setting, size 6.5" },
  { label: "Rose gold half eternity", text: "18k rose gold half eternity, 2.4mm band, hammered finish" },
  { label: "White gold halo cushion", text: "white gold halo, 0.9 ct cushion, split shank, 6 prong, size 7" },
];

const FIELDS: Array<{ key: keyof RingSpec; label: string; fmt?: (v: unknown) => string }> = [
  { key: "metalType", label: "Metal", fmt: (v) => METAL_LABELS[String(v)] ?? String(v) },
  { key: "gemShape", label: "Cut" },
  { key: "gemSize", label: "Carat", fmt: (v) => `${v} ct` },
  { key: "setting", label: "Setting", fmt: (v) => String(v).replace(/_/g, " ") },
  { key: "ringSize", label: "Size", fmt: (v) => `US ${v}` },
  { key: "bandWidth", label: "Band", fmt: (v) => `${v} mm` },
  { key: "shankStyle", label: "Shank" },
  { key: "shankStones", label: "Accents", fmt: (v) => String(v).replace(/_/g, " ") },
  { key: "finish", label: "Finish" },
  { key: "prongCount", label: "Prongs" },
];

function PromptDemo() {
  const [text, setText] = useState("");
  const [taken, setTaken] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Types the examples while on screen, until someone touches the box.
  useEffect(() => {
    if (taken) return;
    if (reduced) {
      setText(EXAMPLES[0].text);
      return;
    }
    let alive = true;
    let timer = 0;
    let visible = false;
    let ex = 0;
    let i = 0;
    let phase: "typing" | "holding" | "clearing" = "typing";

    const step = () => {
      if (!alive || !visible) return;
      const full = EXAMPLES[ex].text;
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

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          window.clearTimeout(timer);
          timer = window.setTimeout(step, 300);
        }
      },
      { threshold: 0.25 }
    );
    if (boxRef.current) io.observe(boxRef.current);
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
    <div ref={boxRef}>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            aria-pressed={text === ex.text}
            onClick={() => takeOver(ex.text)}
            className={
              "tap rounded-full border px-2.5 py-1 text-xs transition-colors " +
              (text === ex.text
                ? "border-metal-400/60 bg-white/10 text-white"
                : "border-white/12 text-white/80 hover:border-white/25 hover:text-white")
            }
          >
            {ex.label}
          </button>
        ))}
      </div>

      <label htmlFor="demo-prompt" className="sr-only">Describe a ring</label>
      <textarea
        id="demo-prompt"
        value={text}
        onChange={(e) => takeOver(e.target.value)}
        onFocus={() => setTaken(true)}
        rows={2}
        spellCheck={false}
        className="glassy-input mt-3 resize-none !rounded-lg !text-[0.85rem] !leading-relaxed"
        placeholder="Describe a ring"
      />

      <div className="mt-3 flex items-baseline justify-between">
        <span className="label">Read from your sentence</span>
        <span className="measure text-xs text-white/70">{hits} of {FIELDS.length}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {FIELDS.map((f) => {
          const v = spec[f.key];
          const has = v !== undefined;
          return (
            <span
              key={f.key}
              className={
                "inline-flex items-baseline gap-1.5 rounded-md border px-2 py-1 text-[0.78rem] " +
                (has ? "border-metal-400/35 bg-white/[0.06]" : "border-white/6 text-white/40")
              }
            >
              <span className={has ? "text-white/60" : ""}>{f.label}</span>
              {has && <span className="font-medium capitalize text-white">{f.fmt ? f.fmt(v) : String(v)}</span>}
            </span>
          );
        })}
      </div>

      <details className="mt-3 text-sm">
        <summary className="tap inline-flex cursor-pointer items-center text-white/70 hover:text-white">See the spec</summary>
        <pre className="measure mt-2 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[0.72rem] leading-relaxed text-white/85">
          {hits === 0 ? "{}" : JSON.stringify(spec, null, 2)}
        </pre>
      </details>

      <p className="mt-3 text-xs text-white/55">
        This demo uses the quick parser that runs in your browser. In the Studio, a language model reads the sentence first.
      </p>
    </div>
  );
}

/* ------------------------------------------------------- 2 · section demo -- */

// The engine's band thickness: 62% of the width, kept between 1.20 and 2.60 mm.
const thicknessFor = (w: number) => Math.min(2.6, Math.max(1.2, w * 0.62));

const PROFILE_LABELS: Record<BandProfile, string> = {
  comfort: "Comfort fit",
  flat: "Flat",
  round: "D-shape",
  knife: "Knife-edge",
};

function profilePath(profile: BandProfile, cx: number, cy: number, w: number, h: number) {
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
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
  const S = 25, cx = 110, cy = 68;
  const w = width * S, h = t * S;
  const d = profilePath(profile, cx, cy, w, h);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {BAND_PROFILES.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={profile === p}
            onClick={() => setProfile(p)}
            className={
              "tap rounded-full border px-2.5 py-1 text-xs transition-colors " +
              (profile === p
                ? "border-metal-400/60 bg-white/10 text-white"
                : "border-white/12 text-white/80 hover:border-white/25 hover:text-white")
            }
          >
            {PROFILE_LABELS[p]}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 220 136" className="mt-2 h-36 w-full" role="img"
           aria-label={`${PROFILE_LABELS[profile]} band, ${width.toFixed(1)} by ${t.toFixed(2)} millimetres`}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--metal-400)" strokeWidth="1.1" strokeOpacity="0.55" />
          </pattern>
          <marker id="arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 1 L 8 4 L 0 7 z" fill="rgba(255,255,255,0.85)" />
          </marker>
        </defs>
        <line x1={cx} y1={14} x2={cx} y2={120} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="7 3 2 3" />
        <motion.path d={d} fill="url(#hatch)" stroke="var(--metal-200)" strokeWidth="1.4" strokeLinejoin="round"
                     initial={false} animate={{ d }} transition={{ type: "spring", stiffness: 260, damping: 30 }} />
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="0.9">
          <line x1={cx - w / 2} y1={cy + h / 2 + 3} x2={cx - w / 2} y2={cy + h / 2 + 20} />
          <line x1={cx + w / 2} y1={cy + h / 2 + 3} x2={cx + w / 2} y2={cy + h / 2 + 20} />
          <line x1={cx - w / 2} y1={cy + h / 2 + 15} x2={cx + w / 2} y2={cy + h / 2 + 15} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1={cx + w / 2 + 3} y1={cy - h / 2} x2={cx + w / 2 + 26} y2={cy - h / 2} />
          <line x1={cx + w / 2 + 3} y1={cy + h / 2} x2={cx + w / 2 + 26} y2={cy + h / 2} />
          <line x1={cx + w / 2 + 21} y1={cy - h / 2} x2={cx + w / 2 + 21} y2={cy + h / 2} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        </g>
        <text x={cx} y={cy + h / 2 + 30} textAnchor="middle" className="fill-white" style={{ font: "500 9.5px ui-monospace, monospace" }}>
          {width.toFixed(1)} mm
        </text>
        <text x={cx + w / 2 + 30} y={cy + 3} className="fill-white" style={{ font: "500 9.5px ui-monospace, monospace" }}>
          {t.toFixed(2)}
        </text>
      </svg>

      <div className="mt-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="band-width" className="label">Band width</label>
          <span className="measure text-sm text-white">{width.toFixed(1)} mm</span>
        </div>
        <input id="band-width" type="range" min={1.4} max={6} step={0.1} value={width}
               onChange={(e) => setWidth(Number(e.target.value))} className="slider-metal" />
        <div className="mt-1 flex items-baseline justify-between text-xs text-white/65">
          <span>Thickness</span>
          <span className="measure text-white">{t.toFixed(2)} mm</span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- 3 · brep demo -- */

function BrepDemo() {
  const [facets, setFacets] = useState(16);
  const radius = innerDiameter(BASE.size) / 2;
  const error = chordError(radius, facets);
  const R = 52, cx = 70, cy = 70;

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
    <div className="flex flex-col gap-5 sm:flex-row lg:flex-col xl:flex-row">
      <div className="mx-auto shrink-0 text-center">
        <svg viewBox="0 0 140 140" className="h-40 w-40" role="img" aria-label={`A circle drawn with ${facets} flat sides`}>
          <defs>
            <clipPath id="lens"><circle cx={cx} cy={22} r="21" /></clipPath>
          </defs>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--metal-300)" strokeWidth="1.4" />
          <polyline points={poly} fill="none" stroke="var(--accent-500)" strokeWidth="1.2" strokeLinejoin="round" />
          <g clipPath="url(#lens)">
            <g transform={`translate(${cx} ${22}) scale(${zoom}) translate(${-cx} ${-(cy - R)})`}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--metal-300)" strokeWidth={1.2 / zoom} />
              <polyline points={poly} fill="none" stroke="var(--accent-500)" strokeWidth={1.2 / zoom} strokeLinejoin="round" />
              <line x1={cx} y1={cy - R} x2={cx} y2={cy - R * Math.cos(half)} stroke="#fff" strokeWidth={1.5 / zoom} strokeLinecap="round" />
            </g>
          </g>
          <circle cx={cx} cy={22} r="21" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </svg>
        <span className="text-xs text-white/65">Top: magnified {zoom}×</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
          <div className="bg-ink-900 px-3 py-2.5">
            <div className="label">STL, {facets} sides</div>
            <div className="measure mt-0.5 text-white">{error.toFixed(3)} mm</div>
            <div className="text-xs text-white/60">off round</div>
          </div>
          <div className="bg-ink-900 px-3 py-2.5">
            <div className="label">STEP</div>
            <div className="measure mt-0.5 text-white">0.000 mm</div>
            <div className="text-xs text-white/60">exact circle</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <label htmlFor="facets" className="label">Flat sides</label>
            <span className="measure text-sm text-white">{facets}</span>
          </div>
          <input id="facets" type="range" min={8} max={128} step={8} value={facets}
                 onChange={(e) => setFacets(Number(e.target.value))} className="slider-metal" />
        </div>

        <p className="mt-2 text-sm text-white/75">
          A size {BASE.size} hole is {radius.toFixed(2)} mm in radius. With {facets} flat sides it is{" "}
          <span className="measure text-white">{error.toFixed(3)} mm</span> off round.
        </p>
      </div>
    </div>
  );
}

export default InteractiveFeatureGrid;
