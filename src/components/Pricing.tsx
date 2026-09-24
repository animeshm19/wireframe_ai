/**
 * Plans.
 *
 * The feature lists were describing a different product. Corrected against
 * what is actually in the repository:
 *
 *   - "Base mesh templates for rings and pendants" — there are no pendants.
 *     Nothing in the engine, the spec or the parser knows what one is.
 *   - "Real-time material and stone cost preview" — there is no cost anywhere
 *     in the codebase. There is measured weight, which is the more defensible
 *     claim anyway, and it is what the line says now.
 *   - "mesh engines", twice — it is a B-rep kernel. The whole argument of the
 *     page above is that it is not a mesh.
 *   - "Single sign-on and advanced access controls" — auth is email and
 *     Google. It is listed as planned rather than quietly dropped, because a
 *     buyer asking about SSO deserves a straight answer either way.
 *
 * Anything not yet built carries a "planned" mark. A plan page that admits
 * what is coming is worth more than one that does not, and it cannot age into
 * a lie.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

type Feature = { text: string; planned?: boolean };

type Tier = {
  id: string;
  name: string;
  hallmark: string;
  blurb: string;
  monthly: number | null;
  yearly: number | null;
  cta: { label: string; to?: string; anchor?: string };
  features: Feature[];
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    hallmark: "ST",
    blurb: "One designer, the whole engine.",
    monthly: 25,
    yearly: 20,
    cta: { label: "Start designing", to: "/chat" },
    features: [
      { text: "Describe a piece in plain language, unlimited prompts" },
      { text: "Every setting, cut and shank the engine builds" },
      { text: "Exact STEP and binary STL export" },
      { text: "Measured metal weight per alloy, carat per stone" },
      { text: "Email support" },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    hallmark: "SD",
    blurb: "For a bench that ships.",
    monthly: 99,
    yearly: 79,
    featured: true,
    cta: { label: "Start designing", to: "/chat" },
    features: [
      { text: "Everything in Starter" },
      { text: "The Studio: section view, dimensions, turntable, finishes" },
      { text: "Lasso editing — rework one stretch of shank on its own" },
      { text: "Per-alloy manufacturability checks before export" },
      { text: "Priority support and a setup session" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    hallmark: "EN",
    blurb: "Several benches, one library.",
    monthly: null,
    yearly: null,
    cta: { label: "Talk to us", anchor: "contact" },
    features: [
      { text: "Everything in Studio" },
      { text: "Onboarding and a named point of contact" },
      { text: "Shared component and design libraries", planned: true },
      { text: "Single sign-on and access controls", planned: true },
      { text: "Private model hosting", planned: true },
    ],
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      className="relative scroll-mt-24 overflow-hidden border-t border-white/5 bg-ink-900 py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, rgba(198,155,178,0.07), transparent 65%)",
        }}
      />

      <div className="shell relative z-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-14">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              <span className="mono-label !text-metal-400">03</span>
              <span className="h-px w-8 bg-white/15" />
              <span className="mono-label">Plans</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-[15ch] text-[clamp(1.9rem,1.2rem+2.4vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
            >
              Priced per bench, not per render.
            </motion.h2>
          </div>

          {/* Term switch */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 lg:pb-2"
          >
            <div
              role="radiogroup"
              aria-label="Billing term"
              className="relative inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1"
            >
              {(["monthly", "yearly"] as const).map((term) => {
                const on = (term === "yearly") === yearly;
                return (
                  <button
                    key={term}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setYearly(term === "yearly")}
                    className="relative rounded-full px-4 py-1.5 text-[0.78rem] capitalize transition-colors duration-300"
                  >
                    {on && (
                      <motion.span
                        layoutId="term-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    )}
                    <span className={"relative " + (on ? "text-ink-900 font-semibold" : "text-white/80")}>
                      {term}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="mono-label !text-[0.55rem] !text-metal-400">
              Two months on us, yearly
            </span>
          </motion.div>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {TIERS.map((t, i) => (
            <Plate key={t.id} tier={t} yearly={yearly} i={i} />
          ))}
        </div>

        <p className="mono-label mx-auto mt-10 max-w-2xl text-center !text-[0.55rem] !normal-case !tracking-[0.1em] !text-white/75">
          Prices in USD, per seat. Items marked planned are not built yet and
          are not what you are paying for today.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ plate -- */

function Plate({ tier, yearly, i }: { tier: Tier; yearly: boolean; i: number }) {
  const reduced = useReducedMotion();
  const price = yearly ? tier.yearly : tier.monthly;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay: reduced ? 0 : 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
      className={
        "card-edge card-sheen relative flex flex-col overflow-hidden rounded-2xl border p-6 sm:p-7 " +
        (tier.featured
          ? // Raised with a real shadow rather than a glow: a glow says "lit
            // from within", a shadow says "sitting on top of the others",
            // which is the thing actually being communicated.
            "border-metal-400/30 bg-gradient-to-b from-white/[0.075] to-white/[0.02] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.95)] lg:-my-3 lg:py-9"
          : "border-white/8 bg-gradient-to-b from-white/[0.035] to-white/[0.01]")
      }
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent"
      />

      {/* An assay mark, the way a piece carries one. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-white/15"
      >
        <span className="mono-label !text-[0.55rem] !tracking-[0.08em] !text-white/75 font-semibold">
          {tier.hallmark}
        </span>
      </span>

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mono-label !text-[0.58rem] !text-metal-400 font-semibold">{tier.name}</div>
        <p className="mt-1.5 text-[0.92rem] text-white/85">{tier.blurb}</p>

        {/* "Let's talk" is a step down from the numerals: a word set at the
            same size as a two-digit price reads larger than one. */}
        <div className="mt-6 flex items-end gap-2">
          {price === null ? (
            <span className="text-[2.1rem] font-semibold leading-[1.15] tracking-tight text-white">
              Let's talk
            </span>
          ) : (
            <>
              <span className="text-[1.3rem] font-semibold leading-none text-white/75">$</span>
              <Rolling value={price} />
              <span className="mono-label pb-1 !text-[0.55rem] !text-white/80">
                / seat / mo
              </span>
            </>
          )}
        </div>

        {price !== null && (
          <div className="mono-label mt-2 !text-[0.55rem] !text-white/75">
            {yearly
              ? `billed yearly · $${price * 12} per seat`
              : `billed monthly · $${(tier.yearly ?? 0) * 12} yearly`}
          </div>
        )}

        <hr className="hairline my-6" />

        <ul className="flex-1 space-y-3">
          {tier.features.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={
                  "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full " +
                  (f.planned ? "bg-white/30" : "bg-metal-300")
                }
              />
              <span
                className={
                  "text-[0.88rem] leading-relaxed " +
                  (f.planned ? "text-white/60" : "text-white/90")
                }
              >
                {f.text}
                {f.planned && (
                  <span className="mono-label ml-2 rounded border border-white/15 px-1 py-px !text-[0.45rem] !text-white/70">
                    planned
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          {tier.cta.to ? (
            <Link
              to={tier.cta.to}
              className={
                "group flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-300 " +
                (tier.featured
                  ? "bg-white text-ink-900 shadow-md hover:bg-metal-200"
                  : "border border-white/20 text-white hover:border-white/40 hover:bg-white/[0.05]")
              }
            >
              {tier.cta.label}
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          ) : (
            <button
              onClick={() =>
                document
                  .getElementById(tier.cta.anchor!)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="group flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:border-white/40 hover:bg-white/[0.05]"
            >
              {tier.cta.label}
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * A price whose digits roll.
 *
 * Each column is a strip of 0–9 moved to the right digit, so changing the term
 * spins the numerals rather than swapping one price for another. It is the
 * one flourish on this section, and it is here because the term switch is the
 * only thing on the page a visitor is invited to change while deciding.
 */
function Rolling({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const digits = String(value).split("");

  if (reduced) {
    return (
      <span className="tabular text-[2.6rem] font-semibold leading-none tracking-tight text-white">
        {value}
      </span>
    );
  }

  return (
    <span
      className="tabular flex text-[2.6rem] font-semibold leading-[0.9] tracking-tight text-white"
      aria-label={String(value)}
    >
      {digits.map((d, i) => (
        // 1ch is exactly one digit's advance under tabular-nums, so the
        // columns line up without guessing at a width.
        <span key={i} aria-hidden="true" className="relative h-[1em] w-[1ch] overflow-hidden">
          <motion.span
            className="absolute inset-x-0 top-0 flex flex-col items-center"
            /* In em, not per cent. A percentage on a transform resolves
             * against the element's own height, and this strip is ten digits
             * tall — so -100% moved it ten digits up instead of one, which is
             * why the price came out as a stray numeral or as nothing at all. */
            animate={{ y: `${-Number(d)}em` }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            {Array.from({ length: 10 }).map((_, n) => (
              <span key={n} className="flex h-[1em] items-center justify-center leading-none">
                {n}
              </span>
            ))}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export default Pricing;
