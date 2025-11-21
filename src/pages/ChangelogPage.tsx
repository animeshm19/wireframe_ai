import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

type ChangelogEntry = {
  id: string;
  date: string;
  label: string; // short date label
  title: string;
  summary: string;
  tags: string[];
  items: string[];
};

const ENTRIES: ChangelogEntry[] = [
  {
    id: "2025-11-mesh-ring-presets",
    date: "2025-11-10",
    label: "Nov 10, 2025",
    title: "Mesh ring presets: first production flows",
    summary:
      "Introduced early presets for solitaire and halo rings with a small, stable set of parameters.",
    tags: ["Mesh", "Rings", "Early access"],
    items: [
      "Added base presets for solitaire and halo rings with adjustable band width, stone size, and gallery height.",
      "Grouped key dimensions into a single bundle to make handoff to CAD clearer.",
      "Improved handling of extreme values so meshes fail more gracefully instead of breaking silently.",
    ],
  },
  {
    id: "2025-10-export-improvements",
    date: "2025-10-18",
    label: "Oct 18, 2025",
    title: "Cleaner exports for CAD workflows",
    summary:
      "Made exports more predictable so CAD work starts with a consistent base rather than small surprises.",
    tags: ["Export", "CAD handoff"],
    items: [
      "Simplified export formats so each mesh ships with a small, documented set of measurements.",
      "Reduced noise in exported geometry for rings with very thin bands.",
      "Clarified which parameters are exported and which are only used inside Wireframe.",
    ],
  },
  {
    id: "2025-09-workflow-notes",
    date: "2025-09-25",
    label: "Sep 25, 2025",
    title: "Workflow notes attached to meshes",
    summary:
      "Allowed teams to attach simple notes to meshes so design intent travels with the file.",
    tags: ["Workflow", "Studios"],
    items: [
      "Added per-mesh notes for things like stone preferences, finishing details, or production constraints.",
      "Shown notes alongside key dimensions during export to keep context in one place.",
      "Kept notes intentionally lightweight so they do not turn into a separate documentation system.",
    ],
  },
  {
    id: "2025-08-private-preview",
    date: "2025-08-07",
    label: "Aug 7, 2025",
    title: "Start of private previews with studios",
    summary:
      "Began working with a small group of studios to ground the product in real workflows.",
    tags: ["Early access", "Studios"],
    items: [
      "Set up a small early-access group with a mix of independent studios and in-house teams.",
      "Focused conversations on repeatable pieces rather than one-off custom designs.",
      "Used feedback to narrow scope instead of adding broader, unfocused features.",
    ],
  },
];

const TAGS = ["All", "Mesh", "Export", "Rings", "Workflow", "Studios", "Early access", "CAD handoff"];

export function ChangelogPage() {
  const [activeTag, setActiveTag] = useState<string>("All");

  const filtered = ENTRIES.filter((entry) =>
    activeTag === "All" ? true : entry.tags.includes(activeTag)
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#13000c] text-white">
      {/* Background: diagonal bands + subtle noise */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(135deg,rgba(250,250,255,0.06)_0%,transparent_35%,transparent_65%,rgba(250,250,255,0.03)_100%),radial-gradient(circle_at_top,#2b111a,transparent_55%),radial-gradient(circle_at_bottom,#050003,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-50 mix-blend-soft-light bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)]" />

      {/* Content */}
      <div className="relative z-30 mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-16 pt-24 sm:px-6 lg:px-8">
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
              <span className="uppercase tracking-[0.18em]">Changelog</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <Link to="/" className="hover:text-(--gold-500)">
                Home
              </Link>
              <span className="text-white/30">/</span>
              <span className="text-white/60">Changelog</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A simple record of what is changing in Wireframe.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                This page is meant to show real progress, not a roadmap full of promises.
                Updates are focused on how the Mesh engine and supporting workflows behave
                in day-to-day use for early studios.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs text-white/55 md:items-end">
              <p>Early access · updates when changes are ready, not on a fixed schedule.</p>
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={() => {
                  const el = document.getElementById("contact");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    window.location.href = "/#contact";
                  }
                }}
              >
                Talk about your workflow
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Tag filter */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="mb-6"
        >
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[11px] backdrop-blur">
            <span className="mr-1 text-white/45">Filter by focus:</span>
            {TAGS.map((tag) => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={
                    "relative rounded-full px-3 py-1 transition-colors " +
                    (isActive
                      ? "bg-(--gold-500)/15 text-(--gold-500) border border-(--gold-500)/60"
                      : "border border-transparent text-white/60 hover:border-white/15 hover:text-white/80")
                  }
                >
                  {tag}
                  {isActive && (
                    <motion.span
                      layoutId="changelog-tag-pill"
                      className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-(--gold-500)/10"
                      transition={{ type: "spring", stiffness: 250, damping: 24 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Timeline */}
        <section className="relative mt-2">
          {/* vertical line */}
          <div className="pointer-events-none absolute left-[10px] top-0 h-full w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent md:left-[11px]" />

          <ul className="space-y-5">
            {filtered.map((entry, index) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
                className="relative flex gap-4 pl-6 sm:gap-5 sm:pl-7"
              >
                {/* dot */}
                <div className="absolute left-0 top-2 flex h-5 w-5 items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-(--gold-500) shadow-[0_0_0_4px_rgba(244,197,122,0.25)]" />
                </div>

                {/* card */}
                <div className="flex-1 rounded-2xl border border-white/12 bg-black/65 p-4 sm:p-5">
                  <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        {entry.label}
                      </p>
                      <h2 className="text-sm font-semibold text-white/90 sm:text-base">
                        {entry.title}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] text-white/55">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mb-3 text-xs leading-relaxed text-white/70 sm:text-sm">
                    {entry.summary}
                  </p>

                  <ul className="space-y-1.5 text-xs text-white/75 sm:text-[13px]">
                    {entry.items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1 h-1 w-1 rounded-full bg-white/50" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.li>
            ))}
          </ul>

          {filtered.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/70 sm:text-sm">
              No entries match this filter yet. You can switch back to{" "}
              <button
                type="button"
                className="font-medium text-(--gold-500) hover:underline"
                onClick={() => setActiveTag("All")}
              >
                All
              </button>
              .
            </div>
          )}
        </section>

        {/* Bottom hint */}
        <footer className="mt-10 border-t border-white/10 pt-4 text-[11px] text-white/45">
          <p>
            If you rely on a specific workflow and want to know how stable it is,
            reach out at{" "}
            <a
              href="mailto:hello@wireframe.studio?subject=Changelog%20question"
              className="font-medium text-(--gold-500) hover:underline"
            >
              hello@wireframe.studio
            </a>
            . We prefer clear answers over vague roadmaps.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default ChangelogPage;
