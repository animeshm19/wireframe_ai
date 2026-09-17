import type { GemCut, SettingStyle, BandProfile } from "./cad-engine";

/**
 * The canonical ring specification, shared by the AI extraction schema, the
 * CAD engine, Studio and the chat card.
 */
export type RingSpec = {
  ringSize: number;          // US
  bandWidth: number;         // mm
  bandProfile: BandProfile;
  gemShape: GemCut;
  gemSize: number;           // carats
  prongCount: number;
  setting: SettingStyle;
  metalType: MetalType;
};

export type MetalType = "18k_gold" | "14k_rose" | "white_gold" | "platinum" | "silver";

export const DEFAULT_SPEC: RingSpec = {
  ringSize: 6.0,
  bandWidth: 2.5,
  bandProfile: "comfort",
  gemShape: "round",
  gemSize: 1.0,
  prongCount: 6,
  setting: "prong",
  metalType: "platinum",
};

export const GEM_CUTS: GemCut[] =
  ["round", "princess", "oval", "emerald", "cushion", "marquise", "pear"];
export const SETTINGS: SettingStyle[] = ["prong", "bezel", "halo", "cathedral"];
export const BAND_PROFILES: BandProfile[] = ["comfort", "flat", "round", "knife"];
export const METALS: MetalType[] =
  ["platinum", "18k_gold", "white_gold", "14k_rose", "silver"];

export const METAL_LABELS: Record<string, string> = {
  "18k_gold": "18k Yellow Gold",
  "14k_rose": "14k Rose Gold",
  white_gold: "18k White Gold",
  platinum: "Platinum",
  silver: "Sterling Silver",
};

/** Physical appearance per metal, used by the renderers. */
export const METAL_APPEARANCE: Record<MetalType, { color: string; roughness: number }> = {
  platinum:   { color: "#e5e4e2", roughness: 0.16 },
  white_gold: { color: "#f0eee9", roughness: 0.13 },
  "18k_gold": { color: "#e6b455", roughness: 0.15 },
  "14k_rose": { color: "#e0a191", roughness: 0.17 },
  silver:     { color: "#cfd2d4", roughness: 0.20 },
};

/** Density in g/cm3 — used for weight and cost estimates. */
export const METAL_DENSITY: Record<MetalType, number> = {
  platinum: 21.45,
  white_gold: 15.2,
  "18k_gold": 15.6,
  "14k_rose": 13.0,
  silver: 10.49,
};

export function withDefaults(spec?: Partial<RingSpec> | null): RingSpec {
  return { ...DEFAULT_SPEC, ...(spec || {}) };
}

/**
 * Best-effort extraction of ring parameters straight from prompt text.
 *
 * This is NOT a replacement for model-based extraction — it only catches
 * explicit, unambiguous statements. It keeps the product responsive while AI
 * extraction is unavailable, and remains the fallback when extraction fails.
 */
export function parseSpecFromPrompt(prompt?: string | null): Partial<RingSpec> {
  if (!prompt) return {};
  const t = prompt.toLowerCase();
  const out: Partial<RingSpec> = {};

  const size = t.match(/(?:\bsize\b|\bus\b)\s*#?\s*(\d{1,2}(?:\.\d)?)/);
  if (size) {
    const n = parseFloat(size[1]);
    if (n >= 3 && n <= 16) out.ringSize = n;
  }

  const carat = t.match(/(\d+(?:\.\d+)?)\s*(?:carat|carats|ct\b)/);
  if (carat) {
    const n = parseFloat(carat[1]);
    if (n > 0 && n <= 15) out.gemSize = n;
  }

  const width = t.match(/(\d+(?:\.\d+)?)\s*mm/);
  if (width) {
    const n = parseFloat(width[1]);
    if (n >= 1.2 && n <= 8) out.bandWidth = n;
  }

  // Metals. Order matters: rose and white qualify gold.
  if (/rose\s*gold|14k\s*rose|pink\s*gold/.test(t)) out.metalType = "14k_rose";
  else if (/white\s*gold/.test(t)) out.metalType = "white_gold";
  else if (/platinum|\bplat\b/.test(t)) out.metalType = "platinum";
  else if (/silver|sterling/.test(t)) out.metalType = "silver";
  else if (/gold/.test(t)) out.metalType = "18k_gold";

  // Cuts.
  if (/princess|square\s*cut/.test(t)) out.gemShape = "princess";
  else if (/emerald\s*cut|step\s*cut|baguette/.test(t)) out.gemShape = "emerald";
  else if (/cushion/.test(t)) out.gemShape = "cushion";
  else if (/marquise|navette/.test(t)) out.gemShape = "marquise";
  else if (/\bpear\b|teardrop|tear\s*drop/.test(t)) out.gemShape = "pear";
  else if (/\boval\b|elongated/.test(t)) out.gemShape = "oval";
  else if (/round|brilliant/.test(t)) out.gemShape = "round";

  // Settings.
  if (/\bhalo\b/.test(t)) out.setting = "halo";
  else if (/bezel|rub[- ]?over/.test(t)) out.setting = "bezel";
  else if (/cathedral/.test(t)) out.setting = "cathedral";
  else if (/prong|claw|solitaire/.test(t)) out.setting = "prong";

  // Band profile.
  if (/comfort/.test(t)) out.bandProfile = "comfort";
  else if (/knife[- ]?edge/.test(t)) out.bandProfile = "knife";
  else if (/\bflat\b/.test(t)) out.bandProfile = "flat";
  else if (/round\s*band|\bd[- ]?shape/.test(t)) out.bandProfile = "round";

  const prong = t.match(/(\d)\s*[- ]?(?:prong|claw)/);
  if (prong) {
    const n = parseInt(prong[1], 10);
    if (n >= 3 && n <= 8) out.prongCount = n;
  }

  return out;
}
