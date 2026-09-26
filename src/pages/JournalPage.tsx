import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";
import { NotFoundPage } from "./NotFoundPage";
import { duelAt, innerDiameter, chordError, BASE } from "../components/duel-model";
import { MANUFACTURING_LIMITS, METALS, METAL_LABELS } from "../lib/ring-spec";

type Post = {
  slug: string;
  title: string;
  date: string; // the day the post went live
  summary: string;
  body: () => ReactNode;
};

const f2 = (n: number) => n.toFixed(2);

function ResizingPost() {
  const k69 = innerDiameter(9) / innerDiameter(6);
  const down = duelAt(4);
  const r = innerDiameter(BASE.size) / 2;

  return (
    <>
      <p>
        Most 3D generators hand you a triangle mesh. A mesh has no idea which
        part is a stone seat and which part is the shank, so the only way to
        change its size is to scale the whole thing. Every length gets multiplied
        by the same number.
      </p>

      <h2>What scaling does to a ring</h2>
      <p>
        Wireframe uses the US size relation: inner diameter in millimetres is
        11.63 + 0.8128 × size. Size 6 is {f2(innerDiameter(6))} mm across and
        size 9 is {f2(innerDiameter(9))} mm, so scaling a size 6 up to a size 9
        multiplies every length by {k69.toFixed(4)}.
      </p>
      <p>
        That includes the seat. A 1.50 ct round sits in a seat about{" "}
        {f2(BASE.seat)} mm across. After scaling, the seat is{" "}
        {f2(BASE.seat * k69)} mm, and the stone that would fill it weighs{" "}
        {f2(1.5 * k69 ** 3)} ct, because weight follows volume and volume grows
        with the cube. The prongs and the wall get thicker too, so the ring gets
        heavier in metal as well.
      </p>
      <p>
        Scaling down has the opposite problem. Take the same ring from size{" "}
        {BASE.size} down to size 4 and the prongs shrink from {f2(BASE.prong)} mm
        to {f2(down.mesh.prong)} mm. The platinum minimum Wireframe checks
        against is {f2(MANUFACTURING_LIMITS.platinum.minProngDia)} mm.
      </p>

      <h2>What a rebuild does instead</h2>
      <p>
        Wireframe keeps the ring as a spec: metal, cut, carat, setting, size,
        band. Change the size and the solid is built again from that spec. The
        inner diameter changes. The stone, the seat, the prongs and the wall stay
        what you asked for.
      </p>

      <h2>Flat sides on a round hole</h2>
      <p>
        A mesh also draws every circle as a polygon. A circle drawn with <em>n</em>{" "}
        flat sides strays from the true circle by R × (1 − cos(π / n)) at the
        middle of each side. For a size {BASE.size} hole ({f2(r)} mm radius) that
        is {chordError(r, 16).toFixed(3)} mm with 16 sides,{" "}
        {chordError(r, 32).toFixed(3)} mm with 32 and{" "}
        {chordError(r, 64).toFixed(3)} mm with 64.
      </p>
      <p>
        In the STEP file Wireframe exports, the hole is a true circle. The STL is
        made from that same solid when you export it, with its flat sides kept
        within 0.01 mm of the true surface.
      </p>
    </>
  );
}

function MinimumsPost() {
  return (
    <>
      <p>
        A design can look fine on screen and still be impossible to cast or wear.
        Before you export, Wireframe checks the ring against minimum sizes for
        the alloy you chose. These are the figures it uses.
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
                  <td className="measure py-2 pr-4">{f2(L.minBandThickness)} mm</td>
                  <td className="measure py-2 pr-4">{f2(L.minProngDia)} mm</td>
                  <td className="measure py-2">{f2(L.minWall)} mm</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Where the numbers come from</h2>
      <p>
        They follow common casting-house practice: most casters will not take
        walls much below 0.8 mm in gold or 0.7 mm in platinum, and prongs under
        about 0.8 mm bend in wear. Silver is softer, so it needs more metal.
      </p>

      <h2>What gets checked</h2>
      <ul>
        <li>The band is at least the minimum thickness for the alloy.</li>
        <li>
          Any stretch of shank you edited on its own is checked on its own. A band
          that is thick everywhere except one thin section still breaks at the
          thin section.
        </li>
        <li>Prongs are at least the minimum diameter, unless the stone is in a bezel.</li>
        <li>
          Where stones are set into the band, enough metal is left behind each
          seat, and there is room between seats to raise a bead.
        </li>
        <li>
          A full eternity band gets a warning that it cannot be resized, and needs
          0.30 mm more band than the alloy minimum.
        </li>
        <li>The metal comes out as one piece. A ring in two pieces cannot be cast.</li>
      </ul>
      <p>
        Nothing is changed for you. The Studio tells you what failed and by how
        much, and you decide what to do.
      </p>
    </>
  );
}

const POSTS: Post[] = [
  {
    slug: "resizing-a-mesh",
    title: "Why a scaled ring is a different ring",
    date: "26 September 2026",
    summary: "What happens to the stone seat, the prongs and the carat when a mesh is scaled to a new size.",
    body: ResizingPost,
  },
  {
    slug: "casting-minimums",
    title: "Casting minimums, alloy by alloy",
    date: "26 September 2026",
    summary: "The band, prong and wall minimums the Studio checks before export, and what else it looks at.",
    body: MinimumsPost,
  },
];

export function JournalPage() {
  useTitle("Journal");
  return (
    <PageShell>
      <PageHeader title="Journal" lede="Notes on ring geometry, casting and the engine." />
      <ul className="mt-14 max-w-3xl divide-y divide-white/10 border-y border-white/10">
        {POSTS.map((p) => (
          <li key={p.slug}>
            <Link to={`/journal/${p.slug}`} className="group block py-7">
              <div className="label">{p.date}</div>
              <h2 className="h-card mt-2 text-[1.35rem] group-hover:text-metal-200">{p.title}</h2>
              <p className="mt-2 text-white/75">{p.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

export function JournalArticlePage() {
  const { slug } = useParams();
  const post = POSTS.find((p) => p.slug === slug);
  useTitle(post ? post.title : "Page not found");
  if (!post) return <NotFoundPage />;
  const Body = post.body;

  return (
    <PageShell narrow>
      <Link to="/journal" className="label inline-flex min-h-11 items-center hover:text-white">
        Journal
      </Link>
      <article className="mt-4">
        <h1 className="h-display">{post.title}</h1>
        <p className="label mt-4">{post.date}</p>
        <div className="prose-site mt-10">
          <Body />
        </div>
      </article>
    </PageShell>
  );
}

export default JournalPage;
