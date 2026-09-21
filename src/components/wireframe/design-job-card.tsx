import React, { useEffect, useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import type { ChatDesign } from "./chat-types";
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { StlPreview } from "./stl-preview";
import { useBrepWorker } from "../../hooks/useBrepWorker";
import { withDefaults, METAL_LABELS, parseSpecFromPrompt, RingSpec } from "../../lib/ring-spec";

export function DesignJobCard({ design }: { design: ChatDesign }) {
  // Geometry is produced in the browser, from a spec that arrives on the
  // message. There is no job document and nothing to wait on: this card used
  // to subscribe to a `designJobs` record that no worker could ever advance.
  const {
    generate, mesh: ringMesh, isBuilding: isGenerating, error: genError,
    progress, stage, issues,
  } = useBrepWorker();

  // Fall back to the schema defaults until (or unless) a spec is extracted.
  const parsed = useMemo(() => parseSpecFromPrompt(design.prompt), [design.prompt]);
  const usedPrompt = !design.spec && Object.keys(parsed).length > 0;
  const spec: RingSpec = useMemo(
    () => withDefaults(design.spec ?? parsed),
    [design.spec, parsed]
  );
  const specKey = JSON.stringify(spec);

  useEffect(() => { generate(spec); }, [specKey, generate]);

  // No object URL, no blob, no revoke timing to get wrong. The geometry comes
  // through as typed arrays and goes straight into a BufferGeometry, which is
  // what removed the "STL Load Error: Failed to fetch" class of bug rather than
  // delaying it by thirty seconds.
  const failed = !!genError;
  const ready = !!ringMesh && !isGenerating && !failed;
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
            <StlPreview mesh={ringMesh?.metal ?? null} height={200} />
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

        {/*
          "as drawn", not "as specified". The checker verifies the solid that
          was built; it has no idea whether that solid is what was asked for.
          Those are the same claim only when every value came from the prompt,
          and they routinely are not: "18k rose gold" parses to 14k_rose, and
          anything the prompt did not mention is a schema default. Saying
          "as specified" over a substituted value is a false statement about
          the customer's own words, on the one line a jeweller would take at
          face value. "As drawn" is true in every case.
        */}
        {ready && issues.length === 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-green-400/80">
            <CheckCircle2 className="h-3 w-3" /> Castable as drawn
          </div>
        )}

        {/*
          A parser result must never be dressed as a model result. Before A8
          this card said nothing at all once the parser had answered: the
          "the model did not answer" note below is gated on `!design.spec`,
          and the parser always supplies a spec, so the line was unreachable
          on exactly the path it was written for. A jeweller saw a finished
          card with a green tick and no way to know that "18k rose gold,
          knife-edge, milgrain" had been matched word by word rather than
          read. This is the honest version, and it is deliberately not a
          whisper.

          It says "did not answer" and not "every model was busy", because
          `source: "parser"` is set on ANY failure in ai-extract.ts — offline,
          not deployed, a rejected prompt — and the browser cannot tell which.
          Naming a cause we do not know would be a new false statement in
          place of the old one.
        */}
        {design.source === "parser" && design.spec && (
          <div className="flex items-start gap-2 text-[10px] text-amber-200/90 bg-amber-900/15 border border-amber-500/20 rounded p-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-px" />
            <span>
              Matched from your wording, not interpreted — the design model
              did not answer. Anything you did not state outright is a
              standard value, not a reading of your description.
            </span>
          </div>
        )}

        {design.interpretation && (
          <p className="text-[11px] text-white/60 leading-relaxed italic">
            {design.interpretation}
          </p>
        )}

        {!design.spec && !failed && (
          <p className="text-[10px] text-white/35 leading-relaxed">
            {design.status === "extracting"
              ? (usedPrompt
                  ? "Read directly from your prompt. Interpreting the rest…"
                  : "Showing standard parameters while your description is interpreted.")
              : (usedPrompt
                  ? "Read directly from your prompt. The model did not answer, so the rest are standard parameters."
                  : "The model did not answer. These are standard parameters, not your description.")}
          </p>
        )}

        {failed && (
          <div className="text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-500/20">
            {genError || "Generation failed"}
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
