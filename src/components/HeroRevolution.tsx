import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Box,
  Layers,
  Scissors,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import {
  HeroRevolutionVisual,
  type HeroRevolutionSpec,
  type HeroMetrics,
} from "./HeroRevolutionVisual";
import {
  parseSpecFromPrompt,
  type MetalType,
} from "../lib/ring-spec";
import type { GemCut } from "../lib/cad-engine";

// Curated atelier starting points
const ATELIER_PRESETS = [
  {
    label: "Solitaire 950 Platinum",
    prompt: "Platinum solitaire, 1.5 ct round brilliant, size 6.5",
    spec: {
      metalType: "platinum" as MetalType,
      gemShape: "round" as GemCut,
      gemSize: 1.5,
      ringSize: 6.5,
      bandWidth: 2.4,
      prongCount: 6,
      displayMode: "solid" as const,
    },
  },
  {
    label: "18k Yellow Gold Oval",
    prompt: "18k yellow gold solitaire with 2.0ct oval diamond, size 6",
    spec: {
      metalType: "18k_gold" as MetalType,
      gemShape: "oval" as GemCut,
      gemSize: 2.0,
      ringSize: 6.0,
      bandWidth: 2.2,
      prongCount: 6,
      displayMode: "solid" as const,
    },
  },
  {
    label: "Rose Gold Marquise",
    prompt: "14k rose gold knife edge ring, 1.5ct marquise diamond, size 6.5",
    spec: {
      metalType: "14k_rose" as MetalType,
      gemShape: "marquise" as GemCut,
      gemSize: 1.5,
      ringSize: 6.5,
      bandWidth: 2.6,
      prongCount: 6,
      displayMode: "solid" as const,
    },
  },
  {
    label: "18k White Gold Emerald Cut",
    prompt: "18k white gold 1.8ct emerald cut diamond, size 7",
    spec: {
      metalType: "white_gold" as MetalType,
      gemShape: "emerald" as GemCut,
      gemSize: 1.8,
      ringSize: 7.0,
      bandWidth: 2.5,
      prongCount: 4,
      displayMode: "solid" as const,
    },
  },
  {
    label: "Platinum Princess Cut",
    prompt: "Platinum solitaire, 2.0 ct princess cut diamond, size 6.5",
    spec: {
      metalType: "platinum" as MetalType,
      gemShape: "princess" as GemCut,
      gemSize: 2.0,
      ringSize: 6.5,
      bandWidth: 2.5,
      prongCount: 4,
      displayMode: "solid" as const,
    },
  },
];

// Metal alloy swatch definitions
const METAL_SWATCHES: Array<{
  id: MetalType;
  label: string;
  badge: string;
  gradient: string;
  density: string;
}> = [
  {
    id: "platinum",
    label: "950 Platinum",
    badge: "950 Pt",
    gradient: "from-[#eae6df] via-[#d6d2ca] to-[#a8a49c]",
    density: "21.45 g/cm³",
  },
  {
    id: "18k_gold",
    label: "18k Yellow Gold",
    badge: "750 Au",
    gradient: "from-[#fff0cd] via-[#fde2aa] to-[#d4aa5c]",
    density: "15.6 g/cm³",
  },
  {
    id: "14k_rose",
    label: "14k Rose Gold",
    badge: "585 Au",
    gradient: "from-[#feddce] via-[#facebf] to-[#c98e7b]",
    density: "13.0 g/cm³",
  },
  {
    id: "white_gold",
    label: "18k White Gold",
    badge: "Rhodium",
    gradient: "from-[#ffffff] via-[#e2e0de] to-[#b3b1af]",
    density: "15.2 g/cm³",
  },
  {
    id: "silver",
    label: "Sterling Silver",
    badge: "925 Ag",
    gradient: "from-[#ffffff] via-[#fbfaf5] to-[#c7c6c0]",
    density: "10.49 g/cm³",
  },
];

const GEM_CUT_OPTIONS: Array<{ id: GemCut; label: string }> = [
  { id: "round", label: "Round Brilliant" },
  { id: "oval", label: "Oval" },
  { id: "emerald", label: "Emerald Cut" },
  { id: "marquise", label: "Marquise" },
  { id: "cushion", label: "Cushion" },
  { id: "princess", label: "Princess Cut" },
];

const CARAT_OPTIONS = [1.0, 1.5, 2.0, 2.5];
const RING_SIZE_OPTIONS = [5.0, 6.0, 6.5, 7.0, 8.0];

export function HeroRevolution() {
  const navigate = useNavigate();

  const [promptText, setPromptText] = useState(ATELIER_PRESETS[0].prompt);
  const [spec, setSpec] = useState<HeroRevolutionSpec>(ATELIER_PRESETS[0].spec);
  const [metrics, setMetrics] = useState<HeroMetrics>({
    volumeCm3: 0.31,
    weightGrams: 6.65,
    carat: 1.5,
    diameterMm: 7.4,
    isWatertight: true,
  });

  const [activeTab, setActiveTab] = useState<"alloy" | "stone" | "view">("alloy");

  const handlePresetSelect = (preset: typeof ATELIER_PRESETS[number]) => {
    setPromptText(preset.prompt);
    setSpec(preset.spec);
  };

  const handlePromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const openInStudio = () => {
    navigate("/chat", {
      state: {
        initialPrompt: promptText,
        initialSpec: spec,
      },
    });
  };

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-ink-950 text-white">
      {/* Background ambient lighting and precision grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(110% 75% at 50% -10%, rgba(212,170,92,0.12), transparent 60%)," +
            "radial-gradient(90% 60% at 75% 105%, rgba(198,155,178,0.10), transparent 65%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] opacity-[0.20] z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(480px) rotateX(64deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, #000 0%, transparent 80%)",
          WebkitMaskImage: "linear-gradient(to top, #000 0%, transparent 80%)",
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-between px-4 pb-8 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        {/* Top Header / Headline */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Left Column: Headline & Atelier Console */}
          <div className="flex flex-col lg:col-span-7">
            {/* Live Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex w-fit items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="mono-label !text-[0.68rem] !tracking-[0.18em] !text-white/90">
                Interactive Atelier Bench · Live B-Rep Solid
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Design fine jewelry with{" "}
              <span className="bg-gradient-to-r from-white via-white/95 to-metal-300 bg-clip-text text-transparent">
                mathematical precision.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2 }}
              className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base"
            >
              Type your design intent, customize every facet live in 3D, and
              export exact, watertight STEP and STL files calibrated for
              investment casting.
            </motion.p>

            {/* Atelier Bench Console Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-6 rounded-2xl border border-white/12 bg-black/50 p-4 backdrop-blur-xl shadow-2xl sm:p-5"
            >
              {/* Natural Language Prompt Input Bar */}
              <form onSubmit={handlePromptSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Describe your piece (e.g. 18k yellow gold solitaire, 2ct oval, size 6)..."
                  className="w-full rounded-xl border border-white/15 bg-white/[0.07] py-2.5 pl-3.5 pr-24 text-xs text-white placeholder-white/60 transition-all focus:border-metal-400 focus:bg-white/[0.10] focus:outline-none sm:text-sm"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ink-950 transition-transform active:scale-95 hover:bg-metal-200"
                >
                  <span>Resolve</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* Quick Preset Chips */}
              <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                {ATELIER_PRESETS.map((p) => {
                  const isActive = promptText === p.prompt;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={`rounded-full px-2.5 py-1 text-[0.72rem] transition-colors sm:text-xs ${
                        isActive
                          ? "border border-metal-400 bg-white/20 text-white font-medium shadow-sm"
                          : "border border-white/12 bg-white/[0.04] text-white/80 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Secondary Customization Tabs */}
              <div className="mt-4 border-t border-white/10 pt-3">
                <div className="flex items-center gap-4 text-xs font-medium text-white/75">
                  <button
                    type="button"
                    onClick={() => setActiveTab("alloy")}
                    className={`pb-1 transition-colors ${
                      activeTab === "alloy"
                        ? "border-b-2 border-metal-400 text-white font-semibold"
                        : "hover:text-white"
                    }`}
                  >
                    Precious Alloy
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("stone")}
                    className={`pb-1 transition-colors ${
                      activeTab === "stone"
                        ? "border-b-2 border-metal-400 text-white font-semibold"
                        : "hover:text-white"
                    }`}
                  >
                    Stone, Prongs & Size
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("view")}
                    className={`pb-1 transition-colors ${
                      activeTab === "view"
                        ? "border-b-2 border-metal-400 text-white font-semibold"
                        : "hover:text-white"
                    }`}
                  >
                    CAD Viewport
                  </button>
                </div>

                {/* Tab 1: Metal Alloy Swatches */}
                {activeTab === "alloy" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
                  >
                    {METAL_SWATCHES.map((m) => {
                      const isSelected = spec.metalType === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setSpec((prev) => ({ ...prev, metalType: m.id }))
                          }
                          className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                            isSelected
                              ? "border-metal-400 bg-white/20 shadow-sm"
                              : "border-white/12 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr shadow-inner ${m.gradient}`}
                          />
                          <div className="overflow-hidden">
                            <div className="truncate text-[0.74rem] font-semibold text-white">
                              {m.badge}
                            </div>
                            <div className="truncate text-[0.64rem] text-white/75">
                              {m.density}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {/* Tab 2: Stone Cut, Prongs & Carat Selector */}
                {activeTab === "stone" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex flex-col gap-2.5"
                  >
                    {/* Cut buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.75rem] font-medium text-white/80 mr-1">Cut:</span>
                      {GEM_CUT_OPTIONS.map((cut) => {
                        const isCutActive = spec.gemShape === cut.id;
                        return (
                          <button
                            key={cut.id}
                            type="button"
                            onClick={() =>
                              setSpec((prev) => ({
                                ...prev,
                                gemShape: cut.id,
                                prongCount:
                                  cut.id === "emerald" || cut.id === "princess"
                                    ? 4
                                    : prev.prongCount,
                              }))
                            }
                            className={`rounded-lg px-2.5 py-1 text-[0.72rem] transition-colors ${
                              isCutActive
                                ? "bg-white text-ink-950 font-semibold shadow"
                                : "bg-white/[0.08] text-white/80 hover:bg-white/15 hover:text-white"
                            }`}
                          >
                            {cut.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Carat, Prongs, Finger Size Controls */}
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.75rem] font-medium text-white/80">Carat:</span>
                        {CARAT_OPTIONS.map((ct) => (
                          <button
                            key={ct}
                            type="button"
                            onClick={() =>
                              setSpec((prev) => ({ ...prev, gemSize: ct }))
                            }
                            className={`rounded-md px-2 py-0.5 text-[0.72rem] ${
                              spec.gemSize === ct
                                ? "border border-metal-400 bg-white/20 text-white font-semibold"
                                : "border border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            {ct.toFixed(1)} ct
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.75rem] font-medium text-white/80">Prongs:</span>
                        {[4, 6].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() =>
                              setSpec((prev) => ({ ...prev, prongCount: cnt }))
                            }
                            className={`rounded-md px-2 py-0.5 text-[0.72rem] ${
                              spec.prongCount === cnt
                                ? "border border-metal-400 bg-white/20 text-white font-semibold"
                                : "border border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            {cnt} Claws
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.75rem] font-medium text-white/80">Finger:</span>
                        {RING_SIZE_OPTIONS.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() =>
                              setSpec((prev) => ({ ...prev, ringSize: sz }))
                            }
                            className={`rounded-md px-1.5 py-0.5 text-[0.72rem] ${
                              spec.ringSize === sz
                                ? "border border-metal-400 bg-white/20 text-white font-semibold"
                                : "border border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            US {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Tab 3: Display Mode */}
                {activeTab === "view" && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2"
                  >
                    {[
                      { id: "solid" as const, label: "Solid PBR", icon: Box },
                      { id: "wireframe" as const, label: "CAD Wireframe", icon: Layers },
                      { id: "section" as const, label: "Cross-Section", icon: Scissors },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const isActive = spec.displayMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            setSpec((prev) => ({
                              ...prev,
                              displayMode: mode.id,
                            }))
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                            isActive
                              ? "bg-white text-ink-950 font-semibold"
                              : "border border-white/12 bg-white/[0.06] text-white/80 hover:text-white"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              {/* Call to Action Row */}
              <div className="mt-5 flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={openInStudio}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-ink-950 transition-colors duration-300 hover:bg-metal-200 sm:text-sm"
                >
                  <span>Open in Full Studio</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/85 transition-colors hover:border-white/30 hover:text-white sm:text-sm"
                >
                  Book an Atelier Demo
                </a>
              </div>
            </motion.div>
          </div>

          {/* Right Column: 3D Viewport Stage */}
          <div className="relative flex h-[380px] w-full flex-col justify-center sm:h-[460px] lg:col-span-5 lg:h-[540px]">
            {/* 3D Visual Canvas */}
            <div className="relative h-full w-full rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.04] to-transparent p-1 shadow-2xl overflow-hidden backdrop-blur-sm">
              <HeroRevolutionVisual
                spec={spec}
                onMetricsChange={setMetrics}
                className="h-full w-full cursor-grab active:cursor-grabbing"
              />

              {/* Top overlay badge on viewport */}
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/70 px-2.5 py-1 text-[0.68rem] text-white/90 backdrop-blur-md">
                <RotateCw className="h-3 w-3 animate-spin text-metal-300" style={{ animationDuration: "12s" }} />
                <span>360° Interactive Canvas · Drag to Orbit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip: Live Mathematical Engineering Readouts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 grid grid-cols-2 gap-2 overflow-hidden rounded-xl border border-white/12 bg-black/50 backdrop-blur-xl sm:grid-cols-4"
        >
          <div className="p-3 sm:px-4 sm:py-3.5 border-r border-white/10">
            <div className="mono-label !text-[0.62rem] !tracking-[0.16em] !text-white/75">
              Metal Volume
            </div>
            <div className="mt-1 text-sm font-semibold text-white sm:text-base">
              {metrics.volumeCm3.toFixed(2)} cm³
            </div>
          </div>

          <div className="p-3 sm:px-4 sm:py-3.5 border-r border-white/10">
            <div className="mono-label !text-[0.62rem] !tracking-[0.16em] !text-white/75">
              Est. Weight ({spec.metalType === "platinum" ? "950 Pt" : spec.metalType === "18k_gold" ? "18k Au" : spec.metalType === "14k_rose" ? "14k Rose" : spec.metalType === "white_gold" ? "18k White" : "Silver"})
            </div>
            <div className="mt-1 text-sm font-semibold text-white sm:text-base">
              {metrics.weightGrams.toFixed(2)} g
            </div>
          </div>

          <div className="p-3 sm:px-4 sm:py-3.5 border-r border-white/10">
            <div className="mono-label !text-[0.62rem] !tracking-[0.16em] !text-white/75">
              Centre Stone
            </div>
            <div className="mt-1 text-sm font-semibold text-white sm:text-base">
              {metrics.carat.toFixed(2)} ct · {metrics.diameterMm.toFixed(1)} mm
            </div>
          </div>

          <div className="p-3 sm:px-4 sm:py-3.5">
            <div className="mono-label !text-[0.62rem] !tracking-[0.16em] !text-white/75">
              Solid Topology
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 sm:text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>100% Watertight B-Rep</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroRevolution;
