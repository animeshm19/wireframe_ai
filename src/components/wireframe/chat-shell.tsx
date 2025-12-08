// src/components/wireframe/chat-shell.tsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Menu, Plus, X, Pin, Trash2, Settings, 
  PanelLeftClose, Cpu, ArrowUpRight, Box, Paperclip, 
  File as FileIcon, Loader2, LogOut, LogIn // Added LogIn icon
} from "lucide-react";
import type { ChatSession, ChatMessage, ChatAttachment } from "./chat-types";
import { AuthDialog } from "./auth-dialog";
import { useAuth } from "../../auth/auth-context";
import { createDesignJob, uploadJobAttachment, deleteChatFromBackend } from "@/lib/design-jobs";
import { DesignJobCard } from "./design-job-card";
import { FlickeringGrid } from "../ui/shadcn-io/flickering-grid";
import { StudioWorkspace } from "./studio-workspace";

import logo from "../../assets/logo.png";

const STORAGE_KEY = "wireframe-chat-v1";

type PersistedState = {
  chats: ChatSession[];
  activeChatId: string;
  isSidebarCollapsed: boolean;
};

// --- Helpers ---
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

// --- Pulsating Background Component ---
function PulsatingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Orb 1: Gold - Top Left */}
      <motion.div
        className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[var(--gold-500)] blur-[120px]"
        initial={{ opacity: 0.15, scale: 1 }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Orb 2: Brand Dark Pink - Bottom Right */}
      <motion.div
        className="absolute top-[20%] -right-[10%] w-[80%] h-[80%] rounded-full bg-[#731E47] blur-[140px]"
        initial={{ opacity: 0.1, scale: 1 }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      
      {/* Orb 3: Center Accent */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[150px]"
        animate={{
          opacity: [0.05, 0.12, 0.05],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />
    </div>
  );
}

export function ChatShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const persisted = loadPersistedState();

  // State
  const [chats, setChats] = useState<ChatSession[]>(persisted?.chats ?? [createEmptyChat()]);
  const [activeChatId, setActiveChatId] = useState<string>(persisted?.activeChatId ?? (chats[0]?.id || ""));
  const [input, setInput] = useState("");
  
  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(persisted?.isSidebarCollapsed ?? false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkspaceJobId, setActiveWorkspaceJobId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  
  const pendingPromptRef = useRef<string | null>(null);
  const pendingFilesRef = useRef<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived
  const activeChat = chats.find((c) => c.id === activeChatId) ?? chats[0];
  const sortedChats = [...chats].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.updatedAt - a.updatedAt);

  // Persistence
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, activeChatId, isSidebarCollapsed }));
  }, [chats, activeChatId, isSidebarCollapsed]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length, isGenerating, activeChatId, selectedFiles.length]);

  // Handlers
  const handleNewChat = () => {
    const newChat = createEmptyChat();
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setMobileMenuOpen(false);
    setActiveWorkspaceJobId(null);
    setInput("");
    setSelectedFiles([]);
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    const confirmDelete = window.confirm("Are you sure you want to delete this collection? This will permanently remove all designs associated with it.");
    if (!confirmDelete) return;

    const newChats = chats.filter(c => c.id !== id);
    if (newChats.length === 0) newChats.push(createEmptyChat());
    setChats(newChats);
    if (activeChatId === id) setActiveChatId(newChats[0].id);

    if (user) {
      try {
        console.log("Deleting backend data for chat:", id);
        await deleteChatFromBackend(id);
      } catch (err) {
        console.error("Failed to cleanup backend jobs:", err);
      }
    }
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChats(chats.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // --- File Handling ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (text: string, files: File[] = []) => {
    const now = Date.now();
    let uploadedAttachments: ChatAttachment[] = [];

    if (files.length > 0 && user) {
      setIsUploading(true);
      try {
        const uploadResults = await Promise.all(
          files.map(file => uploadJobAttachment(file, user.uid))
        );
        
        uploadedAttachments = uploadResults.map(res => ({
          name: res.name,
          url: res.url,
          type: res.type
        }));
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setIsUploading(false);
      }
    }

    const userMsg: ChatMessage = { 
      id: `msg-${now}`, 
      role: "user", 
      content: text, 
      createdAt: now,
      attachments: uploadedAttachments
    };
    
    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const title = c.messages.length === 0 ? generateTitleFromText(text) : c.title;
      return { ...c, title, messages: [...c.messages, userMsg], updatedAt: now };
    }));

    setIsGenerating(true);
    try {
      const attachmentUrls = uploadedAttachments.map(a => a.url);
      const { jobId } = await createDesignJob(text, activeChatId, attachmentUrls);
      
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
    if ((!input.trim() && selectedFiles.length === 0) || isGenerating || isUploading) return;
    
    if (!user) {
      pendingPromptRef.current = input;
      pendingFilesRef.current = selectedFiles;
      setAuthOpen(true);
      return;
    }
    
    sendMessage(input, selectedFiles);
    setInput("");
    setSelectedFiles([]);
  };

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-[#13010C] text-white selection:bg-[#731E47] selection:text-white">
      <AuthDialog 
        open={authOpen} 
        onClose={() => setAuthOpen(false)} 
        onAuthed={() => {
          if (pendingPromptRef.current || pendingFilesRef.current.length > 0) {
            sendMessage(pendingPromptRef.current || "", pendingFilesRef.current);
            pendingPromptRef.current = null;
            pendingFilesRef.current = [];
            setInput("");
            setSelectedFiles([]);
          }
        }} 
      />

      {/* --- Mobile Header --- */}
      <div className="absolute top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#13010C]/80 px-4 backdrop-blur-md md:hidden">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-white/70 hover:text-white">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="Wireframe" className="h-5 w-auto" />
          <span className="text-sm font-semibold tracking-wide uppercase text-white/90">Wireframe AI</span>
        </div>
        <button onClick={handleNewChat} className="p-2 text-[var(--gold-500)]">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* --- Sidebar --- */}
      <AnimatePresence>
        {(mobileMenuOpen || window.innerWidth >= 768) && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            
            <motion.aside 
              initial={false}
              animate={{ 
                width: isSidebarCollapsed ? 80 : 280,
                x: window.innerWidth < 768 && !mobileMenuOpen ? -320 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0a0005] md:relative"
            >
              <div className={`flex items-center h-16 px-4 border-b border-white/5 ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
                {!isSidebarCollapsed && (
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="Wireframe" className="h-6 w-auto" />
                    <span className="text-sm font-medium tracking-wide">Wireframe AI</span>
                  </div>
                )}
                
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden md:flex p-2 text-white/40 hover:text-white transition-colors"
                >
                  {isSidebarCollapsed ? (
                    <img src={logo} alt="Wireframe" className="h-6 w-6 object-contain" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </button>
                
                <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-2 text-white/40 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3">
                <button 
                  onClick={handleNewChat}
                  className={`w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80 hover:bg-white/10 hover:border-[var(--gold-500)]/30 transition-all ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Plus className="h-4 w-4 text-[var(--gold-500)]" />
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
                      <div className="h-4 w-4 text-white/50">{chat.id === activeChatId && <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--gold-500)]" />}</div>
                    ) : (
                      <>
                        <span className="truncate flex-1">{chat.title}</span>
                        {chat.isPinned && <Pin className="h-3 w-3 text-[var(--gold-500)] rotate-45" />}
                        
                        <div className="hidden group-hover:flex items-center gap-1 absolute right-2 bg-[#0a0005] shadow-xl pl-2 rounded-l-lg border-l border-white/10">
                          <div onClick={(e) => togglePin(e, chat.id)} className="p-1.5 hover:text-[var(--gold-500)]">
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

                {/* SIGN IN / SIGN OUT BUTTONS */}
                {user ? (
                  <button 
                    onClick={handleSignOut}
                    className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-sm text-red-400/70 hover:bg-white/5 hover:text-red-400 transition-colors ${isSidebarCollapsed ? "justify-center" : ""}`}
                  >
                    <LogOut className="h-4 w-4" />
                    {!isSidebarCollapsed && <span>Sign Out</span>}
                  </button>
                ) : (
                  <button 
                    onClick={() => setAuthOpen(true)}
                    className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-sm text-[var(--gold-500)] hover:bg-white/5 hover:text-white transition-colors ${isSidebarCollapsed ? "justify-center" : ""}`}
                  >
                    <LogIn className="h-4 w-4" />
                    {!isSidebarCollapsed && <span>Sign In</span>}
                  </button>
                )}
                
                <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-2.5 mt-2 ${isSidebarCollapsed ? "justify-center" : ""}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold-500)] to-[#731E47] text-[10px] font-bold text-white shadow-inner">
                    {initials(user?.email)}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-xs font-medium text-white">
                        {user?.displayName || "Guest"}
                      </p>
                      <p className="truncate text-[10px] text-white/40">
                        {user ? "Pro Plan" : "Sign in to save"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative flex flex-1 overflow-hidden">
        
        {/* LEFT: Chat Feed */}
        <motion.main 
          initial={false}
          animate={{ 
            flex: activeWorkspaceJobId ? "0 0 400px" : "1 1 auto",
            display: activeWorkspaceJobId && window.innerWidth < 768 ? "none" : "flex"
          }}
          className={`relative flex-col border-r border-white/10 bg-[#13010C] transition-all duration-500
            ${activeWorkspaceJobId ? "hidden md:flex max-w-[400px]" : "w-full flex"}
          `}
        >
          {/* Pulsating Background */}
          <PulsatingBackground />

          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <FlickeringGrid squareSize={3} gridGap={24} color="#e1b95c" maxOpacity={0.15} flickerChance={0.2} />
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-20 pb-4 md:px-8 md:pt-10 scrollbar-hide">
            <div className="mx-auto max-w-3xl space-y-10">
              
              {activeChat.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center">
                    <img src={logo} alt="Wireframe" className="h-full w-auto object-contain drop-shadow-[0_0_30px_rgba(131,110,118,0.3)]" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-3">
                    Wireframe Atelier
                  </h1>
                  <p className="max-w-md text-sm text-white/50 leading-relaxed px-4">
                    Generate parametric jewelry meshes ready for manufacturing. <br/>
                    Try "Solitaire ring with 1ct diamond".
                  </p>
                </div>
              )}

              {activeChat.messages.map((msg) => (
                <div key={msg.id} className="group relative pl-8 md:pl-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="absolute left-[11px] top-0 -bottom-10 w-px bg-white/10 group-last:bottom-0 md:left-[15px]" />
                  
                  <div className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] md:h-8 md:w-8
                    ${msg.role === "user" 
                      ? "border-white/20 bg-[#13010C] text-white shadow-lg z-10" 
                      : "border-[var(--gold-500)]/40 bg-[#1a0510] text-[var(--gold-500)] shadow-[0_0_15px_rgba(131,110,118,0.2)] z-10"
                    }`}
                  >
                    {msg.role === "user" ? <div className="h-1.5 w-1.5 rounded-full bg-white" /> : <Cpu className="h-3 w-3 md:h-4 md:w-4" />}
                  </div>

                  <div className="space-y-2 pt-0.5 md:pt-1">
                    <div className="flex items-baseline gap-3">
                      <span className={`text-[10px] font-mono uppercase tracking-widest ${msg.role === "user" ? "text-white/40" : "text-[var(--gold-500)]/80"}`}>
                        {msg.role === "user" ? "PROMPT" : "GENERATOR"}
                      </span>
                    </div>

                    <div className={`text-sm leading-relaxed md:text-base ${msg.role === "user" ? "text-white/90" : "text-white/80"}`}>
                      {msg.content}
                    </div>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {msg.attachments.map((file, i) => (
                          <div key={i} className="group/file relative rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all hover:bg-white/10">
                            {file.type.startsWith("image/") ? (
                              <div className="h-32 w-32 bg-black/50">
                                <img src={file.url} alt={file.name} className="h-full w-full object-cover transition-transform group-hover/file:scale-105" />
                              </div>
                            ) : (
                              <div className="h-20 w-32 flex flex-col items-center justify-center gap-2 p-2">
                                <Box className="h-6 w-6 text-white/50" />
                                <span className="text-[10px] text-white/50 truncate max-w-full px-2">{file.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.designJobId && (
                      <div className="mt-4 w-full max-w-md">
                        <DesignJobCard jobId={msg.designJobId} />
                        
                        <div className="mt-2 flex justify-end">
                          <button 
                            onClick={() => setActiveWorkspaceJobId(msg.designJobId!)}
                            className="text-[10px] text-white/50 hover:text-[var(--gold-500)] flex items-center gap-1 transition-colors uppercase tracking-widest font-semibold"
                          >
                            Open in Studio <ArrowUpRight className="h-3 w-3" />
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

          {/* Floating Command Bar */}
          <div className="p-4 md:p-6 bg-[#13010C] border-t border-white/5">
            <div className="mx-auto max-w-3xl space-y-3">
              
              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 10, height: 0 }}
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                  >
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="relative group shrink-0">
                        <div className="relative h-16 w-16 rounded-xl border border-white/20 bg-white/5 overflow-hidden">
                          {file.type.startsWith("image/") ? (
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt="preview" 
                              className="h-full w-full object-cover"
                              onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} 
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FileIcon className="h-6 w-6 text-white/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button 
                          onClick={() => removeFile(i)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#13010C] border border-white/20 text-white flex items-center justify-center hover:bg-red-500 hover:border-red-500 transition-colors shadow-lg z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative flex items-end gap-2 rounded-3xl border border-white/10 bg-[#0a0005]/80 p-2 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all focus-within:border-[var(--gold-500)]/40 focus-within:bg-[#0a0005]">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  multiple 
                  accept=".jpg,.jpeg,.png,.webp,.stl,.obj" 
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-1 ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                  title="Attach images or models"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

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
                  className="flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none md:text-base max-h-32 scrollbar-hide"
                  rows={1}
                  style={{ minHeight: "48px" }}
                />
                
                <button
                  onClick={handleSubmit}
                  disabled={(!input.trim() && selectedFiles.length === 0) || isGenerating || isUploading}
                  className="mb-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-[var(--gold-500)] hover:text-black disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
                >
                  {isGenerating || isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.main>

        {/* RIGHT: Studio Workspace */}
        <AnimatePresence>
          {activeWorkspaceJobId && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-50 md:static md:flex-1 bg-[#0a0005] border-l border-white/10 shadow-2xl"
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