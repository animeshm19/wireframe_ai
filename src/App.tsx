// src/App.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion"; 
import { useAuth } from "./auth/auth-context"; 
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { HeroRevolution } from "./components/HeroRevolution";
import { InteractiveFeatureGrid } from "./components/InteractiveFeatureGrid";
import { Footer } from "./components/Footer";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { ContactSection } from "./components/ContactSection";
import { Pricing } from "./components/Pricing";
import { PrivacyPage } from "./pages/PrivacyPage";
import { CareersPage } from "./pages/CareersPage";
import { ChatPage } from "./pages/ChatPage"; 
import GenericComingSoonPage from "./components/GenericComingSoonPage"; 
import { ChatComingSoonPage } from "./pages/ChatComingSoonPage"; 
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
      {/* ============================================================ */}
      {/* HERO SECTION SWITCHER: Easily reversible with one line       */}
      {/* To revert to original Hero: comment out <HeroRevolution />   */}
      {/* and uncomment <Hero /> below.                                */}
      {/* ============================================================ */}
      <HeroRevolution />
      {/* <Hero /> */}

      {/* The macOS dock is parked, not deleted.
       *
       * It is a beautifully made component — the genie portal especially — but
       * it is a macOS dock on a jewellery CAD site, and it sat between the
       * hero and the features doing nothing for either: it broke the scroll
       * just as the ring finished resolving, and it argued with the one idea
       * the page is making. DockBar.tsx is untouched; put this line back to
       * bring it home. */}
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

  // ============================================================
  // CONTROL SWITCH: HIDE OR SHOW CHAT
  // ============================================================

  // --- OPTION A: HIDE CHAT (Early Access / Queue Mode) ---
  // UNCOMMENT the block below to HIDE the chat and show the "Coming Soon" queue.
  // ------------------------------------------------------------
  /* if (user) {
    return <ChatComingSoonPage />;
  }
  */
 
  // --- OPTION B: SHOW CHAT (Live Mode) ---
  // COMMENT OUT the block below if you want to HIDE the chat.
  // Currently active: User gets the actual Chat App.
  // ------------------------------------------------------------
  if (user) {
    return <ChatPage />;
  }
  
  // ============================================================

  // If the user is not signed up (unauthenticated), show the page that prompts sign-up.
  return <GenericComingSoonPage />;
}

export default function App() {
  const location = useLocation();
  const isAppRoute = location.pathname === "/chat" || location.pathname === "/settings";

  return (
    <div className={"flex min-h-screen flex-col" + (isAppRoute ? "" : " cursor-none")}>
      {/* Keyboard users land here first and can jump the nav. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-full focus:bg-ink-950 focus:px-5 focus:py-2.5 focus:text-sm focus:text-white focus:outline-2 focus:outline-(--metal-400)"
      >
        Skip to content
      </a>

      {!isAppRoute && <Navbar />}

      <div id="main" className="flex-1 flex flex-col">
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

      {/* Grain and vignette sit above everything and take no input. They are
          what stop the flat dark gradients reading as flat dark gradients. */}
      {!isAppRoute && <div className="vignette-layer" aria-hidden="true" />}
      {!isAppRoute && <div className="grain-layer" aria-hidden="true" />}
      
      {/* Enhanced Cursor */}
      {!isAppRoute && <SmoothCursor />}
    </div>
  );
}
