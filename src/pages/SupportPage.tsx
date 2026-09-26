import { Link } from "react-router-dom";
import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";
import {
  FINISH_LABELS,
  GEM_CUTS,
  METALS,
  METAL_DENSITY,
  METAL_LABELS,
  SETTINGS,
  SETTING_LABELS,
  SHANK_STONES,
  SHANK_STONE_LABELS,
  SHANK_STYLES,
  SHANK_STYLE_LABELS,
} from "../lib/ring-spec";

const list = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export function SupportPage() {
  useTitle("Help");

  const faqs = [
    {
      q: "Which files do I get?",
      a: (
        <p>
          A STEP file and an STL file. The STEP is the exact solid in millimetres,
          with the metal and the stones, for any CAD package that reads STEP. The
          STL is the metal only, for printing a wax or resin model to cast. You can
          also save a PNG render of the current view.
        </p>
      ),
    },
    {
      q: "Which metals can I use?",
      a: (
        <p>
          {list(METALS.map((m) => METAL_LABELS[m]))}. Each has its own density for
          the weight and its own casting minimums. Finishes:{" "}
          {list(Object.values(FINISH_LABELS)).toLowerCase()}.
        </p>
      ),
    },
    {
      q: "Which settings and stone cuts are there?",
      a: (
        <p>
          Settings: {list(SETTINGS.map((s) => SETTING_LABELS[s].toLowerCase()))}.
          Cuts: {list(GEM_CUTS.map((c) => c))}. Shanks:{" "}
          {list(SHANK_STYLES.map((s) => SHANK_STYLE_LABELS[s].toLowerCase()))}. Stones in the
          band: {list(SHANK_STONES.filter((s) => s !== "none").map((s) => SHANK_STONE_LABELS[s].toLowerCase()))}.
          {" "}Band profiles: comfort fit, flat, D-shape and knife-edge.
        </p>
      ),
    },
    {
      q: "Can I upload a photo of a ring?",
      a: (
        <p>
          Not in a way that shapes the design yet. The ring is built from what you
          write. If you have a photo, describe the piece in words: the metal, the
          stone and its cut, the setting and the band.
        </p>
      ),
    },
    {
      q: "How is the weight worked out?",
      a: (
        <>
          <p>
            The metal parts are merged into one solid and its volume is measured.
            That volume is multiplied by the density of the alloy:
          </p>
          <ul>
            {METALS.map((m) => (
              <li key={m}>
                {METAL_LABELS[m]}: <span className="measure">{METAL_DENSITY[m].toFixed(2)} g/cm³</span>
              </li>
            ))}
          </ul>
          <p>
            The centre stone&apos;s carat is worked out the same way, from the volume
            of the stone that was built, at 3.52 g/cm³ for diamond.
          </p>
        </>
      ),
    },
  ];

  return (
    <PageShell narrow>
      <PageHeader
        title="Help"
        lede="Write to hello@wireframe.studio. We usually reply within one business day."
        action={<a href="mailto:hello@wireframe.studio" className="btn-primary">Email us</a>}
      />

      <div className="prose-site mt-14">
        <h2>Common questions</h2>
        {faqs.map((f) => (
          <section key={f.q}>
            <h3>{f.q}</h3>
            {f.a}
          </section>
        ))}

        <h2>More</h2>
        <p>
          The <Link to="/docs">Studio guide</Link> walks through the Studio step by
          step, with every keyboard shortcut.
        </p>
      </div>
    </PageShell>
  );
}

export default SupportPage;
