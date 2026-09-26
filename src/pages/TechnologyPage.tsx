import { Link } from "react-router-dom";
import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";
import { useRise } from "../components/motion";
import { motion } from "framer-motion";
import { BASE, chordError, duelAt, innerDiameter } from "../components/duel-model";

/* Each statement under "Every ring" maps to code in src/lib/cad-engine-brep.ts,
 * src/lib/cad-engine.ts or src/workers/brep-worker.ts (listed in audit/REPORT.md). */
const FACTS = [
  {
    title: "The finger hole is an exact circle",
    body: "A plain band is made by turning its cross-section around the finger, so in the STEP file the hole is a true circle, not a polygon.",
  },
  {
    title: "A new size is a new build",
    body: "The inner diameter comes from the size. The band section comes from the width. The seat and prongs come from the stone. Changing one does not stretch the others.",
  },
  {
    title: "Weight is measured, not looked up",
    body: "All the metal parts are merged into one solid, its volume is measured, and that is multiplied by the density of the alloy you chose.",
  },
  {
    title: "The carat is weighed",
    body: "The centre stone's carat is worked out from the volume of the stone that was actually built, at 3.52 g/cm³ for diamond.",
  },
  {
    title: "One piece of metal",
    body: "If the merged metal comes out as more than one piece, the Studio says so. A ring in two pieces cannot be cast.",
  },
  {
    title: "Pavé seats are cut into the band",
    body: "Each accent stone gets a cone-shaped seat cut into the shank, so the STEP file shows the metal a setter will actually work on.",
  },
];

export function TechnologyPage() {
  useTitle("Technology");
  const rise = useRise();
  const r = innerDiameter(BASE.size) / 2;
  const up = duelAt(9);

  return (
    <PageShell>
      <PageHeader
        title="Why we build solids, not meshes"
        lede="A ring you can cast needs exact sizes: a seat that fits the stone, prongs thick enough to hold it and a round finger hole. This page explains how Wireframe gets there, and what each file you export is for."
      />

      <section className="mt-20 grid gap-10 lg:grid-cols-2">
        <motion.div {...rise(0)}>
          <h2 className="h-card text-xl">A mesh</h2>
          <p className="mt-3 text-white/80">
            A surface made of flat triangles. It is fine for a picture. Every curve is
            an approximation: a size {BASE.size} finger hole drawn with 16 flat sides
            is {chordError(r, 16).toFixed(3)} mm off round. The file does not know
            which part is the seat and which is the shank, so resizing it means
            scaling everything. Scale a {BASE.carat.toFixed(2)} ct solitaire from size{" "}
            {BASE.size} to size 9 and its seat now holds a {up.mesh.carat.toFixed(2)} ct stone.
          </p>
        </motion.div>
        <motion.div {...rise(0.05)}>
          <h2 className="h-card text-xl">A solid</h2>
          <p className="mt-3 text-white/80">
            A boundary representation, or B&#8209;rep: every surface is described
            exactly, so a circle stays a circle. Wireframe builds each ring from its
            spec with OpenCASCADE, the open-source CAD kernel, running in your
            browser. Change the spec and the solid is built again.{" "}
            <Link to="/#how" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              Try it on the home page
            </Link>
            .
          </p>
        </motion.div>
      </section>

      <section className="mt-20">
        <h2 className="h-section">Every ring Wireframe builds</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((f, i) => (
            <motion.div key={f.title} {...rise(0.03 * i)} className="border-t border-white/10 pt-5">
              <h3 className="h-card">{f.title}</h3>
              <p className="mt-2 text-[0.95rem] text-white/78">{f.body}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-white/70">
          Before you export, the ring is also checked against casting minimums for
          its alloy.{" "}
          <Link to="/journal/casting-minimums" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
            See the figures
          </Link>
          .
        </p>
      </section>

      <section className="mt-20">
        <h2 className="h-section">Which file to use</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <h3 className="h-card">STEP</h3>
            <p className="mt-2 text-white/78">
              The exact solid, in millimetres, with the metal and the stones. Open it
              in Rhino, MatrixGold or any CAD package that reads STEP to keep working
              on the design, or send it for milling.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <h3 className="h-card">STL</h3>
            <p className="mt-2 text-white/78">
              For printing a wax or resin model to cast. It holds the metal only,
              because the stones are set by hand. It is made from the same solid when
              you export, with its flat sides kept within 0.01 mm of the true surface.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-20 flex flex-col gap-5 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-white/80">
          Bring a piece you already make. We will build it on a call and send you
          the STEP and STL files.
        </p>
        <Link to="/#contact" className="btn-primary shrink-0">Book a demo</Link>
      </section>
    </PageShell>
  );
}

export default TechnologyPage;
