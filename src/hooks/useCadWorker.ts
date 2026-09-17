import { useEffect, useRef, useState, useCallback } from 'react';

export function useCadWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelBlob, setModelBlob] = useState<Blob | null>(null);
  const [stoneBlob, setStoneBlob] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // VITE WORKER IMPORT SYNTAX - THIS IS CRITICAL
    try {
      workerRef.current = new Worker(
        new URL('../workers/cad-worker.ts', import.meta.url), 
        { type: 'module' }
      );
      
      console.log("Hook: Worker initialized");

      workerRef.current.onmessage = (e) => {
        const { type, blob, stoneBlob: sb, error, progress: p, stage: st, metrics: mx, issues: iss } = e.data;

        if (type === 'PROGRESS') {
          setProgress(p);
          setStage(st);
          return;
        }

        console.log("Hook: Message from worker", type);
        setIsGenerating(false);
        if (type === 'SUCCESS') {
          setModelBlob(blob);
          setStoneBlob(sb || null);
          setMetrics(mx || null);
          setIssues(iss || []);
          setError(null);
        } else if (type === 'ERROR') {
          console.error("Hook: Worker reported error", error);
          setError(error);
        }
      };
    } catch (e) {
      console.error("Hook: Failed to initialize worker", e);
      setError("Worker initialization failed");
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const generate = useCallback((params: any) => {
    if (workerRef.current) {
      console.log("Hook: Sending GENERATE command", params);
      setIsGenerating(true);
      setProgress(0);
      setStage("Queued");
      workerRef.current.postMessage({ type: 'GENERATE', params });
    } else {
      console.warn("Hook: Worker not ready");
    }
  }, []);

  return { generate, modelBlob, stoneBlob, isGenerating, error, progress, stage, metrics, issues };
}