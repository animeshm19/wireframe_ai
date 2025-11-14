import React from "react";

const rows: Array<{ feature: string; desc: string }> = [
  {
    feature: "Natural Language Input",
    desc: "Describe your jewelry in plain English; wireframe interprets form and constraints.",
  },
  {
    feature: "Image References",
    desc: "Attach sketches/photos to guide structure and style.",
  },
  {
    feature: "Real-time Preview",
    desc: "Instant viewport updates while you tweak parameters.",
  },
  {
    feature: "Parameter Extraction",
    desc: "Automatically surfaces editable dimensions (e.g., band width, stone size).",
  },
  {
    feature: "Smart Updates",
    desc: "Adjusts only affected geometry—no full re-generation needed.",
  },
  {
    feature: "Clean Exports",
    desc: "Export STL/STEP with manufacturable topology.",
  },
];

export function CapabilitiesTable() {
  return (
    <section className="relative py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-semibold gold-text">Key Capabilities</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-4 py-3 sm:px-6">Feature</th>
                <th className="px-4 py-3 sm:px-6">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((r) => (
                <tr key={r.feature} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 sm:px-6 font-medium text-[var(--gold-500)]">
                    {r.feature}
                  </td>
                  <td className="px-4 py-3 sm:px-6 text-white/80">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
