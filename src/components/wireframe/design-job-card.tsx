import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { subscribeDesignJob, DesignJob } from "../../lib/design-jobs";
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { StlPreview } from "./stl-preview";
import { useCadWorker } from "../../hooks/useCadWorker";
import { withDefaults, METAL_LABELS, parseSpecFromPrompt, RingSpec } from "../../lib/ring-spec";

export function DesignJobCard({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<DesignJob | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  // Geometry is produced in the browser. The Firestore job is only a source of
  // the extracted spec -- the preview no longer waits on a server pipeline.
  const { generate, modelBlob, isGenerating, error: genError, progress, stage, issues } = useCadWorker();

  useEffect(() => {
    if (!jobId) return;
    const unsub = subscribeDesignJob(
      jobId,
      (j) => setJob(j),
      (err) => setSubscribeError(err?.message || "Error subscribing to job")
    );
    return () => unsub && unsub();
  }, [jobId]);

  // Fall back to the schema defaults until (or unless) a spec is extracted.
  const parsed = useMemo(() => parseSpecFromPrompt(job?.prompt), [job?.prompt]);
  const usedPrompt = !job?.spec && Object.keys(parsed).length > 0;
  const spec: RingSpec = useMemo(
    () => withDefaults(job?.spec ?? parsed),
    [job?.spec, parsed]
  );
  const specKey = JSON.stringify(spec);

  useEffect(() => { generate(spec); }, [specKey, generate]);

  // Blob -> object URL for StlPreview. The previous URL is revoked when a new
  // one replaces it, NOT in effect cleanup: under StrictMode's
  // mount/unmount/mount cycle, cleanup-revoking frees a URL the preview is
  // still loading, which surfaces as "STL Load Error: Failed to fetch".
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!modelBlob) return;
    const url = URL.createObjectURL(modelBlob);
    const stale = prevUrlRef.current;
    prevUrlRef.current = url;
    setModelUrl(url);
    // Revoke the old URL on a delay: the preview may still be fetching it, and
    // revoking mid-fetch surfaces as "STL Load Error: Failed to fetch".
    if (stale) setTimeout(() => URL.revokeObjectURL(stale), 30000);
  }, [modelBlob]);

  const failed = genError || job?.status === "error";
  const ready = !!modelUrl && !isGenerating && !failed;
  const pct = failed ? 0 : ready ? 100 : progress;

  return (
    <Card className="mt-3 border-white/10 bg-white/5 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-[var(--gold-500)]" />}
            {ready && <CheckCircle2 className="h-4 w-4 text-green-400" />}
            {failed && <AlertCircle className="h-4 w-4 text-red-400" />}
            <div className="text-sm font-medium text-white/90">
              {failed ? "Generation failed" : ready ? "Design ready" : stage || "Design Parameters"}
            </div>
          </div>
          <div className="text-[10px] text-white/40 font-mono">{pct}%</div>
        </div>

        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={
              "h-full transition-all duration-300 " +
              (failed ? "bg-red-400" : ready ? "bg-green-400" : "bg-[var(--gold-500)]")
            }
            style={{ width: `${pct}%` }}
          />
        </div>

        {ready && (
          <div className="mt-4 border border-white/10 rounded-lg overflow-hidden">
            <StlPreview url={modelUrl} height={200} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-white/70 mt-2">
          <Field label="Metal" value={METAL_LABELS[spec.metalType] || spec.metalType} />
          <Field label="Gem" value={`${spec.gemShape} · ${spec.gemSize} ct`} />
          <Field label="Size" value={`US ${spec.ringSize}`} />
          <Field label="Band" value={`${spec.bandProfile} · ${spec.bandWidth}mm`} />
          <Field label="Setting" value={spec.setting} />
          <Field label="Prongs" value={spec.setting === "bezel" ? "—" : spec.prongCount} />
        </div>

        {ready && issues.length > 0 && (
          <div className="flex items-start gap-2 text-[10px] text-amber-200/80 bg-amber-900/15 border border-amber-500/20 rounded p-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-px" />
            <span>{issues[0].message}{issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}</span>
          </div>
        )}

        {ready && issues.length === 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-green-400/80">
            <CheckCircle2 className="h-3 w-3" /> Castable as specified
          </div>
        )}

        {(job as any)?.interpretation && (
          <p className="text-[11px] text-white/60 leading-relaxed italic">
            {(job as any).interpretation}
          </p>
        )}

        {!job?.spec && !failed && (
          <p className="text-[10px] text-white/35 leading-relaxed">
            {usedPrompt
              ? "Read directly from your prompt. Interpreting the rest…"
              : "Showing standard parameters while your description is interpreted."}
          </p>
        )}

        {failed && (
          <div className="text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-500/20">
            {genError || job?.error || subscribeError || "Generation failed"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white/5 p-1.5 rounded border border-white/10">
      <span className="block text-[10px] text-white/40 uppercase">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}
