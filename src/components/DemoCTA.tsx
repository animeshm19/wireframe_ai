import React from "react";
import { Button } from "./ui/button";

export function DemoCTA() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-semibold">
            Try the live demo
          </h3>
          <p className="max-w-2xl text-white/80">
            Type a description—get an editable 3D jewelry model with parameters you can tweak.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Open Demo</Button>
            <Button size="lg" variant="ghost">View Docs</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
