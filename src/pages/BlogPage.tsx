import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

type BlogPost = {
  id: string;
  title: string;
  date: string;
  readTime: string;
  tag: string;
  summary: string;
  highlight?: boolean;
};

const POSTS: BlogPost[] = [
  {
    id: "mesh-not-cad",
    title: "Why Wireframe starts with meshes, not full CAD.",
    date: "Nov 2025",
    readTime: "7 min",
    tag: "Product",
    highlight: true,
    summary:
      "A calm explanation of why Wireframe focuses on a narrow layer between sketch and CAD instead of trying to replace everything at once.",
  },
  {
    id: "repeatable-pieces",
    title: "What a repeatable piece actually looks like in a studio.",
    date: "Oct 2025",
    readTime: "6 min",
    tag: "Studios",
    summary:
      "How studios decide which designs are worth turning into structured meshes and which should stay one-off.",
  },
  {
    id: "handoff",
    title: "Handing off intent, not just files.",
    date: "Sep 2025",
    readTime: "5 min",
    tag: "Workflow",
    summary:
      "Notes on sharing measurements, constraints, and small comments so CAD work starts closer to what designers imagine.",
  },
  {
    id: "scope",
    title: "Where Wireframe deliberately stops.",
    date: "Aug 2025",
    readTime: "4 min",
    tag: "Product",
    summary:
      "The edges of the product on purpose: what we do not plan to build so studios can keep their own tools where they are strongest.",
  },
  {
    id: "studios-language",
    title: "Building a shared language between design and production.",
    date: "Aug 2025",
    readTime: "6 min",
    tag: "Studios",
    summary:
      "How a few shared parameters and terms can reduce back-and-forth when pieces change size, stones, or details.",
  },
];

const TAGS = ["All", "Product", "Studios", "Workflow"];

export function BlogPage() {
  const [activeTag, setActiveTag] = useState<string>("All");

  const featured = POSTS.find((p) => p.highlight) ?? POSTS[0];
  const rest = POSTS.filter((p) => p.id !== featured.id);

  const filteredRest =
    activeTag === "All"
      ? rest
      : rest.filter((p) => p.tag === activeTag);

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
      {/* Background: layered nebula + faint grid */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,#3c1025,transparent_55%),radial-gradient(circle_at_bottom,#050003,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-50 mix-blend-soft-light bg-[repeating-linear-gradient(120deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_7px)]" />

      {/* Content */}
      <div className="relative z-30 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="mb-4 flex flex-col gap-3 text-xs text-white/60">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/50 px-3 py-1 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500) animate-pulse" />
              <span className="uppercase tracking-[0.18em]">Field notes</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <Link to="/" className="hover:text-(--gold-500)">
                Home
              </Link>
              <span className="text-white/30">/</span>
              <span className="text-white/60">Blog</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Notes from building a mesh-first workflow for jewelry.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                This is not a high-frequency blog. It is a place to write down
                how Wireframe behaves, what we are learning from studios, and
                where the product intentionally stops.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs text-white/55 md:items-end">
              <p>Occasional long-form posts · focused on real work, not announcements.</p>
              <Button
                size="sm"
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/90 px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-black hover:bg-(--gold-500)"
                onClick={handleBookDemoClick}
              >
                Talk about your workflow
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Hero: crazy layout – orbit chips + 3D featured article */}
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)] lg:items-center">
          {/* Left: Featured post in a 3D-ish stack */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative perspective-[1600px]"
          >
            {/* glowing plate behind */}
            <div className="pointer-events-none absolute inset-4 -z-10 rounded-[2.4rem] bg-[radial-gradient(circle_at_top,rgba(244,197,122,0.18),transparent_60%)] blur-2xl opacity-70" />

            <motion.article
              whileHover={{ rotateX: 6, rotateY: -8, translateY: -4 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              className="transform-gpu rounded-[2.2rem] border border-white/15 bg-gradient-to-br from-white/5 via-black/90 to-black/95 p-[1.5px] shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
            >
              <div className="rounded-[2rem] bg-gradient-to-br from-black/80 via-black/90 to-[#1d060f] px-6 py-6 sm:px-7 sm:py-7">
                <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-white/60">
                  <div className="inline-flex items-center gap-2">
                    <span className="rounded-full border border-(--gold-500)/70 bg-(--gold-500)/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-(--gold-500)">
                      Start here
                    </span>
                    <span>{featured.date}</span>
                    <span className="h-1 w-1 rounded-full bg-white/40" />
                    <span>{featured.readTime} read</span>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px]">
                    {featured.tag}
                  </span>
                </div>

                <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  {featured.summary}
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 text-[11px] text-white/60">
                  <p>
                    These posts are written for studios and CAD teams who think
                    in systems, not just individual pieces.
                  </p>
                  <span className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1 sm:inline-flex">
                    Article · field notes
                  </span>
                </div>
              </div>
            </motion.article>

            {/* layered ghost slabs for depth */}
            <div className="pointer-events-none absolute -bottom-3 left-6 right-6 -z-20 rounded-[2rem] border border-white/8 bg-black/60 opacity-70 blur-[1px]" />
            <div className="pointer-events-none absolute -bottom-6 left-10 right-10 -z-30 rounded-[1.8rem] border border-white/5 bg-black/50 opacity-60 blur-[2px]" />
          </motion.div>

          {/* Right: orbit-style tag filter + mini posts */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Orbit chips */}
            <div className="relative mx-auto h-56 w-full max-w-sm">
              {/* orbit rings */}
              <div className="pointer-events-none absolute inset-4 rounded-full border border-white/12" />
              <div className="pointer-events-none absolute inset-10 rounded-full border border-white/8 opacity-60" />

              {/* center label */}
              <div className="absolute inset-[4.2rem] flex items-center justify-center rounded-3xl border border-white/10 bg-black/80 px-4 py-3 text-center text-[11px] text-white/65 backdrop-blur">
                <span>
                  Filter posts by focus. These tags reflect how we actually
                  think about the product:{" "}
                  <span className="text-(--gold-500)">product</span>,{" "}
                  <span className="text-(--gold-500)">studios</span>, and{" "}
                  <span className="text-(--gold-500)">workflow</span>.
                </span>
              </div>

              {/* floating tag chips */}
              {TAGS.map((tag, index) => {
                const isActive = tag === activeTag;
                const common =
                  "absolute rounded-full border text-[11px] px-3 py-1.5 bg-black/85 backdrop-blur transform-gpu";
                const basePos =
                  index === 0
                    ? "top-0 left-1/2 -translate-x-1/2"
                    : index === 1
                    ? "left-0 top-1/2 -translate-y-1/2"
                    : index === 2
                    ? "right-0 top-1/2 -translate-y-1/2"
                    : "bottom-0 left-1/2 -translate-x-1/2";

                return (
                  <motion.button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={
                      common +
                      " " +
                      basePos +
                      " " +
                      (isActive
                        ? "border-(--gold-500)/80 text-(--gold-500)"
                        : "border-white/25 text-white/70 hover:border-(--gold-500)/60 hover:text-(--gold-500)")
                    }
                    animate={
                      index % 2 === 0
                        ? { y: [-2, 2, -2] }
                        : { x: [-2, 2, -2] }
                    }
                    transition={{
                      duration: 4 + index * 0.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {tag}
                  </motion.button>
                );
              })}
            </div>

            {/* Mini posts rail */}
            <div className="rounded-3xl border border-white/12 bg-black/80 p-4 sm:p-5">
              <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-white/55">
                Latest entries
              </p>
              <div className="flex flex-col gap-3">
                {filteredRest.slice(0, 3).map((post) => (
                  <div
                    key={post.id}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/75 transition-colors hover:border-(--gold-500)/70"
                  >
                    <div>
                      <p className="text-[11px] text-white/50">
                        {post.date} · {post.readTime}
                      </p>
                      <p className="mt-0.5 font-medium text-white/90">
                        {post.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-white/65">
                        {post.summary}
                      </p>
                    </div>
                    <span className="mt-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/60 group-hover:border-(--gold-500)/70 group-hover:text-(--gold-500)">
                      {post.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Lower section: warped rail of posts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
              All notes
            </h2>
            <p className="text-[11px] text-white/55">
              A small set of essays we keep up to date over time.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-black/80 px-4 py-4 sm:px-5 sm:py-5">
            {/* subtle skewed highlight bar */}
            <div className="pointer-events-none absolute -left-20 top-0 h-full w-40 -skew-x-12 bg-gradient-to-b from-(--gold-500)/18 via-transparent to-transparent opacity-75" />

            <div className="grid gap-4 md:grid-cols-2">
              {filteredRest.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/75 sm:text-[13px]"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-white/55">
                    <div className="inline-flex items-center gap-2">
                      <span>{post.date}</span>
                      <span className="h-1 w-1 rounded-full bg-white/40" />
                      <span>{post.readTime}</span>
                    </div>
                    <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px]">
                      {post.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white/90">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-white/70">{post.summary}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BlogPage;
