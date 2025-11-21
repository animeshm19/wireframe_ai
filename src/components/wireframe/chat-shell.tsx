// src/components/wireframe/chat-shell.tsx
import React, { useState, useEffect, useRef } from "react";
import type { ChatSession, ChatMessage } from "./chat-types";

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 420;

// Local storage key
const STORAGE_KEY = "wireframe-chat-v1";

type PersistedState = {
  chats: ChatSession[];
  activeChatId: string;
  sidebarWidth: number;
  isSidebarCollapsed: boolean;
};

function createEmptyChat(label?: string): ChatSession {
  const now = Date.now();
  return {
    id: `chat-${now}`,
    title: label ?? "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
    isPinned: false,
  };
}

// Generate a chat title from the user's text (max 5 words)
function generateTitleFromText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";

  // Remove most punctuation so title is clean
  const stripped = cleaned.replace(/[^\w\s]/g, "");
  const words = stripped.split("").length ? stripped.split(" ") : [];
  if (words.length === 0) return "New chat";

  const preview = words.slice(0, 5).join(" ");
  return preview.charAt(0).toUpperCase() + preview.slice(1);
}

// Load persisted state (if any) from localStorage
function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    if (!parsed.chats || !Array.isArray(parsed.chats) || parsed.chats.length === 0) {
      return null;
    }

    const chats = parsed.chats;
    const activeChatId =
      parsed.activeChatId && chats.some((c) => c.id === parsed.activeChatId)
        ? parsed.activeChatId
        : chats[0].id;

    const sidebarWidth =
      typeof parsed.sidebarWidth === "number"
        ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsed.sidebarWidth))
        : 280;

    const isSidebarCollapsed = Boolean(parsed.isSidebarCollapsed);

    return {
      chats,
      activeChatId,
      sidebarWidth,
      isSidebarCollapsed,
    };
  } catch {
    return null;
  }
}

// Very simple “fake” Wireframe reply for now.
// Later, you can replace this with a real API call.
function buildAssistantReply(userText: string): string {
  return [
    "Here is how Wireframe would start thinking about this piece:",
    "",
    `• Interpreting your brief: "${userText}"`,
    "• Turning it into constraints like stone sizes, prong counts and shank width.",
    "• Preparing a parametric CAD plan that you can tweak before export.",
    "",
    "Later, this reply will come from the real Wireframe engine instead of this placeholder.",
  ].join("\n");
}

export function ChatShell() {
  // ----- state initialisation with persistence -----
  const persisted = loadPersistedState();

  // 1) Chat sessions
  const [chats, setChats] = useState<ChatSession[]>(
    persisted?.chats ?? [createEmptyChat()],
  );

  // 2) Which chat is open
  const [activeChatId, setActiveChatId] = useState<string>(
    persisted?.activeChatId ?? (persisted?.chats?.[0]?.id ?? (chats[0]?.id ?? "")),
  );

  // 3) Prompt input
  const [input, setInput] = useState<string>("");

  // 4) Sidebar layout
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    persisted?.sidebarWidth ?? 280,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    persisted?.isSidebarCollapsed ?? false,
  );

  // 5) Delete confirmation
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);

  // 6) Message editing modal
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // 7) Assistant / generation state
  const [isGenerating, setIsGenerating] = useState(false);

  // 8) For auto-scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Ensure we always have a valid activeChatId
  useEffect(() => {
    if (!activeChatId && chats[0]?.id) {
      setActiveChatId(chats[0].id);
    }
  }, [activeChatId, chats]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? chats[0];
  const hasMessages = activeChat && activeChat.messages.length > 0;
  const messageCount = activeChat ? activeChat.messages.length : 0;

  // Sorted chats: pinned first, then by last updated
  const sortedChats = [...chats].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned; // pinned on top
    return b.updatedAt - a.updatedAt; // newest first
  });

  // Persist state to localStorage when relevant parts change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedState = {
      chats,
      activeChatId,
      sidebarWidth,
      isSidebarCollapsed,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [chats, activeChatId, sidebarWidth, isSidebarCollapsed]);

  // Auto-scroll to bottom whenever messages change or assistant is generating
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount, activeChatId, isGenerating]);

  // Create a new empty chat
  const handleNewChat = () => {
    const newChat = createEmptyChat();
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInput("");
  };

  // Toggle pin
  const handleTogglePin = (id: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === id ? { ...chat, isPinned: !chat.isPinned } : chat,
      ),
    );
  };

  // Actually delete chat (after confirmation)
  const performDeleteChat = (id: string) => {
    let nextActiveId = activeChatId;

    setChats((prev) => {
      const filtered = prev.filter((chat) => chat.id !== id);

      if (filtered.length === 0) {
        const newChat = createEmptyChat();
        nextActiveId = newChat.id;
        return [newChat];
      }

      if (nextActiveId === id) {
        nextActiveId = filtered[0].id;
      }

      return filtered;
    });

    setActiveChatId(nextActiveId);
  };

  const handleConfirmDelete = () => {
    if (chatToDelete) {
      performDeleteChat(chatToDelete.id);
      setChatToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setChatToDelete(null);
  };

  // Append an assistant message to a specific chat
  const appendAssistantMessage = (chatId: string, content: string) => {
    const now = Date.now();
    const assistantMessage: ChatMessage = {
      id: `msg-${now}`,
      role: "assistant",
      content,
      createdAt: now,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          messages: [...chat.messages, assistantMessage],
          updatedAt: now,
        };
      }),
    );
  };

  // Simulate a Wireframe reply (placeholder for real backend)
  const simulateAssistantResponse = (chatId: string, userText: string) => {
    setIsGenerating(true);
    const replyText = buildAssistantReply(userText);
    const delay = Math.min(2200, 600 + userText.length * 25);

    window.setTimeout(() => {
      appendAssistantMessage(chatId, replyText);
      setIsGenerating(false);
    }, delay);
  };

  // Add a user message to the active chat
  const handleSend = () => {
    if (!activeChat) return;
    const text = input.trim();
    if (!text) return;

    const now = Date.now();
    const chatId = activeChat.id;

    const newMessage: ChatMessage = {
      id: `msg-${now}`,
      role: "user",
      content: text,
      createdAt: now,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;

        const isFirstMessage = chat.messages.length === 0;

        let newTitle = chat.title;
        if (isFirstMessage) {
          // Auto-name chat from the first user message (max 5 words)
          newTitle = generateTitleFromText(text);
        }

        return {
          ...chat,
          title: newTitle,
          messages: [...chat.messages, newMessage],
          updatedAt: now,
        };
      }),
    );

    setInput("");

    // For now simulate an assistant reply. Later this is where you plug your real API.
    simulateAssistantResponse(chatId, text);
  };

  // Start editing a user message
  const handleStartEditMessage = (message: ChatMessage) => {
    if (message.role !== "user") return;
    setEditingMessage(message);
    setEditValue(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditValue("");
  };

  const handleConfirmEdit = () => {
    if (!editingMessage) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== activeChatId) return chat;

        const updatedMessages = chat.messages.map((m) =>
          m.id === editingMessage.id ? { ...m, content: trimmed } : m,
        );

        // Recompute title from the first user message after edit
        const firstUserMessage = updatedMessages.find((m) => m.role === "user");
        let newTitle = chat.title;
        if (firstUserMessage) {
          newTitle = generateTitleFromText(firstUserMessage.content);
        }

        return {
          ...chat,
          messages: updatedMessages,
          title: newTitle,
          updatedAt: Date.now(),
        };
      }),
    );

    setEditingMessage(null);
    setEditValue("");
  };

  // ---- sidebar resize + collapse logic ----

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSidebarCollapsed) return;
    e.preventDefault();
    setIsResizing(true);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (!isResizing || isSidebarCollapsed) return;

    const handleMouseMove = (event: MouseEvent) => {
      let newWidth = event.clientX; // distance from left edge
      if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
      if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, isSidebarCollapsed]);

  // ---- auto-resizing textarea + keyboard shortcuts ----

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setInput(el.value);

    // Auto-resize height
    el.style.height = "auto";
    const maxHeight = 240; // px (~6-7 lines)
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative min-h-screen bg-[#13010C]">
      {/* Floating expand button when sidebar is collapsed */}
      {isSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute left-3 top-3 z-30 rounded-full border border-white/20 bg-black/80 p-1 hover:bg-black/95"
          aria-label="Show sidebar"
        >
          <img
            src="/icons/sidebar.png"
            alt="Show sidebar"
            className="h-4 w-4"
          />
        </button>
      )}

      {/* Full-screen split layout */}
      <div className="flex h-screen max-h-screen">
        {/* Sidebar */}
        <aside
          style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
          className="border-r border-white/10 bg-black/20 flex flex-col overflow-hidden transition-[width] duration-150"
        >
          {/* Header with New chat + sidebar toggle */}
          <div className="flex items-center gap-2 p-4 border-b border-white/10">
            <button
              onClick={handleNewChat}
              className="flex-1 rounded-lg bg-white/10 text-sm text-white py-2 hover:bg-white/15 transition"
            >
              + New chat
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex items-center justify-center rounded-md border border-white/15 bg-black/60 p-1 hover:bg-black/90"
              aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              <img
                src="/icons/sidebar.png"
                alt="Toggle sidebar"
                className="h-4 w-4"
              />
            </button>
          </div>

          {/* Chat list + account section */}
          <div className="flex-1 flex flex-col">
            {/* Scrollable chat list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
              {sortedChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    role="button"
                    onClick={() => setActiveChatId(chat.id)}
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer",
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-transparent text-white/60 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <span className="truncate flex-1">
                      {chat.title || "New chat"}
                    </span>

                    {/* Pin button with png icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(chat.id);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded group hover:bg-white/10"
                      aria-label={chat.isPinned ? "Unpin chat" : "Pin chat"}
                    >
                      <img
                        src="/icons/pin.png"
                        alt={chat.isPinned ? "Pinned chat" : "Pin chat"}
                        className={
                          "h-3 w-3 transition-opacity " +
                          (chat.isPinned
                            ? "opacity-100"
                            : "opacity-30 group-hover:opacity-70")
                        }
                      />
                    </button>

                    {/* Delete button (opens confirm UI) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatToDelete(chat);
                      }}
                      className="text-[18px] px-1 py-0.5 rounded hover:bg-red-500/20 hover:text-red-300"
                      aria-label="Delete chat"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Account / subscription section at bottom */}
            <div className="border-t border-white/10 px-3 py-3 flex items-center gap-3 text-xs text-white">
              {/* Simple avatar circle with initials */}
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-semibold">
                AM
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">
                  Animesh Mittal
                </span>
                <span className="text-[11px] text-white/60">Free plan</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="w-1 cursor-col-resize bg-transparent hover:bg-white/10 transition-colors"
        />

        {/* Main chat area */}
        <main className="flex-1 flex flex-col bg-black/10">
          {hasMessages ? (
            <>
              {/* Top brand bar (left corner, like ChatGPT) */}
              <div className="px-8 py-4">
                <div className="max-w-3xl flex items-center">
                  <div className="bg-gradient-to-r from-white to-[#731E47] bg-clip-text text-transparent text-xl font-semibold">
                    Wireframe
                  </div>
                </div>
              </div>

              {/* Messages view (after first message) */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="mx-auto max-w-3xl text-sm text-white/40 space-y-3">
                  {activeChat.messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.role === "user"
                          ? "ml-auto max-w-[70%] rounded-xl bg-white/15 px-3 py-2 text-white text-sm"
                          : "mr-auto max-w-[70%] rounded-xl bg-white/5 px-3 py-2 text-white/90 text-sm"
                      }
                    >
                      <div className="flex justify-between gap-2">
                        <div className="whitespace-pre-wrap break-words flex-1">
                          {m.content}
                        </div>
                        {m.role === "user" && (
                          <button
                            type="button"
                            onClick={() => handleStartEditMessage(m)}
                            className="ml-2 self-start text-[10px] text-white/60 hover:text-white/90"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {isGenerating && (
                    <div className="mr-auto max-w-[60%] rounded-xl bg-white/5 px-3 py-2 text-xs text-white/80">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Wireframe is thinking about your brief…
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Bottom prompt bar (chat mode) */}
              <div className="border-t border-white/10 p-4">
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-end gap-3 rounded-xl border border-white/20 bg-black/30 px-3 py-2">
                    <textarea
                      rows={3}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none max-h-60"
                      placeholder="Start Designing ..."
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleInputKeyDown}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="shrink-0 rounded-lg bg-white/15 text-xs text-white px-3 py-2 hover:bg-white/25 transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    Press Enter to send · Shift+Enter for a new line
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Centered first-prompt view (landing state) */
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="w-full max-w-3xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="bg-gradient-to-r from-white to-[#731E47] bg-clip-text text-transparent text-4xl font-semibold">
                    Wireframe
                  </div>
                  <p className="text-sm text-white/60">
                    Use simple texts to design editable parametric 3D jewelry
                    models.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/20 bg-black/40 px-4 py-3">
                  <div className="flex items-end gap-3">
                    <textarea
                      rows={3}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none max-h-60"
                      placeholder="Describe the jewelry piece you want to design..."
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleInputKeyDown}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="shrink-0 rounded-lg bg:white/15 text-xs text-white px-3 py-2 hover:bg-white/25 transition disabled:cursor-not-allowed disabled:opacity-40 bg-white/15"
                    >
                      Send
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    Press Enter to send · Shift+Enter for a new line
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete confirmation overlay */}
      {chatToDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#13010C] p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-white">
              Delete this conversation?
            </h2>
            <p className="mt-2 text-xs text-white/60">
              “{chatToDelete.title || "New chat"}” will be permanently removed.
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600 transition"
              >
                Delete chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit message overlay */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border:white/15 bg-[#13010C] p-5 shadow-xl border-white/15">
            <h2 className="text-sm font-semibold text-white">Edit message</h2>
            <textarea
              rows={5}
              className="mt-3 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none outline-none"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
            <div className="mt-4 flex justify:end gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEdit}
                className="rounded-lg bg-white/90 px-3 py-1.5 text-xs text-black hover:bg-white transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
