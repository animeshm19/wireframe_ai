import type { GemCut, SettingStyle, BandProfile } from "./cad-engine";
import type { Finish } from "./finishes";
import type { BenchOverrides } from "./setting-standards";
export { FINISHES, FINISH_LABELS } from "./finishes";
export type { Finish } from "./finishes";

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
  finish: Finish;
  /** Accent stones set into the shank itself, separate from the head. */
  shankStones: ShankStones;
  /** The shape the shank sweeps as it goes round the finger. */
  shankStyle: ShankStyle;
  /**
   * Local edits to stretches of the shank, addressed by angle.
   *
   * Angles, never geometry. A region picked with the lasso has to survive the
   * ring being rebuilt — which happens on every parameter change — and face or
   * triangle indices do not survive that. They are different objects with
   * different numbers afterwards, and an edit stored against one silently
   * reattaches itself somewhere else.
   */
  regions: RegionOverride[];
  /**
   * A setter's or caster's own figures for this design: seat depth, gap under
   * the culet, prong height as cast and the rest of BENCH_FIELDS in
   * setting-standards.ts. Absent means every default. Optional and never
   * filled in by withDefaults, so a saved design records only what someone
   * actually chose.
   *
   * Deliberately NOT in the AI extraction schema or parseSpecFromPrompt. These
   * are workshop numbers with safety bounds, and a model guessing "deeper
   * seats" from a sentence is how a ring gets a seat cut through its prong.
   */
  bench?: BenchOverrides;
};

export type RegionOverride = {
  /** Radians from +X, head at +Y. start > end means the region wraps the seam. */
  start: number;
  end: number;
  widthScale?: number;
  thicknessScale?: number;
  profile?: BandProfile;
  blend?: number;
};

export type ShankStyle = "plain" | "tapered" | "split" | "twisted";

export const SHANK_STYLES: ShankStyle[] = ["plain", "tapered", "split", "twisted"];

export const SHANK_STYLE_LABELS: Record<string, string> = {
  plain: "Straight",
  tapered: "Tapered",
  split: "Split shank",
  twisted: "Twisted",
};

export type ShankStones = "none" | "pave" | "half_eternity" | "eternity";

export const SHANK_STONES: ShankStones[] =
  ["none", "pave", "half_eternity", "eternity"];

export const SHANK_STONE_LABELS: Record<string, string> = {
  none: "Plain shank",
  pave: "Pavé shoulders",
  half_eternity: "Half eternity",
  eternity: "Full eternity",
};

export type MetalType = "18k_gold" | "14k_rose" | "white_gold" | "platinum" | "silver";

// Dev harness: lets a render be requested by URL, so metals and finishes can
// be compared without clicking through a native select for each one. It is not
// gated behind import.meta.env.DEV because the harnesses are *built*
// (vite.harness.config.ts -> dist-harness/), where DEV is false and the gate
// would switch the whole matrix off.
//
// Two things it must therefore never do on a deployed page. It must not
// outrank a real spec - see withDefaults, which now spreads it beneath one
// rather than on top - and a junk value must not reach the kernel: `?carat=abc`
// used to put NaN into gemSize, which then poisoned every spec derived from
// DEFAULT_SPEC for the life of the page.
const _q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;
const _override: Partial<RingSpec> = {};
const _num = (key: string): number | null => {
  const raw = _q?.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};
if (_q?.get("metal")) _override.metalType = _q.get("metal") as MetalType;
if (_q?.get("finish")) _override.finish = _q.get("finish") as Finish;
if (_q?.get("shank")) _override.shankStones = _q.get("shank") as ShankStones;
if (_q?.get("style")) _override.shankStyle = _q.get("style") as ShankStyle;
if (_q?.get("setting")) _override.setting = _q.get("setting") as SettingStyle;
if (_q?.get("cut")) _override.gemShape = _q.get("cut") as GemCut;
if (_q?.get("profile")) _override.bandProfile = _q.get("profile") as BandProfile;
// `?bench=bearingDepth:45,culetClearance:0.6`. Pairs whose value is not a
// finite number are dropped here, like `?carat=abc` above; unknown keys and
// out-of-bounds values are left to resolveBench, which ignores the first and
// clamps the second. Parsed locally rather than with parseBenchParam because
// setting-standards imports MANUFACTURING_LIMITS from this module, and calling
// back into it while this one is still loading depends on import order.
{
  const raw = _q?.get("bench");
  if (raw) {
    const bench: Record<string, number> = {};
    for (const pair of raw.split(",")) {
      const parts = pair.split(":").map((x) => x.trim());
      if (parts.length !== 2) continue;
      const [k, v] = parts;
      const n = v ? Number(v) : NaN;
      if (k && /^[A-Za-z]+$/.test(k) && Number.isFinite(n)) bench[k] = n;
    }
    if (Object.keys(bench).length) _override.bench = bench as BenchOverrides;
  }
}
{
  const carat = _num("carat");
  if (carat !== null) _override.gemSize = carat;
  const width = _num("width");
  if (width !== null) _override.bandWidth = width;
  // `?prongs=4`: a whole number of prongs the engine builds (3 to 8), or
  // nothing. A fraction or an out-of-range count would be rounded or clamped
  // somewhere downstream and the page would show a ring nobody asked for.
  const prongs = _num("prongs");
  if (prongs !== null && Number.isInteger(prongs) && prongs >= 3 && prongs <= 8) _override.prongCount = prongs;
}

const _BASE_SPEC: RingSpec = {
  ringSize: 6.0,
  bandWidth: 2.5,
  bandProfile: "comfort",
  gemShape: "round",
  gemSize: 1.0,
  prongCount: 6,
  setting: "prong",
  metalType: "platinum",
  finish: "polished",
  shankStones: "none",
  shankStyle: "plain",
  regions: [],
};

export const DEFAULT_SPEC: RingSpec = { ..._BASE_SPEC, ..._override };

export const GEM_CUTS: GemCut[] =
  ["round", "princess", "oval", "emerald", "cushion", "marquise", "pear"];
export const SETTINGS: SettingStyle[] =
  ["prong", "bezel", "halo", "cathedral", "three_stone"];

export const SETTING_LABELS: Record<string, string> = {
  prong: "Prong",
  bezel: "Bezel",
  halo: "Halo",
  cathedral: "Cathedral",
  three_stone: "Three stone",
};
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

/**
 * Physical appearance per metal, used by the renderers.
 *
 * For a metal in a physically based renderer, `color` is not a paint colour —
 * it is F0, the specular reflectance at normal incidence. The previous values
 * were picked by eye as if they were diffuse albedo, which is why gold read as
 * mustard plastic: real gold reflects about 99% of red and 78% of green, so its
 * F0 is a pale warm white, and the saturated gold you recognise comes from that
 * tint compounding through repeated reflections off the piece's own curves.
 *
 * The white metals are their measured elemental F0 — platinum (0.679, 0.642,
 * 0.588), rhodium (0.760, 0.747, 0.735), silver (0.972, 0.960, 0.915). White
 * gold is quoted as rhodium because every white gold ring sold is rhodium
 * plated: what you are actually looking at is the plating, not the alloy.
 *
 * The golds are measured alloy values, NOT a weighted average of gold and
 * copper. Averaging the constituents' F0 by mass fraction is tempting and
 * wrong — an alloy has its own electronic band structure, not a blend of its
 * ingredients' — and it predicts a rose gold only 8% lower in green than
 * yellow, which renders as the same metal twice. Measured rose is far lower in
 * green and higher in blue, and that is the pink everyone recognises.
 *
 * Roughness is the polish each metal will actually hold. Rhodium takes the
 * highest polish of the group; platinum is softer and burnishes rather than
 * mirrors; sterling is softer still.
 */
export const METAL_APPEARANCE: Record<MetalType, { color: string; roughness: number }> = {
  platinum:   { color: "#d6d2ca", roughness: 0.13 },  // 950 Pt/Ru
  white_gold: { color: "#e2e0de", roughness: 0.09 },  // rhodium plated
  "18k_gold": { color: "#fde2aa", roughness: 0.11 },  // F0 (0.98, 0.76, 0.40)
  "14k_rose": { color: "#facebf", roughness: 0.12 },  // F0 (0.955, 0.62, 0.52)
  silver:     { color: "#fbfaf5", roughness: 0.14 },  // fine silver F0
};

/**
 * Minimum safe dimensions for casting and daily wear, in millimetres.
 *
 * Sources are standard trade practice: casting houses generally refuse walls
 * below ~0.8mm in gold and ~0.7mm in platinum, and prongs below ~0.8mm diameter
 * bend or snap in wear. Silver is softer and needs more material.
 *
 * These live here rather than in the geometry engine so that anything which
 * needs to quote them — the manufacturability check, the Studio, the landing
 * page — reads the same table without importing the CAD kernel to get at it.
 */
export const MANUFACTURING_LIMITS: Record<MetalType, {
  minWall: number; minProngDia: number; minBandThickness: number; label: string;
}> = {
  platinum:   { minWall: 0.70, minProngDia: 0.80, minBandThickness: 1.00, label: "Platinum" },
  white_gold: { minWall: 0.80, minProngDia: 0.85, minBandThickness: 1.10, label: "18k White Gold" },
  "18k_gold": { minWall: 0.80, minProngDia: 0.85, minBandThickness: 1.10, label: "18k Yellow Gold" },
  "14k_rose": { minWall: 0.80, minProngDia: 0.85, minBandThickness: 1.10, label: "14k Rose Gold" },
  silver:     { minWall: 1.00, minProngDia: 1.00, minBandThickness: 1.30, label: "Sterling Silver" },
};

/** Density in g/cm3 — used for weight and cost estimates. */
export const METAL_DENSITY: Record<MetalType, number> = {
  platinum: 21.45,
  white_gold: 15.2,
  "18k_gold": 15.6,
  "14k_rose": 13.0,
  silver: 10.49,
};

/**
 * Fills a partial spec out to a whole one.
 *
 * The URL override reaches this through DEFAULT_SPEC, which means it still
 * decides any field the caller did not set - what the harness matrix needs -
 * but no longer overrides a field the caller did. It used to be spread last,
 * so `?carat=2` silently rewrote every extracted spec on a deployed page, the
 * value was persisted to localStorage, and it outlived the query string that
 * created it.
 */
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

  // Shank shape.
  if (/split[- ]?shank|split\s*band/.test(t)) out.shankStyle = "split";
  else if (/twist(ed)?|rope|braid/.test(t)) out.shankStyle = "twisted";
  else if (/taper(ed|ing)?|pinched|knife[- ]?edge\s*shank/.test(t)) out.shankStyle = "tapered";

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

  // Shank shape.
  if (/split[- ]?shank|split\s*band/.test(t)) out.shankStyle = "split";
  else if (/twist(ed)?|rope|braid/.test(t)) out.shankStyle = "twisted";
  else if (/taper(ed|ing)?|pinched|knife[- ]?edge\s*shank/.test(t)) out.shankStyle = "tapered";

  // Settings.
  if (/three[- ]?stone|trilogy|past\s*present\s*future/.test(t)) out.setting = "three_stone";

  // Shank stones. Checked before finishes because "pavé band" names the band.
  if (/full\s*eternity|eternity\s*band|all[- ]?round/.test(t)) out.shankStones = "eternity";
  else if (/half\s*eternity/.test(t)) out.shankStones = "half_eternity";
  else if (/pav[ée]|micro[- ]?pav|accent(ed)?\s*(band|shoulders?)|diamond\s*shoulders?/.test(t))
    out.shankStones = "pave";

  // Finishes.
  if (/hammer/.test(t)) out.finish = "hammered";
  else if (/florentine|cross[- ]?hatch|engraved\s*texture/.test(t)) out.finish = "florentine";
  else if (/satin|brushed|matte\s*brush/.test(t)) out.finish = "satin";
  else if (/matte|sandblast|frosted|stone\s*finish/.test(t)) out.finish = "matte";
  else if (/polish|mirror|high\s*shine|shiny/.test(t)) out.finish = "polished";

  const prong = t.match(/(\d)\s*[- ]?(?:prong|claw)/);
  if (prong) {
    const n = parseInt(prong[1], 10);
    if (n >= 3 && n <= 8) out.prongCount = n;
  }

  return out;
}
