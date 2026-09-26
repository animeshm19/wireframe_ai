/** Plans. Anything not built yet carries a "planned" mark. */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useRise } from "./motion";

type Feature = { text: string; planned?: boolean };

type Tier = {
  id: string;
  name: string;
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
    blurb: "One designer, the whole engine.",
    monthly: 25,
    yearly: 20,
    cta: { label: "Open the Studio", to: "/chat" },
    features: [
      { text: "Describe a ring in plain language, as often as you like" },
      { text: "Every setting, cut and shank the engine builds" },
      { text: "STEP and STL export" },
      { text: "Measured metal weight per alloy, carat per stone" },
      { text: "Email support" },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    blurb: "For a bench that ships.",
    monthly: 99,
    yearly: 79,
    featured: true,
    cta: { label: "Open the Studio", to: "/chat" },
    features: [
      { text: "Everything in Starter" },
      { text: "The Studio: section view, dimensions, turntable, finishes" },
      { text: "Lasso editing: rework one stretch of shank on its own" },
      { text: "Casting checks for each alloy before export" },
      { text: "Priority support and a setup session" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Several benches, one library.",
    monthly: null,
    yearly: null,
    cta: { label: "Book a demo", anchor: "contact" },
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
  const rise = useRise();

  return (
    <section id="pricing" className="relative scroll-mt-24 border-t border-white/5 bg-ink-900 py-16 md:py-28">
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-14">
          <div>
            <motion.p {...rise(0)} className="eyebrow">Pricing</motion.p>
            <motion.h2 {...rise(0.04)} className="h-section mt-3">Priced per seat</motion.h2>
          </div>

          <motion.div {...rise(0.08)} className="flex flex-wrap items-center gap-3 lg:pb-1">
            <div role="radiogroup" aria-label="Billing" className="relative inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["monthly", "yearly"] as const).map((term) => {
                const on = (term === "yearly") === yearly;
                return (
                  <button
                    key={term}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setYearly(term === "yearly")}
                    className="tap relative rounded-full px-4 py-1.5 text-sm capitalize"
                  >
                    {on && (
                      <motion.span layoutId="term-pill" transition={{ duration: 0.25 }}
                                   className="absolute inset-0 rounded-full bg-white" />
                    )}
                    <span className={"relative " + (on ? "font-semibold text-ink-900" : "text-white/80")}>{term}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-sm text-metal-300">Save 20% yearly</span>
          </motion.div>
        </div>

        <div className="mt-10 grid gap-5 md:mt-14 lg:grid-cols-3 lg:items-stretch">
          {TIERS.map((t, i) => (
            <Plate key={t.id} tier={t} yearly={yearly} i={i} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-white/65">
          Prices in USD per seat. Items marked planned are not built yet.
        </p>
      </div>
    </section>
  );
}

function Plate({ tier, yearly, i }: { tier: Tier; yearly: boolean; i: number }) {
  const rise = useRise();
  const price = yearly ? tier.yearly : tier.monthly;
  const btn = tier.featured ? "btn-primary w-full" : "btn-secondary w-full";

  return (
    <motion.div
      {...rise(0.05 * i)}
      className={
        "relative flex flex-col rounded-2xl border p-6 sm:p-7 " +
        (tier.featured ? "border-metal-400/35 bg-white/[0.06]" : "border-white/8 bg-white/[0.025]")
      }
    >
      <h3 className="h-card">{tier.name}</h3>
      <p className="mt-1 text-[0.95rem] text-white/78">{tier.blurb}</p>

      <div className="mt-6 flex items-end gap-2">
        {price === null ? (
          <span className="text-[2rem] font-semibold leading-[1.15] text-white">Let&apos;s talk</span>
        ) : (
          <>
            <Price value={price} />
            <span className="pb-1 text-sm text-white/70">per seat / month</span>
          </>
        )}
      </div>
      {price !== null && (
        <p className="mt-2 text-sm text-white/65">{yearly ? `$${price * 12} billed yearly` : "Billed monthly"}</p>
      )}

      <hr className="hairline my-5 sm:my-6" />

      <ul className="flex-1 space-y-2.5">
        {tier.features.map((f) => (
          <li key={f.text} className="flex items-start gap-2.5">
            <span aria-hidden="true" className={"mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full " + (f.planned ? "bg-white/30" : "bg-metal-300")} />
            <span className={"text-[0.92rem] " + (f.planned ? "text-white/60" : "text-white/88")}>
              {f.text}
              {f.planned && (
                <span className="ml-2 rounded border border-white/15 px-1.5 py-px text-xs text-white/65">planned</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 sm:mt-7">
        {tier.cta.to ? (
          <Link to={tier.cta.to} className={btn}>{tier.cta.label}</Link>
        ) : (
          <button
            type="button"
            onClick={() => document.getElementById(tier.cta.anchor!)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className={btn}
          >
            {tier.cta.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * A price whose digits roll when the billing term changes. The strips are
 * decoration: screen readers get a sentence, and copying gets "$25".
 */
function Price({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const spoken = `${value} dollars per seat per month`;
  const digits = String(value).split("");

  return (
    <span className="relative inline-flex items-baseline text-[2.6rem] font-semibold leading-none text-white">
      <span className="sr-only select-none">{spoken}</span>
      {/* Selectable copy of the price, laid over the strips. */}
      <span aria-hidden="true" className="absolute inset-0 z-10 whitespace-nowrap text-transparent selection:bg-white/25">
        <span className="text-[1.3rem]">$</span>
        <span className="tabular">{value}</span>
      </span>
      <span aria-hidden="true" className="flex select-none items-baseline">
        <span className="mr-0.5 text-[1.3rem] text-white/75">$</span>
        {reduced ? (
          <span className="tabular">{value}</span>
        ) : (
          <span className="tabular flex h-[1em] leading-[1]">
            {digits.map((d, i) => (
              <span key={i} className="relative h-[1em] w-[1ch] overflow-hidden">
                <motion.span
                  className="absolute inset-x-0 top-0 flex flex-col items-center"
                  animate={{ y: `${-Number(d)}em` }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  {Array.from({ length: 10 }).map((_, n) => (
                    <span key={n} className="flex h-[1em] items-center justify-center">{n}</span>
                  ))}
                </motion.span>
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}

export default Pricing;
