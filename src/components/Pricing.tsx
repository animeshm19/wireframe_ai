import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

function CheckIcon({
  className = "",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-3 w-3 flex-none ${className}`}
      {...props}
    >
      <path
        d="M15.833 5.5L8.25 13.083 4.167 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Pricing() {
  const [billing, setBilling] = React.useState<"monthly" | "yearly">("monthly");
  const isYearly = billing === "yearly";

  const prices = {
    starter: {
      monthly: 25,
      yearly: 20,
    },
    studio: {
      monthly: 99,
      yearly: 79,
    },
    enterprise: {
      monthly: 0,
      yearly: 0,
    },
  };

  return (
    <section
      id="pricing"
      className="relative overflow-hidden border-y border-white/10 bg-gradient-to-b from-[#13010c] via-[#13010c] to-[#050003] py-20 sm:py-24"
    >
      {/* soft mesh + glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="mesh-bg absolute inset-0 opacity-40" />
        <div className="absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(circle_at_top,_rgba(19,1,12,0.18),_transparent_60%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
            <span>Pricing</span>
            <span className="text-white/35">built for jewelry teams</span>
          </div>

          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Choose a plan that fits your studio’s rhythm.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Start with a single designer or roll out wireframe across your
            entire team. Switch plans or billing cycles any time.
          </p>

          {/* Billing toggle */}
          <div className="mt-6 flex items-center gap-4">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 text-xs text-white/60">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`relative rounded-full px-3 py-1.5 transition ${
                  !isYearly
                    ? "bg-(--gold-500) text-black"
                    : "hover:text-white/90"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={`relative rounded-full px-3 py-1.5 transition ${
                  isYearly
                    ? "bg-(--gold-500) text-black"
                    : "hover:text-white/90"
                }`}
              >
                Yearly
              </button>
            </div>
            <span className="text-xs text-(--gold-400)">
              {isYearly ? "You are saving up to 25%." : "Save up to 25% with yearly"}
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {/* Starter */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="group relative flex flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-7 backdrop-blur"
          >
            <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Starter
            </div>
            <p className="text-sm text-white/65">
              For solo designers or small teams getting their first collections
              into a parametric workflow.
            </p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-white">
                ${isYearly ? prices.starter.yearly : prices.starter.monthly}
              </span>
              <span className="text-xs text-white/50">
                /designer {isYearly ? "/month (billed yearly)" : "/month"}
              </span>
            </div>

            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Up to 3 active collections</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Base mesh templates for rings and pendants</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Export to your existing CAD workflow</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Email support within 48 hours</span>
              </li>
            </ul>

            <div className="mt-6">
              <Button
                className="w-full rounded-full border border-white/15 bg-white/5 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white/10"
                size="sm"
              >
                Start with Starter
              </Button>
            </div>
          </motion.div>

          {/* Studio (featured) */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="group relative flex flex-col rounded-3xl border border-(--gold-500)/60 bg-[radial-gradient(circle_at_top,_rgba(131,110,118,0.28),_rgba(5,5,11,0.96))] p-6 sm:p-7 shadow-[0_0_60px_rgba(131,110,118,0.32)] backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-(--gold-400)">
                Studio
              </div>
              <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-(--gold-400)">
                Most popular
              </span>
            </div>
            <p className="text-sm text-white/80">
              For growing studios that want deep control over variants, pricing,
              and production ready exports.
            </p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-white">
                ${isYearly ? prices.studio.yearly : prices.studio.monthly}
              </span>
              <span className="text-xs text-white/70">
                /designer {isYearly ? "/month (billed yearly)" : "/month"}
              </span>
            </div>

            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-400)" />
                <span>Unlimited collections and design variants</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-400)" />
                <span>Advanced parametric controls and constraints</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-400)" />
                <span>Real-time material and stone cost preview</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-400)" />
                <span>Priority support and setup session</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-400)" />
                <span>Early access to new mesh engines</span>
              </li>
            </ul>

            <div className="mt-6 space-y-3">
              <Button
                className="w-full rounded-full border border-(--gold-500) bg-(--gold-500) text-xs font-medium uppercase tracking-[0.18em] text-black hover:bg-(--gold-400)"
                size="sm"
              >
                Book a studio demo
              </Button>
              <p className="text-center text-[11px] text-white/75">
                Need to add more than 10 designers?{" "}
                <a
                  href="#contact"
                  className="underline-offset-2 hover:underline"
                >
                  Talk to us
                </a>
                .
              </p>
            </div>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="group relative flex flex-col rounded-3xl border border-white/10 bg-white/[0.01] p-6 sm:p-7 backdrop-blur"
          >
            <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Enterprise
            </div>
            <p className="text-sm text-white/65">
              For large houses and manufacturers that need custom workflows,
              security reviews, and on-premise options.
            </p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-white">Custom</span>
            </div>

            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-white/75">
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Custom SLAs and onboarding for your team</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Single sign-on and advanced access controls</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Private mesh engines and internal libraries</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 text-(--gold-500)" />
                <span>Dedicated success manager</span>
              </li>
            </ul>

            <div className="mt-6">
              <Button
                className="w-full rounded-full border border-white/15 bg-white/5 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white/10"
                size="sm"
              >
                Talk to sales
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Included in all plans */}
        <div className="mt-10 rounded-3xl border border-white/5 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/65">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Included in every plan
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
              <CheckIcon className="text-(--gold-500)" />
              Unlimited exports
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
              <CheckIcon className="text-(--gold-500)" />
              Secure cloud workspace
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
              <CheckIcon className="text-(--gold-500)" />
              Team roles and permissions
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
              <CheckIcon className="text-(--gold-500)" />
              Onboarding resources
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
