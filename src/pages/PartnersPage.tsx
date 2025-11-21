// src/pages/PartnersPage.tsx
import React from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

const logoUrl = "/icons/Wireframe.png";

type StudioProfile = {
  id: string;
  label: string;
  title: string;
  description: string;
  highlights: string[];
};

const STUDIOS: StudioProfile[] = [
  {
    id: "independent",
    label: "Independent studio",
    title: "Small team balancing custom work and core lines.",
    description:
      "Uses Wireframe to keep a handful of key ring and pendant families consistent across many small variations.",
    highlights: [
      "Mesh presets for their most common engagement designs.",
      "Notes to capture client preferences and constraints.",
      "Exports into the CAD tools they already use.",
    ],
  },
  {
    id: "brand",
    label: "Brand design team",
    title: "Growing brand with a seasonal catalog.",
    description:
      "Anchors proportions for signature collections so new pieces feel related even when stones and details change.",
    highlights: [
      "Mesh families that keep signature profiles consistent.",
      "Shared dimensions so designers and CAD specialists align.",
      "Gradual rollout across lines instead of a big switch.",
    ],
  },
  {
    id: "cad-workshop",
    label: "CAD workshop",
    title: "Technical team supporting multiple labels.",
    description:
      "Organises repeating technical patterns while keeping detailed work inside their main CAD environment.",
    highlights: [
      "Mesh templates for recurring technical challenges.",
      "Shared guidance on what is fixed and what can move.",
      "Cleaner starting points for repeat requests.",
    ],
  },
  {
    id: "production-led",
    label: "Production-led team",
    title: "Production-led workshop prioritising reliability.",
    description:
      "Defines safe ranges for dimensions before designs move too far, so pieces stay practical to manufacture.",
    highlights: [
      "Simple constraints around thickness and stone height.",
      "Shared language when pieces push those limits.",
      "Clearer feedback loops between design and the bench.",
    ],
  },
];

export function PartnersPage() {
  const handleContactClick = () => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/#contact";
    }
  };

  const cardShellClasses =
    "group relative h-full rounded-3xl border border-white/12 bg-black/70 p-[1px] " +
    "shadow-[0_0_40px_rgba(0,0,0,0.85)] transition-colors transition-shadow duration-300 " +
    "hover:border-(--gold-500)/70 hover:shadow-[0_0_55px_rgba(244,197,122,0.35)]";

  const innerCardClasses =
    "relative flex h-full flex-col justify-between rounded-[1.4rem] " +
    "bg-gradient-to-br from-white/5 via-black/85 to-black/95 px-5 py-5 sm:px-6 sm:py-6";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#13000c] text-white">
      {/* Background: overlapping arcs */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,#2b111a,transparent_55%),radial-gradient(circle_at_bottom_right,#050003,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-45 bg-[conic-gradient(from_200deg_at_10%_0%,rgba(244,197,122,0.18),transparent_40%,transparent_70%,rgba(244,197,122,0.14))]" />

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
              <span className="uppercase tracking-[0.18em]">Studio partners</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <Link to="/" className="hover:text-(--gold-500)">
                Home
              </Link>
              <span className="text-white/30">/</span>
              <span className="text-white/60">Studios</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Working with studios that care about repeatable quality.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                Wireframe is in private previews with a small number of studios.
                We focus on teams that already have a strong practice and want
                more structure around how designs change and repeat.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs text-white/55 md:items-end">
              <p>Limited early access · a few deep collaborations at a time.</p>
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={handleContactClick}
              >
                Start a conversation
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Symmetrical studio profile cards */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="grid gap-5 md:grid-cols-2">
            {STUDIOS.map((studio, index) => (
              <motion.article
                key={studio.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.03 }}
                className={cardShellClasses}
              >
                <div className={innerCardClasses}>
                  {/* top meta */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-[11px] font-medium text-white/80">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                          {studio.label}
                        </p>
                        <p className="text-xs font-medium text-white/85">
                          {studio.title}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-full border border-white/12 bg-white/5 px-2 py-1 text-[10px] text-white/55">
                      Example profile
                    </div>
                  </div>

                  {/* middle description */}
                  <p className="mb-3 text-xs leading-relaxed text-white/70 sm:text-[13px]">
                    {studio.description}
                  </p>

                  {/* highlights */}
                  <ul className="space-y-1.5 text-xs text-white/75 sm:text-[13px]">
                    {studio.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60 group-hover:bg-(--gold-500) transition-colors" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* Bottom: two matching fancy cards */}
        <section className="grid gap-5 md:grid-cols-2">
          {/* Card 1: Early access */}
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cardShellClasses}
          >
            <div className={innerCardClasses}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                    What early access looks like
                  </p>
                  <p className="text-xs font-medium text-white/85">
                    A simple four-step collaboration.
                  </p>
                </div>
                <div className="rounded-full border border-white/12 bg-white/5 px-2 py-1 text-[10px] text-white/55">
                  Process
                </div>
              </div>

              <ol className="space-y-3 text-xs text-white/75 sm:text-[13px]">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-(--gold-500)/18 text-[11px] font-medium text-(--gold-500)">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-white/85">Initial conversation</p>
                    <p className="text-xs text-white/70">
                      We walk through a few pieces you make often and how you move
                      from idea to CAD to production.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium text-white/80">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-white/85">Focused setup</p>
                    <p className="text-xs text-white/70">
                      We decide on a small number of mesh presets that make sense for
                      you instead of trying to cover your entire catalog at once.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium text-white/80">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-white/85">Real-world use</p>
                    <p className="text-xs text-white/70">
                      You use Wireframe on actual projects. We listen for where it
                      saves time and where it creates friction.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-(--gold-500)/18 text-[11px] font-medium text-(--gold-500)">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-white/85">Adjust and decide</p>
                    <p className="text-xs text-white/70">
                      We refine flows based on what you actually use. If we are not a
                      fit, we say that clearly instead of stretching the product.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </motion.article>

          {/* Card 2: Shared expectations */}
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className={cardShellClasses}
          >
            <div className={innerCardClasses}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                    <img
                      src={logoUrl}
                      alt="wireframe logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                      Shared expectations
                    </p>
                    <p className="text-xs font-medium text-white/85">
                      What both sides can count on.
                    </p>
                  </div>
                </div>
                <div className="rounded-full border border-white/12 bg-white/5 px-2 py-1 text-[10px] text-white/55">
                  How we work
                </div>
              </div>

              <ul className="mb-3 space-y-2 text-xs text-white/75 sm:text-[13px]">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
                  <span>We are clear about what is stable and what is experimental.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                  <span>We treat your feedback as product input, not ticket volume.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/50" />
                  <span>We do not expect you to change every part of your process.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span>If we are not a good match, we say that early.</span>
                </li>
              </ul>

              <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/70">
                <p className="mb-1 font-medium text-white/80">
                  Interested in becoming a partner studio
                </p>
                <p className="mb-2">
                  Share a brief note about your team, the pieces you make most
                  often, and where repeat work could be more structured.
                </p>
                <a
                  href="mailto:hello@wireframe.studio?subject=Studio%20partner"
                  className="font-medium text-(--gold-500) hover:underline"
                >
                  Email hello@wireframe.studio
                </a>
              </div>
            </div>
          </motion.article>
        </section>
      </div>
    </main>
  );
}

export default PartnersPage;
