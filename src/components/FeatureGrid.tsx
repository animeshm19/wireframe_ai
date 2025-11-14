import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const FEATURES = [
  {
    title: "AI-Powered Generation",
    desc: "Transform text and image references into editable CAD.",
  },
  {
    title: "Parametric Controls",
    desc: "Interactive sliders expose key dimensions instantly.",
  },
  {
    title: "Multiple Export Formats",
    desc: "Export STL / STEP ready for manufacturing.",
  },
  {
    title: "Browser-Based + Libraries",
    desc: "Runs in the browser; includes BOSL/BOSL2/MCAD-style utilities.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="relative py-16 sm:py-20">
      <div className="absolute inset-0 -z-10">
        <div
          className="pointer-events-none absolute inset-0"
        />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl font-semibold gold-text"
        >
          Features
        </motion.h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ y: 24, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{f.title}</CardTitle>
                </CardHeader>
                <CardContent>{f.desc}</CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
