/**
 * The navigation.
 *
 * Three things it now does that it did not:
 *
 *   1. It works on a phone. The links were simply hidden below the md
 *      breakpoint with nothing in their place, so the bar was an empty pill
 *      with a logo at one end and a button at the other — most of the site
 *      was unreachable from a phone. There is a real menu now.
 *   2. It knows where you are. A scroll-spy underlines the section you are
 *      actually looking at, and a hairline across the very top reports how
 *      far through the page you are.
 *   3. It changes shape. Wide and open over the hero, condensed into a
 *      floating pill once you leave it, so it stops competing with the
 *      thing it is sitting on top of.
 *
 * "Features" used to point at #features, which did not exist anywhere in the
 * document — the link had never worked. The targets are real now.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from "framer-motion";

const logoUrl = "/icons/Wireframe.png";

type NavLink = { label: string } & (
  | { kind: "section"; id: string }
  | { kind: "route"; to: string }
);

const LINKS: NavLink[] = [
  { kind: "section", label: "Features", id: "features" },
  { kind: "section", label: "Capabilities", id: "capabilities" },
  { kind: "section", label: "Pricing", id: "pricing" },
  { kind: "route", label: "Mesh", to: "/mesh" },
  { kind: "route", label: "Blog", to: "/blog" },
];

const SECTION_IDS = LINKS.filter((l) => l.kind === "section").map(
  (l) => (l as Extract<NavLink, { kind: "section" }>).id
);

export function Navbar() {
  const { pathname } = useLocation();
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollYProgress, "change", () => {
    setCondensed(window.scrollY > 64);
  });

  /* Scroll-spy.
   *
   * rootMargin pulls the observation band up to just under the bar and down
   * to the middle of the screen, so a section counts as "current" while it
   * occupies the top half — which is where you are reading — rather than the
   * moment a single pixel of it appears. */
  useEffect(() => {
    if (pathname !== "/") {
      setActive(null);
      return;
    }
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.intersectionRatio);
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of seen) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        setActive(bestRatio > 0.02 ? best : null);
      },
      { rootMargin: "-88px 0px -50% 0px", threshold: [0, 0.02, 0.25, 0.5, 1] }
    );

    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => !!el
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // Close the menu on navigation, and whenever the viewport grows past the
  // breakpoint where the menu stops existing.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);

    // Hold the page still behind the overlay without the usual
    // position:fixed trick, which loses the scroll position on close.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      mq.removeEventListener("change", onChange);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const goToSection = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Not on this page — let the browser resolve it after the route loads.
      window.location.href = `/#${id}`;
    }
  };

  return (
    <>
      {/* How far through the page you are. One pixel, the full width. */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-gradient-to-r from-metal-500 via-metal-200 to-accent-500"
      />

      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 pt-safe"
      >
        <div className="shell">
          <motion.div
            animate={{
              maxWidth: condensed ? 680 : 1100,
              marginTop: condensed ? 10 : 20,
              backgroundColor: condensed
                ? "rgba(19,1,12,0.72)"
                : "rgba(255,255,255,0.02)",
              borderColor: condensed
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.05)",
            }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto flex h-14 items-center justify-between rounded-full border px-3 backdrop-blur-xl"
          >
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2.5 rounded-full px-1.5 py-1"
              aria-label="wireframe — home"
            >
              <img src={logoUrl} alt="" className="h-6 w-auto" />
              <span className="text-sm font-medium tracking-tight text-white/90">
                wireframe
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
              {LINKS.map((l) =>
                l.kind === "section" ? (
                  <button
                    key={l.label}
                    onClick={() => goToSection(l.id)}
                    className="group relative rounded-full px-3 py-2 text-sm text-white/65 transition-colors duration-300 hover:text-white"
                  >
                    {l.label}
                    {active === l.id && pathname === "/" && (
                      <motion.span
                        layoutId="nav-active"
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-x-3 -bottom-0.5 h-px bg-metal-300"
                      />
                    )}
                  </button>
                ) : (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="group relative rounded-full px-3 py-2 text-sm text-white/65 transition-colors duration-300 hover:text-white"
                  >
                    {l.label}
                    {pathname === l.to && (
                      <motion.span
                        layoutId="nav-active"
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-x-3 -bottom-0.5 h-px bg-metal-300"
                      />
                    )}
                  </Link>
                )
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => goToSection("contact")}
                className="group relative hidden overflow-hidden rounded-full border border-white/12 px-4 py-2 text-sm text-white/85 transition-colors duration-300 hover:border-metal-400/60 hover:text-white sm:inline-flex"
              >
                <span className="absolute inset-0 -translate-y-full bg-gradient-to-b from-metal-400/25 to-transparent transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                <span className="relative">Book a demo</span>
              </button>

              {/* Menu toggle — the whole reason a phone can reach the site. */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="relative grid h-10 w-10 place-items-center rounded-full border border-white/12 md:hidden"
              >
                <span className="relative block h-3 w-4">
                  <motion.span
                    animate={menuOpen ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-x-0 top-0 block h-px bg-white"
                  />
                  <motion.span
                    animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-x-0 top-1.5 block h-px bg-white"
                  />
                  <motion.span
                    animate={menuOpen ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-x-0 top-3 block h-px bg-white"
                  />
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.nav>

      <MobileMenu
        open={menuOpen}
        links={LINKS}
        pathname={pathname}
        onClose={() => setMenuOpen(false)}
        onSection={goToSection}
      />
    </>
  );
}

/* ----------------------------------------------------------- mobile menu -- */

function MobileMenu({
  open,
  links,
  pathname,
  onClose,
  onSection,
}: {
  open: boolean;
  links: NavLink[];
  pathname: string;
  onClose: () => void;
  onSection: (id: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the panel when it opens so a keyboard or screen-reader
  // user is not left behind on the page underneath.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          id="mobile-menu"
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-40 flex flex-col bg-ink-950/96 backdrop-blur-2xl outline-none md:hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 pb-10 pt-28">
            <ul className="space-y-1">
              {links.map((l, i) => (
                <motion.li
                  key={l.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.06 + i * 0.055,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="border-b border-white/6"
                >
                  {l.kind === "section" ? (
                    <button
                      onClick={() => onSection(l.id)}
                      className="flex w-full items-baseline justify-between py-4 text-left"
                    >
                      <span className="text-2xl tracking-tight text-white">
                        {l.label}
                      </span>
                      <span className="mono-label !text-[0.55rem]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </button>
                  ) : (
                    <Link
                      to={l.to}
                      onClick={onClose}
                      className="flex items-baseline justify-between py-4"
                    >
                      <span
                        className={
                          "text-2xl tracking-tight " +
                          (pathname === l.to ? "text-metal-300" : "text-white")
                        }
                      >
                        {l.label}
                      </span>
                      <span className="mono-label !text-[0.55rem]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </Link>
                  )}
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 space-y-3"
            >
              <Link
                to="/chat"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-ink-900"
              >
                Start designing →
              </Link>
              <button
                onClick={() => onSection("contact")}
                className="flex w-full items-center justify-center rounded-full border border-white/15 px-6 py-3.5 text-sm text-white/80"
              >
                Book a demo
              </button>
            </motion.div>

            <p className="mono-label mt-10 !text-[0.55rem]">
              B-rep kernel · STEP &amp; STL export
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
