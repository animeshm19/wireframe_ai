/**
 * Geometry worker, B-rep kernel.
 *
 * Two jobs, deliberately kept separate because they have wildly different
 * costs. PREVIEW builds the ring's parts and tessellates them — a couple of
 * hundred milliseconds, fast enough to run on every slider movement. RESOLVE
 * merges those parts into one solid, which is where OCCT spends seconds, and is
 * only worth doing once the design stops moving.
 *
 * The hook runs two instances of this file for exactly that reason: a preview
 * instance that must stay responsive, and a resolve instance that can be
 * terminated mid-merge when the design changes underneath it. A worker cannot
 * abandon a running WebAssembly call any other way — there is no yield point to
 * check a cancel flag at — so being killable IS the cancellation mechanism.
 */
import wasmUrl from "replicad-opencascadejs/wasm?url";
import {
  buildRingParts, previewMesh, previewEdges, fuseMetal, ringMetrics, toSTEP, toSTL,
  initKernel,
  kernelHeapMB,
  type RingDims,
} from "../lib/cad-engine-brep";
import { checkManufacturability } from "../lib/cad-engine";
import type { Shape3D } from "replicad";

/** The engine owns the kernel; the worker only says where the wasm lives. */
const boot = (): Promise<void> => initKernel(() => wasmUrl);

// Boot as soon as the worker exists, not on its first message. useBrepWorker
// spawns a replacement in an idle moment; booting then (and warming the
// kernel's code, see warmKernel) keeps both off the next slider movement,
// which would otherwise wait for boot, warm-up and build together. A failed
// boot is not lost: the first message awaits the same promise and reports it.
boot().catch(() => {});

const report = (progress: number, stage: string) =>
  self.postMessage({ type: "PROGRESS", progress, stage });

/** Kept between messages so a STEP export does not have to merge all over again. */
let held: { metal: Shape3D; stones: Shape3D[] } | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, params } = e.data;

  try {
    if (type === "PREVIEW" || type === "RESOLVE") {
      report(8, "Starting kernel");
      await boot();
    }

    if (type === "PREVIEW") {
      report(30, "Shaping band");
      const { metalParts, stones } = buildRingParts(params);
      report(70, "Tessellating");

      const metal = previewMesh(metalParts);
      const edges = previewEdges(metalParts);
      // Stones merge into one mesh: a halo is a dozen bodies but one material
      // and one draw call, and nothing in the viewport addresses them singly.
      // Finer deflection than the metal — facet edges are the whole point of a
      // gemstone, and tessellating them coarsely rounds the sparkle off.
      const stoneMesh = stones.length ? previewMesh(stones, 0.008) : null;

      report(100, "Ready");
      // Transferred, not copied: a 1ct solitaire is about 300KB of vertex data
      // and structured-cloning it on every slider tick is a waste of a frame.
      const buffers = [
        metal.vertices.buffer, metal.normals.buffer, metal.triangles.buffer,
        edges.buffer,
      ];
      if (stoneMesh) buffers.push(
        stoneMesh.vertices.buffer, stoneMesh.normals.buffer, stoneMesh.triangles.buffer);

      self.postMessage({ type: "PREVIEW", metal, stones: stoneMesh, edges, heapMB: kernelHeapMB() }, buffers as any);
      return;
    }

    if (type === "RESOLVE") {
      report(20, "Rebuilding");
      // seats: true — the merge is where pavé seats get cut. The preview skips
      // them because they cost seconds and sit under the stones anyway.
      const { metalParts, stones, dims } = buildRingParts(params, { seats: true });
      report(45, "Merging solids");
      const { metal, dropped } = fuseMetal(metalParts);
      report(85, "Measuring");
      const metrics = ringMetrics(metal, stones, dims as RingDims);
      const issues = checkManufacturability(params, metrics as any);

      // Connectivity is a manufacturing question, not a geometry curiosity: a
      // ring in two pieces cannot be cast, and it is the kind of defect that
      // renders perfectly and is only discovered by whoever tries to make it.
      if (metrics.solidCount !== 1) {
        issues.unshift({
          severity: "error",
          code: "disconnected",
          message: `The metal is ${metrics.solidCount} separate pieces and cannot be cast as one ring.`,
        });
      }
      if (dropped > 0) {
        issues.push({
          severity: "warning",
          code: "merge-incomplete",
          message: `${dropped} component${dropped > 1 ? "s" : ""} could not be merged cleanly; the export may be incomplete.`,
        });
      }
      held = { metal, stones };

      // Tessellate the MERGED solid and send it too.
      //
      // The preview is the unfused parts with no pavé seats cut — right to look
      // at, and wrong the moment anyone looks inside. Section a pavé shank in
      // preview geometry and the stones appear buried in unbroken metal, which
      // is precisely the question a section view is being asked. So once the
      // merge is done the viewport swaps to the real thing: seats cut, parts
      // joined, exactly what the STEP will contain.
      const resolved = previewMesh([metal]);
      report(100, "Ready");
      self.postMessage({ type: "RESOLVED", metrics, issues, mesh: resolved }, [
        resolved.vertices.buffer, resolved.normals.buffer, resolved.triangles.buffer,
      ] as any);
      return;
    }

    if (type === "EXPORT") {
      if (!held) {
        self.postMessage({ type: "ERROR", error: "Still merging — try again in a moment." });
        return;
      }
      const format = e.data.format === "stl" ? "stl" : "step";
      // STL carries the metal only. A caster prints what they will cast; the
      // stones are bought by the carat and set by hand, and a printed diamond
      // is just something to throw away.
      const blob = format === "stl"
        ? toSTL(held.metal)
        : toSTEP(held.metal, held.stones);
      self.postMessage({ type: "EXPORT", format, blob });
      return;
    }
  } catch (error: any) {
    self.postMessage({ type: "ERROR", error: error?.message || String(error) });
  }
};
