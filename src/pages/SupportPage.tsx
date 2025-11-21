// src/pages/SupportPage.tsx
import React from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

export function SupportPage() {
  const handleContactClick = () => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/#contact";
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#13000c] text-white">
      {/* Background: soft vertical glow + noise */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_bottom,rgba(250,250,255,0.04),transparent_55%),radial-gradient(circle_at_top,#2b111a,transparent_55%),radial-gradient(circle_at_bottom,#050003,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-35 mix-blend-soft-light bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_7px)]" />

      {/* Content */}
      <div className="relative z-30 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="mb-4 flex flex-col gap-3 text-xs text-white/60">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500) animate-pulse" />
              <span className="uppercase tracking-[0.18em]">Support</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <Link to="/" className="hover:text-(--gold-500)">
                Home
              </Link>
              <span className="text-white/30">/</span>
              <span className="text-white/60">Support</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A practical support layer for early studios.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                During early access, support is direct and simple: you talk to the
                people building Wireframe. No ticket systems or automated replies,
                just clear answers about what the product can and cannot do today.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs text-white/55 md:items-end">
              <p>Early access only · no 24/7 guarantees, honest communication instead.</p>
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={handleContactClick}
              >
                Talk to the team
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Hero row: redesigned radar + channels */}
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)] lg:items-center">
          {/* Redesigned support radar */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex justify-center"
          >
            <div className="relative h-72 w-72 sm:h-80 sm:w-80">
              {/* RINGS (kept tighter, all behind content) */}
              <motion.div
                className="pointer-events-none absolute inset-10 rounded-full border border-(--gold-500)/20 z-0"
                animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.03, 1] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="pointer-events-none absolute inset-16 rounded-full border border-white/12 z-0"
                animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.02, 1] }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="pointer-events-none absolute inset-22 rounded-full border border-white/15 bg-black/60 backdrop-blur z-0" />

              {/* CENTER HUB CARD */}
              <div className="absolute inset-[4.8rem] sm:inset-[5.2rem] z-10 flex items-center justify-center">
                <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/8 via-black/85 to-black/95 px-4 py-4 text-center shadow-[0_0_32px_rgba(0,0,0,0.8)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    SUPPORT HUB
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white">
                    One place to understand how to get help.
                  </p>
                  <p className="mt-2 text-[11px] text-white/65">
                    Email first · short calls if needed · no complicated portals.
                  </p>
                </div>
              </div>

              {/* FLOATING CHIPS – all outside outer ring, above everything */}
              <motion.div
                className="absolute -top-9 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/90 px-4 py-1.5 text-[11px] text-white/80"
                animate={{ y: [-3, 3, -3] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              >
                Early studio onboarding
              </motion.div>

              <motion.div
                className="absolute top-1/2 left-[-5.8rem] z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/90 px-4 py-1.5 text-[11px] text-white/80"
                animate={{ x: [-3, 3, -3] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
              >
                Workflow questions
              </motion.div>

              <motion.div
                className="absolute top-1/2 right-[-5.8rem] z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/90 px-4 py-1.5 text-[11px] text-white/80"
                animate={{ x: [3, -3, 3] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                Mesh behaviour
              </motion.div>

              <motion.div
                className="absolute -bottom-9 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/90 px-4 py-1.5 text-[11px] text-white/80"
                animate={{ y: [3, -3, 3] }}
                transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
              >
                Export + CAD handoff
              </motion.div>
            </div>
          </motion.div>

          {/* Simple support channels (unchanged) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                How to get help during early access
              </h2>
              <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                There are three main channels: email, lightweight calls, and the
                changelog / docs. We keep them simple so you always know where to go.
              </p>
            </div>

            <div className="grid gap-3 text-xs text-white/75 sm:text-[13px]">
              <div className="rounded-2xl border border-white/12 bg-black/75 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  Email
                </p>
                <p className="mt-1 font-medium text-white/85">
                  For questions about behaviour or limitations.
                </p>
                <p className="mt-1 text-xs text-white/70">
                  We respond with clear yes / no answers and timelines instead of
                  generic promises.
                </p>
                <a
                  href="mailto:hello@wireframe.studio?subject=Support"
                  className="mt-2 inline-block text-[11px] font-medium text-(--gold-500) hover:underline"
                >
                  Email hello@wireframe.studio
                </a>
              </div>

              <div className="rounded-2xl border border-white/12 bg-black/75 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  Short calls
                </p>
                <p className="mt-1 font-medium text-white/85">
                  For workflow reviews when email is not enough.
                </p>
                <p className="mt-1 text-xs text-white/70">
                  We use calls to look at real pieces with you, not to walk through
                  marketing slides.
                </p>
                <button
                  type="button"
                  className="mt-2 text-[11px] font-medium text-(--gold-500) hover:underline"
                  onClick={handleContactClick}
                >
                  Use the contact form to request a call
                </button>
              </div>

              <div className="rounded-2xl border border-white/12 bg-black/75 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  Changelog + docs
                </p>
                <p className="mt-1 font-medium text-white/85">
                  For understanding what changed and what is stable.
                </p>
                <p className="mt-1 text-xs text-white/70">
                  The changelog and docs are where we write down how Wireframe behaves
                  instead of keeping it all in calls.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                  <Link
                    to="/changelog"
                    className="underline-offset-2 hover:text-(--gold-500) hover:underline"
                  >
                    View changelog
                  </Link>
                  <Link
                    to="/docs"
                    className="underline-offset-2 hover:text-(--gold-500) hover:underline"
                  >
                    Read workflow docs
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Expectations + quick FAQ (unchanged) */}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-4 rounded-3xl border border-white/12 bg-black/80 p-5 sm:p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
              What you can expect from support
            </h2>
            <ul className="space-y-2 text-xs text-white/75 sm:text-[13px]">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
                <span>Honest answers about what is possible today and what is not.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>Clear communication when something is experimental or likely to change.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/50" />
                <span>Thoughtful follow-ups instead of scripted responses.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                <span>
                  If Wireframe is not a good fit for your workflow, we will say that rather than stretching it.
                </span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-3 rounded-3xl border border-white/12 bg-black/80 p-5 text-xs text-white/75 sm:p-6 sm:text-[13px]"
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
              Quick questions
            </h3>
            <div>
              <p className="font-medium text-white/85">Do you offer 24/7 support?</p>
              <p className="mt-1 text-white/70">
                Not at this stage. During early access we prioritise clarity over
                constant availability. If you need guaranteed response times, tell us
                and we can discuss whether that is realistic.
              </p>
            </div>
            <div>
              <p className="font-medium text-white/85">
                Can my whole team contact you?
              </p>
              <p className="mt-1 text-white/70">
                Usually we start with one or two main contacts and then widen out as
                workflows settle. This keeps communication focused and easier to act on.
              </p>
            </div>
            <div>
              <p className="font-medium text-white/85">
                How do I report something that feels off?
              </p>
              <p className="mt-1 text-white/70">
                Email with a short description, screenshots if helpful, and if
                possible a note on how it affects your work. We respond with next
                steps rather than just logging it.
              </p>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default SupportPage;
