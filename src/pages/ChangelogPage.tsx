import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";

/* Written from `git log`. One entry per shipped change a user can see; internal
 * work (infrastructure, rules, tests) is left out. */
type Month = { month: string; entries: string[] };

const LOG: Month[] = [
  {
    month: "September 2026",
    entries: [
      "The Journal replaces the old blog, and a Technology page explains why Wireframe builds solids.",
      "The home page ring is now a live 3D model: pick a metal, a cut and a size and watch it change.",
      "When the language model is unavailable, the Studio falls back to a simpler parser and tells you it did.",
      "The Studio works on phones.",
      "The chat and the Studio were rebuilt with a command palette (⌘K or Ctrl K) and keyboard shortcuts for every view and export.",
      "Lasso editing: draw around a stretch of the shank and widen, thicken or reshape just that part. The edit stays in place when the ring is resized.",
      "Carat weights are now right for every cut. Before this, a “1.00 ct” marquise weighed 0.75 ct and a “1.00 ct” emerald 1.24 ct.",
      "Rings are now built as exact solids on OpenCASCADE, replacing the earlier engine. STEP export arrived with it.",
      "New options: pavé shoulders, half and full eternity bands, three-stone settings, split, tapered and twisted shanks.",
      "Studio tools: section cut, dimensions, turntable, compare against a pinned version, and five metal finishes.",
      "Faceted stones for all seven cuts, with lighting set up the way a jewellery photographer would.",
      "Before export, every ring is checked against casting minimums for its alloy.",
      "Your description is now read by a language model into a full ring spec: metal, cut, carat, setting, size and band.",
    ],
  },
  {
    month: "December 2025",
    entries: [
      "Ring previews are generated in your browser instead of on a server.",
      "A 3D preview in the chat, attachments on messages, and bulk delete for chats.",
      "A settings page.",
    ],
  },
  {
    month: "November 2025",
    entries: [
      "First version of the site and the chat: sign in, describe a ring, and keep your chats in collections you can pin, rename and delete.",
    ],
  },
];

export function ChangelogPage() {
  useTitle("Changelog");
  return (
    <PageShell>
      <PageHeader title="Changelog" lede="What has changed in Wireframe, newest first." />
      <div className="mt-14 max-w-3xl space-y-14">
        {LOG.map((m) => (
          <section key={m.month} className="grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-[11rem_1fr] sm:gap-8">
            <h2 className="text-base font-semibold text-white">{m.month}</h2>
            <ul className="space-y-3 text-white/82">
              {m.entries.map((e) => (
                <li key={e} className="leading-relaxed">{e}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

export default ChangelogPage;
