import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import LightRays from "./LightRays";

const logoUrl = "/icons/Wireframe.png";

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#13010c] text-white">
      {/* Background mesh and rays */}
      <div className="absolute inset-0 z-0 mesh-bg" />
      <div className="absolute inset-0 z-10 opacity-70 pointer-events-none">
        <LightRays
          raysOrigin="top-center"
          raysColor="#2g3824"
          raysSpeed={1.4}
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
      <div className="relative z-30 mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        {/* Logo + breadcrumb pill */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center gap-3 text-xs text-white/60"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500) animate-pulse" />
            <span className="uppercase tracking-[0.18em]">Wireframe studio</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <Link to="/" className="hover:text-(--gold-500)">
              Home
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-white/55">Coming soon</span>
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 via-black/60 to-black/90 p-[1px] shadow-[0_0_80px_rgba(0,0,0,0.8)]"
        >
          <div className="relative flex flex-col gap-10 rounded-[1.4rem] bg-black/70 px-6 py-7 sm:px-10 sm:py-10 lg:flex-row">
            {/* Accent blur orb */}
            <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-(--gold-500)/30 blur-3xl opacity-60" />

            {/* Left: copy */}
            <div className="relative z-10 flex-1 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-(--gold-500)/40 bg-(--gold-500)/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-(--gold-500)">
                <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500) shadow-[0_0_12px_rgba(244,197,122,0.9)]" />
                <span>In the workshop</span>
              </div>

              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.7rem]">
                This page is still being cut and polished.
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                We are wiring this section into the mesh engine so it feels as
                intentional as a finished collection. While we refine it, you can
                still explore Wireframe, book a demo, or join the early access list.
              </p>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] sm:text-xs">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="uppercase tracking-[0.18em] text-white/70">
                    Status · In progress
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">
                  <span className="h-1 w-1 rounded-full bg-(--gold-500)" />
                  <span>Private studio previews first</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-5 text-xs font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/#contact";
                  }}
                >
                  Book a demo
                </Button>

                <Button
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent px-5 text-xs font-medium uppercase tracking-[0.2em] text-white/80 hover:bg-white/5"
                  size="sm"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                >
                  Back to home
                </Button>

                <a
                  href="mailto:hello@wireframe.studio"
                  className="text-xs text-white/60 hover:text-(--gold-500)"
                >
                  Say hi at hello@wireframe.studio
                </a>
              </div>
            </div>

            {/* Right: mini roadmap / card */}
            <div className="relative z-10 w-full max-w-xs self-stretch rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:max-w-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-7 w-7 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                  <img
                    src={logoUrl}
                    alt="wireframe logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-white/90">Wireframe roadmap</p>
                  <p className="text-[11px] text-white/40">Snapshot for this section</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-white/70">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                    Current focus
                  </p>
                  <p className="text-sm text-white/80">
                    UX flows for mesh presets, CAD export, and studio permissions.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                    Milestones
                  </p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
                      <span>Internal prototypes with a small group of studios.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/50" />
                      <span>Polish the flows and error states so they feel invisible.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/25" />
                      <span>Roll out to early access accounts in phases.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/60">
                  <p className="mb-1 font-medium text-white/80">
                    Want early access for this area
                  </p>
                  <p className="mb-2 text-[11px] text-white/55">
                    Mention which part you are viewing and your current CAD stack when
                    you reach out. That helps us prioritise the right workflows.
                  </p>
                  <a
                    href="mailto:hello@wireframe.studio?subject=Wireframe%20early%20access"
                    className="text-[11px] font-medium text-(--gold-500) hover:underline"
                  >
                    Join the early access list
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tiny bottom hint */}
        <p className="mt-6 text-center text-[11px] text-white/35">
          Crafted in Canada for studios everywhere.
        </p>
      </div>
    </main>
  );
}
