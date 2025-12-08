import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { subscribeDesignJob, DesignJob } from "../../lib/design-jobs";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function DesignJobCard({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<DesignJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const unsub = subscribeDesignJob(
      jobId,
      (j) => setJob(j),
      (err) => setError(err?.message || "Error subscribing to job")
    );
    return () => unsub && unsub();
  }, [jobId]);

  const progress = Math.max(0, Math.min(100, job?.progress ?? 0));
  
  // Format the spec for display
  const specs = useMemo(() => {
    if (!job?.spec) return null;
    return (
      <div className="grid grid-cols-2 gap-2 text-xs text-white/70 mt-2">
        <div className="bg-white/5 p-1.5 rounded border border-white/10">
          <span className="block text-[10px] text-white/40 uppercase">Metal</span>
          {job.spec.metalType?.replace(/_/g, ' ') || "Platinum"}
        </div>
        <div className="bg-white/5 p-1.5 rounded border border-white/10">
          <span className="block text-[10px] text-white/40 uppercase">Gem</span>
          {job.spec.gemShape || "Round"}
        </div>
        <div className="bg-white/5 p-1.5 rounded border border-white/10">
          <span className="block text-[10px] text-white/40 uppercase">Size</span>
          US {job.spec.ringSize || "6"}
        </div>
        <div className="bg-white/5 p-1.5 rounded border border-white/10">
          <span className="block text-[10px] text-white/40 uppercase">Carat</span>
          {job.spec.gemSize || "1.0"} ct
        </div>
      </div>
    );
  }, [job?.spec]);

  return (
    <Card className="mt-3 border-white/10 bg-white/5 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {job?.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-[var(--gold-500)]" />}
            {job?.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
            {job?.status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
            
            <div className="text-sm font-medium text-white/90">
              {job?.status === "running" ? "Generating Specs..." : "Design Parameters"}
            </div>
          </div>
          <div className="text-[10px] text-white/40 font-mono">
            {progress}%
          </div>
        </div>

        {/* Progress Bar */}
        {job?.status === "running" && (
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-[var(--gold-500)] transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        )}

        {/* Specs Display */}
        {job?.status === "done" && specs}

        {/* Error Message */}
        {job?.status === "error" && (
          <div className="text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-500/20">
            {job.error || "Generation failed"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}