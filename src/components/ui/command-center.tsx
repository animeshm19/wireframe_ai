/**
 * The command palette and the shortcut sheet.
 *
 * One palette serves both the chat and the Studio: each passes the commands it
 * can run right now, so the list is never a menu of things that would do
 * nothing. Fuzzy-ish matching on label and keywords, arrow keys to move, enter
 * to run — the behaviour people already have in their fingers from every other
 * tool, which is the only reason a palette is worth having.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react";
import { chord, type Binding } from "../../lib/keyboard";

export type Command = {
  id: string;
  label: string;
  group: string;
  keys?: string;
  keywords?: string;
  disabled?: boolean;
  run: () => void;
};

/* --------------------------------------------------------------- palette -- */

export function CommandPalette({
  open, onClose, commands,
}: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const live = commands.filter((c) => !c.disabled);
    const needle = q.trim().toLowerCase();
    if (!needle) return live;
    // Every character of the query, in order, somewhere in the haystack. Loose
    // enough that "dstl" finds "Download STL", strict enough to stay ranked.
    const subseq = (hay: string) => {
      let j = 0;
      for (const ch of hay) if (ch === needle[j]) j++;
      return j === needle.length;
    };
    return live
      .map((c) => {
        const hay = `${c.label} ${c.group} ${c.keywords ?? ""}`.toLowerCase();
        const exact = hay.indexOf(needle);
        if (exact >= 0) return { c, score: exact };
        return subseq(hay) ? { c, score: 500 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score)
      .map((r) => r!.c);
  }, [commands, q]);

  useEffect(() => { setI(0); }, [q, open]);
  useEffect(() => {
    if (open) {
      setQ("");
      // rAF so the field exists before focus is asked for.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep the highlighted row on screen as the arrows walk past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-i="${i}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [i]);

  if (typeof document === "undefined") return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setI((v) => (v + 1) % Math.max(1, results.length)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setI((v) => (v - 1 + results.length) % Math.max(1, results.length)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const c = results[i];
      if (c) { onClose(); c.run(); }
    }
  };

  let lastGroup = "";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-md sm:pt-[12vh]"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={onKeyDown}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#160711]/96 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.07)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/8 px-4">
              <Search className="h-4 w-4 shrink-0 text-white/30" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a command…"
                aria-label="Search commands"
                className="w-full bg-transparent py-4 text-[0.95rem] text-white placeholder:text-white/30 focus:outline-none"
              />
              <kbd className="mono-label shrink-0 rounded border border-white/12 px-1.5 py-0.5 !text-[0.45rem] !text-white/40">
                Esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-6 text-center text-[0.85rem] text-white/35">
                  Nothing matches “{q}”.
                </p>
              )}
              {results.map((c, n) => {
                const header = c.group !== lastGroup ? ((lastGroup = c.group), c.group) : null;
                return (
                  <div key={c.id}>
                    {header && (
                      <div className="mono-label px-3 pb-1 pt-3 !text-[0.45rem]">{header}</div>
                    )}
                    <button
                      data-i={n}
                      onMouseEnter={() => setI(n)}
                      onClick={() => { onClose(); c.run(); }}
                      className={
                        "flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition-colors " +
                        (n === i ? "bg-white/[0.08]" : "hover:bg-white/[0.04]")
                      }
                    >
                      <span className="truncate text-[0.88rem] text-white/85">{c.label}</span>
                      {c.keys && (
                        <kbd className="mono-label shrink-0 rounded border border-white/12 px-1.5 py-0.5 !text-[0.45rem] !text-white/45">
                          {chord(c.keys)}
                        </kbd>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-white/8 px-4 py-2.5">
              <Hint what="move">
                <ArrowUp className="h-2.5 w-2.5" /><ArrowDown className="h-2.5 w-2.5" />
              </Hint>
              <Hint what="run"><CornerDownLeft className="h-2.5 w-2.5" /></Hint>
              <Hint what="close">esc</Hint>
              <span className="ml-auto mono-label !text-[0.45rem] !text-white/25">
                {results.length} {results.length === 1 ? "command" : "commands"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Hint({ what, children }: { what: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="mono-label flex items-center gap-0.5 rounded border border-white/12 px-1.5 py-1 !text-[0.45rem] !text-white/45">
        {children}
      </kbd>
      <span className="text-[0.68rem] text-white/30">{what}</span>
    </span>
  );
}

/* ----------------------------------------------------------- help sheet -- */

export function ShortcutSheet({
  open, onClose, bindings,
}: { open: boolean; onClose: () => void; bindings: Binding[] }) {
  if (typeof document === "undefined") return null;

  const groups = bindings.reduce<Record<string, Binding[]>>((acc, b) => {
    const g = b.group ?? "General";
    (acc[g] ||= []).push(b);
    return acc;
  }, {});

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#160711]/96 p-6 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-8"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-[1.15rem] font-medium tracking-tight text-white">
                Keyboard
              </h2>
              <button onClick={onClose} className="mono-label !text-[0.5rem] hover:!text-white">
                Close · Esc
              </button>
            </div>

            <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {Object.entries(groups).map(([g, list]) => (
                <div key={g}>
                  <h3 className="mono-label !text-[0.48rem] !text-metal-400">{g}</h3>
                  <ul className="mt-3 space-y-2">
                    {list.map((b) => (
                      <li key={b.keys + b.label} className="flex items-baseline justify-between gap-4">
                        <span className="text-[0.85rem] text-white/65">{b.label}</span>
                        <kbd className="mono-label shrink-0 rounded border border-white/12 px-1.5 py-0.5 !text-[0.45rem] !text-white/50">
                          {chord(b.keys)}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ------------------------------------------------------------- confirm -- */

/**
 * Replaces window.confirm, which blocks the whole tab, cannot be styled, and
 * on a destructive action gives no room to say what is about to be lost.
 */
export function ConfirmDialog({
  open, title, body, confirmLabel = "Delete", onConfirm, onClose,
}: {
  open: boolean; title: string; body: string; confirmLabel?: string;
  onConfirm: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) requestAnimationFrame(() => ref.current?.focus()); }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="alertdialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0d0309]/97 p-6 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
          >
            <h3 className="text-[1.05rem] font-medium tracking-tight text-white">{title}</h3>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-white/55">{body}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-full border border-white/12 px-4 py-2 text-[0.82rem] text-white/70 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                ref={ref}
                onClick={() => { onClose(); onConfirm(); }}
                className="rounded-full bg-red-500/90 px-4 py-2 text-[0.82rem] font-medium text-white transition-colors hover:bg-red-500"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
