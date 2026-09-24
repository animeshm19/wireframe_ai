/**
 * Atelier Field Notes & Engineering Journal.
 *
 * Authoritative essays and technical deep-dives on jewelry CAD architecture,
 * metallurgy, lost-wax casting physics, and B-rep solid modeling.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Clock,
  Tag,
  ArrowRight,
  X,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";

type Article = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  readTime: string;
  category: "Kernel Architecture" | "Metallurgy" | "CAM / Tooling" | "Bench Practice";
  highlight?: boolean;
  summary: string;
  content: {
    intro: string;
    sections: Array<{
      heading: string;
      body: string;
      codeOrDiagram?: string;
    }>;
    takeaway: string;
  };
};

const ARTICLES: Article[] = [
  {
    id: "brep-not-mesh",
    title: "Why Fine Jewelry Requires B-Rep Solids, Not Polygon Meshes",
    subtitle: "The mathematics of continuous analytical curvature vs. tessellated triangle approximations.",
    date: "Dec 2025",
    readTime: "8 min read",
    category: "Kernel Architecture",
    highlight: true,
    summary:
      "Why generative polygon meshes collapse at the casting tree, and how compiling natural language into OpenCASCADE boundary representation produces true analytical geometry.",
    content: {
      intro:
        "Every consumer AI 3D generator exports polygon meshes (STL, OBJ, or USDZ). While flat triangulations work for video games and visual rendering, they break down the moment metal is poured into an investment mold.",
      sections: [
        {
          heading: "1. The 0.052 mm Sagitta Flaw",
          body: "When an inner ring hole is approximated by 32 flat chords, the center of each chord drops away from the true circle by a sagitta distance. In a standard US size 6.5 band (16.92 mm diameter), this chord deviation reaches up to 0.052 mm. The ring is physically out-of-round, feeling jagged on the client's finger and requiring laborious lathe reaming that thins the shank.",
          codeOrDiagram: "sagitta_error = R * (1 - cos(π / facets))\nAt 32 facets: 8.46mm * (1 - 0.99518) = 0.041 mm error\nAt B-rep: radius is pure analytical cylinder (0.000 mm error)",
        },
        {
          heading: "2. The Destruction of Resizing",
          body: "In a polygon mesh, resizing a ring scales all vertices uniformly. The shank thins, but worse: the diamond seats stretch from optical circles into warped ellipses, and prongs pinch into brittle 0.4mm toothpicks. A B-rep model treats dimensions as decoupled parametric constraints. Changing finger size expands the inner sweep while prongs, seats, and wall thickness remain strictly locked.",
        },
        {
          heading: "3. Direct 5-Axis CNC & CAM Ingestion",
          body: "High-end European ateliers and Japanese wedding band manufacturers increasingly turn platinum on 5-axis CNC lathes. CNC CAM software cannot generate smooth continuous toolpaths from faceted triangles without gouging. STEP AP214 boundary representation provides exact spline surfaces that machine cleanly to a mirror finish.",
        },
      ],
      takeaway:
        "Polygon meshes are an approximation format for screens. Boundary representation is the universal truth format for physical manufacturing.",
    },
  },
  {
    id: "casting-shrinkage-physics",
    title: "The Physics of Metal Shrinkage: Platinum vs. 18K Gold vs. Silver",
    subtitle: "Why different precious alloys demand dynamic volumetric mold compensation.",
    date: "Nov 2025",
    readTime: "6 min read",
    category: "Metallurgy",
    summary:
      "Different precious metals solidify and contract at distinct rates. How Wireframe dynamically adjusts the 3D printed wax geometry to hit target ring sizes post-cast.",
    content: {
      intro:
        "When liquid gold cools from 1064°C to room temperature, atomic lattices contract. If your CAD model outputs nominal dimensions, your cast ring will arrive half a size too small.",
      sections: [
        {
          heading: "Volumetric Thermal Contraction Rates",
          body: "Different alloys exhibit radically different cooling shrinkage: Platinum 950 contracts around 1.1% to 1.3%; 18K Yellow Gold contracts 1.6% to 1.8%; and Sterling Silver contracts up to 2.2% to 2.5%. A ring printed at size 7.0 in wax will cast at size 6.6 in silver if uncompensated.",
        },
        {
          heading: "Thick-to-Thin Thermal Sinks",
          body: "Where a heavy ring head meets a slender 1.5mm band, the thin metal solidifies first, choking liquid feed from the sprue and leaving porosity voids in the head. The CAD engine flags thermal mass gradients before the file reaches the printer.",
        },
      ],
      takeaway:
        "True jewelry CAD software must know what alloy is being poured before finalizing the geometry.",
    },
  },
  {
    id: "negative-azures-galleries",
    title: "Automating the Under-Gallery: Negative Boolean Azures",
    subtitle: "How light-entry honeycombs prevent shrinkage voids and save precious metal weight.",
    date: "Oct 2025",
    readTime: "5 min read",
    category: "CAM / Tooling",
    summary:
      "Light azures aren't just decorative—they evacuate mass beneath diamonds to prevent shrinkage tears, optimize light refraction, and shave grams off raw casting cost.",
    content: {
      intro:
        "A solid block of gold behind a pavé diamond cluster is a disaster: it traps dirt, kills diamond brilliance, and wastes hundreds of dollars in hidden metal weight.",
      sections: [
        {
          heading: "Procedural Negative Cutters",
          body: "Rather than asking jewelers to manually draw complex boolean shapes in Rhino, Wireframe projects procedural conical and hexagonal cutters up through the gallery. Each cutter maintains a 0.20 mm offset from the gem pavilion, maximizing light while maintaining prong structural rigidity.",
        },
        {
          heading: "Cost & Weight Economics",
          body: "On an 18K gold ring with 40 pavé stones, clean azures reduce metal volume by 0.22 cm³, saving approximately 3.4 grams of gold—or roughly $250 in raw metal per ring.",
        },
      ],
      takeaway:
        "Negative space in jewelry is as critical to engineer as positive metal.",
    },
  },
  {
    id: "the-0-8mm-rule",
    title: "The 0.8mm Rule: Minimum Bench Thickness for Lost-Wax Casting",
    subtitle: "Real-world trade tolerances that prevent cracked molds and incomplete metal fills.",
    date: "Sep 2025",
    readTime: "5 min read",
    category: "Bench Practice",
    summary:
      "Why designs that look delicate and beautiful in digital rendering crumble during flask burnout, and how our rule engine enforces physical reality.",
    content: {
      intro:
        "The CAD screen is frictionless and weightless. Gold, however, is a viscous molten liquid subject to surface tension, mold pressure, and centrifugal force.",
      sections: [
        {
          heading: "The Viscosity Boundary",
          body: "Molten gold cannot reliably fill a channel thinner than 0.70 mm across a span greater than 4 mm before freezing. Any wall designed at 0.50 mm risks short-shots—leaving an incomplete casting with gaps in the metal.",
        },
        {
          heading: "Polishing Allowance Depreciation",
          body: "A raw casting requires magnetic pin tumbling, emery sanding, and rouge wheel polishing. This process removes 0.10 mm to 0.15 mm of surface skin. A prong designed at 0.70 mm finishes at 0.55 mm—far too weak to secure a $10,000 diamond.",
        },
      ],
      takeaway:
        "A CAD system that lets you build uncastable jewelry is not a tool; it is a liability.",
    },
  },
  {
    id: "parsing-jeweler-intuition",
    title: "Parsing Jeweler Intuition: From Natural Language to Parametric AST",
    subtitle: "How conversational prompts translate into exact algebraic constraints.",
    date: "Aug 2025",
    readTime: "7 min read",
    category: "Kernel Architecture",
    summary:
      "How we translate subjective bench descriptions like 'dainty cathedral with claw prongs' into exact geometric dependencies.",
    content: {
      intro:
        "Jewelers do not think in coordinate tuples or Bezier control points. They think in proportions, styles, and trade conventions.",
      sections: [
        {
          heading: "The Domain Vocabulary Compiler",
          body: "When a user types 'dainty cathedral', the parser extracts: band width clamped between 1.6 mm and 1.9 mm, shoulder elevation angle at 32°, and bridge arch curvature tangent to the finger rail.",
        },
        {
          heading: "Self-Healing Constraint Graphs",
          body: "Unlike traditional parametric CAD where changing a dimension throws a broken feature tree error, our constraint graph recalculates filleted blends and Boolean intersections analytically.",
        },
      ],
      takeaway:
        "The compiler's job is to bridge the semantic gap between a designer's vision and CNC toolpaths.",
    },
  },
];

const CATEGORIES = ["All", "Kernel Architecture", "Metallurgy", "CAM / Tooling", "Bench Practice"] as const;

export function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Close reader on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedArticle(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const featured = ARTICLES.find((a) => a.highlight) ?? ARTICLES[0];
  const filteredArticles =
    activeCategory === "All"
      ? ARTICLES
      : ARTICLES.filter((a) => a.category === activeCategory);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      {/* Radiant ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(75% 45% at 50% 0%, rgba(198,155,178,0.12), transparent 65%)," +
            "radial-gradient(60% 45% at 85% 90%, rgba(225,40,130,0.06), transparent 60%)",
        }}
      />
      <span aria-hidden="true" className="blueprint pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex items-center gap-3 text-xs"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-metal-300 animate-pulse" />
            <span className="mono-label !text-[0.55rem] !text-white font-semibold">
              ATELIER FIELD NOTES
            </span>
          </div>
          <span className="text-white/30">/</span>
          <Link to="/" className="text-white/70 hover:text-white transition-colors">
            Home
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white font-medium">Journal</span>
        </motion.div>

        {/* Page Header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <div className="mono-label !text-metal-400 font-semibold !text-[0.6rem]">
            THE WIREFRAME JOURNAL
          </div>
          <h1 className="mt-3 text-[clamp(2.2rem,1.5rem+3vw,3.6rem)] font-semibold leading-[1.05] tracking-tight text-white">
            Engineering essays on jewelry CAD &amp; lost-wax metallurgy.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/85 sm:text-lg">
            Technical papers, bench observations, and computational geometry deep-dives
            from the team building the boundary-representation engine for fine jewelry.
          </p>
        </motion.header>

        {/* Category Filters */}
        <div className="mt-10 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 " +
                (activeCategory === cat
                  ? "border-metal-400 bg-metal-400/20 text-white shadow-sm"
                  : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/25 hover:text-white")
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Article Hero Plate */}
        {activeCategory === "All" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
          >
            <div
              onClick={() => setSelectedArticle(featured)}
              className="card-edge card-sheen group relative cursor-pointer overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-7 sm:p-9 shadow-2xl transition-all duration-300 hover:border-metal-400/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-metal-400/40 bg-metal-400/15 px-2.5 py-0.5 !text-[0.52rem] font-semibold text-metal-200 uppercase tracking-wider">
                    FEATURED ESSAY
                  </span>
                  <span className="text-white/60">{featured.date}</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span className="text-white/60">{featured.readTime}</span>
                </div>
                <span className="mono-label !text-[0.52rem] !text-white/80">
                  {featured.category}
                </span>
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-white group-hover:text-metal-200 transition-colors">
                {featured.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-white/80">
                {featured.summary}
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-metal-300 group-hover:text-white transition-colors">
                <span>Read technical paper</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Article Grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {filteredArticles.map((article, i) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setSelectedArticle(article)}
              className="card-edge card-sheen group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.06]"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-metal-400" />
                    <span>{article.date}</span>
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                    <span>{article.readTime}</span>
                  </div>
                  <span className="mono-label !text-[0.5rem] !text-white/80">
                    {article.category}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold tracking-tight text-white group-hover:text-metal-200 transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/75">
                  {article.summary}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-4">
                <span className="mono-label !text-[0.52rem] !text-metal-400 font-semibold group-hover:text-white transition-colors">
                  READ NOTE →
                </span>
                <span className="text-[0.75rem] text-white/50">ISO 10303-21</span>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Bottom Callout */}
        <section className="mt-16 rounded-3xl border border-white/12 bg-black/75 p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Interested in technical CAD research?
              </h3>
              <p className="text-xs leading-relaxed text-white/80 sm:text-sm">
                We publish deep-dives on computational solid geometry, OpenCASCADE performance,
                and lost-wax casting tolerances as we release kernel updates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  const el = document.getElementById("contact");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  else window.location.href = "/#contact";
                }}
                className="rounded-full bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-950 transition-colors hover:bg-metal-200"
              >
                Connect with Engineering
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* In-Page Interactive Reader Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl sm:p-6"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-ink-950 shadow-2xl"
            >
              {/* Top Header Controls */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="mono-label !text-[0.52rem] !text-metal-400 font-semibold uppercase">
                    {selectedArticle.category}
                  </span>
                  <span className="h-3 w-px bg-white/15" />
                  <span className="text-xs text-white/70">{selectedArticle.readTime}</span>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="rounded-full border border-white/10 p-1.5 text-white/70 transition-colors hover:border-white/30 hover:text-white"
                  aria-label="Close reader"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Essay Content */}
              <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-8">
                <div className="text-xs text-white/60">
                  Published {selectedArticle.date} · Wireframe Studio Engineering
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  {selectedArticle.title}
                </h1>
                <p className="mt-2 text-sm text-metal-200 font-medium">
                  {selectedArticle.subtitle}
                </p>

                <hr className="my-6 border-white/10" />

                <div className="space-y-6 text-sm leading-relaxed text-white/85 sm:text-base">
                  <p className="text-base text-white leading-relaxed font-normal">
                    {selectedArticle.content.intro}
                  </p>

                  {selectedArticle.content.sections.map((sec, idx) => (
                    <div key={idx} className="space-y-2.5">
                      <h2 className="text-base sm:text-lg font-semibold text-white">
                        {sec.heading}
                      </h2>
                      <p className="text-xs sm:text-sm leading-relaxed text-white/80">
                        {sec.body}
                      </p>
                      {sec.codeOrDiagram && (
                        <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3.5 font-mono text-xs text-emerald-300">
                          {sec.codeOrDiagram}
                        </pre>
                      )}
                    </div>
                  ))}

                  <div className="rounded-2xl border border-metal-400/30 bg-metal-400/[0.08] p-4 text-xs sm:text-sm text-white">
                    <strong className="text-metal-200">Key Production Takeaway:</strong>{" "}
                    {selectedArticle.content.takeaway}
                  </div>
                </div>
              </div>

              {/* Reader Footer */}
              <div className="flex items-center justify-between border-t border-white/10 bg-black/40 px-6 py-4 text-xs">
                <span className="mono-label !text-[0.52rem] !text-white/70">
                  OpenCASCADE 7.8 · STEP AP214
                </span>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="font-medium text-metal-300 hover:text-white transition-colors"
                >
                  Close article
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default BlogPage;
