// src/App.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { auth } from "./lib/firebase";
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
import ComingSoonPage from "./components/ComingSoonPage";
import { AboutPage } from "./pages/AboutPage";
import { MeshPage } from "./pages/MeshPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import { DocsPage } from "./pages/DocsPage";
import { PartnersPage } from "./pages/PartnersPage";
import { SupportPage } from "./pages/SupportPage";
import { BlogPage } from "./pages/BlogPage";
import { InteractiveFeatureGrid } from "./components/InteractiveFeatureGrid";



// 👇 Home (marketing) page composed from your existing sections
function HomePage() {
  return (
    <main>
      <Hero />
      <DockBar />
      <InteractiveFeatureGrid />
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
          {/* Real pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/mesh" element={<MeshPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/blog" element={<BlogPage />} />

          {/* Everything else → ComingSoonPage */}
          <Route path="*" element={<ComingSoonPage />} />
        </Routes>
      </div>

      {/* No footer / fancy cursor on chat route */}
      {!isChatRoute && <Footer />}
      {!isChatRoute && <SmoothCursor />}
    </div>
  );
}

console.log("FB env", {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
});

console.log("UID:", auth.currentUser?.uid);