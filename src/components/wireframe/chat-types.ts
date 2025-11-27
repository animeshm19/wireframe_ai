// src/components/ui/wireframe/chat-types.ts

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  designJobId?: string; // add this
};

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean; // 👈 new
}
