import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  HeroRevolutionVisual,
  type HeroRevolutionSpec,
  type HeroMetrics,
} from "./HeroRevolutionVisual";
import {
  METAL_DENSITY,
  METAL_LABELS,
  parseSpecFromPrompt,
  type MetalType,
} from "../lib/ring-spec";
import type { GemCut } from "../lib/cad-engine";
import { useRise } from "./motion";

const PRESETS: Array<{ label: string; prompt: string; spec: HeroRevolutionSpec }> = [
  {
    label: "Platinum solitaire",
    prompt: "Platinum solitaire, 1.5 ct round brilliant, size 6.5",
    spec: { metalType: "platinum", gemShape: "round", gemSize: 1.5, ringSize: 6.5, bandWidth: 2.4, prongCount: 6, displayMode: "solid" },
  },
  {
    label: "Yellow gold oval",
    prompt: "18k yellow gold solitaire with 2.0ct oval diamond, size 6",
    spec: { metalType: "18k_gold", gemShape: "oval", gemSize: 2.0, ringSize: 6.0, bandWidth: 2.2, prongCount: 6, displayMode: "solid" },
  },
  {
    label: "Rose gold marquise",
    prompt: "14k rose gold knife edge ring, 1.5ct marquise diamond, size 6.5",
    spec: { metalType: "14k_rose", gemShape: "marquise", gemSize: 1.5, ringSize: 6.5, bandWidth: 2.6, prongCount: 6, displayMode: "solid" },
  },
  {
    label: "White gold emerald cut",
    prompt: "18k white gold 1.8ct emerald cut diamond, size 7",
    spec: { metalType: "white_gold", gemShape: "emerald", gemSize: 1.8, ringSize: 7.0, bandWidth: 2.5, prongCount: 4, displayMode: "solid" },
  },
  {
    label: "Platinum princess",
    prompt: "Platinum solitaire, 2.0 ct princess cut diamond, size 6.5",
    spec: { metalType: "platinum", gemShape: "princess", gemSize: 2.0, ringSize: 6.5, bandWidth: 2.5, prongCount: 4, displayMode: "solid" },
  },
];

// Hallmark plus colour. Densities come from the engine's table.
const METAL_SWATCHES: Array<{ id: MetalType; badge: string; gradient: string }> = [
  { id: "platinum", badge: "950 Pt", gradient: "from-[#eae6df] via-[#d6d2ca] to-[#a8a49c]" },
  { id: "18k_gold", badge: "750 Yellow", gradient: "from-[#fff0cd] via-[#fde2aa] to-[#d4aa5c]" },
  { id: "white_gold", badge: "750 White", gradient: "from-[#ffffff] via-[#e2e0de] to-[#b3b1af]" },
  { id: "14k_rose", badge: "585 Rose", gradient: "from-[#feddce] via-[#facebf] to-[#c98e7b]" },
  { id: "silver", badge: "925 Silver", gradient: "from-[#ffffff] via-[#fbfaf5] to-[#c7c6c0]" },
];

const CUTS: Array<{ id: GemCut; label: string }> = [
  { id: "round", label: "Round" },
  { id: "oval", label: "Oval" },
  { id: "emerald", label: "Emerald" },
  { id: "marquise", label: "Marquise" },
  { id: "cushion", label: "Cushion" },
  { id: "princess", label: "Princess" },
];

const CARATS = [1.0, 1.5, 2.0, 2.5];
const SIZES = [5.0, 6.0, 6.5, 7.0, 8.0];
const VIEWS: Array<{ id: HeroRevolutionSpec["displayMode"]; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "wireframe", label: "Edges" },
  { id: "section", label: "Section" },
];

type Tab = "metal" | "stone" | "view";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "metal", label: "Metal" },
  { id: "stone", label: "Stone and size" },
  { id: "view", label: "View" },
];

const chip = (on: boolean) =>
  "tap inline-flex items-center rounded-full border px-3 py-1 text-[0.8rem] transition-colors " +
  (on
    ? "border-metal-400 bg-white/15 font-medium text-white"
    : "border-white/12 bg-white/[0.04] text-white/80 hover:border-white/25 hover:text-white");

export function HeroRevolution() {
  const navigate = useNavigate();
  const rise = useRise();

  const [promptText, setPromptText] = useState(PRESETS[0].prompt);
  const [spec, setSpec] = useState<HeroRevolutionSpec>(PRESETS[0].spec);
  const [metrics, setMetrics] = useState<HeroMetrics>({
    volumeCm3: 0.31,
    weightGrams: 6.65,
    carat: 1.5,
    diameterMm: 7.4,
    isWatertight: true,
  });
  const [tab, setTab] = useState<Tab>("metal");

  const promptRef = useRef<HTMLTextAreaElement>(null);
  // Grows with the text, up to three lines.
  useLayoutEffect(() => {
    const el = promptRef.current;
    if (!el) return;
    el.style.height = "auto";
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 22;
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    el.style.height = `${Math.min(el.scrollHeight, line * 3 + padY) + border}px`;
  }, [promptText]);

  const preview = () => {
    if (!promptText.trim()) return;
    const parsed = parseSpecFromPrompt(promptText);
    setSpec((prev) => ({
      ...prev,
      metalType: (parsed.metalType as MetalType) || prev.metalType,
      gemShape: (parsed.gemShape as GemCut) || prev.gemShape,
      gemSize: parsed.gemSize ?? prev.gemSize,
      ringSize: parsed.ringSize ?? prev.ringSize,
      bandWidth: parsed.bandWidth ?? prev.bandWidth,
      prongCount: parsed.prongCount ?? prev.prongCount,
    }));
  };

  const openStudio = () =>
    navigate("/chat", { state: { initialPrompt: promptText, initialSpec: spec } });

  const hallmark = METAL_SWATCHES.find((m) => m.id === spec.metalType)?.badge ?? METAL_LABELS[spec.metalType];

  return (
    <section className="page-glow relative w-full overflow-hidden bg-ink-950 text-white">
      <div className="shell relative flex min-h-[100svh] flex-col justify-between pb-10 pt-28 lg:pt-32">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col lg:col-span-7">
            <motion.h1 {...rise(0)} className="h-display max-w-[18ch]">
              Describe the ring. Get a file your caster can use.
            </motion.h1>

            <motion.p {...rise(0.05)} className="lede mt-5 max-w-xl">
              Write what you want in plain words. Adjust it in 3D. Export STEP or STL,
              checked against casting limits for the alloy you chose.
            </motion.p>

            <motion.div
              {...rise(0.1)}
              className="mt-8 rounded-2xl border border-white/12 bg-black/45 p-4 sm:p-5"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  preview();
                }}
                className="flex flex-col gap-2 sm:flex-row sm:items-start"
              >
                <label htmlFor="hero-prompt" className="sr-only">
                  Describe your ring
                </label>
                <textarea
                  id="hero-prompt"
                  ref={promptRef}
                  rows={1}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      preview();
                    }
                  }}
                  placeholder="For example: 18k yellow gold solitaire, 2 ct oval, size 6"
                  className="glassy-input min-h-11 flex-1 resize-none !leading-snug"
                />
                <button type="submit" className="btn-primary w-full shrink-0 sm:w-auto">
                  Preview
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={promptText === p.prompt}
                    onClick={() => {
                      setPromptText(p.prompt);
                      setSpec(p.spec);
                    }}
                    className={chip(promptText === p.prompt)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 border-t border-white/10 pt-3">
                <div role="tablist" aria-label="Adjust the ring" className="flex gap-5 text-sm">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={
                        "tap border-b-2 pb-1 transition-colors " +
                        (tab === t.id
                          ? "border-metal-400 font-medium text-white"
                          : "border-transparent text-white/70 hover:text-white")
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === "metal" && (
                  <div
                    role="tabpanel"
                    className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0"
                  >
                    {METAL_SWATCHES.map((m) => {
                      const on = spec.metalType === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={on}
                          aria-label={`${METAL_LABELS[m.id]}, ${METAL_DENSITY[m.id].toFixed(2)} grams per cubic centimetre`}
                          onClick={() => setSpec((prev) => ({ ...prev, metalType: m.id }))}
                          className={
                            "flex w-[38%] min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl border p-2 text-left transition-colors sm:w-auto " +
                            (on
                              ? "border-metal-400 bg-white/15"
                              : "border-white/12 bg-white/[0.04] hover:border-white/25")
                          }
                        >
                          <span className={`h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr ${m.gradient}`} />
                          <span className="min-w-0">
                            <span className="block truncate text-[0.8rem] font-semibold text-white">{m.badge}</span>
                            <span className="measure block truncate text-[0.7rem] text-white/70">
                              {METAL_DENSITY[m.id].toFixed(2)} g/cm³
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {tab === "stone" && (
                  <div role="tabpanel" className="mt-3 space-y-3">
                    <Row label="Cut">
                      {CUTS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={spec.gemShape === c.id}
                          onClick={() =>
                            setSpec((prev) => ({
                              ...prev,
                              gemShape: c.id,
                              prongCount: c.id === "emerald" || c.id === "princess" ? 4 : prev.prongCount,
                            }))
                          }
                          className={chip(spec.gemShape === c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </Row>
                    <Row label="Carat">
                      {CARATS.map((ct) => (
                        <button
                          key={ct}
                          type="button"
                          aria-pressed={spec.gemSize === ct}
                          onClick={() => setSpec((prev) => ({ ...prev, gemSize: ct }))}
                          className={chip(spec.gemSize === ct)}
                        >
                          {ct.toFixed(1)} ct
                        </button>
                      ))}
                    </Row>
                    <Row label="Prongs">
                      {[4, 6].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={spec.prongCount === n}
                          onClick={() => setSpec((prev) => ({ ...prev, prongCount: n }))}
                          className={chip(spec.prongCount === n)}
                        >
                          {n} prongs
                        </button>
                      ))}
                    </Row>
                    <Row label="Size">
                      {SIZES.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          aria-pressed={spec.ringSize === sz}
                          onClick={() => setSpec((prev) => ({ ...prev, ringSize: sz }))}
                          className={chip(spec.ringSize === sz)}
                        >
                          US {sz}
                        </button>
                      ))}
                    </Row>
                  </div>
                )}

                {tab === "view" && (
                  <div role="tabpanel" className="mt-3 flex flex-wrap gap-2">
                    {VIEWS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={spec.displayMode === v.id}
                        onClick={() => setSpec((prev) => ({ ...prev, displayMode: v.id }))}
                        className={chip(spec.displayMode === v.id)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4">
                <button type="button" onClick={openStudio} className="btn-primary group">
                  Open the Studio
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
                <a href="#contact" className="btn-secondary">
                  Book a demo
                </a>
              </div>
            </motion.div>
          </div>

          <motion.div
            {...rise(0.15)}
            className="relative h-[340px] w-full sm:h-[440px] lg:col-span-5 lg:h-[540px]"
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.04] to-transparent p-1">
              <HeroRevolutionVisual
                spec={spec}
                onMetricsChange={setMetrics}
                className="h-full w-full cursor-grab active:cursor-grabbing"
              />
              <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/65 px-2.5 py-1 text-xs text-white/85">
                Drag to turn
              </div>
            </div>
          </motion.div>
        </div>

        {/* A torus estimate for the preview, not the Studio's measured solid, hence "approx." */}
        <motion.div
          {...rise(0.2)}
          className="mt-8 grid grid-cols-2 overflow-hidden rounded-xl border border-white/12 bg-black/45 sm:grid-cols-4"
        >
          <Stat label="Approx. metal volume" value={`${metrics.volumeCm3.toFixed(2)} cm³`} />
          <Stat label={`Approx. weight (${hallmark})`} value={`${metrics.weightGrams.toFixed(2)} g`} />
          <Stat label="Centre stone" value={`${metrics.carat.toFixed(2)} ct · ${metrics.diameterMm.toFixed(1)} mm`} />
          <div className="border-t border-white/10 p-3 sm:border-t-0 sm:px-4 sm:py-3.5">
            <div className="label">Casting check</div>
            <div className="mt-1 text-sm text-white/85">Checked on export in the Studio</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 p-3 odd:border-r sm:border-r sm:px-4 sm:py-3.5 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0">
      <div className="label">{label}</div>
      <div className="measure mt-1 text-sm font-semibold text-white sm:text-base">{value}</div>
    </div>
  );
}

export default HeroRevolution;
