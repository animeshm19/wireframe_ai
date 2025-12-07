// src/App.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion"; // Import Animation Components
import { auth } from "./lib/firebase";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { InteractiveFeatureGrid } from "./components/InteractiveFeatureGrid"; // Or your new InteractiveFeatureGrid
import { CapabilitiesTable } from "./components/CapabilitiesTable"; // Or InteractiveCapabilities
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
import { SettingsPage } from "./pages/SettingsPage"; // If you added this
import { InteractiveCapabilities } from "./components/InteractiveCapabilities";

// Wrapper for page transitions
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex-1 w-full"
    >
      {children}
    </motion.div>
  );
}

function HomePage() {
  return (
    <PageWrapper>
      <Hero />
      <DockBar />
      <InteractiveFeatureGrid />
      <InteractiveCapabilities />
      <Pricing />
      <ContactSection />
    </PageWrapper>
  );
}

export default function App() {
  const location = useLocation();
  const isAppRoute = location.pathname === "/chat" || location.pathname === "/settings";

  return (
    <div className={"flex min-h-screen flex-col" + (isAppRoute ? "" : " cursor-none")}>
      {!isAppRoute && <Navbar />}

      <div className="flex-1 flex flex-col">
        {/* AnimatePresence enables exit animations */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            
            {/* Wrap individual pages or handle them in a generic wrapper */}
            <Route path="/chat" element={<PageWrapper><ChatPage /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
            <Route path="/mesh" element={<PageWrapper><MeshPage /></PageWrapper>} />
            
            <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
            <Route path="/blog" element={<PageWrapper><BlogPage /></PageWrapper>} />
            <Route path="/careers" element={<PageWrapper><CareersPage /></PageWrapper>} />
            <Route path="/privacy" element={<PageWrapper><PrivacyPage /></PageWrapper>} />
            <Route path="/changelog" element={<PageWrapper><ChangelogPage /></PageWrapper>} />
            <Route path="/docs" element={<PageWrapper><DocsPage /></PageWrapper>} />
            <Route path="/partners" element={<PageWrapper><PartnersPage /></PageWrapper>} />
            <Route path="/support" element={<PageWrapper><SupportPage /></PageWrapper>} />

            <Route path="*" element={<PageWrapper><ComingSoonPage /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </div>

      {!isAppRoute && <Footer />}
      
      {/* Enhanced Cursor - only show on non-app routes to avoid conflicting with complex UI like 3D studios */}
      {!isAppRoute && <SmoothCursor />}
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