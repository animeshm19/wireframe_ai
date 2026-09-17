import { useCallback, useEffect, useRef, useState } from "react";
import type { Mesh } from "../lib/cad-engine-brep";

export type RingMesh = { metal: Mesh; stones: Mesh | null; edges: Float32Array };

/**
 * Drives the B-rep geometry worker.
 *
 * Two worker instances, for one reason: merging a ring into a single solid
 * takes OCCT a few seconds, and a WebAssembly call cannot be interrupted. If
 * previews and merges shared a worker, every merge would block the next preview
 * and dragging a slider would stall. So the preview worker is never asked to do
 * anything slow, and the resolve worker is disposable — when the design changes
 * mid-merge, it is terminated and replaced rather than waited on.
 *
 * The consequence to keep in mind: `metrics` lags `mesh`. What is on screen is
 * always current; the weight beside it may be a moment behind, and says so.
 */
export function useBrepWorker() {
  const previewRef = useRef<Worker | null>(null);
  const resolveRef = useRef<Worker | null>(null);
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStep = useRef<((b: Blob) => void) | null>(null);

  const [mesh, setMesh] = useState<RingMesh | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const spawn = useCallback(() => new Worker(
    new URL("../workers/brep-worker.ts", import.meta.url), { type: "module" }
  ), []);

  useEffect(() => {
    const w = spawn();
    previewRef.current = w;
    w.onmessage = (e) => {
      const d = e.data;
      if (d.type === "PROGRESS") { setProgress(d.progress); setStage(d.stage); return; }
      if (d.type === "PREVIEW") {
        setMesh({ metal: d.metal, stones: d.stones, edges: d.edges });
        setIsBuilding(false);
        setError(null);
        return;
      }
      if (d.type === "ERROR") { setError(d.error); setIsBuilding(false); }
    };
    return () => {
      w.terminate();
      resolveRef.current?.terminate();
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
    };
  }, [spawn]);

  const generate = useCallback((params: any) => {
    setIsBuilding(true);
    setProgress(0);
    setStage("Queued");
    previewRef.current?.postMessage({ type: "PREVIEW", params });

    // Any merge still running is for a design that no longer exists. Kill it.
    resolveRef.current?.terminate();
    resolveRef.current = null;
    setIsResolving(false);
    if (resolveTimer.current) clearTimeout(resolveTimer.current);

    // Merge only once the design has been still for a moment. Dragging a slider
    // should never queue up a series of multi-second merges nobody will read.
    resolveTimer.current = setTimeout(() => {
      const w = spawn();
      resolveRef.current = w;
      setIsResolving(true);
      w.onmessage = (e) => {
        const d = e.data;
        if (d.type === "RESOLVED") {
          setMetrics(d.metrics);
          setIssues(d.issues || []);
          setIsResolving(false);
          return;
        }
        if (d.type === "EXPORT") { pendingStep.current?.(d.blob); pendingStep.current = null; return; }
        if (d.type === "ERROR") { setError(d.error); setIsResolving(false); }
      };
      w.postMessage({ type: "RESOLVE", params });
    }, 500);
  }, [spawn]);

  /**
   * Resolves with the exported file, or rejects if the merge is still running.
   *
   * Export deliberately waits on the merge rather than falling back to the
   * preview. The preview is a pile of overlapping parts: perfectly good to look
   * at, and not a thing anyone should be able to send to a caster.
   */
  const exportFile = useCallback((format: "step" | "stl") => new Promise<Blob>((resolve, reject) => {
    const w = resolveRef.current;
    if (!w || isResolving) return reject(new Error("Still merging — try again in a moment."));
    pendingStep.current = resolve;
    w.postMessage({ type: "EXPORT", format });
    setTimeout(() => {
      if (pendingStep.current) { pendingStep.current = null; reject(new Error("Export timed out.")); }
    }, 60000);
  }), [isResolving]);

  return {
    generate, exportFile,
    mesh, metrics, issues,
    isBuilding, isResolving, progress, stage, error,
  };
}
