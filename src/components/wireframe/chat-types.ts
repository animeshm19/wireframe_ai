// src/components/wireframe/chat-types.ts
import type { RingSpec } from "../../lib/ring-spec";

export type ChatRole = "user" | "assistant";

export type ChatAttachment = {
  name: string;
  url: string;
  type: string;
};

/**
 * A design produced by one chat message.
 *
 * This used to be a Firestore document id (`designJobId`) pointing at a
 * `designJobs` record that a Cloud Run worker was supposed to advance. Nothing
 * consumes that collection, so the design is now carried on the message
 * itself: the chat calls `extractRingSpec` directly and fills `spec` in when
 * it returns.
 *
 * `spec` is undefined only while the extraction is in flight. Both the card
 * and the Studio fall back to the schema defaults, so there is no state in
 * which a design has nothing to draw.
 *
 * B1 reads this shape when it migrates localStorage sessions into `designs`.
 */
export type ChatDesign = {
  /** Stable id for this design within the session. */
  id: string;
  /** The prompt this design was built from — the local parser's only input. */
  prompt: string;
  spec?: RingSpec;
  /** Whether `spec` came from the model or from the local parser. */
  source?: "ai" | "parser";
  /** The model that produced it, when it came from the model. */
  model?: string;
  /** The model's sentence back, shown under the card. */
  interpretation?: string;
  /**
   * Where the extraction got to. The card says different things depending on
   * it, and all of them have to be true.
   *
   * `extracting` is only ever true within the session that started the call —
   * a reload is downgraded to `stalled` on load, because nothing survives it.
   * `stalled` means no spec is coming and nothing is trying to get one: the
   * call never answered, or the tab was navigated away from mid-flight, or
   * the design predates A7. There is no retry path, so the card must not
   * imply one.
   */
  status?: "extracting" | "ready" | "stalled";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  design?: ChatDesign;
  /** @deprecated pre-A7 `designJobs` id; migrated to `design` on load. */
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
