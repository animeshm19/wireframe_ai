import { useReducedMotion } from "framer-motion";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Entry animation for marketing sections: once, 400 ms, 12 px. Still under reduced motion. */
export function useRise() {
  const reduced = useReducedMotion();
  return (delay = 0) => ({
    initial: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: reduced ? { duration: 0 } : { duration: 0.4, delay, ease: EASE },
  });
}
