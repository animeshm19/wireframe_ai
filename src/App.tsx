// src/App.tsx
import React from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { FeatureGrid } from "./components/FeatureGrid";
import { CapabilitiesTable } from "./components/CapabilitiesTable";
// import { MeshShowcase } from "./components/MeshShowcase";
// import { DemoCTA } from "./components/DemoCTA";
import { Footer } from "./components/Footer";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { DockBar } from "./components/DockBar";
import { ChatShell } from "./components/wireframe/chat-shell";
import { ContactSection } from "./components/ContactSection";
import { Pricing } from "./components/Pricing";

export default function App() {
  const isChatRoute =
    typeof window !== "undefined" && window.location.pathname === "/chat";

  // 🔹 TOOL VIEW: /chat → only the chat UI, normal cursor, no navbar, no SmoothCursor
  if (isChatRoute) {
    return <ChatShell />;
  }

  // 🔹 MARKETING VIEW: / → landing page, fancy cursor, navbar etc.
  return (
    <div className="min-h-dvh cursor-none">
      <Navbar />
      <main>
        <Hero />
        <DockBar />
        <FeatureGrid />
        <CapabilitiesTable />
        {/* <MeshShowcase /> */}
        {/* <DemoCTA /> */}
        <Pricing/>
        {/* New Book a Demo / Contact section */}
        <ContactSection />
      </main>
      <Footer />
      <SmoothCursor />
    </div>
  );
}
