/**
 * The Technical Architecture Deep-Dive: B-Rep Solids vs. Polygon Meshes.
 *
 * Explains why traditional 3D polygon meshes fail in jewelry manufacturing,
 * and how Wireframe's analytical B-rep kernel (OpenCASCADE / STEP AP214)
 * provides the precision required for lost-wax casting and 5-axis CNC machining.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  FileCode,
  ArrowRight,
  ShieldCheck,
  Scale,
  Box,
} from "lucide-react";

export function TechnologyPage() {
  const [selectedFormat, setSelectedFormat] = useState<"step" | "stl">("step");

  const scrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/#contact";
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white">
      {/* Radiant ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(70% 40% at 50% 0%, rgba(198,155,178,0.12), transparent 60%)," +
            "radial-gradient(60% 50% at 85% 90%, rgba(225,40,130,0.06), transparent 65%)",
        }}
      />
      <span aria-hidden="true" className="blueprint pointer-events-none absolute inset-0 opacity-30" />

      {/* Main Container */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex items-center gap-3 text-xs"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-metal-300 animate-pulse" />
            <span className="mono-label !text-[0.55rem] !text-white font-semibold">
              ARCHITECTURE &amp; GEOMETRY
            </span>
          </div>
          <span className="text-white/30">/</span>
          <Link to="/" className="text-white/70 hover:text-white transition-colors">
            Home
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white font-medium">Technology</span>
        </motion.div>

        {/* Hero Section */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <div className="mono-label !text-metal-400 font-semibold !text-[0.6rem]">
            THE COMPUTATIONAL FOUNDATION
          </div>
          <h1 className="mt-4 text-[clamp(2.2rem,1.5rem+3vw,3.8rem)] font-semibold leading-[1.05] tracking-tight text-white">
            Why jewelry cannot be built out of triangles.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">
            Every generative 3D model on the internet exports a polygon mesh—a hollow shell of flat triangles.
            At the casting bench, meshes fail: curves become faceted chords, wall thickness is unpredictable,
            and stone seats lack analytical clearance.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-base">
            Wireframe abandons polygon meshes for true <strong>Boundary Representation (B-rep)</strong>.
            We compile conversational design prompts into exact mathematical curves, closed volume shells, and
            native STEP AP214 solids powered by OpenCASCADE.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={scrollToContact}
              className="group flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-950 transition-colors duration-300 hover:bg-metal-200"
            >
              <span>Schedule Atelier Demo</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
            <Link
              to="/#features"
              className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors duration-300 hover:border-white/35 hover:bg-white/[0.08]"
            >
              Test Live in Feature Grid
            </Link>
          </div>
        </motion.header>

        {/* Comparative Failure vs Solution Cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {/* Card 1: The Failure of the Mesh */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-red-500/25 bg-gradient-to-b from-red-500/[0.05] to-transparent p-6 sm:p-7"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h2 className="text-base font-semibold text-red-200">
                  The Polygon Mesh Failure
                </h2>
              </div>
              <span className="mono-label rounded border border-red-500/30 bg-red-950/60 px-2 py-0.5 !text-[0.52rem] !text-red-300 font-semibold">
                LEGACY STL / OBJ / SUBD
              </span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-white/75 sm:text-sm">
              Polygon meshes approximate continuous curvature by stitching flat triangles together.
              While suitable for video games and rendering, they break down under mechanical manufacturing constraints.
            </p>

            <ul className="mt-5 space-y-3.5 text-xs sm:text-sm">
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <div>
                  <strong className="text-white">Faceted Ring Holes:</strong> A circular band rendered with 32 or 64 facets has a sagitta error up to 0.052 mm. The ring is out-of-round and pinches the client's finger.
                </div>
              </li>
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <div>
                  <strong className="text-white">Non-Manifold Edges:</strong> Scaling a mesh causes self-intersecting triangles, zero-thickness walls, and inverted normals that freeze slicers and fail in lost-wax casting.
                </div>
              </li>
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <div>
                  <strong className="text-white">Imprecise Stone Seats:</strong> Diamond girdles require an exact 45° bearing notch with micron tolerances. In a mesh, bearing cuts become jagged polygons that cause stones to chip or pop out.
                </div>
              </li>
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <div>
                  <strong className="text-white">Destructive Resizing:</strong> Resizing a ring scales prongs, stones, and shank together as one rigid balloon, requiring complete manual rebuilding in Rhino.
                </div>
              </li>
            </ul>
          </motion.div>

          {/* Card 2: The B-Rep Mathematical Solution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.05] to-transparent p-6 sm:p-7"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-emerald-200">
                  The Wireframe B-Rep Solution
                </h2>
              </div>
              <span className="mono-label rounded border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 !text-[0.52rem] !text-emerald-300 font-semibold">
                ANALYTICAL OCCT SOLID
              </span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-white/75 sm:text-sm">
              Boundary Representation defines objects through exact mathematical equations: NURBS surfaces,
              conic cylinders, planar faces, and topological edge loops.
            </p>

            <ul className="mt-5 space-y-3.5 text-xs sm:text-sm">
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <strong className="text-white">Zero Curvature Loss (0.000 mm):</strong> A ring hole is represented as an analytical cylinder. Whether milled on a 5-axis CNC or printed in wax, the radius is mathematically pure.
                </div>
              </li>
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <strong className="text-white">100% Watertight Solids:</strong> Verified closed shells with rigorous manifold continuity. Zero disjointed faces, zero inverted normals, and zero slicer repair required.
                </div>
              </li>
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <strong className="text-white">Automated Tooling Cutters:</strong> The engine models negative geometry—under-bezel azures, culet drill holes, and bearing seats—as separate boolean cutters carved directly into the solid.
                </div>
              </li>
              <li className="flex items-start gap-3 text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <strong className="text-white">Parametric History:</strong> Resizing from US 5 to US 9 updates the inner diameter while automatically keeping prongs locked at 0.85 mm and wall thickness at 1.80 mm.
                </div>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Detailed Engineering Comparison Table */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <Scale className="h-4 w-4 text-metal-300" />
            <h3 className="mono-label !text-[0.6rem] !text-white font-semibold">
              ENGINEERING SPECIFICATION MATRIX
            </h3>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md">
            <table className="w-full min-w-[620px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="p-4 font-semibold text-white/80">Capability</th>
                  <th className="p-4 font-semibold text-red-300">Generic Mesh Tool (STL/OBJ)</th>
                  <th className="p-4 font-semibold text-emerald-300">Wireframe Kernel (B-Rep STEP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                <tr>
                  <td className="p-4 font-medium text-white">Underlying Representation</td>
                  <td className="p-4 text-white/70">Flat triangles &amp; vertex coordinates</td>
                  <td className="p-4 text-emerald-300/90 font-medium">Analytical NURBS surfaces &amp; topological wires</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Curvature Accuracy</td>
                  <td className="p-4 text-white/70">Faceted (error depends on polygon density)</td>
                  <td className="p-4 text-emerald-300/90 font-medium">Exact (0.000 mm sagitta deviation)</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Ring Resizing Behavior</td>
                  <td className="p-4 text-white/70">Warps prongs, stones, and wall thickness</td>
                  <td className="p-4 text-emerald-300/90 font-medium">Independent parameters; stones &amp; prongs locked</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Stone Seat Bearing Cuts</td>
                  <td className="p-4 text-white/70">Jagged polygonal steps (high stone loss risk)</td>
                  <td className="p-4 text-emerald-300/90 font-medium">True 45° conical bearing with 0.35 mm claw overlap</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Minimum Wall Thickness Check</td>
                  <td className="p-4 text-white/70">None (causes casting porosity and collapse)</td>
                  <td className="p-4 text-emerald-300/90 font-medium">Strict alloy floor (Pt 1.0mm, 18K 1.2mm, Ag 1.5mm)</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Machining / Master CAD Toolpath</td>
                  <td className="p-4 text-white/70">Cannot be ingested into 5-axis CNC CAM</td>
                  <td className="p-4 text-emerald-300/90 font-medium">Direct ISO 10303-21 STEP toolpathing</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Mass &amp; Gold Weight Derivation</td>
                  <td className="p-4 text-white/70">Approximate mesh volume (often leaks)</td>
                  <td className="p-4 text-emerald-300/90 font-medium">Divergence theorem closed-solid integration</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Dual-Format Workflow Console */}
        <section className="mt-16 rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mono-label !text-metal-400 font-semibold !text-[0.55rem]">
                DUAL EXPORT PIPELINE
              </div>
              <h3 className="mt-1 text-xl font-semibold text-white">
                When does Wireframe use STEP vs. STL?
              </h3>
            </div>

            <div className="flex rounded-full border border-white/15 bg-black/50 p-1">
              <button
                onClick={() => setSelectedFormat("step")}
                className={
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 " +
                  (selectedFormat === "step"
                    ? "bg-white text-ink-950 shadow-md"
                    : "text-white/70 hover:text-white")
                }
              >
                STEP (B-Rep Solid)
              </button>
              <button
                onClick={() => setSelectedFormat("stl")}
                className={
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 " +
                  (selectedFormat === "stl"
                    ? "bg-metal-300 text-ink-950 shadow-md"
                    : "text-white/70 hover:text-white")
                }
              >
                Binary STL (Tessellated)
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-metal-300" />
                <h4 className="text-sm font-semibold text-white">
                  {selectedFormat === "step" ? "STEP AP214 (Master Archive & CNC)" : "Binary STL (Resin 3D Printing)"}
                </h4>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/80">
                {selectedFormat === "step"
                  ? "The primary master deliverable. Contains exact mathematical topology, allowing downstream jewelry CAD designers in Rhino or MatrixGold to select edges, adjust fillets, and carve secondary engraving without rebuild."
                  : "Generated dynamically from the exact B-rep solid only when sending directly to SLA wax printers. Wireframe computes ultra-fine adaptive chord tolerances (0.0005 mm) tailored to the printer's resolution."}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-5">
              <div className="mono-label !text-[0.52rem] !text-white/70">RECOMMENDED USAGE</div>
              <ul className="mt-2 space-y-1.5 text-xs text-white/85">
                {selectedFormat === "step" ? (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>5-axis CNC wax &amp; platinum milling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Rhino / MatrixGold / 3Design master import</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Long-term studio catalog parametric archives</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-metal-300" />
                      <span>Formlabs Form 4 / Asiga SLA wax resin printing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-metal-300" />
                      <span>Rapid prototype physical customer try-on bands</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-metal-300" />
                      <span>Direct investment casting prep</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* Bottom CTA Block */}
        <section className="mt-16 rounded-3xl border border-white/12 bg-black/80 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Ready to inspect real B-rep geometry?
              </h3>
              <p className="text-xs leading-relaxed text-white/80 sm:text-sm">
                Bring a file from your existing CAD process or walk through a custom piece.
                We will demonstrate the STEP export and casting tolerance check live.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={scrollToContact}
                className="rounded-full bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-950 transition-colors duration-300 hover:bg-metal-200"
              >
                Book a Demo
              </button>
              <a
                href="mailto:hello@wireframe.studio?subject=B-Rep%20Kernel%20Inquiry"
                className="rounded-full border border-white/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:border-white/35 transition-colors"
              >
                Email hello@wireframe.studio
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default TechnologyPage;
