import React from "react";
import { motion } from "framer-motion";

export function MeshShowcase() {
  return (
    <section id="mesh" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-center">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-5"
          >
            <h3 className="text-2xl sm:text-3xl font-semibold gold-text">
              Procedural Mesh &amp; Filigree
            </h3>
            <p className="mt-3 text-white/80">
              Loopable, parameterized patterns with collision-aware stones and
              adaptive thickness. Ready for casting.
            </p>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="md:col-span-7"
          >
            {/* Faux 3D grid / glass window */}
            <div className="glass relative overflow-hidden rounded-3xl p-4">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10">
                <svg viewBox="0 0 800 450" className="h-full w-full">
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e1b95c" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#e1b95c" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>

                  {/* grid */}
                  {Array.from({ length: 20 }).map((_, i) => (
                    <line
                      key={`v${i}`}
                      x1={i * 40}
                      y1={0}
                      x2={i * 40}
                      y2={450}
                      stroke="url(#g)"
                      strokeWidth="1"
                    />
                  ))}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <line
                      key={`h${i}`}
                      x1={0}
                      y1={i * 40}
                      x2={800}
                      y2={i * 40}
                      stroke="url(#g)"
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
        </div>
      </div>
    </section>
  );
}
