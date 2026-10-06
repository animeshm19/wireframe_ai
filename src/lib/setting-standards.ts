import { MANUFACTURING_LIMITS, type MetalType } from "./ring-spec";

/**
 * Every number a stone setting is built to, in one place.
 *
 * Two kinds live here, and the difference between them is the point of the
 * file. FIXED_STANDARDS are rules and safety floors: a placement rule from the
 * trade literature, a check tolerance, a floor below which "the head is
 * attached" stops meaning anything. Nobody edits those. BENCH_FIELDS are the
 * dimensions the trade has no single answer for: how deep a setter cuts a
 * seat, how much room a caster wants under the culet, how tall a prong is cast
 * so there is metal to bend. Every bench has its own habit, so each one is a
 * default a user may override per design, inside hard bounds.
 *
 * Pure on purpose: no kernel, no replicad, no jscad. The engine, the
 * structure audit, the Studio panel and the marketing pages all read the same
 * table, and none of them should have to boot OCCT to find out what a seat
 * depth is.
 *
 * Alloy minimums (wall, prong diameter, band thickness) stay in
 * MANUFACTURING_LIMITS in ring-spec.ts. They are referenced here, never copied:
 * two tables of the same floor drift, and the first anyone hears of it is a
 * prong that passed one check and failed the other.
 */

// ------------------------------------------------------------ fixed rules --

export type FixedStandard = {
  value: number;
  unit: string;
  /** A sourced range the value was picked from, when there is one. */
  range?: readonly [number, number];
  source: string;
  /** Why a user may not change it. */
  why: string;
};

export const FIXED_STANDARDS = {
  /**
   * 0.5 of the girdle-to-culet height, measured up from the culet: the gallery
   * is centred halfway down the pavilion.
   * Source: Ganoksin, "CAD Modeling Prong Settings",
   * https://www.ganoksin.com/article/cad-modeling-prong-settings/
   * Fixed because it is a placement rule, not a preference: off it, the
   * gallery either fouls the girdle or stops supporting the prongs where they
   * bend.
   */
  GALLERY_RULE_OF_THIRDS: {
    value: 0.5,
    unit: "fraction of girdle-to-culet height, from the culet",
    source: "https://www.ganoksin.com/article/cad-modeling-prong-settings/",
    why: "a placement rule from the trade literature, which no bench preference overrides",
  },
  /**
   * A set prong's highest point stays below the table plane (value is the
   * required margin, 0 mm).
   * Source: Ganoksin claw-prong thread,
   * https://orchid.ganoksin.com/t/recommendation-cad-manufacturing-guidelines-for-claw-prongs/57880
   * Fixed for wearability: a tip standing above the table snags on clothing
   * and is the first thing to be knocked open.
   */
  AS_SET_TIP_BELOW_TABLE: {
    value: 0,
    unit: "mm below the table plane, at least",
    source: "https://orchid.ganoksin.com/t/recommendation-cad-manufacturing-guidelines-for-claw-prongs/57880",
    why: "wearability: a tip above the table snags",
  },
  /**
   * 0.05 mm. How close a set prong must come to the crown to count as touching.
   * UNSOURCED: this is the tolerance of a check, not a shape on the ring.
   */
  AS_SET_CONTACT_TOL_MM: {
    value: 0.05,
    unit: "mm",
    source: "UNSOURCED, a check tolerance",
    why: "it is the tolerance of a check and draws nothing on the ring",
  },
  /**
   * 1.0. The metal section just above the band, inside the head's footprint,
   * must be at least this many times the summed prong sections.
   * UNSOURCED: a provisional engineering floor.
   * Fixed because it is the floor under "the head is attached"; a user must
   * not be able to switch that off.
   */
  JOINT_AREA_RATIO: {
    value: 1.0,
    unit: "× summed prong cross-section",
    source: "UNSOURCED, a provisional engineering floor",
    why: "safety floor for a check; a user must not be able to switch off \"the head is attached\"",
  },
  /**
   * 0.40 mm (published 0.30 to 0.50) between gallery and a coloured stone.
   * Source: Ganoksin, "CAD Modeling Prong Settings",
   * https://www.ganoksin.com/article/cad-modeling-prong-settings/
   * Unused until coloured stones exist: every stone built today is a diamond,
   * whose figure is the bench field galleryClearance.
   */
  GALLERY_CLEARANCE_COLOURED_MM: {
    value: 0.40,
    unit: "mm",
    range: [0.30, 0.50],
    source: "https://www.ganoksin.com/article/cad-modeling-prong-settings/",
    why: "unused until coloured stones exist",
  },
} as const satisfies Record<string, FixedStandard>;

// ------------------------------------------------------------- prong size --

/**
 * Prong diameter, mm, for a stone of this girdle radius.
 *
 * Moved here unchanged from the two places that each carried a copy (the
 * B-rep head and the manufacturability check), so the prong the engine builds
 * and the prong the check judges can no longer disagree. It is a formula the
 * engine has always used, not a trade figure: one bench jeweller suggests
 * 1.2 mm or more for a 2 ct platinum ring, where this gives 0.93.
 * https://orchid.ganoksin.com/t/prong-diameter-guide/28578
 */
export function prongDiameterFor(girdleR: number): number {
  return (0.28 + 0.045 * girdleR) * 2;
}

// ---------------------------------------------------------- bench fields --

/** What a bench value can depend on. Bounds depend on the alloy alone. */
export type BenchCtx = { alloy: MetalType; girdleR: number; pavH: number };

export type BenchGroup = "Seat" | "Prongs" | "Gallery" | "Clearances" | "Finishing";
export type BenchUnit =
  | "mm" | "mm above table" | "% of prong" | "× prong diameter" | "fraction of crown height";
export type BenchStatus = "sourced default" | "sourced range, our point value" | "our default";
export type BenchStage = "S1" | "S2" | "S3" | "S4" | "S6";

/** A bound that is a plain number, or one read from the alloy's limits. */
type Bound = number | ((alloy: MetalType) => number);

export type BenchField = {
  key: string;
  label: string;
  /** Plain English for a jeweller: what it changes and the trade-off. */
  help: string;
  group: BenchGroup;
  unit: BenchUnit;
  /** A number, or "auto" computed from the stone and alloy by `auto`. */
  default: number | "auto";
  autoRule?: string;
  auto?: (ctx: BenchCtx) => number;
  /** Hard bounds. A value outside them never reaches the engine. */
  min: Bound;
  max: Bound;
  step: number;
  /** Inside the bounds but outside this is allowed, with a warning. */
  publishedRange?: readonly [number, number];
  source: string;
  status: BenchStatus;
  /** The prompt in the ring-structure series that makes the engine read it. */
  wiredIn: BenchStage;
  appliesTo: readonly ("prong" | "halo" | "cathedral" | "three_stone" | "bezel")[];
};

const PRONG_HEADS: BenchField["appliesTo"] = ["prong", "halo", "cathedral", "three_stone"];
const EVERY_HEAD: BenchField["appliesTo"] = ["prong", "halo", "cathedral", "three_stone", "bezel"];

// Ordered as the Studio panel lists them: by group, then by how often a
// setter reaches for each.
export const BENCH_FIELDS = [
  {
    key: "bearingDepth",
    label: "Seat depth in each prong",
    help: "How deep the notch is that the stone's girdle sits in, as a share of the prong's thickness. Deeper holds the stone more securely but leaves less metal behind the seat.",
    group: "Seat",
    unit: "% of prong",
    default: 40, min: 20, max: 50, step: 1,
    publishedRange: [30, 50],
    source: "https://www.stuller.com/benchjeweler/resources/bencharticles/view/step-by-step-stone-setting-gems-in-four-prong-mountings/ ; https://orchid.ganoksin.com/t/prong-setting-notches/45827",
    status: "sourced range, our point value",
    wiredIn: "S1",
    appliesTo: PRONG_HEADS,
  },
  {
    key: "seatTolerance",
    label: "Extra room around the stone in its seat",
    help: "A small allowance so a stone slightly larger than its nominal size still drops into the seat. More room makes setting easier; too much and the stone can rock before the prongs are closed.",
    group: "Seat",
    unit: "mm",
    default: 0.05, min: 0, max: 0.20, step: 0.01,
    source: "UNSOURCED, our default (stones vary about ±0.1 mm in diameter)",
    status: "our default",
    wiredIn: "S1",
    appliesTo: EVERY_HEAD,
  },
  {
    key: "culetClearance",
    label: "Gap under the stone's tip",
    help: "Clear space between the point at the bottom of the stone and any metal. A pointed culet chips easily, especially while it is being set, so it should never rest on metal. More gap makes the head taller.",
    group: "Clearances",
    unit: "mm",
    default: 0.30, min: 0.10, max: 1.50, step: 0.05,
    source: "UNSOURCED, our default (fact used: a pointed culet is fragile, especially during setting, https://www.jewelry-secrets.com/Blog/the-purpose-of-a-culet/)",
    status: "our default",
    wiredIn: "S1",
    appliesTo: EVERY_HEAD,
  },
  {
    key: "pavilionClearance",
    label: "Gap between prongs and the stone below the seat",
    help: "Room between each prong and the lower half of the stone, under the seat. It lets the stone drop in square and keeps metal off the facets; too much and the prongs stand away from the stone.",
    group: "Clearances",
    unit: "mm",
    default: 0.25, min: 0.10, max: 0.60, step: 0.05,
    source: "UNSOURCED, reuses the gallery figure",
    status: "our default",
    wiredIn: "S1",
    appliesTo: PRONG_HEADS,
  },
  {
    key: "prongDiameter",
    label: "Prong thickness",
    help: "How thick each prong is. Thicker prongs last longer and survive knocks and re-tipping; thinner ones show more of the stone.",
    group: "Prongs",
    unit: "mm",
    default: "auto",
    autoRule: "(0.28 + 0.045 × girdle radius) × 2, the engine's existing formula, held at the alloy's minimum",
    auto: (ctx: BenchCtx) => prongDiameterFor(ctx.girdleR),
    min: (alloy: MetalType) => MANUFACTURING_LIMITS[alloy].minProngDia,
    max: 2.0, step: 0.05,
    source: "existing engine formula; one bench jeweller suggests 1.2 mm or more for a 2 ct platinum ring where the formula gives 0.93 mm, https://orchid.ganoksin.com/t/prong-diameter-guide/28578",
    status: "our default",
    wiredIn: "S1",
    appliesTo: PRONG_HEADS,
  },
  {
    key: "asCastProngHeight",
    label: "Prong height above the stone when cast",
    help: "How far each prong stands above the table as it comes out of casting, before the setter bends it over. Taller gives the setter more metal to work with and more to trim off afterwards.",
    group: "Prongs",
    unit: "mm above table",
    default: 2.0, min: 0.75, max: 5.0, step: 0.25,
    publishedRange: [0.75, 5.0],
    source: "https://orchid.ganoksin.com/t/recommendation-cad-manufacturing-guidelines-for-claw-prongs/57880 (range 0.75 to 5.0 mm; one setter asks 3.5 to 4.5 mm)",
    status: "sourced range, our point value",
    wiredIn: "S1",
    appliesTo: PRONG_HEADS,
  },
  {
    key: "galleryClearance",
    label: "Gap between gallery and stone",
    help: "Space between the gallery wire and the stone it runs round. It lets light and cleaning reach the stone and keeps the wire off the facets; too much and the gallery no longer braces the prongs where they are needed.",
    group: "Gallery",
    unit: "mm",
    default: 0.25, min: 0.10, max: 0.60, step: 0.05,
    publishedRange: [0.20, 0.30],
    source: "https://www.ganoksin.com/article/cad-modeling-prong-settings/ (0.20 to 0.30 mm for diamonds)",
    status: "sourced range, our point value",
    wiredIn: "S2",
    appliesTo: PRONG_HEADS,
  },
  {
    key: "galleryThickness",
    label: "Gallery wire thickness",
    help: "How thick the gallery wire is. Thicker is stiffer and holds the prongs apart more firmly; thinner is lighter and lets more light into the stone.",
    group: "Gallery",
    unit: "mm",
    default: "auto",
    autoRule: "a third of the pavilion depth (rule of thirds), never below the alloy's minimum wall",
    auto: (ctx: BenchCtx) => Math.max(ctx.pavH / 3, MANUFACTURING_LIMITS[ctx.alloy].minWall),
    min: (alloy: MetalType) => MANUFACTURING_LIMITS[alloy].minWall,
    max: 2.0, step: 0.05,
    source: "https://www.ganoksin.com/article/cad-modeling-prong-settings/",
    status: "sourced default",
    wiredIn: "S2",
    appliesTo: PRONG_HEADS,
  },
  {
    key: "filletRadius",
    label: "Rounding where parts meet",
    help: "The radius of the rounded inside corner where a prong, gallery or head meets the metal it grows from. Larger is stronger and easier to polish; smaller keeps the lines crisp.",
    group: "Finishing",
    unit: "mm",
    default: 0.30, min: 0.10, max: 0.80, step: 0.05,
    source: "UNSOURCED, our default",
    status: "our default",
    wiredIn: "S3",
    appliesTo: EVERY_HEAD,
  },
  {
    key: "setTipHeight",
    label: "How far the set prong reaches up the crown",
    help: "Where the tip of a prong ends once it is bent over the stone, as a share of the crown's height. Higher holds the stone more securely but covers more of it.",
    group: "Prongs",
    unit: "fraction of crown height",
    default: 0.5, min: 0.3, max: 0.8, step: 0.05,
    source: "https://www.stuller.com/benchjeweler/resources/bencharticles/view/step-by-step-stone-setting-gems-in-four-prong-mountings/ (\"halfway up the crown\")",
    status: "sourced default",
    wiredIn: "S4",
    appliesTo: PRONG_HEADS,
  },
  {
    key: "minBendRadius",
    label: "Tightest bend in a set prong",
    help: "The tightest curve a prong is allowed where it bends over the stone, in prong thicknesses. A gentler bend is less likely to crack the metal; a tighter one hugs the stone more closely.",
    group: "Prongs",
    unit: "× prong diameter",
    default: 1.0, min: 0.5, max: 3.0, step: 0.1,
    source: "UNSOURCED, our default",
    status: "our default",
    wiredIn: "S4",
    appliesTo: PRONG_HEADS,
  },
] as const satisfies readonly BenchField[];

export type BenchKey = (typeof BENCH_FIELDS)[number]["key"];
export type BenchOverrides = Partial<Record<BenchKey, number>>;
export type BenchValues = Record<BenchKey, number>;

export type BenchWarning = {
  key: BenchKey;
  kind: "clamped" | "outside-published";
  message: string;
};

export type ResolvedBench = {
  values: BenchValues;
  warnings: BenchWarning[];
  /** Keys whose effective value differs from the default. */
  customised: BenchKey[];
};

const FIELD_BY_KEY: Record<string, BenchField> =
  Object.fromEntries(BENCH_FIELDS.map((f) => [f.key, f]));

export const BENCH_KEYS: BenchKey[] = BENCH_FIELDS.map((f) => f.key);

const boundOf = (b: Bound, alloy: MetalType) => (typeof b === "function" ? b(alloy) : b);

/** A known alloy, or platinum: the same fallback the manufacturability check uses. */
function alloyOf(a: unknown): MetalType {
  // Own keys only: `in` also answers yes to "constructor" or "toString", and an
  // alloy read off the prototype has no limits, so every bound became NaN.
  return typeof a === "string" && Object.prototype.hasOwnProperty.call(MANUFACTURING_LIMITS, a)
    ? (a as MetalType) : "platinum";
}

/** A field's hard bounds for an alloy. */
export function benchBounds(key: BenchKey, alloy: MetalType): { min: number; max: number } {
  const f = FIELD_BY_KEY[key];
  const a = alloyOf(alloy);
  return { min: boundOf(f.min, a), max: boundOf(f.max, a) };
}

/** A field's default for this stone and alloy, before any override. */
export function benchDefault(key: BenchKey, ctx: BenchCtx): number {
  const f = FIELD_BY_KEY[key];
  return f.default === "auto" ? f.auto!(ctx) : f.default;
}

/**
 * The effective bench values for one design.
 *
 * Geometry reads bench values through this and nothing else, so an override a
 * user typed is the number the engine builds, and a value outside the hard
 * bounds is clamped here rather than discovered as a broken ring later. An
 * "auto" default is held to the same bounds: the prong formula gives 0.74 mm at
 * a quarter carat, under every alloy's minimum, and a default must not be the
 * one value allowed to break the floor.
 *
 * Never throws. Overrides arrive from a URL, a saved design or a panel, and a
 * junk entry (NaN, a string, a key from a later version) is dropped rather than
 * allowed to stop the ring from building.
 */
export function resolveBench(
  overrides: BenchOverrides | Record<string, unknown> | null | undefined,
  ctx: BenchCtx,
): ResolvedBench {
  const alloy = alloyOf(ctx?.alloy);
  const c: BenchCtx = { alloy, girdleR: Number(ctx?.girdleR) || 0, pavH: Number(ctx?.pavH) || 0 };
  const src: Record<string, unknown> =
    overrides && typeof overrides === "object" ? (overrides as Record<string, unknown>) : {};

  const values = {} as BenchValues;
  const warnings: BenchWarning[] = [];
  const customised: BenchKey[] = [];

  for (const f of BENCH_FIELDS) {
    const key = f.key as BenchKey;
    const { min, max } = benchBounds(key, alloy);
    const def = benchDefault(key, c);
    const raw = Object.prototype.hasOwnProperty.call(src, key) ? src[key] : undefined;
    const given = typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
    const asked = given ?? def;

    let v = asked;
    if (v < min || v > max) {
      v = Math.min(max, Math.max(min, v));
      warnings.push({
        key, kind: "clamped",
        message: given === undefined
          ? `${f.label}: the automatic value ${fmt(asked)} is outside ${fmt(min)} to ${fmt(max)} ${f.unit}, so ${fmt(v)} is used.`
          : `${f.label}: ${fmt(asked)} is outside ${fmt(min)} to ${fmt(max)} ${f.unit}, so ${fmt(v)} is used.`,
      });
    }
    const pr = (f as BenchField).publishedRange;
    if (pr && (v < pr[0] || v > pr[1])) {
      warnings.push({
        key, kind: "outside-published",
        message: `${f.label}: ${fmt(v)} ${f.unit} is outside the published ${fmt(pr[0])} to ${fmt(pr[1])}.`,
      });
    }
    values[key] = v;
    // Compared with the default as it would be used, so a default that was
    // itself clamped does not count as a user's change.
    const effectiveDefault = Math.min(max, Math.max(min, def));
    if (Math.abs(v - effectiveDefault) > 1e-9) customised.push(key);
  }
  return { values, warnings, customised };
}

const fmt = (n: number) => String(+n.toFixed(3));

/**
 * The bench values nobody has checked against a real bench yet: every field
 * that is not a sourced default. These are the questions for the setter and
 * the caster before any of them is presented as more than our starting point.
 */
export const PROVISIONAL_INPUTS: readonly BenchField[] =
  (BENCH_FIELDS as readonly BenchField[]).filter((f) => f.status !== "sourced default");

/**
 * Reads `key:value,key:value` into overrides: the `?bench=` form, for the
 * Studio and anything else that takes bench values as text. (ring-spec's own
 * harness override cannot call this while it loads; see the note there.)
 *
 * Junk is dropped, never passed on: an unknown key, a missing colon, or a value
 * that is not a finite number. `?carat=abc` once put NaN into a spec and
 * poisoned every design built from it for the life of the page; this follows
 * the same rule as the other URL overrides so that cannot happen here.
 * Out-of-bounds numbers are kept, because clamping is resolveBench's job and
 * it reports what it did.
 */
export function parseBenchParam(raw: string | null | undefined): BenchOverrides {
  const out: BenchOverrides = {};
  if (typeof raw !== "string" || !raw) return out;
  for (const pair of raw.split(",")) {
    const i = pair.indexOf(":");
    if (i <= 0) continue;
    const key = pair.slice(0, i).trim();
    const text = pair.slice(i + 1).trim();
    if (!Object.prototype.hasOwnProperty.call(FIELD_BY_KEY, key) || !text) continue;
    const n = Number(text);
    if (Number.isFinite(n)) out[key as BenchKey] = n;
  }
  return out;
}
