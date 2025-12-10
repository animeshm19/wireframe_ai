// src/App.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion"; 
import { auth } from "./lib/firebase";
import { useAuth } from "./auth/auth-context"; // <-- NEW IMPORT for ChatGate
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { InteractiveFeatureGrid } from "./components/InteractiveFeatureGrid";
import { CapabilitiesTable } from "./components/CapabilitiesTable"; 
import { Footer } from "./components/Footer";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { DockBar } from "./components/DockBar";
import { ContactSection } from "./components/ContactSection";
import { Pricing } from "./components/Pricing";
import { PrivacyPage } from "./pages/PrivacyPage";
import { CareersPage } from "./pages/CareersPage";
import { ChatPage } from "./pages/ChatPage"; // The actual chat page (currently hidden)
import GenericComingSoonPage from "./components/GenericComingSoonPage"; // <-- RENAMED (Unauthenticated/404 view)
import { ChatComingSoonPage } from "./pages/ChatComingSoonPage"; // <-- NEW IMPORT (Authenticated view)
import { AboutPage } from "./pages/AboutPage";
import { MeshPage } from "./pages/MeshPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import { DocsPage } from "./pages/DocsPage";
import { PartnersPage } from "./pages/PartnersPage";
import { SupportPage } from "./pages/SupportPage";
import { BlogPage } from "./pages/BlogPage";
import { SettingsPage } from "./pages/SettingsPage"; 
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

// NEW COMPONENT: Gate that checks auth status
function ChatGate() {
  const { user, loading } = useAuth();
  
  if (loading) {
    // Show a loading state while auth is resolving
    return <div className="h-full flex-1 w-full"></div>; 
  }

  // LOGIC: If the user is signed up (user exists), show the "in queue" page.
  if (user) {
    return <ChatComingSoonPage />;
  }

  // If the user is not signed up (unauthenticated), show the page that prompts sign-up.
  // Note: This replaces the original <ChatPage /> for both authenticated and unauthenticated users.
  return <GenericComingSoonPage />;
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
            
            {/* The gated chat route uses ChatGate */}
            <Route path="/chat" element={<PageWrapper><ChatGate /></PageWrapper>} />
            
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

            {/* Default 404 page */}
            <Route path="*" element={<PageWrapper><GenericComingSoonPage /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </div>

      {!isAppRoute && <Footer />}
      
      {/* Enhanced Cursor */}
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