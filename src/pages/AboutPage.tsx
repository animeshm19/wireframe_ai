import React from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import LightRays from "../components/LightRays";

const logoUrl = "/icons/Wireframe.png";

export function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#13000c] text-white">
      {/* Background mesh + rays */}
      <div className="absolute inset-0 z-0 mesh-bg" />
      <div className="absolute inset-0 z-10 opacity-70 pointer-events-none">
        <LightRays
          raysOrigin="top-center"
          raysColor="#2g3824"
          raysSpeed={1.3}
          lightSpread={0.9}
          rayLength={0.7}
          followMouse
          mouseInfluence={0.08}
          noiseAmount={0.08}
          distortion={0.04}
          className="custom-rays"
        />
      </div>

      {/* Soft vignette */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_top,_rgba(250,250,255,0.09),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(250,220,180,0.08),_transparent_55%)]" />

      {/* Content */}
      <div className="relative z-30 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        {/* Breadcrumb + pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-8 flex flex-col gap-3 text-xs text-white/60"
        >
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500) animate-pulse" />
            <span className="uppercase tracking-[0.18em]">About wireframe</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <Link to="/" className="hover:text-(--gold-500)">
              Home
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-white/60">About</span>
          </div>
        </motion.div>

        {/* Hero row */}
        <section className="mb-12 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.7rem]">
              A mesh-first companion for jewelry teams that care about detail and
              repeatability.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              Wireframe is an early-stage product focused on one thing: making it
              easier for jewelry studios to move from an idea to a manufacturable
              CAD model without rebuilding work every time a client changes their mind.
              We are not trying to replace your CAD software. We are trying to make
              it less repetitive and more consistent.
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              The product is currently in private previews with a small group of
              studios. Most of what we build is informed directly by their day-to-day
              workflows, not generic design tooling ideas.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-5 text-xs font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={() => {
                  const el = document.querySelector("#contact");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    window.location.href = "/#contact";
                  }
                }}
              >
                Book a demo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-white/20 bg-transparent px-5 text-xs font-medium uppercase tracking-[0.2em] text-white/80 hover:bg-white/5"
                onClick={() => {
                  window.location.href = "/careers";
                }}
              >
                View roles
              </Button>
              <p className="text-xs text-white/50">
                Based in Canada · working with teams worldwide.
              </p>
            </div>
          </motion.div>

          {/* Right: studio snapshot card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-black/60 p-[1px] shadow-[0_0_70px_rgba(0,0,0,0.8)]"
          >
            <div className="rounded-[1.4rem] bg-gradient-to-b from-white/5 via-black/70 to-black/95 px-5 py-5 sm:px-6 sm:py-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                  <img
                    src={logoUrl}
                    alt="wireframe logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-white/90">
                    Studio snapshot
                  </p>
                  <p className="text-[11px] text-white/45">
                    High-level view of where we are today.
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs text-white/70">
                <div className="space-y-1">
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                    State
                  </dt>
                  <dd className="text-sm text-white/85">Early access</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                    Focus
                  </dt>
                  <dd className="text-sm text-white/85">
                    Rings, pendants, and everyday pieces
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                    Workflows
                  </dt>
                  <dd>Mesh presets, parametric tweaks, export to CAD</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                    Collaboration
                  </dt>
                  <dd>Designers, CAD artists, and production leads</dd>
                </div>
              </dl>

              <div className="mt-2 rounded-2xl border border-white/10 bg-black/50 p-3 text-[11px] text-white/65">
                <p className="mb-1 font-medium text-white/80">
                  What you can expect if you work with us
                </p>
                <ul className="space-y-1.5">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
                    <span>
                      Direct contact with the team building the product, not a support bot.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                    <span>
                      Honest timelines and a clear picture of what is stable and what is
                      still experimental.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/35" />
                    <span>
                      Changes that are driven by actual workflows rather than abstract
                      feature lists.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </section>

        {/* What we are building */}
        <section className="mb-12 space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55"
          >
            What we are building
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="grid gap-5 md:grid-cols-3"
          >
            <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-(--gold-500)/60">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                Mesh-first design
              </p>
              <p className="mt-2 text-sm font-medium text-white/90">
                Reusable structures instead of one-off files.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                We focus on parameterizing the parts of a piece that change most:
                stone sizes, band widths, prong profiles, and similar details. The
                goal is to keep the structure stable while giving you controlled
                flexibility.
              </p>
            </div>

            <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-(--gold-500)/60">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                Clean handoff to CAD
              </p>
              <p className="mt-2 text-sm font-medium text-white/90">
                A bridge, not a replacement.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                Wireframe prepares the inputs that matter and keeps them organized:
                dimensions, references, and preset meshes that can be taken into
                your existing CAD stack without changing the tools you already use.
              </p>
            </div>

            <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-(--gold-500)/60">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                Workflow clarity
              </p>
              <p className="mt-2 text-sm font-medium text-white/90">
                Less guessing when designs evolve.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                When a client asks for a change, the system should make it clear
                which parameters to adjust and what that will affect. We want to
                reduce manual rework and miscommunication between design and production.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Who it is for + how we work */}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Who it is for */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-4 rounded-3xl border border-white/10 bg-black/60 p-5 sm:p-6"
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
              Who we are building for
            </h3>
            <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
              Wireframe is not a general design tool. It is for teams that already
              have a serious jewelry practice and want more structure in how they
              design and maintain collections.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs text-white/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  Independent studios
                </p>
                <p className="mt-1.5 text-xs text-white/80">
                  Small teams that juggle custom work and core lines and want
                  fewer one-off CAD files.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  In-house design teams
                </p>
                <p className="mt-1.5 text-xs text-white/80">
                  Brands with catalog pieces that need to evolve over time without
                  losing their proportions.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  CAD specialists
                </p>
                <p className="mt-1.5 text-xs text-white/80">
                  Freelancers who handle recurring design patterns and want a
                  more organized starting point.
                </p>
              </div>
            </div>
          </motion.div>

          {/* How we work */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="space-y-4 rounded-3xl border border-white/10 bg-black/60 p-5 sm:p-6"
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
              How we work with early teams
            </h3>
            <ul className="space-y-3 text-xs text-white/70">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
                <span>
                  We start with a clear picture of your current workflow rather
                  than pushing you into a fixed process.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>
                  We share what is in scope for the next few months instead of
                  promising everything at once.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                <span>
                  We treat your feedback as input for the product, not as a
                  support ticket to close.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/30" />
                <span>
                  If we are not the right fit for your workflow, we say that
                  clearly and early.
                </span>
              </li>
            </ul>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/65">
              <p className="mb-1 font-medium text-white/80">
                Interested in joining as an early studio
              </p>
              <p className="mb-2">
                Share a few examples of pieces you work on often and which parts of
                the process feel most repetitive today.
              </p>
              <a
                href="mailto:hello@wireframe.studio?subject=Wireframe%20studio%20interest"
                className="font-medium text-(--gold-500) hover:underline"
              >
                Email hello@wireframe.studio
              </a>
            </div>
          </motion.div>
        </section>

        {/* Founder / origin note */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-black/70 p-5 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex flex-col gap-4 sm:flex-row sm:items-start"
          >
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
                Why wireframe exists
              </h3>
              <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                Wireframe grew out of time spent around independent jewelry
                businesses that were constantly balancing design quality with the
                reality of production. A lot of work sat in individual CAD files,
                spreadsheets, and notes that were hard to reuse when collections
                evolved or clients returned years later.
              </p>
              <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                The product is still evolving, and we are deliberate about where
                it goes. The aim is not to automate creativity but to make the
                repetitive parts of the process less fragile so teams can focus
                more on the pieces themselves.
              </p>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default AboutPage;
