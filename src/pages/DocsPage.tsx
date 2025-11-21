import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

type PersonaId = "designer" | "cad" | "studio";

const PERSONAS: {
  id: PersonaId;
  label: string;
  subtitle: string;
}[] = [
  {
    id: "designer",
    label: "Designer",
    subtitle: "You sketch ideas and shape collections.",
  },
  {
    id: "cad",
    label: "CAD specialist",
    subtitle: "You turn concepts into precise geometry.",
  },
  {
    id: "studio",
    label: "Studio lead",
    subtitle: "You keep projects and clients moving.",
  },
];

const personaCopy: Record<
  PersonaId,
  {
    intro: string;
    flowTitle: string;
    flow: string[];
    notesTitle: string;
    notes: string[];
  }
> = {
  designer: {
    intro:
      "Wireframe gives you a structured place to define how a piece should behave when it changes, without asking you to learn a full new CAD system.",
    flowTitle: "A typical day with Wireframe as a designer",
    flow: [
      "Start from a mesh preset that matches the type of piece you are designing, such as a solitaire ring or a simple pendant.",
      "Adjust core proportions with a few parameters instead of redrawing the band or setting from scratch every time.",
      "Save meshes for pieces that are likely to repeat, such as popular engagement designs or best-selling pendants.",
      "Add short notes that capture intent, like how much variation you are comfortable with in band thickness or stone size.",
      "Export a mesh and key measurements so your CAD specialist starts from the same structure you see in your head.",
    ],
    notesTitle: "What this does not try to do",
    notes: [
      "Wireframe does not replace sketching or your early exploration tools.",
      "It is not aiming to be a full 3D environment for visual exploration.",
      "It focuses on repeatable structures more than one-off experimental pieces.",
    ],
  },
  cad: {
    intro:
      "For CAD specialists, Wireframe’s role is to give you a clean starting point and a small set of parameters that explain how a piece is meant to move.",
    flowTitle: "A typical day with Wireframe as a CAD specialist",
    flow: [
      "Receive a mesh package with a base mesh and a small set of well-named dimensions.",
      "Review designer notes that explain intent, such as minimum comfort for band thickness or how claws should read from the top.",
      "Import the mesh into your CAD software and refine details that are better handled there, like micro prong styling or engraving.",
      "Use the provided dimensions to keep measurements consistent when you adapt the piece to different sizes or stones.",
      "If a client change returns later, request an updated mesh instead of rebuilding a similar piece from earlier files.",
    ],
    notesTitle: "Where Wireframe stops and CAD begins",
    notes: [
      "Wireframe does not try to cover detailed operations that are already strong in your existing CAD tools.",
      "It does not enforce a specific CAD application; it is a neutral starting point.",
      "It is deliberately conservative with geometry so you can finish details where you are most comfortable.",
    ],
  },
  studio: {
    intro:
      "As a studio lead, Wireframe is a way to make repeated work more predictable and easier to hand off, without forcing everyone into one rigid process.",
    flowTitle: "How Wireframe fits into your studio",
    flow: [
      "Identify a small set of pieces that repeat often and cause the most manual rework today.",
      "Work with designers and CAD specialists to define mesh presets for those pieces and agree on the core parameters.",
      "Use Wireframe as the place where those presets live, so new variations start from the same structure.",
      "Encourage teams to attach notes that explain what is fixed and what is flexible in each design.",
      "Use the shared meshes and dimensions to reduce misunderstandings when designs change between client conversations.",
    ],
    notesTitle: "What this is not",
    notes: [
      "Wireframe is not a full studio management or order tracking system.",
      "It does not replace the tools you use for quoting, invoicing, or scheduling.",
      "It is focused on the design and CAD handoff layer, not everything around it.",
    ],
  },
};

export function DocsPage() {
  const [activePersona, setActivePersona] = useState<PersonaId>("designer");
  const data = personaCopy[activePersona];

  const handleBookDemoClick = () => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/#contact";
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#13000c] text-white">
      {/* Background: gentle vertical bands */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_bottom,rgba(250,250,255,0.04),transparent_50%),radial-gradient(circle_at_top,#2b111a,transparent_55%),radial-gradient(circle_at_bottom,#050003,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-soft-light bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_6px)]" />

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
              <span className="uppercase tracking-[0.18em]">How it fits into your day</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <Link to="/" className="hover:text-(--gold-500)">
                Home
              </Link>
              <span className="text-white/30">/</span>
              <span className="text-white/60">Docs</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A workflow guide, not a manual.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                Wireframe sits between sketching and detailed CAD work. These guides show
                where it adds structure and where it intentionally gets out of the way,
                so each role knows what to expect.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs text-white/55 md:items-end">
              <p>Early access · focused on real workflows, not feature checklists.</p>
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={handleBookDemoClick}
              >
                Walk through your setup
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Persona tabs */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="mb-8"
        >
          <div className="rounded-3xl border border-white/10 bg-black/60 p-3 sm:p-4">
            <div className="flex flex-wrap gap-2 text-[11px]">
              {PERSONAS.map((persona) => {
                const isActive = persona.id === activePersona;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setActivePersona(persona.id)}
                    className={
                      "relative rounded-full px-3 py-1.5 text-left transition-colors " +
                      (isActive
                        ? "border border-(--gold-500)/70 bg-(--gold-500)/15 text-(--gold-500)"
                        : "border border-transparent text-white/60 hover:border-white/15 hover:text-white/80")
                    }
                  >
                    <div className="font-medium">{persona.label}</div>
                    <div className="text-[10px] text-white/45">{persona.subtitle}</div>
                    {isActive && (
                      <motion.span
                        layoutId="docs-persona-pill"
                        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-(--gold-500)/10"
                        transition={{ type: "spring", stiffness: 240, damping: 24 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Persona content */}
        <motion.section
          key={activePersona}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]"
        >
          {/* Left: main flow */}
          <div className="space-y-5 rounded-3xl border border-white/12 bg-black/70 p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
              {data.flowTitle}
            </h2>
            <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
              {data.intro}
            </p>
            <ol className="mt-2 space-y-3 text-xs text-white/75 sm:text-[13px]">
              {data.flow.map((step, i) => (
                <li key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-(--gold-500)/15 text-[11px] font-medium text-(--gold-500)">
                    {i + 1}
                  </div>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Right: boundaries / expectations */}
          <div className="space-y-4 rounded-3xl border border-white/12 bg-black/70 p-5 sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
              {data.notesTitle}
            </h3>
            <ul className="space-y-2 text-xs text-white/75 sm:text-[13px]">
              {data.notes.map((note, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/50" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/70">
              <p className="mb-1 font-medium text-white/80">
                Want a guide specific to your team
              </p>
              <p className="mb-2">
                During early access, we often create a short, private outline for how
                Wireframe fits into your existing process instead of expecting teams
                to adapt to a generic template.
              </p>
              <a
                href="mailto:hello@wireframe.studio?subject=Workflow%20guide"
                className="font-medium text-(--gold-500) hover:underline"
              >
                Email hello@wireframe.studio
              </a>
            </div>
          </div>
        </motion.section>

        {/* Quick start */}
        <section className="mt-10 rounded-3xl border border-white/12 bg-black/80 p-5 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"
          >
            <div className="md:max-w-xl space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                A simple first week with Wireframe
              </h3>
              <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
                You do not need to rebuild your entire catalog on day one. Most early
                teams start by picking two or three pieces that repeat often and then
                decide together where a mesh would genuinely save time.
              </p>
            </div>
            <div className="grid gap-3 text-xs text-white/75 sm:grid-cols-3 sm:text-[13px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  Day 1–2
                </p>
                <p className="mt-1.5">
                  Choose a few representative pieces and gather existing CAD files and
                  notes around them.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  Day 3–4
                </p>
                <p className="mt-1.5">
                  Define one or two mesh presets with the team and agree on the key
                  parameters that matter.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  Day 5
                </p>
                <p className="mt-1.5">
                  Run through a real client scenario and see where the mesh saves time
                  or creates friction, then adjust accordingly.
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default DocsPage;
