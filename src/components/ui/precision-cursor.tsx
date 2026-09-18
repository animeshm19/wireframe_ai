/**
 * The pointer, as a measuring instrument.
 *
 * A jewellery CAD tool is a thing you take measurements with, so the cursor is
 * a viewfinder rather than an arrow: a reticle with four ticks, a dot that
 * tracks the true pointer position, and a ring that lags behind it on a spring.
 * The gap that opens between the dot and the ring when you move quickly is the
 * whole effect — it reads as mass.
 *
 * Interactive elements are read from the DOM rather than declared per-component:
 * anything focusable gets the expanded state automatically, and anything
 * carrying `data-cursor="..."` also gets that text rendered beside the reticle.
 * So a new button added later behaves correctly without being told to.
 *
 * Nothing here re-renders on pointer movement. Position lives in motion values
 * written directly to the transform; React state changes only when the cursor
 * changes *mode*, which happens on enter and leave, not on every frame.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

type Mode = "default" | "interactive" | "text" | "drag";

const INTERACTIVE = 'a,button,[role="button"],[data-cursor],summary,label[for]';
const TEXT_FIELD = "input,textarea,select,[contenteditable='true']";

export function PrecisionCursor() {
  // The true pointer position, written every move.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // The ring follows on a spring, so it trails the dot under acceleration.
  const ringX = useSpring(x, { stiffness: 380, damping: 34, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 380, damping: 34, mass: 0.6 });

  const [mode, setMode] = useState<Mode>("default");
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [down, setDown] = useState(false);

  // Set once, on mount, from the same media queries the CSS uses. A device
  // without a fine pointer never mounts the reticle at all.
  const [enabled, setEnabled] = useState(false);

  const frame = useRef<number | null>(null);
  const pending = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !still);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Pointer events fire faster than the display refreshes. Coalescing to one
    // write per frame means the motion values are set at most 60 times a
    // second instead of 120-plus.
    const flush = () => {
      frame.current = null;
      x.set(pending.current.x);
      y.set(pending.current.y);
    };

    const onMove = (e: PointerEvent) => {
      pending.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    };

    const onOver = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el || typeof el.closest !== "function") return;

      const field = el.closest(TEXT_FIELD);
      if (field) {
        setMode("text");
        setLabel(null);
        return;
      }

      const hit = el.closest(INTERACTIVE) as HTMLElement | null;
      if (hit) {
        setMode(hit.dataset.cursorMode === "drag" ? "drag" : "interactive");
        setLabel(hit.dataset.cursor || null);
        return;
      }

      setMode("default");
      setLabel(null);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [enabled, visible, x, y]);

  if (!enabled) return null;

  const ring =
    mode === "text"
      ? { w: 2, h: 26, r: 1, o: 0.9 }
      : mode === "interactive"
      ? { w: 54, h: 54, r: 27, o: 1 }
      : mode === "drag"
      ? { w: 64, h: 64, r: 32, o: 1 }
      : { w: 26, h: 26, r: 13, o: 0.55 };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] hidden md:block"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
    >
      {/* The reticle. */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ x: ringX, y: ringY }}
      >
        <motion.div
          className="absolute"
          animate={{
            width: ring.w,
            height: ring.h,
            borderRadius: ring.r,
            opacity: ring.o,
            scale: down ? 0.82 : 1,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          style={{
            x: "-50%",
            y: "-50%",
            border: "1px solid var(--metal-300)",
            boxShadow: "0 0 18px -4px var(--accent-glow)",
          }}
        />

        {/* Four ticks, outside the ring, only while measuring something. */}
        <AnimatePresence>
          {(mode === "interactive" || mode === "drag") && (
            <motion.svg
              key="ticks"
              width="96"
              height="96"
              viewBox="0 0 96 96"
              className="absolute"
              style={{ x: "-50%", y: "-50%" }}
              initial={{ opacity: 0, rotate: -35, scale: 0.85 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 20, scale: 0.9 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              <g stroke="var(--metal-400)" strokeWidth="1" opacity="0.85">
                <line x1="48" y1="6" x2="48" y2="15" />
                <line x1="48" y1="81" x2="48" y2="90" />
                <line x1="6" y1="48" x2="15" y2="48" />
                <line x1="81" y1="48" x2="90" y2="48" />
              </g>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      {/* The dot tracks the true position with no spring, so the gap between it
          and the ring shows how fast the pointer is moving. */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ x, y }}
      >
        <motion.div
          className="absolute rounded-full"
          animate={{
            width: mode === "text" ? 0 : 4,
            height: mode === "text" ? 0 : 4,
            opacity: mode === "interactive" || mode === "drag" ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
          style={{
            x: "-50%",
            y: "-50%",
            background: "var(--accent-500)",
            boxShadow: "0 0 10px var(--accent-500)",
          }}
        />

        <AnimatePresence>
          {label && (
            <motion.span
              key={label}
              className="mono-label absolute whitespace-nowrap"
              initial={{ opacity: 0, x: 26, y: 14 }}
              animate={{ opacity: 1, x: 38, y: 18 }}
              exit={{ opacity: 0, x: 26, y: 14 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              style={{ color: "var(--metal-200)" }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default PrecisionCursor;
