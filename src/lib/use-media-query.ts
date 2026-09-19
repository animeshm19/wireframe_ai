import { useEffect, useState } from "react";

/**
 * A media query as state.
 *
 * The chat shell used to read window.innerWidth during render, in three
 * places, to decide whether the sidebar existed and whether the Studio
 * replaced the feed. Nothing re-rendered on resize, so the layout was frozen
 * to whatever the window happened to be when the component first mounted —
 * drag the window narrower and the sidebar stayed, rotate a tablet and the
 * Studio kept a 400px feed beside it. This subscribes instead.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True from the `md` breakpoint up — the width the sidebar needs. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
