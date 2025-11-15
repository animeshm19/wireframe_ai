import React from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";

export function CareersPage() {
  const [email, setEmail] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: hook this up to your backend / form tool
    console.log("Careers waitlist email:", email);
    setEmail("");
  };

  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-black via-[#13010c] to-black py-20 sm:py-24">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="mesh-bg absolute inset-0 opacity-20" />
        <div className="absolute -top-40 left-1/2 h-80 w-[120%] -translate-x-1/2 bg-[radial-gradient(circle_at_top,_rgba(131,110,118,0.35),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[10%] h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(198,155,178,0.45),_transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-10%] right-[5%] h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.18),_transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass mx-auto max-w-3xl px-6 py-8 sm:px-10 sm:py-10"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-(--gold-400)" />
            <span>Careers at wireframe</span>
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Hiring soon<span className="shiny-gold">.</span>
          </h1>

          <p className="mt-3 text-sm text-white/70 sm:text-base">
            We are building a tiny, sharp team at the intersection of{" "}
            <span className="gold-text">
              generative AI, parametric CAD, and jewelry craft
            </span>
            . We are not hiring just yet, but if you love meshes, metal, and
            meticulous details, we want to know you exist.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] text-white/70">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              Product Engineer · 3D
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              ML Engineer · Geometry
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              Designer · Brand &amp; Product
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              Customer Partner · Jewelry
            </span>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Drop your best email to get pinged first"
              className="glassy-input max-w-sm text-xs sm:text-sm"
            />
            <Button
              type="submit"
              size="sm"
              className="w-full rounded-full border border-[var(--gold-500)] bg-[var(--background)] text-xs font-medium uppercase tracking-[0.18em] text-black hover:bg-(--background) sm:w-auto"
            >
              Join the early talent list
            </Button>
          </form>

          <p className="mt-4 text-[11px] text-white/55">
            No spam, no fake “we&apos;ll keep you on file” promises.
            <br className="hidden sm:block" />
            Just a note from us when we open roles that actually match you.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
