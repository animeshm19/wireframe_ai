import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import LightRays from "./LightRays";
import { FireworksBackground } from "@/components/ui/shadcn-io/fireworks-background";
import { FlickeringGrid } from "@/components/ui/shadcn-io/flickering-grid";
import chat from "@/assets/chat.svg";

type HeroProps = {
  onTryNow?: () => void; // optional, in case you want to use it later
};

export function Hero(_props: HeroProps) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#13000c] text-white pt-28 sm:pt-36">
      {/* Deep radial gradient (matches MeshPage) */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_#2b111a,_transparent_55%),radial-gradient(circle_at_bottom,_#050003,_transparent_55%)]" />

      {/* Flickering grid core (little dots) */}
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

      {/* Soft moving light rays */}
      <div className="pointer-events-none absolute inset-0 z-5">
        <LightRays
          raysOrigin="top-center"
          raysColor="#13000c"
          raysSpeed={1.5}
          lightSpread={1}
          rayLength={0.6}
          followMouse
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
          className="custom-rays"
        />
      </div>

      {/* Floating glow orbs */}
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

      {/* CONTENT */}
      <div className="relative z-30 mx-auto min-h-screen max-w-5xl px-4 text-center">
        <motion.h1
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="font-semibold tracking-tight"
        >
          <span className="block text-5xl sm:text-6xl lg:text-7xl shiny-text">
            The AI Powered
          </span>
          <span className="block text-5xl sm:text-6xl lg:text-7xl">
            <span className="shiny-gold">Jewelry CAD</span>{" "}
            <span className="shiny-text">Tool</span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mx-auto mt-4 max-w-3xl text-base text-white/80 sm:text-lg"
        >
          wireframe turns text into editable, parametric 3D designs - ready to
          tweak, export (STL / STEP), and manufacture.
        </motion.p>

        {/* === New fancy CTA === */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-8 flex justify-center"
        >
          <Link to="/chat" target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 shadow-[0_18px_50px_rgba(0,0,0,0.85)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_65px_rgba(0,0,0,0.95)] sm:text-sm"
            >
              {/* Soft halo behind */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-x-6 -inset-y-2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(180,40,122,0.28),transparent_55%),radial-gradient(circle_at_bottom,_rgba(232,30,120,0.18),transparent_55%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />

              {/* Golden micro-pill that slides slightly */}
              <span className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#13000c] via-[#13000c] to-[#13000c] px-4 py-2 text-[13px] font-medium text-black shadow-[0_0_30px_rgba(50,40,50,0.5)] transition-transform duration-300 group-hover:translate-x-0.5">
                {/* Live pulse dot */}
                <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e12882] shadow-[0_0_14px_rgba(244,197,122,0.95)]"></span>
                  <span className="absolute inset-0 rounded-full border border-white/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
                </span>
                <span className="shiny-text">Open mesh chat</span>
              </span>

              {/* Right side subtle label + chevron */}
              <span className="relative flex items-center gap-2 pr-2 pl-1 text-[11px] text-white/55 sm:text-xs">
                <span>Live preview</span>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/25 bg-white/5 text-[9px] text-white/70">
                  →
                </span>
              </span>
            </Button>
          </Link>
        </motion.div>

        {/* Mesh-style chat card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-10 w-full max-w-4xl"
        >
          <div className="glass relative overflow-hidden rounded-3xl p-4">
            <div className="relative aspect-auto overflow-hidden rounded-2xl border border-white/10">
              <motion.img
                src={chat}
                alt="chat card"
                className="absolute inset-0 h-full w-full transform-gpu object-contain"
                initial={{ scale: 0.94 }}
                whileHover={{ scale: 1.0 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 24,
                  mass: 0.6,
                }}
              />

              <svg viewBox="0 0 800 450" className="h-full w-full">
                <defs>
                  <linearGradient id="g-hero" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#e1b95c" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#e1b95c" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {Array.from({ length: 20 }).map((_, i) => (
                  <line
                    key={`v-hero-${i}`}
                    x1={i * 40}
                    y1={0}
                    x2={i * 40}
                    y2={450}
                    stroke="url(#g-hero)"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={`h-hero-${i}`}
                    x1={0}
                    y1={i * 40}
                    x2={800}
                    y2={i * 40}
                    stroke="url(#g-hero)"
                    strokeWidth="1"
                  />
                ))}
              </svg>

              <motion.div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(120deg, transparent, rgba(19, 1, 12, 0.08), transparent)",
                }}
                animate={{ x: ["-20%", "120%"] }}
                transition={{
                  repeat: Infinity,
                  duration: 3.8,
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
