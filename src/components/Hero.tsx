import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import LightRays from "./LightRays";
import { FireworksBackground } from "@/components/ui/shadcn-io/fireworks-background";
// if your generator used a different folder, check the created file path and adjust

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-28 sm:pt-36">
      {/* Backgrounds */}
      <div className="absolute inset-0 z-0 mesh-bg" />
      <div className="absolute inset-0 z-10">
        <LightRays
          raysOrigin="top-center"
          raysColor="#2g3824"
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
      {/* 3) Fireworks overlay (canvas is transparent, won’t change bg color) */}
      <FireworksBackground
        className="absolute inset-0 z-15 pointer-events-none"
        // keep clicks on your buttons; fireworks still auto-launch
        color={["rgb(240, 201, 216)", "rgb(198, 155, 178)"]}           // your gold + white
        population={0.5}                           // how many auto fireworks (higher = more)
        fireworkSpeed={{ min: 4, max: 7 }}
        fireworkSize={{ min: 2, max: 4 }}
        particleSpeed={{ min: 2, max: 7 }}
        particleSize={{ min: 1, max: 4 }}
      />
      {/* CONTENT */}
      <div className="relative z-20 mx-auto max-w-5xl px-4 text-center min-h-screen">
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
          className="mx-auto mt-4 max-w-3xl text-base sm:text-lg text-white/80"
        >
          wireframe turns text into editable, parametric 3D designs - ready to tweak,
          export (STL / STEP), and manufacture.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-7 flex items-center justify-center"
        >
          <Button size="lg" className="h-12 rounded-xl px-6 text-base">
            Book a Demo
          </Button>
        </motion.div>

        {/* === MeshShowcase-style card inside Hero === */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-10 w-full max-w-4xl"
        >
          {/* Faux 3D glass window */}
          <div className="glass relative overflow-hidden rounded-3xl p-4">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10">
              <svg viewBox="0 0 800 450" className="h-full w-full">
                <defs>
                  <linearGradient id="g-hero" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#e1b95c" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#e1b95c" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* grid */}
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

              {/* animated shimmer */}
              <motion.div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(120deg, transparent, rgba(225,185,92,0.08), transparent)",
                }}
                animate={{ x: ["-20%", "120%"] }}
                transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
        {/* === /card === */}
      </div>
    </section>
  );
}
