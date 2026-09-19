/**
 * The chat.
 *
 * Rebuilt around the way the tool is actually used: you write a sentence, you
 * get a piece, you open it in the Studio, you come back and write another.
 * Everything here serves that loop, and everything in it is reachable from the
 * keyboard.
 *
 * Bugs fixed while rebuilding:
 *
 *   - window.innerWidth was read during render in three places to decide
 *     whether the sidebar existed and whether the Studio replaced the feed.
 *     Nothing re-rendered on resize, so the layout was frozen to whatever the
 *     window was at mount — drag it narrower and the sidebar stayed.
 *   - loadPersistedState() ran on every render, and the useState default built
 *     a fresh chat object every render to throw it away. Both are lazy now.
 *   - URL.createObjectURL was called during render for each attachment chip
 *     and revoked in onLoad, so every keystroke in the composer minted a new
 *     blob URL for every pending file and orphaned the last one. They are
 *     created once per file and revoked when the file is dropped.
 *   - The feed scrolled to the bottom on every change, smoothly, which fought
 *     anyone who had scrolled up to read. It only follows when you are already
 *     at the bottom, and offers a button when you are not.
 *   - Two window.confirm() calls. A blocking native dialog in an app that has
 *     a WebGL canvas running is a bad idea, and it cannot say what is about to
 *     be lost.
 *   - "Pro Plan" was printed under the name of every signed-in user.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Menu, Plus, X, Pin, Trash2, Settings, PanelLeftClose, PanelLeft,
  Cpu, ArrowUp, Box, Paperclip, File as FileIcon, Loader2, LogOut, LogIn,
  Check, Search, Copy, RefreshCw, Maximize2, ArrowDown, Command as CommandIcon,
} from "lucide-react";
import type { ChatSession, ChatMessage, ChatAttachment } from "./chat-types";
import { AuthDialog } from "./auth-dialog";
import { useAuth } from "../../auth/auth-context";
import { createDesignJob, uploadJobAttachment, deleteChatFromBackend } from "@/lib/design-jobs";
import { DesignJobCard } from "./design-job-card";
import { StudioWorkspace } from "./studio-workspace";
import { attachShortcuts, chord, type Binding } from "../../lib/keyboard";
import { useIsDesktop } from "../../lib/use-media-query";
import { CommandPalette, ShortcutSheet, ConfirmDialog, type Command } from "../ui/command-center";

import logo from "../../assets/logo.png";

const STORAGE_KEY = "wireframe-chat-v1";

type PersistedState = {
  chats: ChatSession[];
  activeChatId: string;
  isSidebarCollapsed: boolean;
};

/* Starters that the parser actually understands. Anything offered as a
 * one-tap example had better come back with a filled spec, or the first thing
 * a new visitor learns is that it does not work. */
const STARTERS = [
  "Platinum solitaire, 1.5 ct round brilliant, size 6.5",
  "18k rose gold half eternity, 2.4mm band, hammered finish",
  "White gold halo, 0.9 ct cushion, split shank, 6 prong",
  "Three-stone emerald cut in platinum, cathedral setting, size 7",
];

function createEmptyChat(label?: string): ChatSession {
  const now = Date.now();
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: label ?? "New collection",
    messages: [],
    createdAt: now,
    updatedAt: now,
    isPinned: false,
  };
}

function titleFrom(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New collection";
  const words = cleaned.split(/\s+/);
  return words.slice(0, 5).join(" ") + (words.length > 5 ? "…" : "");
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function initials(s?: string | null) {
  const v = (s ?? "").trim();
  return v ? v.slice(0, 2).toUpperCase() : "WF";
}

function relativeDay(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return "This week";
  if (d < 30) return "This month";
  return "Earlier";
}

export function ChatShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  // Lazy: read storage once, not on every render.
  const [chats, setChats] = useState<ChatSession[]>(
    () => loadPersisted()?.chats ?? [createEmptyChat()]
  );
  const [activeChatId, setActiveChatId] = useState<string>(
    () => loadPersisted()?.activeChatId ?? ""
  );
  const [collapsed, setCollapsed] = useState<boolean>(
    () => loadPersisted()?.isSidebarCollapsed ?? false
  );

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [studioJobId, setStudioJobId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ ids: string[]; title: string; body: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{ text: string; files: File[] } | null>(null);

  const active = chats.find((c) => c.id === activeChatId) ?? chats[0];

  // Keep activeChatId honest: a stale id from storage, or a deleted chat,
  // would otherwise leave `active` pointing at chats[0] while the sidebar
  // highlighted nothing.
  useEffect(() => {
    if (active && active.id !== activeChatId) setActiveChatId(active.id);
  }, [active, activeChatId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chats, activeChatId, isSidebarCollapsed: collapsed })
    );
  }, [chats, activeChatId, collapsed]);

  /* --------------------------------------------------------- attachments -- */

  /* One object URL per file, made when the file arrives and released when it
   * leaves. Minting them in render meant a new blob for every pending file on
   * every keystroke. */
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());
  useEffect(() => {
    setPreviews((prev) => {
      const next = new Map<File, string>();
      for (const f of files) {
        const existing = prev.get(f);
        next.set(f, existing ?? (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
      }
      for (const [f, url] of prev) if (!next.has(f) && url) URL.revokeObjectURL(url);
      return next;
    });
  }, [files]);
  useEffect(() => () => { previews.forEach((u) => u && URL.revokeObjectURL(u)); }, []); // eslint-disable-line

  /* ------------------------------------------------------------- scroll -- */

  const onFeedScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
  }, []);

  const jumpToEnd = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  // Follow new messages only when already at the bottom.
  useEffect(() => {
    if (atBottom) jumpToEnd(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.messages.length, generating]);

  // A different collection always starts at its end, without animating there.
  useEffect(() => { jumpToEnd(false); setAtBottom(true); }, [activeChatId, jumpToEnd]);

  /* ------------------------------------------------------------ actions -- */

  const newChat = useCallback(() => {
    const c = createEmptyChat();
    setChats((prev) => [c, ...prev]);
    setActiveChatId(c.id);
    setDrawerOpen(false);
    setStudioJobId(null);
    setInput("");
    setFiles([]);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  const reallyDelete = useCallback(async (ids: string[]) => {
    const set = new Set(ids);
    setChats((prev) => {
      const next = prev.filter((c) => !set.has(c.id));
      if (next.length === 0) next.push(createEmptyChat());
      if (set.has(activeChatId)) setActiveChatId(next[0].id);
      return next;
    });
    if (user) {
      try { await Promise.all(ids.map((id) => deleteChatFromBackend(id))); }
      catch (err) { console.error("Backend cleanup failed:", err); }
    }
  }, [activeChatId, user]);

  const askDelete = (chat: ChatSession) =>
    setConfirm({
      ids: [chat.id],
      title: `Delete “${chat.title}”?`,
      body: `${chat.messages.length} message${chat.messages.length === 1 ? "" : "s"} and every design in this collection will be removed. This cannot be undone.`,
    });

  const togglePin = (id: string) =>
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)));

  const send = useCallback(async (text: string, attach: File[]) => {
    const now = Date.now();
    let uploaded: ChatAttachment[] = [];
    let uploadFailed = false;

    if (attach.length > 0 && user) {
      setUploading(true);
      try {
        const res = await Promise.all(attach.map((f) => uploadJobAttachment(f, user.uid)));
        uploaded = res.map((r) => ({ name: r.name, url: r.url, type: r.type }));
      } catch (err) {
        console.error("Upload failed", err);
        uploadFailed = true;   // said out loud below, not swallowed
      } finally {
        setUploading(false);
      }
    }

    const userMsg: ChatMessage = {
      id: `msg-${now}`, role: "user", content: text, createdAt: now, attachments: uploaded,
    };
    setChats((prev) => prev.map((c) =>
      c.id !== activeChatId ? c
        : { ...c,
            title: c.messages.length === 0 ? titleFrom(text) : c.title,
            messages: [...c.messages, userMsg],
            updatedAt: now }
    ));

    if (uploadFailed) {
      setChats((prev) => prev.map((c) => c.id !== activeChatId ? c : { ...c, messages: [...c.messages, {
        id: `warn-${Date.now()}`, role: "assistant", createdAt: Date.now(),
        content: "Your attachments did not upload, so this was sent without them.",
      }]}));
    }

    setGenerating(true);
    try {
      const { jobId } = await createDesignJob(text, activeChatId, uploaded.map((a) => a.url));
      setChats((prev) => prev.map((c) => c.id !== activeChatId ? c : { ...c, messages: [...c.messages, {
        id: `sys-${Date.now()}`, role: "assistant", createdAt: Date.now(),
        content: "Building the solid.", designJobId: jobId,
      }]}));
    } catch (err: any) {
      setChats((prev) => prev.map((c) => c.id !== activeChatId ? c : { ...c, messages: [...c.messages, {
        id: `err-${Date.now()}`, role: "assistant", createdAt: Date.now(),
        content: `Could not start that build — ${err?.message ?? "unknown error"}`,
      }]}));
    } finally {
      setGenerating(false);
    }
  }, [activeChatId, user]);

  const submit = useCallback(() => {
    const text = input.trim();
    if ((!text && files.length === 0) || generating || uploading) return;
    if (!user) {
      pendingRef.current = { text: input, files };
      setAuthOpen(true);
      return;
    }
    send(input, files);
    setInput("");
    setFiles([]);
  }, [input, files, generating, uploading, user, send]);

  const retry = (text: string) => {
    setInput(text);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(text.length, text.length);
    });
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((v) => (v === id ? null : v)), 1400);
    } catch { /* clipboard denied — nothing useful to say */ }
  };

  /* ---------------------------------------------------------- shortcuts -- */

  const bindings: Binding[] = useMemo(() => [
    { keys: "mod+k", label: "Command palette", group: "General", whenTyping: true,
      run: () => setPaletteOpen((v) => !v) },
    { keys: "?", label: "Keyboard shortcuts", group: "General",
      run: () => setHelpOpen((v) => !v) },
    { keys: "mod+b", label: "Show or hide the sidebar", group: "General", whenTyping: true,
      run: () => setCollapsed((v) => !v) },
    { keys: "mod+n", label: "New collection", group: "Collections", whenTyping: true,
      run: newChat },
    { keys: "mod+f", label: "Search collections", group: "Collections", whenTyping: true,
      run: () => { setCollapsed(false); setSearching(true); requestAnimationFrame(() => searchRef.current?.focus()); } },
    { keys: "mod+enter", label: "Send", group: "Composer", whenTyping: true, run: submit },
    { keys: "mod+u", label: "Attach a file", group: "Composer", whenTyping: true,
      run: () => fileInputRef.current?.click() },
    { keys: "escape", label: "Close what is open", group: "General", whenTyping: true,
      run: () => {
        if (paletteOpen) return setPaletteOpen(false);
        if (helpOpen) return setHelpOpen(false);
        if (searching) { setSearching(false); setQuery(""); return; }
        if (studioJobId) return setStudioJobId(null);
        if (drawerOpen) return setDrawerOpen(false);
        composerRef.current?.blur();
      } },
  ], [newChat, submit, paletteOpen, helpOpen, searching, studioJobId, drawerOpen]);

  useEffect(() => attachShortcuts(bindings), [bindings]);

  const lastPrompt = useMemo(
    () => [...(active?.messages ?? [])].reverse().find((m) => m.role === "user")?.content ?? "",
    [active?.messages]
  );

  const commands: Command[] = useMemo(() => [
    { id: "new", label: "New collection", group: "Collections", keys: "mod+n", run: newChat },
    { id: "search", label: "Search collections", group: "Collections", keys: "mod+f",
      run: () => { setCollapsed(false); setSearching(true); requestAnimationFrame(() => searchRef.current?.focus()); } },
    { id: "pin", label: active?.isPinned ? "Unpin this collection" : "Pin this collection",
      group: "Collections", disabled: !active, run: () => active && togglePin(active.id) },
    { id: "del", label: "Delete this collection", group: "Collections",
      disabled: !active, run: () => active && askDelete(active) },
    ...STARTERS.map((s, i) => ({
      id: `starter-${i}`, label: s, group: "Start from", keywords: "prompt example starter",
      run: () => { setInput(s); requestAnimationFrame(() => composerRef.current?.focus()); },
    })),
    { id: "again", label: "Reuse my last prompt", group: "Composer", keywords: "repeat retry",
      disabled: !lastPrompt, run: () => retry(lastPrompt) },
    { id: "attach", label: "Attach a file", group: "Composer", keys: "mod+u",
      run: () => fileInputRef.current?.click() },
    { id: "sidebar", label: collapsed ? "Show the sidebar" : "Hide the sidebar",
      group: "View", keys: "mod+b", run: () => setCollapsed((v) => !v) },
    { id: "studio", label: "Close the Studio", group: "View",
      disabled: !studioJobId, run: () => setStudioJobId(null) },
    { id: "keys", label: "Keyboard shortcuts", group: "View", keys: "?", run: () => setHelpOpen(true) },
    { id: "settings", label: "Studio settings", group: "Account", run: () => navigate("/settings") },
    { id: "auth", label: user ? "Sign out" : "Sign in", group: "Account",
      run: () => (user ? signOut().catch(console.error) : setAuthOpen(true)) },
  ], [active, collapsed, studioJobId, lastPrompt, newChat, navigate, user, signOut]);

  /* ------------------------------------------------------------ sidebar -- */

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? chats.filter((c) =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q)))
      : chats;
    return [...list].sort(
      (a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.updatedAt - a.updatedAt
    );
  }, [chats, query]);

  const grouped = useMemo(() => {
    const out: Array<{ heading: string; items: ChatSession[] }> = [];
    for (const c of visible) {
      const heading = c.isPinned ? "Pinned" : relativeDay(c.updatedAt);
      const last = out[out.length - 1];
      if (last?.heading === heading) last.items.push(c);
      else out.push({ heading, items: [c] });
    }
    return out;
  }, [visible]);

  const showSidebar = isDesktop || drawerOpen;
  const width = collapsed && isDesktop ? 72 : 286;

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-ink-900 text-white">
      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={() => {
          const p = pendingRef.current;
          if (p && (p.text.trim() || p.files.length)) {
            send(p.text, p.files);
            setInput("");
            setFiles([]);
          }
          pendingRef.current = null;
        }}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <ShortcutSheet open={helpOpen} onClose={() => setHelpOpen(false)} bindings={bindings} />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        body={confirm?.body ?? ""}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && reallyDelete(confirm.ids)}
      />

      {/* ------------------------------------------------------- sidebar -- */}

      <AnimatePresence>
        {showSidebar && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width, x: showSidebar ? 0 : -width - 8 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        aria-label="Collections"
        className="fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-white/8 bg-ink-950 md:relative md:z-auto"
      >
        <div className={"flex h-14 items-center border-b border-white/6 px-3 " + (collapsed && isDesktop ? "justify-center" : "justify-between")}>
          {!(collapsed && isDesktop) && (
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="" className="h-6 w-auto" />
              <span className="text-[0.9rem] font-medium tracking-tight text-white/90">wireframe</span>
            </div>
          )}
          <button
            onClick={() => (isDesktop ? setCollapsed((v) => !v) : setDrawerOpen(false))}
            title={isDesktop ? `Toggle sidebar · ${chord("mod+b")}` : "Close"}
            aria-label="Toggle sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >
            {!isDesktop ? <X className="h-4 w-4" />
              : collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={newChat}
            title={`New collection · ${chord("mod+n")}`}
            className={"flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[0.85rem] text-white/80 transition-colors hover:border-metal-400/40 hover:bg-white/[0.07] " + (collapsed && isDesktop ? "justify-center px-0" : "")}
          >
            <Plus className="h-4 w-4 shrink-0 text-metal-300" />
            {!(collapsed && isDesktop) && (
              <>
                <span className="flex-1 text-left">New collection</span>
                <kbd className="mono-label !text-[0.42rem] !text-white/30">{chord("mod+n")}</kbd>
              </>
            )}
          </button>
        </div>

        {!(collapsed && isDesktop) && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/30 px-2.5 py-1.5 focus-within:border-metal-400/40">
              <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearching(true)}
                placeholder="Search collections"
                aria-label="Search collections"
                className="w-full bg-transparent py-0.5 text-[0.8rem] text-white placeholder:text-white/25 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search"
                        className="text-white/30 hover:text-white"><X className="h-3 w-3" /></button>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {grouped.length === 0 && !(collapsed && isDesktop) && (
            <p className="px-3 py-6 text-center text-[0.8rem] text-white/30">
              Nothing matches “{query}”.
            </p>
          )}
          {grouped.map((g) => (
            <div key={g.heading} className="mb-1">
              {!(collapsed && isDesktop) && (
                <div className="mono-label px-2 pb-1 pt-3 !text-[0.44rem]">{g.heading}</div>
              )}
              {g.items.map((c) => {
                const on = c.id === active?.id;
                return (
                  <div key={c.id} className="group relative">
                    <button
                      onClick={() => { setActiveChatId(c.id); setDrawerOpen(false); setStudioJobId(null); }}
                      title={c.title}
                      aria-current={on ? "true" : undefined}
                      className={"flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.85rem] transition-colors " +
                        (on ? "bg-white/[0.09] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/85") +
                        (collapsed && isDesktop ? " justify-center" : "")}
                    >
                      {collapsed && isDesktop ? (
                        <span className={"h-1.5 w-1.5 rounded-full " + (on ? "bg-metal-300" : "bg-white/20")} />
                      ) : (
                        <>
                          {c.isPinned && <Pin className="h-3 w-3 shrink-0 rotate-45 text-metal-400" />}
                          <span className="truncate">{c.title}</span>
                        </>
                      )}
                    </button>

                    {!(collapsed && isDesktop) && (
                      <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg bg-ink-950/95 pl-2 group-hover:flex group-focus-within:flex">
                        <button onClick={() => togglePin(c.id)} title={c.isPinned ? "Unpin" : "Pin"}
                                aria-label={c.isPinned ? "Unpin" : "Pin"}
                                className="grid h-7 w-7 place-items-center rounded text-white/35 hover:text-metal-300">
                          <Pin className="h-3 w-3" />
                        </button>
                        <button onClick={() => askDelete(c)} title="Delete" aria-label="Delete"
                                className="grid h-7 w-7 place-items-center rounded text-white/35 hover:text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/6 p-2">
          <SideAction icon={CommandIcon} label="Commands" hint={chord("mod+k")}
                      collapsed={collapsed && isDesktop} onClick={() => setPaletteOpen(true)} />
          <SideAction icon={Settings} label="Settings"
                      collapsed={collapsed && isDesktop} onClick={() => navigate("/settings")} />
          {user
            ? <SideAction icon={LogOut} label="Sign out" tone="danger"
                          collapsed={collapsed && isDesktop} onClick={() => signOut().catch(console.error)} />
            : <SideAction icon={LogIn} label="Sign in" tone="accent"
                          collapsed={collapsed && isDesktop} onClick={() => setAuthOpen(true)} />}

          <div className={"mt-2 flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2 " + (collapsed && isDesktop ? "justify-center" : "")}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-metal-400 to-accent-500 text-[0.55rem] font-semibold text-ink-900">
              {initials(user?.displayName || user?.email)}
            </span>
            {!(collapsed && isDesktop) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.78rem] text-white/85">
                  {user?.displayName || user?.email || "Not signed in"}
                </p>
                <p className="mono-label !text-[0.42rem]">
                  {user ? "Signed in" : "Sign in to save your work"}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ---------------------------------------------------------- main -- */}

      <div className="relative flex min-w-0 flex-1">
        <main
          className={"relative flex min-w-0 flex-col " +
            (studioJobId ? "hidden lg:flex lg:w-[420px] lg:shrink-0 lg:border-r lg:border-white/8" : "flex-1")}
        >
          {/* Top bar */}
          <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-white/6 bg-ink-900/85 px-3 backdrop-blur-xl">
            {!isDesktop && (
              <button onClick={() => setDrawerOpen(true)} aria-label="Open collections"
                      className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white">
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[0.9rem] font-medium tracking-tight text-white/90">
                {active?.title ?? "New collection"}
              </h1>
              <p className="mono-label !text-[0.42rem]">
                {active?.messages.length ?? 0} message{(active?.messages.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
            <button onClick={() => setPaletteOpen(true)} title={`Commands · ${chord("mod+k")}`}
                    className="hidden items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[0.75rem] text-white/45 transition-colors hover:border-white/20 hover:text-white/80 sm:flex">
              <Search className="h-3.5 w-3.5" />
              <span>Commands</span>
              <kbd className="mono-label !text-[0.42rem] !text-white/30">{chord("mod+k")}</kbd>
            </button>
            {!isDesktop && (
              <button onClick={newChat} aria-label="New collection"
                      className="grid h-9 w-9 place-items-center rounded-lg text-metal-300 hover:bg-white/5">
                <Plus className="h-5 w-5" />
              </button>
            )}
          </header>

          {/* Feed */}
          <div ref={feedRef} onScroll={onFeedScroll}
               className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {/* The empty state is centred in the space it has rather than
                stacked at the top of it, which left the starters floating in
                the upper third with a screen of nothing underneath. */}
            <div className={"mx-auto max-w-3xl " +
              ((!active || active.messages.length === 0) ? "flex min-h-full items-center justify-center" : "")}>
              {(!active || active.messages.length === 0) ? (
                <EmptyState onPick={(s) => { setInput(s); composerRef.current?.focus(); }} />
              ) : (
                <ol className="space-y-8">
                  {active.messages.map((m) => (
                    <Message
                      key={m.id}
                      msg={m}
                      copied={copiedId === m.id}
                      onCopy={() => copy(m.id, m.content)}
                      onRetry={() => retry(m.content)}
                      onOpenStudio={() => m.designJobId && setStudioJobId(m.designJobId)}
                    />
                  ))}
                </ol>
              )}
              {generating && (
                <div className="mt-8 flex items-center gap-3 pl-9">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-metal-300" />
                  <span className="mono-label !text-[0.46rem]">Working</span>
                </div>
              )}
              <div ref={endRef} className="h-2" />
            </div>

            <AnimatePresence>
              {!atBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  onClick={() => jumpToEnd(true)}
                  className="sticky bottom-3 left-1/2 z-10 ml-[-4.5rem] flex w-36 items-center justify-center gap-2 rounded-full border border-white/12 bg-ink-950/90 px-3 py-2 text-[0.75rem] text-white/70 shadow-xl backdrop-blur"
                >
                  <ArrowDown className="h-3.5 w-3.5" /> Latest
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-white/6 bg-ink-900 px-4 pb-4 pt-3 md:px-8">
            <div className="mx-auto max-w-3xl">
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 flex gap-2 overflow-x-auto pb-1"
                  >
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="relative shrink-0">
                        <div className="h-14 w-14 overflow-hidden rounded-xl border border-white/12 bg-white/5">
                          {previews.get(f)
                            ? <img src={previews.get(f)} alt="" className="h-full w-full object-cover" />
                            : <span className="grid h-full w-full place-items-center"><FileIcon className="h-5 w-5 text-white/35" /></span>}
                        </div>
                        <button
                          onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                          aria-label={`Remove ${f.name}`}
                          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-ink-950 text-white transition-colors hover:border-red-500 hover:bg-red-500"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>

              <div className="relative flex items-end gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 transition-colors focus-within:border-metal-400/45">
                <input ref={fileInputRef} type="file" multiple hidden
                       accept=".jpg,.jpeg,.png,.webp,.stl,.obj"
                       onChange={(e) => {
                         if (e.target.files?.length) setFiles((p) => [...p, ...Array.from(e.target.files!)]);
                         e.target.value = "";
                       }} />
                <button onClick={() => fileInputRef.current?.click()}
                        title={`Attach · ${chord("mod+u")}`} aria-label="Attach a file"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/40 transition-colors hover:bg-white/8 hover:text-white">
                  <Paperclip className="h-4.5 w-4.5" />
                </button>

                <textarea
                  ref={composerRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); return; }
                    // Up arrow in an empty box recalls the last prompt, the way
                    // a shell does. Only when empty, so it never eats a caret move.
                    if (e.key === "ArrowUp" && input === "" && lastPrompt) {
                      e.preventDefault(); retry(lastPrompt);
                    }
                  }}
                  rows={1}
                  placeholder={isDesktop ? "Describe a piece — metal, stone, setting, size…" : "Describe a piece…"}
                  aria-label="Describe a piece"
                  className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2.5 text-[0.92rem] text-white placeholder:text-white/28 focus:outline-none"
                  style={{ minHeight: 44 }}
                />

                <button
                  onClick={submit}
                  disabled={(!input.trim() && files.length === 0) || generating || uploading}
                  aria-label="Send"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-ink-900 transition-all hover:bg-metal-200 disabled:bg-white/10 disabled:text-white/30"
                >
                  {generating || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>

              {/* Keyboard hints, for the people who have a keyboard. On a phone
                  this row was two pieces of advice you cannot take. */}
              <div className="mt-2 hidden items-center justify-between px-1 md:flex">
                <p className="mono-label !text-[0.42rem]">
                  Enter to send · Shift + Enter for a new line
                </p>
                <button onClick={() => setHelpOpen(true)}
                        className="mono-label !text-[0.42rem] transition-colors hover:!text-white/70">
                  Shortcuts · ?
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* --------------------------------------------------------- studio -- */}
        <AnimatePresence>
          {studioJobId && (
            <motion.section
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              aria-label="Studio"
              className="absolute inset-0 z-30 bg-ink-950 lg:static lg:flex-1"
            >
              <StudioWorkspace jobId={studioJobId} onClose={() => setStudioJobId(null)} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- pieces -- */

function SideAction({
  icon: Icon, label, hint, collapsed, tone, onClick,
}: {
  icon: any; label: string; hint?: string; collapsed: boolean;
  tone?: "danger" | "accent"; onClick: () => void;
}) {
  const colour =
    tone === "danger" ? "text-red-400/70 hover:text-red-400"
    : tone === "accent" ? "text-metal-300 hover:text-white"
    : "text-white/45 hover:text-white";
  return (
    <button
      onClick={onClick}
      title={hint ? `${label} · ${hint}` : label}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.82rem] transition-colors hover:bg-white/5 ${colour} ${collapsed ? "justify-center" : ""}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          {hint && <kbd className="mono-label !text-[0.42rem] !text-white/25">{hint}</kbd>}
        </>
      )}
    </button>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex w-full flex-col items-center justify-center py-8 text-center">
      <motion.img
        src={logo} alt=""
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="h-14 w-auto opacity-80"
      />
      <motion.h2
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-[1.4rem] font-medium tracking-tight text-white"
      >
        What are we making?
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
        className="mt-2 max-w-md text-[0.88rem] leading-relaxed text-white/45"
      >
        Describe it the way you would to a bench jeweller. Name the metal, the
        stone, the setting and the size, and you get a parametric solid back.
      </motion.p>

      <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {STARTERS.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onPick(s)}
            className="group rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-3 text-left text-[0.82rem] leading-snug text-white/60 transition-colors hover:border-metal-400/35 hover:bg-white/[0.05] hover:text-white/90"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Message({
  msg, copied, onCopy, onRetry, onOpenStudio,
}: {
  msg: ChatMessage; copied: boolean;
  onCopy: () => void; onRetry: () => void; onOpenStudio: () => void;
}) {
  const isUser = msg.role === "user";
  return (
    <li className="group relative pl-9">
      <span
        aria-hidden="true"
        className={"absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full border " +
          (isUser
            ? "border-white/15 bg-ink-900"
            : "border-metal-400/35 bg-ink-850")}
      >
        {isUser
          ? <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          : <Cpu className="h-3.5 w-3.5 text-metal-300" />}
      </span>

      <div className="flex items-center gap-3">
        <span className="mono-label !text-[0.44rem]">{isUser ? "You" : "wireframe"}</span>
        <span className="h-px flex-1 bg-white/5" />
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconBtn label={copied ? "Copied" : "Copy"} onClick={onCopy}>
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </IconBtn>
          {isUser && (
            <IconBtn label="Use this prompt again" onClick={onRetry}>
              <RefreshCw className="h-3 w-3" />
            </IconBtn>
          )}
        </div>
      </div>

      <p className="mt-1.5 whitespace-pre-wrap text-[0.92rem] leading-relaxed text-white/85">
        {msg.content}
      </p>

      {msg.attachments && msg.attachments.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {msg.attachments.map((f, i) => (
            <li key={i} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {f.type.startsWith("image/") ? (
                <img src={f.url} alt={f.name} className="h-28 w-28 object-cover" />
              ) : (
                <span className="flex h-20 w-28 flex-col items-center justify-center gap-1.5 px-2">
                  <Box className="h-5 w-5 text-white/40" />
                  <span className="truncate text-[0.62rem] text-white/45">{f.name}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {msg.designJobId && (
        <div className="mt-3 max-w-md">
          <DesignJobCard jobId={msg.designJobId} />
          <button
            onClick={onOpenStudio}
            className="group/s mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-[0.8rem] text-white/70 transition-colors hover:border-metal-400/40 hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Open in the Studio
          </button>
        </div>
      )}
    </li>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
            className="grid h-6 w-6 place-items-center rounded text-white/35 transition-colors hover:bg-white/8 hover:text-white">
      {children}
    </button>
  );
}
