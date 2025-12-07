// src/components/wireframe/chat-types.ts

export type ChatRole = "user" | "assistant";

export type ChatAttachment = {
  name: string;
  url: string;
  type: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  designJobId?: string;
  // New field for files
  attachments?: ChatAttachment[];
};

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}