import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { parseSpecFromPrompt, withDefaults, RingSpec } from "./ring-spec";

export type ExtractSource = "ai" | "parser";

export type ExtractResult = {
  spec: RingSpec;
  source: ExtractSource;
  /**
   * The model that actually produced the spec — not the one we asked first.
   * A8: the function retries and then walks down a ranked chain, so a spec
   * can legitimately come from gemini-3.6-flash while the policy's first
   * choice is 3.8. This field is what the card reports, so it has to be the
   * answering model or the card is lying.
   */
  model?: string;
  interpretation?: string;
};

/**
 * Turns a prompt into a ring spec.
 *
 * Tries the Cloud Function first (a real model with structured output). The
 * function itself now retries and fails over across models, so reaching this
 * catch means every model refused, or we could not reach the function at all.
 * Only then does the local regex parser run, and `source` says so — the card
 * is required to repeat that to the customer rather than presenting a keyword
 * match as an interpretation.
 */
export async function extractRingSpec(prompt: string): Promise<ExtractResult> {
  try {
    const call = httpsCallable<{ prompt: string }, any>(functions, "extractRingSpec");
    const res = await call({ prompt });
    const raw = res.data?.spec;
    if (!raw) throw new Error("empty spec");
    const { interpretation, ...spec } = raw;
    return {
      spec: withDefaults(spec),
      source: "ai",
      model: res.data?.model,
      interpretation,
    };
  } catch (err) {
    console.warn("AI extraction unavailable, using local parser:", err);
    return { spec: withDefaults(parseSpecFromPrompt(prompt)), source: "parser" };
  }
}
