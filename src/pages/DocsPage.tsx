import { Link } from "react-router-dom";
import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";
import { MANUFACTURING_LIMITS, METALS, METAL_LABELS } from "../lib/ring-spec";

/* Everything here is read from the app: panel names from studio-workspace.tsx,
 * shortcuts from the bindings in studio-workspace.tsx and chat-shell.tsx. */

const STUDIO_KEYS: Array<[string, string]> = [
  ["1 to 4", "Shaded, Shaded + edges, Wireframe, X-ray"],
  ["S", "Section cut"],
  ["D", "Dimensions"],
  ["T", "Turntable"],
  ["\\", "Show or hide the panels"],
  ["L", "Select a section of the band"],
  ["P", "Pin this version for compare"],
  ["C", "Compare against the pinned version"],
  ["R", "Reset to the generated design"],
  ["E", "Download STEP"],
  ["Shift E", "Download STL"],
  ["G", "Save a render (PNG)"],
  ["⌘ K or Ctrl K", "Command palette"],
  ["?", "Keyboard shortcuts"],
  ["Esc", "Cancel, or close the Studio"],
];

const CHAT_KEYS: Array<[string, string]> = [
  ["⌘ K or Ctrl K", "Command palette"],
  ["⌘ B or Ctrl B", "Show or hide the sidebar"],
  ["⌘ N or Ctrl N", "New collection"],
  ["⌘ F or Ctrl F", "Search collections"],
  ["⌘ Enter or Ctrl Enter", "Send"],
  ["⌘ U or Ctrl U", "Attach a file"],
  ["Esc", "Close what is open"],
];

function Keys({ rows }: { rows: Array<[string, string]> }) {
  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {rows.map(([k, what]) => (
          <tr key={k + what} className="border-b border-white/8">
            <td className="w-44 py-2 pr-4"><kbd>{k}</kbd></td>
            <td className="py-2">{what}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DocsPage() {
  useTitle("Studio guide");
  return (
    <PageShell narrow>
      <PageHeader
        title="Studio guide"
        lede="How to go from a sentence to a file your caster can use."
      />

      <div className="prose-site mt-14">
        <h2>1. Describe the ring</h2>
        <p>
          <Link to="/chat">Open the Studio</Link> and write what you want in the
          message box. Name the metal, the stone cut and carat, the setting, the
          ring size and the band width if you know it. For example:
        </p>
        <p><em>Platinum solitaire, 1.5 ct oval, cathedral setting, size 6.5, 2.4 mm comfort fit band.</em></p>
        <p>
          A language model reads your sentence into a ring spec and a preview is
          built. If the model is not available, a simpler reader picks out what it
          can, and the design card tells you it did. Anything you leave out gets a
          sensible default that you can change in the next step.
        </p>
        <p>
          Your conversations are kept as collections in the sidebar. You can pin,
          search and delete them. They are saved in your browser on this
          device.
        </p>

        <h2>2. Adjust it in the Studio</h2>
        <p>
          Under a design, choose <strong>Open in the Studio</strong>. The
          Parameters panel holds everything the ring is built from: stone cut,
          setting, band profile, shank shape, shank stones, metal, finish, ring size
          (US), carat, band width and prongs. Change one and the ring is built again.
          <strong> Reset to the generated design</strong> takes you back to what
          the chat produced.
        </p>
        <p>
          The Measurements panel shows inner and outer diameter, band, stone
          diameter, stone height, stone weight, metal volume, the number of stones
          and the estimated metal weight.
        </p>

        <h2>3. Look at it properly</h2>
        <ul>
          <li><strong>Display</strong>: Shaded, Shaded + edges, Wireframe or X-ray.</li>
          <li><strong>Section cut</strong>: slice through the ring along X, Y or Z and slide the cut to see inside the head and the band.</li>
          <li><strong>Dimensions</strong>: measurements drawn on the model.</li>
          <li><strong>Turntable</strong>: the ring turns slowly on its own.</li>
          <li><strong>Pin for compare</strong>: keep a version, change the design, then switch between the two.</li>
          <li><strong>Save render</strong>: a PNG image of the current view.</li>
        </ul>

        <h2>4. Edit one stretch of the shank</h2>
        <p>
          Choose <strong>Select a section</strong> (or press <kbd>L</kbd>) and
          draw a loop around part of the band. That stretch becomes its own region,
          and you can change its width and thickness without touching the rest.
          The ends blend into the band so there is no step in the metal.
        </p>
        <p>
          The region is saved as an angle around the finger, so it stays on the
          same stretch of shank when you change the ring size.
        </p>

        <h2>5. Check it</h2>
        <p>
          The Manufacturability panel lists anything a caster would reject or
          that would fail in wear, with the numbers. It checks the band thickness,
          any edited region on its own, the prong diameter, the metal left behind
          stones set into the band and the space between them, and that the metal
          is one piece. These are the minimums it uses:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/15 text-white">
                <th className="py-2 pr-4 font-semibold">Alloy</th>
                <th className="py-2 pr-4 font-semibold">Band thickness</th>
                <th className="py-2 pr-4 font-semibold">Prong diameter</th>
                <th className="py-2 font-semibold">Wall behind a seat</th>
              </tr>
            </thead>
            <tbody>
              {METALS.map((m) => {
                const L = MANUFACTURING_LIMITS[m];
                return (
                  <tr key={m} className="border-b border-white/8">
                    <td className="py-2 pr-4">{METAL_LABELS[m]}</td>
                    <td className="measure py-2 pr-4">{L.minBandThickness.toFixed(2)} mm</td>
                    <td className="measure py-2 pr-4">{L.minProngDia.toFixed(2)} mm</td>
                    <td className="measure py-2">{L.minWall.toFixed(2)} mm</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          Nothing is changed for you. You decide whether to adjust the design.
        </p>

        <h2>6. Export</h2>
        <ul>
          <li>
            <strong>Download STEP</strong>: the exact solid in millimetres, metal
            and stones. Open it in Rhino, MatrixGold or any CAD package that reads
            STEP.
          </li>
          <li>
            <strong>Download STL</strong>: the metal only, for printing a wax or
            resin model to cast.
          </li>
        </ul>
        <p>
          Both are made from the merged, measured solid, so export waits until the
          Studio has finished merging the latest change.
        </p>

        <h2>Keyboard shortcuts</h2>
        <p>
          Press <kbd>?</kbd> in the app to see these. Letter keys do nothing while
          you are typing in a field.
        </p>
        <h3>In the Studio</h3>
        <Keys rows={STUDIO_KEYS} />
        <h3>In the chat</h3>
        <Keys rows={CHAT_KEYS} />

        <h2>Still stuck?</h2>
        <p>
          See <Link to="/support">Help</Link>, or write to{" "}
          <a href="mailto:hello@wireframe.studio">hello@wireframe.studio</a>.
        </p>
      </div>
    </PageShell>
  );
}

export default DocsPage;
