/**
 * Keyboard shortcuts.
 *
 * A CAD tool that can only be driven with a mouse is a CAD tool nobody uses
 * for eight hours. This is the whole mechanism: a list of bindings, a matcher,
 * and one listener.
 *
 * Two rules do most of the work:
 *
 *   - A bare letter never fires while someone is typing. The chat is a text
 *     box and the Studio has number fields; a shortcut that steals "s" from a
 *     sentence is worse than no shortcut. Chorded keys (with cmd/ctrl) still
 *     fire, because those are not characters anyone is trying to type.
 *   - "mod" is cmd on a Mac and ctrl everywhere else, so the same binding
 *     reads correctly in the help sheet on both.
 */

export type Binding = {
  /** "mod+k", "shift+e", "l", "?", "Escape" */
  keys: string;
  label: string;
  group?: string;
  run: (e: KeyboardEvent) => void;
  /** Let it fire even while a field has focus. Default false. */
  whenTyping?: boolean;
  /** Skip without removing it from the help sheet. */
  disabled?: boolean;
};

const IS_APPLE =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

type Parsed = { mod: boolean; shift: boolean; alt: boolean; key: string };

function parse(keys: string): Parsed {
  const parts = keys.toLowerCase().split("+").map((p) => p.trim());
  return {
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    key: parts[parts.length - 1],
  };
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable === true
  );
}

function matches(e: KeyboardEvent, p: Parsed): boolean {
  const mod = IS_APPLE ? e.metaKey : e.ctrlKey;
  if (p.mod !== mod) return false;
  // Only insist on shift when the binding asks for it: "?" already requires
  // shift on most layouts, and demanding both would make it unreachable.
  if (p.shift && !e.shiftKey) return false;
  if (p.alt !== e.altKey) return false;

  const key = e.key.toLowerCase();
  if (p.key === key) return true;
  // Digits: e.key is the character, which changes with the layout. e.code does
  // not, so a "1" binding works on AZERTY too.
  if (/^[0-9]$/.test(p.key) && e.code === `Digit${p.key}`) return true;
  return false;
}

/**
 * Installs the bindings for as long as the caller is mounted.
 *
 * Pass a stable array or memoise it — this re-registers whenever it changes,
 * which is cheap but pointless every render.
 */
export function attachShortcuts(bindings: Binding[]): () => void {
  if (typeof window === "undefined") return () => {};

  const compiled = bindings.map((b) => ({ b, p: parse(b.keys) }));

  const onKeyDown = (e: KeyboardEvent) => {
    const typing = isTypingTarget(e.target);
    for (const { b, p } of compiled) {
      if (b.disabled) continue;
      if (typing && !b.whenTyping) continue;
      if (!matches(e, p)) continue;
      e.preventDefault();
      b.run(e);
      return;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}

/**
 * "mod+shift+e" → "⌘⇧E" on a Mac, "Ctrl Shift E" elsewhere.
 *
 * The Apple glyphs are only used on Apple. Elsewhere they are a coin flip on
 * whether the system's monospace font has U+21E7 at all, and a hint nobody can
 * read is worse than a slightly longer one — "⇧E" rendered as a tofu box next
 * to "Download STL" tells a Windows user nothing.
 */
export function chord(keys: string): string {
  const p = parse(keys);
  const out: string[] = [];
  if (p.mod) out.push(IS_APPLE ? "⌘" : "Ctrl");
  if (p.shift) out.push(IS_APPLE ? "⇧" : "Shift");
  if (p.alt) out.push(IS_APPLE ? "⌥" : "Alt");
  const named: Record<string, string> = {
    escape: "Esc",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    enter: IS_APPLE ? "↵" : "Enter",
    backslash: "\\",
    " ": "Space",
  };
  out.push(named[p.key] ?? p.key.toUpperCase());
  return IS_APPLE ? out.join("") : out.join(" ");
}

export const MOD_LABEL = IS_APPLE ? "⌘" : "Ctrl";
