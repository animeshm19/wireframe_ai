// src/App.tsx
import React from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { FeatureGrid } from "./components/FeatureGrid";
import { CapabilitiesTable } from "./components/CapabilitiesTable";
import { MeshShowcase } from "./components/MeshShowcase";
import { DemoCTA } from "./components/DemoCTA";
import { Footer } from "./components/Footer";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { DockBar } from "./components/Dockbar"; // ⟵ add this

export default function App() {
  return (
    <div className="min-h-dvh cursor-none">
      <Navbar />
      <main>
        <Hero />
        {/* Mac Dock lives immediately after the Hero */}
        <DockBar />

        <FeatureGrid />
        <CapabilitiesTable />
        <MeshShowcase />
        <DemoCTA />
      </main>
      <Footer />
      <SmoothCursor />
    </div>
  );
}
