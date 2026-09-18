/**
 * Four things the engine does, drawn.
 *
 * What was here described four capabilities, three of which were not quite
 * true and one of which was not true at all:
 *
 *   - "Auto-detects walls thinner than 0.6mm or unclosed meshes." The limits
 *     are per alloy and none of them is 0.6 — platinum wants 0.70mm of wall
 *     and 1.00mm of band, sterling 1.00 and 1.30 — and they are B-rep solids,
 *     not meshes.
 *   - "Change a ring size from 5 to 9 and the shank thickens proportionally."
 *     It does not. thickness = clamp(bandWidth x 0.62, 1.2, 2.6): it follows
 *     the band width and nothing else. Ring size moves the inner radius and
 *     leaves the section alone — which is correct, and a better claim than
 *     the one being made.
 *   - "Poly: 12,404" sat in the corner of the viewport like a live readout.
 *     It was a constant.
 *   - "MESH WATERTIGHT" again: what the check counts is closed solids.
 *
 * Every number below now comes from the engine — its size formula, its alloy
 * densities, its stone counts, the angles the lasso stores — or it is not
 * stated.
 *
 * It is also operable now. The old rows responded to onMouseEnter only, so on
 * any touch device the section was frozen on its first item and the other
 * three were unreachable; there was no keyboard path either. They are tabs.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { METAL_DENSITY, METAL_LABELS, type MetalType } from "../lib/ring-spec";

/* The engine's own size relation, from cad-engine: inner diameter in
 * millimetres, 16.51mm at size 6, 0.8128mm per size. */
const innerDia = (size: number) => 11.63 + size * 0.8128;

/** Measured metal volume of the reference design, cm³ — as the hero quotes. */
const VOLUME_CM3 = 0.31;

type Mode = "vocabulary" | "size" | "weight" | "regions";

const CAPS: Array<{ id: Mode; title: string; kicker: string; desc: string }> = [
  {
    id: "vocabulary",
    title: "It speaks the trade",
    kicker: "Vocabulary → structure",
    desc:
      "Bezel, cathedral, three-stone, half eternity, pavé. Each names a way parts attach, not a look — so the head, the gallery and the shoulders are built where a bench jeweller would expect to find them.",
  },
  {
    id: "size",
    title: "Rebuilt, never stretched",
    kicker: "Size is a parameter, not a scale factor",
    desc:
      "Change the size and the ring is rebuilt from its spec. Scaling one instead would take the stone with it — a size 6 scaled to a size 9 turns a 1.50 ct centre into a 2.27 ct one, which is a different ring and a different invoice.",
  },
  {
    id: "weight",
    title: "Weighed, not estimated",
    kicker: "Volume × density",
    desc:
      "The metal volume is measured off the closed solid, then multiplied by the alloy's real density. Nothing here is a lookup table of typical ring weights.",
  },
  {
    id: "regions",
    title: "Edits that stay put",
    kicker: "Stored as angle, not as geometry",
    desc:
      "Widen one stretch of the shank and the edit is recorded as an angle around the finger. The ring is rebuilt on every parameter change, and the faces that come out are different objects each time — an edit pinned to one of them would quietly wander off somewhere else.",
  },
];

export function InteractiveCapabilities() {
  const [mode, setMode] = useState<Mode>("vocabulary");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Arrow keys move between tabs, which is what a tab list owes a keyboard.
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
      const btns = tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      btns?.[next]?.focus();
    },
    [mode]
  );

  return (
    <section
      id="capabilities"
      className="relative scroll-mt-24 overflow-hidden border-t border-white/5 bg-ink-900 py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 82% 12%, rgba(198,155,178,0.08), transparent 62%)",
        }}
      />

      <div className="shell relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          <span className="mono-label !text-metal-400">02</span>
          <span className="h-px w-8 bg-white/15" />
          <span className="mono-label">On the bench</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 max-w-[18ch] text-[clamp(1.9rem,1.2rem+2.4vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
        >
          Built the way it would be made.
        </motion.h2>

        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14">
          {/* Tabs */}
          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Engine capabilities"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            /* Two shapes, one list. On a phone the tabs are a horizontal strip
               of fixed-size chips and the prose lives in the sheet, so nothing
               reflows when the selection moves; from lg up they are a vertical
               list carrying their own descriptions, where the extra width is
               there to spend. Collapsing descriptions in place — which is what
               was here — made the list change height on every selection and
               slid the other rows out from under the pointer. */
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
          >
            {CAPS.map((c, i) => {
              const active = c.id === mode;
              return (
                <button
                  key={c.id}
                  role="tab"
                  id={`cap-tab-${c.id}`}
                  aria-selected={active}
                  aria-controls={`cap-panel-${c.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setMode(c.id)}
                  /* Hover-to-select only where the list is the vertical one.
                     In the phone layout the tabs are a strip that scrolls, so a
                     chip can arrive under a stationary pointer on its own and
                     change the selection without anyone asking. */
                  onPointerEnter={(e) => {
                    if (e.pointerType !== "mouse") return;
                    if (!window.matchMedia("(min-width: 1024px)").matches) return;
                    setMode(c.id);
                  }}
                  className={
                    "relative shrink-0 rounded-xl border px-4 py-3 text-left transition-colors duration-300 lg:w-full lg:px-5 lg:py-4 " +
                    (active
                      ? "border-white/12 bg-white/[0.045]"
                      : "border-white/8 hover:bg-white/[0.02] lg:border-transparent")
                  }
                >
                  {active && (
                    <motion.span
                      layoutId="cap-marker"
                      transition={{ type: "spring", stiffness: 320, damping: 32 }}
                      className="absolute inset-y-4 left-0 w-0.5 rounded-r bg-metal-300"
                    />
                  )}

                  <div className="flex items-baseline gap-3">
                    <span className={"mono-label !text-[0.5rem] " + (active ? "!text-metal-400" : "")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={
                        "text-[1.02rem] font-medium tracking-tight transition-colors duration-300 " +
                        (active ? "text-white" : "text-white/55")
                      }
                    >
                      {c.title}
                    </span>
                  </div>

                  <div className="mono-label mt-1 !text-[0.48rem] !tracking-[0.14em]">
                    {c.kicker}
                  </div>

                  {/* Always rendered, dimmed when inactive.
                    *
                    * Collapsing the inactive descriptions made the list change
                    * height every time the selection moved, which slid the
                    * other rows out from under the pointer — so moving toward
                    * one row could land you on its neighbour. Reserving the
                    * space costs nothing and makes all four readable at once. */}
                  <p
                    className={
                      "mt-2.5 hidden text-[0.85rem] leading-relaxed transition-colors duration-300 lg:block " +
                      (active ? "text-white/60" : "text-white/30")
                    }
                  >
                    {c.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Sheet */}
          <div
            role="tabpanel"
            id={`cap-panel-${mode}`}
            aria-labelledby={`cap-tab-${mode}`}
            className="card-edge relative min-h-[26rem] overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.012] lg:min-h-[32rem]"
          >
            <span aria-hidden="true" className="blueprint pointer-events-none absolute inset-0" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent"
            />

            <div className="relative flex h-full flex-col p-5 sm:p-7">
              <p className="mb-4 text-[0.85rem] leading-relaxed text-white/55 lg:hidden">
                {CAPS.find((c) => c.id === mode)!.desc}
              </p>

              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full"
                  >
                    {mode === "vocabulary" && <VocabularySheet />}
                    {mode === "size" && <SizeSheet />}
                    {mode === "weight" && <WeightSheet />}
                    {mode === "regions" && <RegionSheet />}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mono-label mt-4 flex items-center justify-between !text-[0.48rem]">
                <span>Sheet {String(CAPS.findIndex((c) => c.id === mode) + 1).padStart(2, "0")} / 04</span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Drawn to the engine's own figures
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ sheets -- */

function VocabularySheet() {
  /* Counts are the engine's: pavé sets 13 stones, half eternity 21, full
   * eternity 42, and a prong head is 4 or 6.
   *
   * The sheet is 520 wide rather than 420 because the callouts are the point
   * of it — at the narrower box the longest of them ran off the edge. */
  const CX = 200, CY = 170;

  const right = [
    { label: "Head · 6 prong", y: 86 },
    { label: "Gallery rail", y: 126 },
    { label: "Shoulder", y: 176 },
    { label: "Shank · D-profile", y: 236 },
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
                  stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
            <circle cx="284" cy={r.y} r="2" fill="var(--metal-300)" />
            <text x="332" y={r.y + 3} className="fill-white/70"
                  style={{ font: "500 9px ui-monospace, monospace" }}>
              {r.label}
            </text>
          </g>
        ))}

        <g>
          <line x1="104" y1="196" x2="140" y2="196"
                stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
          <circle cx="140" cy="196" r="2" fill="var(--accent-400)" />
          <text x="96" y="199" textAnchor="end" className="fill-white/70"
                style={{ font: "500 9px ui-monospace, monospace" }}>
            Pavé · 13 stones
          </text>
        </g>
      </svg>

      <p className="mt-3 text-[0.78rem] leading-relaxed text-white/45">
        Pavé sets 13 stones, half eternity 21, full eternity 42 — counts the
        engine derives from the band, not numbers typed into a caption.
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
      {/* 520 wide, like the other sheets: the longest readout ran off a 420 box. */}
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

        <g className="fill-white/60" style={{ font: "500 9px ui-monospace, monospace" }}>
          <text x="330" y="96">stone · 7.40 mm · 1.50 ct</text>
          <text x="330" y="112" className="fill-accent-400">if scaled · {scaled.toFixed(2)} ct</text>
          <text x="330" y="150">inner Ø · {dia.toFixed(2)} mm</text>
          <text x="330" y="166">band · 2.40 mm, unchanged</text>
        </g>
      </svg>

      <div className="mt-2">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="mono-label !text-[0.52rem]">US ring size</span>
          <span className="tabular text-[0.78rem] text-white/75">{size.toFixed(1)}</span>
        </div>
        <input type="range" min={3} max={13} step={0.5} value={size}
               onChange={(e) => setSize(Number(e.target.value))}
               className="slider-metal" aria-label="US ring size" />
        <p className="mono-label mt-1 !text-[0.46rem] !normal-case !tracking-[0.1em]">
          inner Ø = 11.63 + size × 0.8128 — the engine's relation
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
      <div className="flex flex-wrap gap-1.5">
        {alloys.map((m) => (
          <button
            key={m}
            onClick={() => setMetal(m)}
            className={
              "rounded-full border px-2.5 py-1 text-[0.66rem] transition-colors duration-300 " +
              (metal === m
                ? "border-metal-400/50 bg-metal-400/10 text-metal-200"
                : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/75")
            }
          >
            {METAL_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-1 flex-col justify-center">
        <div className="flex items-baseline gap-3">
          <motion.span
            key={grams.toFixed(2)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="tabular text-[clamp(2.4rem,1.6rem+2.6vw,3.6rem)] font-semibold leading-none text-white"
          >
            {grams.toFixed(2)}
          </motion.span>
          <span className="mono-label !text-[0.6rem]">grams</span>
        </div>

        <div className="mt-5 space-y-2">
          {alloys.map((m) => {
            const g = VOLUME_CM3 * METAL_DENSITY[m];
            return (
              <button
                key={m}
                onClick={() => setMetal(m)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className={"mono-label w-32 shrink-0 !text-[0.5rem] " + (m === metal ? "!text-metal-300" : "")}>
                  {METAL_LABELS[m]}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <motion.span
                    className={"block h-full rounded-full " + (m === metal ? "bg-metal-300" : "bg-white/20")}
                    initial={false}
                    animate={{ width: `${(g / max) * 100}%` }}
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  />
                </span>
                <span className={"tabular w-16 shrink-0 text-right text-[0.76rem] " + (m === metal ? "text-white" : "text-white/40")}>
                  {g.toFixed(2)} g
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[0.78rem] leading-relaxed text-white/45">
        {VOLUME_CM3.toFixed(2)} cm³ of metal, measured off the closed solid,
        times {METAL_DENSITY[metal]} g/cm³ for {METAL_LABELS[metal].toLowerCase()}.
      </p>
    </div>
  );
}

function RegionSheet() {
  const [size, setSize] = useState(6);
  const reduced = useReducedMotion();

  /* The region from the engine's own regression: 158°–198°, still exactly
   * that stretch after the ring is resized and resized back. */
  const FROM = 158, TO = 198;

  /* The size steps back and forth on its own, because the claim is about what
   * survives a resize and a still picture cannot show that. It only runs while
   * the sheet is on screen, and not at all for anyone who has asked for less
   * motion — for them it is simply a labelled diagram. */
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

        <g className="fill-white/60" style={{ font: "500 9px ui-monospace, monospace" }}>
          <text x="20" y="34">region · {FROM}° – {TO}°</text>
          <text x="20" y="50" className="fill-accent-400">unchanged</text>
          <text x="20" y="206">US size · {size.toFixed(1)}</text>
          <text x="20" y="222">inner Ø · {dia.toFixed(2)} mm</text>
        </g>
      </svg>

      <p className="mt-3 text-[0.78rem] leading-relaxed text-white/45">
        The ring is rebuilt each time the size changes, so the faces it is made
        of are new objects with new numbers. The edit is stored as an angle
        around the finger, which is a property of the design rather than of any
        one build of it — so it is still on the same stretch of shank
        afterwards.
      </p>
    </div>
  );
}

export default InteractiveCapabilities;
