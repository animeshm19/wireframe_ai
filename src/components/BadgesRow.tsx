import React from "react";

export function BadgesRow() {
  const items = [
    "AI-Powered",
    "Parametric Controls",
    "STL / STEP Exports",
    "Browser-Based",
    "BOSL / BOSL2 / MCAD",
  ];
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 bg-white/5"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
