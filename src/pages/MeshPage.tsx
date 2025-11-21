import React from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { FlickeringGrid } from "@/components/ui/shadcn-io/flickering-grid";

const logoUrl = "/icons/Wireframe.png";

export function MeshPage() {
  const handleScrollToContact = () => {
    const el = document.querySelector("#contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/#contact";
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#13000c] text-white">
      {/* Background: deep gradient + subtle grid */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_#2b111a,_transparent_55%),radial-gradient(circle_at_bottom,_#050003,_transparent_55%)]" />

      {/* Flickering grid core */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-50">
        <FlickeringGrid
          className="h-full w-full"
          squareSize={3}
          gridGap={18}
          color="#ffffff"
          maxOpacity={0.3}
          flickerChance={0.4}
        />
      </div>

      {/* Floating param chips */}
      <motion.div
        className="pointer-events-none absolute -left-10 top-40 z-20 hidden h-40 w-40 rounded-full border border-[#f4c57a]/40 bg-[#f4c57a]/5 blur-2xl sm:block"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.9, scale: 1.02 }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="pointer-events-none absolute -right-10 bottom-32 z-20 hidden h-48 w-48 rounded-full border border-[#f4c57a]/35 bg-[#f4c57a]/8 blur-3xl md:block"
        initial={{ opacity: 0.2, scale: 0.95, rotate: 0 }}
        animate={{ opacity: 0.7, scale: 1.05, rotate: 7 }}
        transition={{
          duration: 9,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      {/* Content */}
      <div className="relative z-30 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* Breadcrumb + label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-8 flex flex-col gap-3 text-xs text-white/60"
        >
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500) animate-pulse" />
            <span className="uppercase tracking-[0.18em]">Mesh engine</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <Link to="/" className="hover:text-(--gold-500)">
              Home
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-white/60">Mesh</span>
          </div>
        </motion.div>

        {/* Hero row */}
        <section className="mb-12 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)] lg:items-start">
          {/* Left: explanation */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">
              The mesh layer that sits between your idea and a finished CAD file.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              The Mesh engine is where you define the reusable structure of a piece:
              stone layout, core profiles, and the relationships between key
              dimensions. Instead of redrawing from scratch, you adjust parameters
              and export a stable base for your existing CAD tools.
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              Today, the Mesh engine focuses on rings and pendants with common
              variations in stone size, band thickness, and setting style. We add
              workflows gradually, based on what early studios actually use in
              production.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-5 text-xs font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={handleScrollToContact}
              >
                Walk through a mesh
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-white/25 bg-transparent px-5 text-xs font-medium uppercase tracking-[0.2em] text-white/80 hover:bg-white/5"
                onClick={() => {
                  window.location.href = "/careers";
                }}
              >
                See open roles
              </Button>
              <p className="text-xs text-white/50">
                Private previews · limited number of studios.
              </p>
            </div>
          </motion.div>

          {/* Right: mesh pipeline card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
            className="relative rounded-3xl border border-white/10 bg-black/70 p-[1px] shadow-[0_0_80px_rgba(0,0,0,0.9)]"
          >
            <div className="rounded-[1.4rem] bg-gradient-to-b from-white/5 via-black/80 to-black/95 px-5 py-5 sm:px-6 sm:py-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                    <img
                      src={logoUrl}
                      alt="wireframe logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/90">
                      Mesh flow for a ring
                    </p>
                    <p className="text-[11px] text-white/45">
                      Concept to CAD-ready base in four steps.
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  Example
                </span>
              </div>

              <ol className="space-y-3 text-xs text-white/75">
                <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-(--gold-500)/15 text-[11px] font-medium text-(--gold-500)">
                    1
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                      Define intent
                    </p>
                    <p className="mt-1 text-xs text-white/80">
                      Choose a preset family (solitaire, halo, bezel) and set
                      base measurements like ring size and stone shape.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/3 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[11px] font-medium text-white/80">
                    2
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                      Adjust the mesh
                    </p>
                    <p className="mt-1 text-xs text-white/80">
                      Use sliders for band width, shoulder profile, gallery
                      height, and claw thickness. The mesh keeps proportions
                      consistent while you tweak.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/3 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[11px] font-medium text-white/80">
                    3
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                      Check constraints
                    </p>
                    <p className="mt-1 text-xs text-white/80">
                      Optional checks flag combinations that may be difficult to
                      manufacture, like very thin bands or extreme stone heights.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-(--gold-500)/15 text-[11px] font-medium text-(--gold-500)">
                    4
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                      Export to CAD
                    </p>
                    <p className="mt-1 text-xs text-white/80">
                      Export a clean starting mesh and a small set of key
                      measurements so your CAD tool has everything in one place.
                    </p>
                  </div>
                </li>
              </ol>

              {/* Animated param chips */}
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/60">
                <motion.div
                  className="inline-flex items-center gap-1 rounded-full border border-(--gold-500)/40 bg-(--gold-500)/10 px-2 py-1"
                  initial={{ y: 0 }}
                  animate={{ y: -4 }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
                  <span>Stone size</span>
                </motion.div>
                <motion.div
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1"
                  initial={{ y: 0 }}
                  animate={{ y: -2 }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  <span>Band width</span>
                </motion.div>
                <motion.div
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1"
                  initial={{ y: 0 }}
                  animate={{ y: -3 }}
                  transition={{
                    duration: 3.6,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span>Gallery height</span>
                </motion.div>
                <motion.div
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1"
                  initial={{ y: 0 }}
                  animate={{ y: -1 }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                  <span>Claw thickness</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* What is live vs in progress */}
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
          {/* Live today */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-4 rounded-3xl border border-white/12 bg-black/70 p-5 sm:p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              Available in early access
            </h2>
            <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
              The Mesh engine is intentionally narrow at the moment. We prefer a
              smaller set of workflows that are reliable instead of a larger set
              that is difficult to trust.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-white/75">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span>Solitaire and halo ring presets with core parameters.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span>Simple pendant layouts with stone size and bail options.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span>Dimension bundles that keep key measurements grouped.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span>Export to a clean neutral mesh ready for CAD refinement.</span>
              </li>
            </ul>
          </motion.div>

          {/* In progress */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-4 rounded-3xl border border-white/12 bg-black/60 p-5 sm:p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
              Areas we are exploring next
            </h2>
            <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
              We avoid setting fixed dates here, but this gives you a sense of the
              direction. If any of these are critical for your studio, we can
              discuss them during an onboarding call.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-white/75">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>More complex stone layouts for bands and clusters.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>Better support for matching sets (rings and pendants).</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>
                  Additional checks around minimum thickness and stone security.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>
                  Tighter handoff into specific CAD environments used by studios.
                </span>
              </li>
            </ul>
          </motion.div>
        </section>

        {/* Who benefits and CTA */}
        <section className="rounded-3xl border border-white/12 bg-black/75 p-5 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"
          >
            <div className="md:max-w-xl space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                When the mesh layer makes sense
              </h3>
              <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                The Mesh engine is most useful if you have designs that repeat with
                controlled variation. If every piece is a one-off experiment, it may
                be less of a fit. During early access we are honest about this so
                you do not end up reorganising your work for the wrong tool.
              </p>
              <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                If you are unsure, a short call walking through two or three of your
                existing pieces is usually enough to see whether a mesh-based
                workflow will actually help.
              </p>
            </div>

            <div className="flex flex-col gap-3 text-xs text-white/70 md:w-72">
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-5 text-xs font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={handleScrollToContact}
              >
                Talk about your workflow
              </Button>
              <p>
                Or email{" "}
                <a
                  href="mailto:hello@wireframe.studio?subject=Mesh%20engine"
                  className="font-medium text-(--gold-500) hover:underline"
                >
                  hello@wireframe.studio
                </a>{" "}
                with a brief description of how you design and produce your pieces.
              </p>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default MeshPage;
