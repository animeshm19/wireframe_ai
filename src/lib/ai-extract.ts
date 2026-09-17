import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { parseSpecFromPrompt, withDefaults, RingSpec } from "./ring-spec";

export type ExtractSource = "ai" | "parser";

export type ExtractResult = {
  spec: RingSpec;
  source: ExtractSource;
  model?: string;
  interpretation?: string;
};

/**
 * Turns a prompt into a ring spec.
 *
 * Tries the Cloud Function first (a real model with structured output). If that
 * is unavailable for any reason — offline, not deployed, quota, model outage —
 * falls back to the local parser rather than failing the design. The caller is
 * told which path was used so the UI can be honest about it.
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
