import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  Menu, Plus, X, Pin, Trash2, Settings, 
  PanelLeftClose, PanelLeftOpen, Cpu, Sparkles, 
  History, ArrowUpRight, Box
} from "lucide-react";
import type { ChatSession, ChatMessage } from "./chat-types";
import { AuthDialog } from "./auth-dialog";
import { useAuth } from "../../auth/auth-context";
import { createDesignJob } from "@/lib/design-jobs";
import { DesignJobCard } from "./design-job-card";
import { FlickeringGrid } from "../ui/shadcn-io/flickering-grid";
import { StudioWorkspace } from "./studio-workspace";

const STORAGE_KEY = "wireframe-chat-v1";

type PersistedState = {
  chats: ChatSession[];
  activeChatId: string;
  isSidebarCollapsed: boolean;
};

function createEmptyChat(label?: string): ChatSession {
  const now = Date.now();
  return {
    id: `chat-${now}`,
    title: label ?? "New Collection",
    messages: [],
    createdAt: now,
    updatedAt: now,
    isPinned: false,
  };
}

function generateTitleFromText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Collection";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "New Collection";
  return words.slice(0, 4).join(" ") + (words.length > 4 ? "..." : "");
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function initials(nameOrEmail?: string | null) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "WF";
  return s.slice(0, 2).toUpperCase();
}

export function ChatShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const persisted = loadPersistedState();

  const [chats, setChats] = useState<ChatSession[]>(persisted?.chats ?? [createEmptyChat()]);
  const [activeChatId, setActiveChatId] = useState<string>(persisted?.activeChatId ?? (chats[0]?.id || ""));
  const [input, setInput] = useState("");
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(persisted?.isSidebarCollapsed ?? false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkspaceJobId, setActiveWorkspaceJobId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  
  const pendingPromptRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? chats[0];
  const sortedChats = [...chats].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.updatedAt - a.updatedAt);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, activeChatId, isSidebarCollapsed }));
  }, [chats, activeChatId, isSidebarCollapsed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length, isGenerating, activeChatId]);

  const handleNewChat = () => {
    const newChat = createEmptyChat();
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setMobileMenuOpen(false);
    setActiveWorkspaceJobId(null);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newChats = chats.filter(c => c.id !== id);
    if (newChats.length === 0) newChats.push(createEmptyChat());
    setChats(newChats);
    if (activeChatId === id) setActiveChatId(newChats[0].id);
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChats(chats.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
  };

  const sendMessage = async (text: string) => {
    const now = Date.now();
    const userMsg: ChatMessage = { id: `msg-${now}`, role: "user", content: text, createdAt: now };
    
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const title = c.messages.length === 0 ? generateTitleFromText(text) : c.title;
      return { ...c, title, messages: [...c.messages, userMsg], updatedAt: now };
    }));

    setIsGenerating(true);
    try {
      const { jobId } = await createDesignJob(text, activeChatId);
      const botMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: "assistant",
        content: "Processing geometry...",
        createdAt: Date.now(),
        designJobId: jobId
      };
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, botMsg] } : c));
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `System Error: ${err.message}`,
        createdAt: Date.now()
      };
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, errorMsg] } : c));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;
    if (!user) {
      pendingPromptRef.current = input;
      setAuthOpen(true);
      return;
    }
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#13010C] text-white selection:bg-[#731E47] selection:text-white">
      <AuthDialog 
        open={authOpen} 
        onClose={() => setAuthOpen(false)} 
        onAuthed={() => {
          if (pendingPromptRef.current) {
            sendMessage(pendingPromptRef.current);
            pendingPromptRef.current = null;
            setInput("");
          }
        }} 
      />

      <div className="absolute top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#13010C]/80 px-4 backdrop-blur-md md:hidden">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-white/70 hover:text-white">
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold tracking-wide uppercase text-white/90">Wireframe</span>
        <button onClick={handleNewChat} className="p-2 text-(--gold-500)">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {(mobileMenuOpen || window.innerWidth >= 768) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            
            <motion.aside 
              initial={false}
              animate={{ 
                width: isSidebarCollapsed ? 80 : 280,
                x: window.innerWidth < 768 && !mobileMenuOpen ? -300 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0a0005] md:relative"
            >
              <div className={`flex items-center h-16 px-4 border-b border-white/5 ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                {!isSidebarCollapsed && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-linear-to-br from-(--gold-500)/20 to-(--gold-500)/5 border border-(--gold-500)/30 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-(--gold-500)" />
                    </div>
                    <span className="text-sm font-medium tracking-wide">Wireframe</span>
                  </div>
                )}
                
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden md:flex p-2 text-white/40 hover:text-white transition-colors"
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </div>

              <div className="p-3">
                <button 
                  onClick={handleNewChat}
                  className={`w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80 hover:bg-white/10 hover:border-(--gold-500)/30 transition-all ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Plus className="h-4 w-4 text-(--gold-500)" />
                  {!isSidebarCollapsed && <span>New Collection</span>}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {!isSidebarCollapsed && <div className="px-2 py-2 text-[10px] font-medium uppercase tracking-widest text-white/30">History</div>}
                
                {sortedChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => { setActiveChatId(chat.id); setMobileMenuOpen(false); }}
                    title={chat.title}
                    className={`group relative flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm transition-all duration-200
                      ${chat.id === activeChatId 
                        ? "bg-white/10 text-white shadow-lg" 
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                      } ${isSidebarCollapsed ? "justify-center" : ""}`}
                  >
                    {isSidebarCollapsed ? (
                      <History className={`h-4 w-4 ${chat.id === activeChatId ? "text-(--gold-500)" : ""}`} />
                    ) : (
                      <>
                        <span className="truncate flex-1">{chat.title}</span>
                        {chat.isPinned && <Pin className="h-3 w-3 text-(--gold-500) rotate-45" />}
                        
                        <div className="hidden group-hover:flex items-center gap-1 absolute right-2 bg-[#0a0005] shadow-xl pl-2 rounded-l-lg border-l border-white/10">
                          <div onClick={(e) => togglePin(e, chat.id)} className="p-1.5 hover:text-(--gold-500)">
                            <Pin className="h-3 w-3" />
                          </div>
                          <div onClick={(e) => deleteChat(e, chat.id)} className="p-1.5 hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </div>
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10 p-3 space-y-1">
                <button 
                  onClick={() => navigate("/settings")}
                  className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors ${isSidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Settings className="h-4 w-4" />
                  {!isSidebarCollapsed && <span>Studio Settings</span>}
                </button>
                
                <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-2.5 mt-2 ${isSidebarCollapsed ? "justify-center" : ""}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-(--gold-500) to-[#731E47] text-[10px] font-bold text-white shadow-inner">
                    {initials(user?.email)}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-xs font-medium text-white">
                        {user?.displayName || "Guest"}
                      </p>
                      <p className="truncate text-[10px] text-white/40">Pro Plan</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative flex flex-1 overflow-hidden">
        
        <motion.main 
          initial={false}
          animate={{ flex: activeWorkspaceJobId ? "0 0 400px" : "1 1 auto" }}
          className={`relative flex flex-col border-r border-white/10 bg-[#13010C] transition-all duration-500
            ${activeWorkspaceJobId ? "hidden md:flex max-w-[400px]" : "w-full"}
          `}
        >
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <FlickeringGrid squareSize={3} gridGap={24} color="#e1b95c" maxOpacity={0.15} flickerChance={0.2} />
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-20 pb-36 md:px-8 md:pt-10 md:pb-40 scrollbar-hide">
            <div className="mx-auto max-w-3xl space-y-10">
              
              {activeChat.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-4xl bg-white/5 shadow-[0_0_60px_rgba(131,110,118,0.2)] border border-white/10 backdrop-blur-xl">
                    <Sparkles className="h-10 w-10 text-(--gold-500)" />
                  </div>
                  <h1 className="text-3xl font-semibold text-white tracking-tight mb-3">
                    Wireframe Atelier
                  </h1>
                  <p className="max-w-md text-sm text-white/50 leading-relaxed">
                    Generate parametric jewelry meshes ready for manufacturing. <br/>
                    Try "Solitaire ring with 1ct diamond" or "Pendant with halo".
                  </p>
                </div>
              )}

              {activeChat.messages.map((msg) => (
                <div key={msg.id} className="group relative pl-8 md:pl-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="absolute left-[11px] top-0 -bottom-10 w-px bg-white/10 group-last:bottom-0 md:left-[15px]" />
                  
                  <div className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] md:h-8 md:w-8
                    ${msg.role === "user" 
                      ? "border-white/20 bg-[#13010C] text-white shadow-lg z-10" 
                      : "border-(--gold-500)/40 bg-[#1a0510] text-(--gold-500) shadow-[0_0_15px_rgba(131,110,118,0.2)] z-10"
                    }`}
                  >
                    {msg.role === "user" ? <div className="h-1.5 w-1.5 rounded-full bg-white" /> : <Cpu className="h-3 w-3 md:h-4 md:w-4" />}
                  </div>

                  <div className="space-y-2 pt-0.5 md:pt-1">
                    <div className="flex items-baseline gap-3">
                      <span className={`text-[10px] font-mono uppercase tracking-widest ${msg.role === "user" ? "text-white/40" : "text-(--gold-500)/80"}`}>
                        {msg.role === "user" ? "PROMPT" : "GENERATOR"}
                      </span>
                    </div>

                    <div className={`text-sm leading-relaxed md:text-base ${msg.role === "user" ? "text-white/90" : "text-white/80"}`}>
                      {msg.content}
                    </div>

                    {msg.designJobId && (
                      <div className="mt-4 w-full">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between group-hover:border-(--gold-500)/30 transition-colors cursor-pointer" onClick={() => setActiveWorkspaceJobId(msg.designJobId!)}>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-black/40 flex items-center justify-center">
                              <Box className="h-5 w-5 text-white/70" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">CAD Geometry Ready</div>
                              <div className="text-xs text-white/40">ID: {msg.designJobId.slice(0,8)}...</div>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 rounded-lg bg-(--gold-500) text-black text-xs font-bold hover:bg-white transition-colors">
                            Open Studio
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 md:pb-8 bg-linear-to-t from-[#13010C] via-[#13010C]/90 to-transparent">
            <div className="mx-auto max-w-3xl">
              <div className="relative flex items-end gap-2 rounded-3xl border border-white/10 bg-[#0a0005]/80 p-2 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all focus-within:border-(--gold-500)/40 focus-within:bg-[#0a0005]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Describe your design parameters..."
                  className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none md:text-base max-h-40 scrollbar-hide"
                  rows={1}
                  style={{ minHeight: "48px" }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isGenerating}
                  className="mb-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-(--gold-500) hover:text-black disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
                >
                  {isGenerating ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              <p className="mt-3 text-center text-[10px] text-white/30 font-mono tracking-wide">
                WIREFRAME ENGINE V1.0 · GENERATING STL/STEP
              </p>
            </div>
          </div>
        </motion.main>

        <AnimatePresence>
          {activeWorkspaceJobId && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-30 md:static md:flex-1 bg-[#0a0005] border-l border-white/10 shadow-2xl"
            >
              <StudioWorkspace 
                jobId={activeWorkspaceJobId} 
                onClose={() => setActiveWorkspaceJobId(null)} 
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}