// src/components/ui/wireframe/chat-shell.tsx
import React, { useState, useEffect } from "react";
import type { ChatSession, ChatMessage } from "./chat-types";

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 420;

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

export function ChatShell() {
  // 1) Chat sessions
  const [chats, setChats] = useState<ChatSession[]>(() => [createEmptyChat()]);

  // 2) Which chat is open
  const [activeChatId, setActiveChatId] = useState<string>(chats[0].id);

  // 3) Prompt input
  const [input, setInput] = useState<string>("");

  // 4) Sidebar layout
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 5) Delete confirmation
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? chats[0];
  const hasMessages = activeChat.messages.length > 0;

  // Sorted chats: pinned first, then by last updated
  const sortedChats = [...chats].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned; // pinned on top
    return b.updatedAt - a.updatedAt; // newest first
  });

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
        chat.id === id ? { ...chat, isPinned: !chat.isPinned } : chat
      )
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

  // Add a user message to the active chat
  const handleSend = () => {
    const text = input.trim();
    if (!text || !activeChat) return;

    const now = Date.now();
    const newMessage: ChatMessage = {
      id: `msg-${now}`,
      role: "user",
      content: text,
      createdAt: now,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== activeChat.id) return chat;

        const isFirstMessage = chat.messages.length === 0;

        // Auto-name chat from the first message
        let newTitle = chat.title;
        if (isFirstMessage) {
          const firstLine = text.split("\n")[0].trim();
          const sliced =
            firstLine.length > 40 ? firstLine.slice(0, 40) + "…" : firstLine;
          newTitle = sliced || "New chat";
        }

        return {
          ...chat,
          title: newTitle,
          messages: [...chat.messages, newMessage],
          updatedAt: now,
        };
      })
    );

    setInput("");
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

  // ---- auto-resizing textarea ----

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setInput(el.value);

    // Auto-resize height
    el.style.height = "auto";
    const maxHeight = 240; // px (~6-7 lines)
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
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
                      {m.content}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom prompt bar (chat mode) */}
              <div className="border-t border-white/10 p-4">
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-end gap-3 rounded-xl border border-white/20 bg-black/30 px-3 py-2">
                    <textarea
                      rows={3}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none max-h-60"
                      placeholder="Start Designing Jewelry with AI..."
                      value={input}
                      onChange={handleInputChange}
                    />
                    <button
                      onClick={handleSend}
                      className="shrink-0 rounded-lg bg-white/15 text-xs text-white px-3 py-2 hover:bg-white/25 transition"
                    >
                      Send
                    </button>
                  </div>
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
                    Use simple texts to design editable parametric 3D jewelry models.
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
                    />
                    <button
                      onClick={handleSend}
                      className="shrink-0 rounded-lg bg-white/15 text-xs text-white px-3 py-2 hover:bg-white/25 transition"
                    >
                      Send
                    </button>
                  </div>
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
                onClick={handleCancelDelete}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600 transition"
              >
                Delete chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
