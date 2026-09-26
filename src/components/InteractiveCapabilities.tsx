/**
 * "On the bench": four things the engine does, each drawn from its own figures.
 * The tabs are real tabs (arrow keys, Home, End) so touch and keyboard work.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { METAL_DENSITY, METAL_LABELS, type MetalType } from "../lib/ring-spec";
import { innerDiameter as innerDia } from "./duel-model";
import { useRise } from "./motion";

/** Example metal volume for the weight sheet, cm³. */
const VOLUME_CM3 = 0.31;

type Mode = "vocabulary" | "size" | "weight" | "regions";

const CAPS: Array<{ id: Mode; title: string; desc: string }> = [
  {
    id: "vocabulary",
    title: "It uses bench words",
    desc: "Say bezel, cathedral or half eternity and the parts are built where a setter expects them.",
  },
  {
    id: "size",
    title: "Rebuilt at every size",
    desc: "Change the size and the stone, prongs and wall stay as specified.",
  },
  {
    id: "weight",
    title: "Weight from the actual solid",
    desc: "Metal volume is measured from the closed solid and multiplied by the alloy's density.",
  },
  {
    id: "regions",
    title: "Edits stay where you made them",
    desc: "A widened stretch of shank stays at the same angle around the finger through every change.",
  },
];

export function InteractiveCapabilities() {
  const [mode, setMode] = useState<Mode>("vocabulary");
  const tabsRef = useRef<HTMLDivElement>(null);
  const rise = useRise();

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const i = CAPS.findIndex((c) => c.id === mode);
      const next =
        e.key === "Home" ? 0
        : e.key === "End" ? CAPS.length - 1
        : e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (i + 1) % CAPS.length
        : (i - 1 + CAPS.length) % CAPS.length;
      setMode(CAPS[next].id);
      tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    },
    [mode]
  );

  const current = CAPS.find((c) => c.id === mode)!;

  return (
    <section id="bench" className="relative scroll-mt-24 border-t border-white/5 bg-ink-900 py-16 md:py-28">
      {/* Old links pointed here. */}
      <span id="capabilities" className="absolute -top-24" aria-hidden="true" />

      <div className="shell">
        <motion.p {...rise(0)} className="eyebrow">On the bench</motion.p>
        <motion.h2 {...rise(0.04)} className="h-section mt-3 max-w-[18ch]">
          Built the way it would be made
        </motion.h2>

        <div className="mt-10 grid items-stretch gap-6 md:mt-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-12">
          <div
            ref={tabsRef}
            role="tablist"
            aria-label="What the engine does"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
          >
            {CAPS.map((c) => {
              const active = c.id === mode;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  id={`cap-tab-${c.id}`}
                  aria-selected={active}
                  aria-controls={`cap-panel-${c.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setMode(c.id)}
                  className={
                    "tap relative shrink-0 rounded-xl border px-4 py-2.5 text-left transition-colors lg:w-full lg:px-5 lg:py-4 " +
                    (active
                      ? "border-white/12 bg-white/[0.05]"
                      : "border-white/8 hover:bg-white/[0.02] lg:border-transparent")
                  }
                >
                  {active && (
                    <motion.span
                      layoutId="cap-marker"
                      transition={{ duration: 0.25 }}
                      className="absolute inset-y-4 left-0 hidden w-0.5 rounded-r bg-metal-300 lg:block"
                    />
                  )}
                  <span className={"block text-[1rem] " + (active ? "font-semibold text-white" : "text-white/80")}>
                    {c.title}
                  </span>
                  <span className={"mt-1.5 hidden text-[0.9rem] leading-relaxed lg:block " + (active ? "text-white/85" : "text-white/60")}>
                    {c.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`cap-panel-${mode}`}
            aria-labelledby={`cap-tab-${mode}`}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] lg:min-h-[30rem]"
          >
            <div className="relative flex h-full flex-col p-5 sm:p-7">
              <p className="mb-4 text-[0.95rem] text-white/85 lg:hidden">{current.desc}</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  {mode === "vocabulary" && <VocabularySheet />}
                  {mode === "size" && <SizeSheet />}
                  {mode === "weight" && <WeightSheet />}
                  {mode === "regions" && <RegionSheet />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ sheets -- */

function VocabularySheet() {
  const CX = 200, CY = 170;
  const SANS = { font: "500 11px ui-sans-serif, system-ui, sans-serif" };

  const right = [
    { label: "Head, 6 prongs", y: 86 },
    { label: "Gallery rail", y: 126 },
    { label: "Shoulder", y: 176 },
    { label: "Shank, D-shape", y: 236 },
  ];

  return (
    <div className="flex h-full flex-col">
      <svg viewBox="0 0 520 272" className="w-full flex-1" role="img"
           aria-label="A solitaire annotated with the names of its parts">
        <g stroke="var(--metal-300)" fill="none" strokeWidth="1.3">
          <circle cx={CX} cy={CY} r="74" />
          <circle cx={CX} cy={CY} r="62" />
        </g>

        {/* Head: table, crown and two prongs in elevation. */}
        <g stroke="var(--metal-200)" fill="none" strokeWidth="1.3">
          <path d={`M ${CX - 24} 86 L ${CX} 62 L ${CX + 24} 86 L ${CX} 106 Z`} />
          <path d={`M ${CX - 24} 86 L ${CX + 24} 86`} />
          <path d={`M ${CX - 18} 88 L ${CX - 18} 102 M ${CX + 18} 88 L ${CX + 18} 102`} />
        </g>

        {/* Pavé along the left shoulder. */}
        {Array.from({ length: 7 }).map((_, i) => {
          const a = Math.PI * (0.78 + i * 0.058);
          return (
            <circle key={i} cx={CX + Math.cos(a) * 68} cy={CY + Math.sin(a) * 68}
                    r="4" fill="none" stroke="var(--accent-400)" strokeWidth="1" />
          );
        })}

        {right.map((r) => (
          <g key={r.label}>
            <line x1="284" y1={r.y} x2="322" y2={r.y}
                  stroke="rgba(255,255,255,0.38)" strokeWidth="1" />
            <circle cx="284" cy={r.y} r="2" fill="var(--metal-300)" />
            <text x="332" y={r.y + 4} className="fill-white" style={SANS}>
              {r.label}
            </text>
          </g>
        ))}

        <g>
          <line x1="104" y1="196" x2="140" y2="196"
                stroke="rgba(255,255,255,0.38)" strokeWidth="1" />
          <circle cx="140" cy="196" r="2" fill="var(--accent-400)" />
          <text x="96" y="200" textAnchor="end" className="fill-white" style={SANS}>
            Pavé shoulders
          </text>
        </g>
      </svg>

      <p className="mt-3 text-sm text-white/78">
        The number of pavé stones follows the band: wider bands take bigger
        stones, and a bigger finger fits more of them.
      </p>
    </div>
  );
}

function SizeSheet() {
  const [size, setSize] = useState(6);
  const dia = innerDia(size);
  const scaled = 1.5 * Math.pow(innerDia(9) / innerDia(6), 3);

  const S = 6.4;
  const ri = (dia / 2) * S;
  const stoneR = (7.4 / 2) * S;          // 1.50 ct stays 7.4mm across
  const ghostR = ((7.4 * (innerDia(9) / innerDia(6))) / 2) * S;

  return (
    <div className="flex h-full flex-col">
      <svg viewBox="0 0 520 260" className="w-full flex-1" role="img"
           aria-label={`Ring at US size ${size}`}>
        <g transform="translate(176 132)">
          {/* What scaling would do to the stone, for comparison. */}
          <circle r={ghostR} cy={-(ri + 16)} fill="none" stroke="var(--accent-500)"
                  strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
          <motion.circle
            animate={{ r: ri }} transition={{ type: "spring", stiffness: 240, damping: 30 }}
            fill="none" stroke="var(--metal-300)" strokeWidth="1.4"
          />
          <motion.circle
            animate={{ r: ri + 2.4 * S }} transition={{ type: "spring", stiffness: 240, damping: 30 }}
            fill="none" stroke="var(--metal-300)" strokeWidth="1.4"
          />
          <motion.circle
            animate={{ cy: -(ri + 16) }} transition={{ type: "spring", stiffness: 240, damping: 30 }}
            r={stoneR} fill="none" stroke="var(--metal-200)" strokeWidth="1.4"
          />
        </g>

        <g className="fill-white/90" style={{ font: "500 11px ui-monospace, monospace" }}>
          <text x="320" y="96">Stone 7.40 mm, 1.50 ct</text>
          <text x="320" y="114" className="fill-accent-400">Scaled 6 to 9: {scaled.toFixed(2)} ct</text>
          <text x="320" y="150">Inner Ø {dia.toFixed(2)} mm</text>
          <text x="320" y="168">Band 2.40 mm at every size</text>
        </g>
      </svg>

      <div className="mt-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="bench-size" className="label">Ring size (US)</label>
          <span className="measure text-sm text-white">{size.toFixed(1)}</span>
        </div>
        <input id="bench-size" type="range" min={3} max={13} step={0.5} value={size}
               onChange={(e) => setSize(Number(e.target.value))} className="slider-metal" />
        <p className="mt-1 text-xs text-white/60">
          Inner diameter in mm = 11.63 + 0.8128 × size
        </p>
      </div>
    </div>
  );
}

function WeightSheet() {
  const alloys: MetalType[] = ["platinum", "white_gold", "18k_gold", "14k_rose", "silver"];
  const [metal, setMetal] = useState<MetalType>("platinum");
  const grams = VOLUME_CM3 * METAL_DENSITY[metal];
  const max = VOLUME_CM3 * METAL_DENSITY.platinum;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline gap-3">
        <span className="measure text-[clamp(2.4rem,1.6rem+2.6vw,3.4rem)] font-semibold leading-none text-white">
          {grams.toFixed(2)}
        </span>
        <span className="text-white/75">grams in {METAL_LABELS[metal].toLowerCase()}</span>
      </div>

      <div className="mt-6 space-y-1" role="group" aria-label="Alloy">
        {alloys.map((m) => {
          const g = VOLUME_CM3 * METAL_DENSITY[m];
          const on = m === metal;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => setMetal(m)}
              className="tap flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-white/[0.03]"
            >
              <span className={"w-32 shrink-0 text-sm " + (on ? "text-white" : "text-white/70")}>
                {METAL_LABELS[m]}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  className={"block h-full rounded-full " + (on ? "bg-metal-300" : "bg-white/30")}
                  initial={false}
                  animate={{ width: `${(g / max) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </span>
              <span className={"measure w-16 shrink-0 text-right text-sm " + (on ? "text-white" : "text-white/65")}>
                {g.toFixed(2)} g
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-sm text-white/78">
        Example: a ring with {VOLUME_CM3.toFixed(2)} cm³ of metal, times{" "}
        {METAL_DENSITY[metal].toFixed(2)} g/cm³ for {METAL_LABELS[metal].toLowerCase()}. In the
        Studio the volume is measured from your ring&apos;s own solid.
      </p>
    </div>
  );
}

function RegionSheet() {
  const [size, setSize] = useState(6);
  const reduced = useReducedMotion();

  // The region from the engine's regression test (158° to 198°).
  const FROM = 158, TO = 198;

  // Steps between size 6 and 9 while on screen; not at all under reduced motion.
  const hostRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (reduced) return;
    let id = 0;
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(id);
      if (e.isIntersecting) {
        id = window.setInterval(() => setSize((s) => (s === 6 ? 9 : 6)), 2400);
      }
    }, { threshold: 0.3 });
    if (hostRef.current) io.observe(hostRef.current);
    return () => { io.disconnect(); window.clearInterval(id); };
  }, [reduced]);

  const dia = innerDia(size);
  const S = 6.4;
  const ri = (dia / 2) * S;
  const ro = ri + 2.4 * S;

  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return [210 + Math.cos(rad) * r, 130 + Math.sin(rad) * r];
    };
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };

  return (
    <div className="flex h-full flex-col">
      <svg ref={hostRef} viewBox="0 0 420 240" className="w-full flex-1" role="img"
           aria-label={`Region from ${FROM} to ${TO} degrees at size ${size}`}>
        <motion.circle animate={{ r: ri }} transition={{ type: "spring", stiffness: 200, damping: 28 }}
                       cx="210" cy="130" fill="none" stroke="var(--metal-300)" strokeWidth="1.3" />
        <motion.circle animate={{ r: ro }} transition={{ type: "spring", stiffness: 200, damping: 28 }}
                       cx="210" cy="130" fill="none" stroke="var(--metal-300)" strokeWidth="1.3" />

        {/* The edited stretch, drawn where its angles say it is. */}
        <motion.path
          animate={{ d: arc(ri + (ro - ri) / 2, FROM, TO) }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
          fill="none" stroke="var(--accent-500)" strokeWidth={(ro - ri)} strokeOpacity="0.32"
        />
        <motion.path
          animate={{ d: arc(ro + 10, FROM, TO) }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
          fill="none" stroke="var(--accent-400)" strokeWidth="1.2"
        />

        <g className="fill-white/90" style={{ font: "500 11px ui-monospace, monospace" }}>
          <text x="20" y="34">Edited {FROM}° to {TO}°</text>
          <text x="20" y="52" className="fill-accent-400">Same angles at every size</text>
          <text x="20" y="204">US size {size.toFixed(1)}</text>
          <text x="20" y="222">Inner Ø {dia.toFixed(2)} mm</text>
        </g>
      </svg>

      <p className="mt-3 text-sm text-white/78">
        The edit is saved as an angle around the finger. The ring is rebuilt at
        each size, and the edit lands on the same stretch of shank every time.
      </p>
    </div>
  );
}

export default InteractiveCapabilities;
