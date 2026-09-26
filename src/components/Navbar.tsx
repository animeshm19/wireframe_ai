/**
 * Site navigation: a wide bar over the hero that condenses into a pill once you
 * scroll, a scroll-spy for the home sections, and a full-screen menu on phones.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { EASE } from "./motion";

const logoUrl = "/icons/Wireframe.png";

type NavLink = { label: string } & (
  | { kind: "section"; id: string }
  | { kind: "route"; to: string }
);

// One name per section: the same words in the nav, the section eyebrow and the footer.
const LINKS: NavLink[] = [
  { kind: "section", label: "How it works", id: "how" },
  { kind: "section", label: "On the bench", id: "bench" },
  { kind: "section", label: "Pricing", id: "pricing" },
  { kind: "route", label: "Technology", to: "/technology" },
  { kind: "route", label: "Journal", to: "/journal" },
];

const SECTION_IDS = LINKS.flatMap((l) => (l.kind === "section" ? [l.id] : []));
const WIDE = 1100;
const GAP = 16;

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fitWidth, setFitWidth] = useState(WIDE);
  const [desktop, setDesktop] = useState(false);

  const logoRef = useRef<HTMLAnchorElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  useMotionValueEvent(scrollYProgress, "change", () => setCondensed(window.scrollY > 64));

  // The condensed pill is exactly as wide as its contents.
  useLayoutEffect(() => {
    const els = [logoRef.current, linksRef.current, ctaRef.current].filter(Boolean) as HTMLElement[];
    const measure = () => {
      const sum = els.reduce((t, el) => t + el.offsetWidth, 0);
      setFitWidth(Math.min(WIDE, sum + GAP * 2 + 24 + 2));
    };
    measure();
    const ro = new ResizeObserver(measure);
    els.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Scroll-spy: a section is current while it fills the top half of the screen.
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
    SECTION_IDS.map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)
      .forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => setMenuOpen(false), [pathname]);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const goToSection = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else navigate(`/#${id}`);
  };

  const maxWidth = condensed && desktop ? fitWidth : WIDE;

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-metal-400"
      />

      <nav aria-label="Main" className="fixed inset-x-0 top-0 z-50 pt-safe">
        <div className="shell">
          <motion.div
            initial={false}
            style={{ maxWidth: WIDE }}
            animate={{
              maxWidth,
              marginTop: condensed ? 10 : 20,
              backgroundColor: condensed ? "rgba(19,1,12,0.88)" : "rgba(255,255,255,0.03)",
              borderColor: condensed ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
            }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mx-auto flex h-14 items-center justify-between gap-4 overflow-hidden rounded-full border px-3 backdrop-blur-xl"
          >
            <Link
              ref={logoRef}
              to="/"
              className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-full px-1.5"
              aria-label="wireframe, home"
            >
              <img src={logoUrl} alt="" className="h-6 w-auto" />
              <span className="text-sm font-semibold tracking-tight text-white">wireframe</span>
            </Link>

            <div ref={linksRef} className="hidden shrink-0 items-center gap-0.5 lg:flex">
              {LINKS.map((l) => {
                const current = l.kind === "section" ? active === l.id && pathname === "/" : pathname.startsWith(l.to);
                const cls = "relative whitespace-nowrap rounded-full px-3 py-2 text-sm text-white/85 transition-colors hover:text-white";
                const mark = current && (
                  <motion.span layoutId="nav-active" transition={{ duration: 0.3, ease: EASE }}
                               className="absolute inset-x-3 -bottom-0.5 h-px bg-metal-300" />
                );
                return l.kind === "section" ? (
                  <button key={l.label} type="button" onClick={() => goToSection(l.id)} className={cls}>
                    {l.label}
                    {mark}
                  </button>
                ) : (
                  <Link key={l.label} to={l.to} className={cls} aria-current={current ? "page" : undefined}>
                    {l.label}
                    {mark}
                  </Link>
                );
              })}
            </div>

            <div ref={ctaRef} className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToSection("contact")}
                className="hidden whitespace-nowrap rounded-full border border-white/20 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-metal-400/60 sm:inline-flex"
              >
                Book a demo
              </button>
              <button
                ref={toggleRef}
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 lg:hidden"
              >
                <span className="relative block h-3 w-4">
                  <motion.span animate={menuOpen ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
                               transition={{ duration: 0.25 }} className="absolute inset-x-0 top-0 block h-px bg-white" />
                  <motion.span animate={{ opacity: menuOpen ? 0 : 1 }} transition={{ duration: 0.15 }}
                               className="absolute inset-x-0 top-1.5 block h-px bg-white" />
                  <motion.span animate={menuOpen ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
                               transition={{ duration: 0.25 }} className="absolute inset-x-0 top-3 block h-px bg-white" />
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </nav>

      <MobileMenu
        open={menuOpen}
        pathname={pathname}
        toggleRef={toggleRef}
        onClose={closeMenu}
        onSection={goToSection}
      />
    </>
  );
}

function MobileMenu({
  open, pathname, toggleRef, onClose, onSection,
}: {
  open: boolean;
  pathname: string;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSection: (id: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => mq.matches && onClose();
    mq.addEventListener("change", onWide);

    // Escape closes; Tab stays inside the menu and its toggle.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [
        toggleRef.current,
        ...panelRef.current.querySelectorAll<HTMLElement>("a[href], button"),
      ].filter(Boolean) as HTMLElement[];
      // The toggle lives in the nav and the panel in a portal, so DOM order
      // cannot be trusted: move focus by hand.
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = i === -1 ? 0 : (i + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[next].focus();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      mq.removeEventListener("change", onWide);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, toggleRef]);

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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 flex flex-col bg-ink-950/98 outline-none backdrop-blur-2xl lg:hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 pb-10 pt-28">
            <ul>
              {LINKS.map((l) => (
                <li key={l.label} className="border-b border-white/8">
                  {l.kind === "section" ? (
                    <button type="button" onClick={() => onSection(l.id)}
                            className="flex min-h-14 w-full items-center text-left text-2xl font-medium text-white">
                      {l.label}
                    </button>
                  ) : (
                    <Link to={l.to} onClick={onClose}
                          className={"flex min-h-14 items-center text-2xl font-medium " +
                            (pathname.startsWith(l.to) ? "text-metal-300" : "text-white")}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-8 grid gap-3">
              <Link to="/chat" onClick={onClose} className="btn-primary w-full">Open the Studio</Link>
              <button type="button" onClick={() => onSection("contact")} className="btn-secondary w-full">
                Book a demo
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Navbar;
