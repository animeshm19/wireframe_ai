// src/components/wireframe/design-job-card.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { DesignJob, jobFileUrl, subscribeDesignJob } from "../../lib/design-jobs";
import { StlPreview } from "./stl-preview";

export function DesignJobCard({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<DesignJob | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    setSubError(null);
    setJob(null);

    if (!jobId) {
      setSubError("Missing jobId");
      return;
    }

    // IMPORTANT: subscribeDesignJob should return an unsubscribe fn.
    // Also: it should accept an error callback. If yours doesn't, update it (recommended).
    const unsub = subscribeDesignJob(
      jobId,
      (j) => {
        setSubError(null);
        setJob(j);
      },
      (err) => {
        setSubError(err?.message ?? String(err));
      }
    );

    return () => {
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [jobId]);

  const progress = Math.max(0, Math.min(100, job?.progress ?? 0));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStlUrl(null);
      setStepUrl(null);
      setFileError(null);

      if (!job || job.status !== "done") return;

      const stlPath = job.outputs?.stlPath ?? null;
      const stepPath = job.outputs?.stepPath ?? null;

      try {
        const [a, b] = await Promise.all([
          stlPath ? jobFileUrl(stlPath) : Promise.resolve(null),
          stepPath ? jobFileUrl(stepPath) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setStlUrl(a);
          setStepUrl(b);
        }
      } catch (e: any) {
        if (!cancelled) {
          setFileError(e?.message ?? String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [job]);

  const statusLabel = useMemo(() => {
    if (subError) return "Blocked (permissions?)";
    if (!job) return "Loading…";
    if (job.status === "queued") return "Queued";
    if (job.status === "running") return `Generating (${progress}%)`;
    if (job.status === "done") return "Done";
    return "Error";
  }, [job, progress, subError]);

  const dlBtnClass =
    "border-white/15 bg-white/10 text-white hover:bg-white/20 hover:border-white/25 " +
    "disabled:opacity-50 disabled:hover:bg-white/10 disabled:cursor-not-allowed";

  return (
    <Card className="mt-3 border-white/10 bg-white/4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-white/80">
            <div className="font-medium text-white/90">CAD Job</div>
            <div className="text-white/60">{statusLabel}</div>
          </div>
          <div className="text-[11px] text-white/40 font-mono truncate max-w-[180px]">
            {jobId}
          </div>
        </div>

        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-white/40" style={{ width: `${progress}%` }} />
        </div>

        {!!subError && (
          <div className="text-sm text-red-300/90 whitespace-pre-wrap">
            Firestore subscribe failed: {subError}
            {"\n"}
            Most common fix: Firestore Rules are denying reads for this doc.
          </div>
        )}

        {job?.status === "error" && (
          <div className="text-sm text-red-300/90 whitespace-pre-wrap">
            {job.error ?? "Unknown error"}
          </div>
        )}

        {!!fileError && (
          <div className="text-sm text-red-300/90 whitespace-pre-wrap">
            Storage download URL failed: {fileError}
            {"\n"}
            Most common fix: Storage Rules are denying reads.
          </div>
        )}

        {stlUrl && (
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
            <StlPreview url={stlUrl} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className={dlBtnClass}
            disabled={!stlUrl}
            onClick={() => stlUrl && window.open(stlUrl, "_blank", "noopener,noreferrer")}
          >
            Download STL
          </Button>

          <Button
            variant="outline"
            className={dlBtnClass}
            disabled={!stepUrl}
            onClick={() => stepUrl && window.open(stepUrl, "_blank", "noopener,noreferrer")}
          >
            Download STEP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
