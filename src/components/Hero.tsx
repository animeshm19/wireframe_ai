/**
 * The hero.
 *
 * The section is taller than the screen and its contents are pinned, so the
 * first stretch of scrolling does not move the page — it resolves the ring.
 * Points become wireframe becomes polished metal, the spec rail fills in with
 * real numbers, and only then does the page start to travel. The product turns
 * a sentence into a manufacturable solid; scrolling the hero is that, done
 * once, before a word of marketing copy.
 *
 * Nothing in here re-renders on scroll or on pointer movement. Both feed refs
 * that the canvas reads inside its own loop, and the DOM pieces that need to
 * track scroll are motion values written straight to style.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { HeroVisual } from "./HeroVisual";

const PROMPT = "platinum solitaire, 1.5 ct round brilliant, size 6.5";

/* Set as lines rather than as a flat list of words. Left to itself the
 * headline broke into four short ragged lines at desktop width, which is the
 * difference between a headline and a column of text. */
const HEADLINE: string[][] = [
  ["From", "a", "sentence"],
  ["to", "a", "STEP", "file."],
];

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  // Read by the canvas loop; never triggers a React render.
  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });

  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Copy scroll into the ref the renderer polls.
  useEffect(() => {
    progressRef.current = scrollYProgress.get();
    return scrollYProgress.on("change", (v) => {
      progressRef.current = v;
    });
  }, [scrollYProgress]);

  /* The light rake.
   *
   * The headline is filled with the metal gradient and a white hotspot that
   * follows the pointer, so light appears to move across the letters the way
   * it moves across a polished surface when you tilt it. It is two CSS custom
   * properties written from a single rAF-throttled listener — no state, no
   * re-render, and it simply does not appear on a device without a pointer. */
  useEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    if (!section || !headline) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    let latest = { x: 0, y: 0 };

    const apply = () => {
      frame = 0;
      const r = headline.getBoundingClientRect();
      headline.style.setProperty("--mx", `${latest.x - r.left}px`);
      headline.style.setProperty("--my", `${latest.y - r.top}px`);

      const s = section.getBoundingClientRect();
      pointerRef.current = {
        x: ((latest.x - s.left) / s.width) * 2 - 1,
        y: ((latest.y - s.top) / s.height) * 2 - 1,
      };
    };

    const onMove = (e: PointerEvent) => {
      latest = { x: e.clientX, y: e.clientY };
      // The handle is cleared inside apply(), so a frame is always re-queued.
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The prompt types itself once, on mount.
  const typed = useTypewriter(PROMPT, !!reduced);

  // Pinned content drifts up and dims as the section is scrolled out.
  const contentY = useTransform(scrollYProgress, [0, 0.88, 1], [0, -34, -80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.84, 1], [1, 1, 0]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[150vh] sm:h-[175vh] lg:h-[190vh] bg-ink-900"
    >
      {/* Everything below is pinned for the length of the section. */}
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Ground. One radial pool of light, not four stacked effects. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 78% at 50% 108%, rgba(198,155,178,0.14), transparent 62%)," +
              "radial-gradient(90% 55% at 50% -8%, rgba(225,40,130,0.09), transparent 64%)",
          }}
        />

        {/* A surveyor's grid, in perspective, fading out before it reaches the
            copy. It is one element and one gradient mask — the previous hero
            spent a canvas on this. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            transform: "perspective(420px) rotateX(62deg)",
            transformOrigin: "bottom center",
            maskImage: "linear-gradient(to top, #000 0%, transparent 78%)",
            WebkitMaskImage: "linear-gradient(to top, #000 0%, transparent 78%)",
          }}
        />

        {/* The ring. Full-bleed behind the copy on phones, the right half of
            the stage on a wide screen. */}
        {/* The stage paints its own backdrop, so .hero-stage feathers its
            edges into the page — see index.css. */}
        <HeroVisual
          progress={progressRef}
          pointer={pointerRef}
          className="hero-stage absolute inset-x-0 bottom-[104px] h-[46%] w-full lg:inset-y-0 lg:bottom-0 lg:left-auto lg:right-0 lg:h-full lg:w-[54%]"
        />

        {/* Copy. */}
        <motion.div
          style={{ y: reduced ? 0 : contentY, opacity: contentOpacity }}
          className="relative z-10 flex h-full flex-col justify-start pt-28 sm:pt-32 lg:justify-center lg:pt-0"
        >
          <div className="shell w-full">
            <div className="max-w-[46rem] lg:max-w-[37rem]">
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="mb-4 inline-flex items-center gap-2.5 sm:mb-6 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-sm"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="mono-label !text-[0.62rem] !tracking-[0.2em] !text-white/55">
                  B-rep kernel · running live
                </span>
              </motion.div>

              {/* Headline. Word by word, with the pointer-tracked light rake. */}
              <h1
                ref={headlineRef}
                className="hero-rake text-[clamp(2.5rem,1.5rem+4.4vw,4.6rem)] font-semibold leading-[1.0] tracking-[-0.045em]"
              >
                {HEADLINE.map((line, li) => (
                  <span key={li} className="block">
                    {line.map((word, wi) => {
                      const n = HEADLINE.slice(0, li).reduce((a, l) => a + l.length, 0) + wi;
                      return (
                        <span
                          key={wi}
                          className="inline-block overflow-hidden pb-[0.1em] align-bottom"
                        >
                          <motion.span
                            className="inline-block"
                            initial={{ y: "110%" }}
                            animate={{ y: 0 }}
                            transition={{
                              duration: 0.95,
                              delay: 0.1 + n * 0.07,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                          >
                            {word}
                          </motion.span>
                          {wi < line.length - 1 && <span>&nbsp;</span>}
                        </span>
                      );
                    })}
                  </span>
                ))}
              </h1>

              {/* The prompt, typing itself. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.75 }}
                className="mt-5 flex items-start gap-3 sm:mt-7 rounded-xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-sm"
              >
                <span className="mono-label mt-[3px] shrink-0 !text-[0.6rem] !text-metal-400">
                  &gt;
                </span>
                <p className="font-mono text-[0.78rem] leading-relaxed text-white/80 sm:text-[0.85rem]">
                  {typed}
                  <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.15em] animate-pulse bg-accent-500" />
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 max-w-[34rem] sm:mt-6 text-[0.95rem] leading-relaxed text-white/60 sm:text-base"
              >
                wireframe reads that and builds exact B-rep solids — real
                surfaces, not a triangle soup.{" "}
                <span className="hidden sm:inline">
                  Every piece is measured, checked against per-alloy casting
                  limits, and exported as STEP or STL your caster can open.
                </span>
              </motion.p>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 flex flex-wrap items-center gap-3 sm:mt-9"
              >
                <MagneticLink to="/chat">
                  <span className="relative z-10">Start designing</span>
                  <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
                    →
                  </span>
                </MagneticLink>

                <a
                  href="#contact"
                  className="group inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm text-white/70 transition-colors duration-300 hover:border-white/25 hover:text-white"
                >
                  Book a demo
                </a>
              </motion.div>
            </div>
          </div>

          {/* Spec rail. The numbers resolve as the ring does. */}
          <SpecRail progress={scrollYProgress} />
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          style={{ opacity: cueOpacity }}
          className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
        >
          <span className="mono-label !text-[0.58rem]">Scroll to resolve</span>
          <span className="relative block h-9 w-px overflow-hidden bg-white/12">
            <motion.span
              className="absolute inset-x-0 top-0 h-3 bg-metal-300"
              animate={{ y: [-12, 36] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- spec rail -- */

/**
 * Four readings that count up as the geometry resolves. The numbers are the
 * ones the engine actually reports for this design — metal volume, the weight
 * that volume implies in platinum, the stone, and the solid count the
 * manufacturability check refuses on if it is ever greater than one.
 */
function SpecRail({ progress }: { progress: MotionValue<number> }) {
  const vol = useCounter(progress, 0.42, 0.8, 0.31, 2, " cm³");
  const grams = useCounter(progress, 0.46, 0.84, 6.6, 1, " g");
  const carat = useCounter(progress, 0.16, 0.5, 1.5, 2, " ct");
  const reveal = useTransform(progress, [0.5, 0.72], [0, 1]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-10">
      <div className="shell w-full pb-6 sm:pb-8">
        <motion.div
          style={{ opacity: useTransform(progress, [0.14, 0.4], [0, 1]) }}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8 sm:grid-cols-4"
        >
          <SpecCell label="Metal volume" value={vol} />
          <SpecCell label="Est. weight · Pt" value={grams} />
          <SpecCell label="Centre stone" value={carat} />
          <SpecCell label="Closed solids" value="1" ok reveal={reveal} />
        </motion.div>
      </div>
    </div>
  );
}

function SpecCell({
  label,
  value,
  ok,
  reveal,
}: {
  label: string;
  value: MotionValue<string> | string;
  ok?: boolean;
  reveal?: MotionValue<number>;
}) {
  return (
    <div className="bg-ink-900/95 px-4 py-3 backdrop-blur-md lg:bg-ink-900/85">
      <div className="mono-label !text-[0.55rem] !tracking-[0.16em]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <motion.span className="tabular text-[0.95rem] font-medium text-white sm:text-lg">
          {value}
        </motion.span>
        {ok && (
          <motion.span
            style={reveal ? { opacity: reveal } : undefined}
            className="text-[0.7rem] text-emerald-400"
          >
            ✓ watertight
          </motion.span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers -- */

/** A number that counts from zero to `to` across a window of scroll. */
function useCounter(
  progress: MotionValue<number>,
  from: number,
  until: number,
  to: number,
  decimals: number,
  suffix: string
) {
  return useTransform(progress, (p) => {
    // Before the measurement exists, say so. Counting from a flat 0.00 for
    // half the scroll reads as a broken readout rather than as one waiting.
    if (p < from) return "—";
    const t = Math.min(1, Math.max(0, (p - from) / (until - from)));
    // Ease out, so it settles rather than stopping dead on the final value.
    const eased = 1 - Math.pow(1 - t, 3);
    return (to * eased).toFixed(decimals) + suffix;
  });
}

/** Types a string out once. Returns it whole if motion is not wanted. */
function useTypewriter(text: string, skip: boolean) {
  const [n, setN] = useState(skip ? text.length : 0);

  useEffect(() => {
    if (skip) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(id);
      // Slightly irregular, because a perfectly even cadence reads as a
      // marquee rather than as typing.
    }, 34 + Math.random() * 26);
    return () => window.clearInterval(id);
  }, [text, skip]);

  return text.slice(0, n);
}

/** A button that leans toward the pointer and springs back when it leaves. */
function MagneticLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.5 });
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.5 });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.34);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div style={{ x, y }} className="inline-block">
      <Link
        ref={ref}
        to={to}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-900 transition-colors duration-300"
      >
        {/* The metal wash slides in from the left on hover. */}
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-metal-400 via-metal-200 to-metal-400 transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
        {children}
      </Link>
    </motion.div>
  );
}
