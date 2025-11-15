// src/App.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { FeatureGrid } from "./components/FeatureGrid";
import { CapabilitiesTable } from "./components/CapabilitiesTable";
import { Footer } from "./components/Footer";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { DockBar } from "./components/DockBar";
import { ContactSection } from "./components/ContactSection";
import { Pricing } from "./components/Pricing";
import { PrivacyPage } from "./pages/PrivacyPage";
import { CareersPage } from "./pages/CareersPage";
import { ChatPage } from "./pages/ChatPage";

// 👇 Home (marketing) page composed from your existing sections
function HomePage() {
  return (
    <main>
      <Hero />
      <DockBar />
      <FeatureGrid />
      <CapabilitiesTable />
      {/* <MeshShowcase /> */}
      {/* <DemoCTA /> */}
      <Pricing />
      <ContactSection />
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const isChatRoute = location.pathname === "/chat";

  return (
    <div
      className={
        "flex min-h-screen flex-col" + (isChatRoute ? "" : " cursor-none")
      }
    >
      {/* No navbar on /chat so the tool feels like a focused app */}
      {!isChatRoute && <Navbar />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/chat" element={<ChatPage />} />
          {/* fallback: unknown route → home */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>

      {/* No footer / fancy cursor on chat route */}
      {!isChatRoute && <Footer />}
      {!isChatRoute && <SmoothCursor />}
    </div>
  );
}
