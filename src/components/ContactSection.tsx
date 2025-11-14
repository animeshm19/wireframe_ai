// src/components/ContactSection.tsx
import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

export function ContactSection() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    // For now, just log it. Hook this up to your backend / email service later.
    console.log("Demo request:", payload);
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden py-20 sm:py-24 lg:py-28"
    >
      {/* Ambient glow / orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="float-slow absolute -top-32 -left-24 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(225,185,92,0.35),transparent_60%)] blur-3xl opacity-70" />
        <div className="float-slow-delayed absolute bottom-[-5rem] right-[-5rem] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(87,178,255,0.32),transparent_65%)] blur-3xl opacity-80" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-10 lg:space-y-12"
        >
          {/* Heading row */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
            {/* Left: copy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="space-y-5 sm:space-y-6"
            >
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/50">
                Book a live walkthrough
              </p>
              <h2 className="shiny-gold text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight">
                See Wireframe in your{" "}
                <span className="text-white">jewelry workflow.</span>
              </h2>
              <p className="text-sm sm:text-base text-white/70 max-w-md">
                Share a bit about your business and how you design or quote
                jewelry today. We’ll tailor a live demo to your exact workflow
                and show how Wireframe can plug in without breaking anything.
              </p>

              <div className="grid gap-3 text-xs sm:text-sm text-white/75 sm:grid-cols-2 max-w-lg">
                <div className="glow-chip">
                  <span className="chip-dot" />
                  <div>
                    <p className="font-medium text-white">AI parametric CAD</p>
                    <p className="text-white/60">
                      Turn text briefs into editable 3D-ready jewelry concepts.
                    </p>
                  </div>
                </div>
                <div className="glow-chip">
                  <span className="chip-dot" />
                  <div>
                    <p className="font-medium text-white">
                      Faster quoting & pricing
                    </p>
                    <p className="text-white/60">
                      Price custom pieces with live metal rates and stones.
                    </p>
                  </div>
                </div>
                <div className="glow-chip">
                  <span className="chip-dot" />
                  <div>
                    <p className="font-medium text-white">Multi-store teams</p>
                    <p className="text-white/60">
                      Share projects across designers, sales, and production.
                    </p>
                  </div>
                </div>
                <div className="glow-chip">
                  <span className="chip-dot" />
                  <div>
                    <p className="font-medium text-white">No hard switch</p>
                    <p className="text-white/60">
                      Keep your current CAD stack — Wireframe layers on top.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-white/45">
                We usually reply within <span className="font-semibold">1</span>{" "}
                business day.
              </p>
            </motion.div>

            {/* Right: form */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="glass glow-card relative z-10 space-y-4 sm:space-y-5 px-4 py-4 sm:px-6 sm:py-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-medium text-white">
                  Tell us about your studio
                </h3>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/60">
                  Demo request
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Full name
                  </label>
                  <input
                    name="fullName"
                    required
                    className="glassy-input"
                    placeholder="Animesh Mittal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Work email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="glassy-input"
                    placeholder="you@brandstudio.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Business / studio name
                  </label>
                  <input
                    name="company"
                    required
                    className="glassy-input"
                    placeholder="Aurora Atelier"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Website (optional)
                  </label>
                  <input
                    name="website"
                    className="glassy-input"
                    placeholder="https://yourstudio.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Team size
                  </label>
                  <select
                    name="teamSize"
                    className="glassy-input glassy-select"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    <option value="1-3">1–3 people</option>
                    <option value="4-10">4–10 people</option>
                    <option value="11-50">11–50 people</option>
                    <option value="50+">50+ people</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Primary use case
                  </label>
                  <select
                    name="useCase"
                    className="glassy-input glassy-select"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    <option value="ai-cad">AI jewelry design / CAD</option>
                    <option value="quoting">Quoting & pricing custom work</option>
                    <option value="both">Both design & pricing</option>
                    <option value="other">Something else</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  What should we prepare for the demo?
                </label>
                <textarea
                  name="message"
                  rows={4}
                  className="glassy-input resize-none"
                  placeholder="Share how you work today, your CAD tools, and any specific workflows you want us to walk through…"
                />
              </div>

              <Button
                type="submit"
                className="mt-2 h-10 w-full rounded-xl text-sm font-medium"
              >
                Request demo
              </Button>

              <p className="text-[11px] text-white/45 text-center">
                By submitting this form you agree to be contacted about Wireframe.
                No spam, only thoughtful follow-ups.
              </p>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
