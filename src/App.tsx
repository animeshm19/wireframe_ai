import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useAuth } from "./auth/auth-context";
import { CHAT_LIVE } from "./config/flags";
import { Navbar } from "./components/Navbar";
import { HeroRevolution } from "./components/HeroRevolution";
import { InteractiveFeatureGrid } from "./components/InteractiveFeatureGrid";
import { InteractiveCapabilities } from "./components/InteractiveCapabilities";
import { Pricing } from "./components/Pricing";
import { ContactSection } from "./components/ContactSection";
import { Footer } from "./components/Footer";
import { useTitle } from "./components/useTitle";
import { ChatPage } from "./pages/ChatPage";
import { ChatComingSoonPage } from "./pages/ChatComingSoonPage";
import { SignInGate } from "./pages/SignInGate";
import { SettingsPage } from "./pages/SettingsPage";
import { TechnologyPage } from "./pages/TechnologyPage";
import { AboutPage } from "./pages/AboutPage";
import { JournalPage, JournalArticlePage } from "./pages/JournalPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import { DocsPage } from "./pages/DocsPage";
import { SupportPage } from "./pages/SupportPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex w-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}

function HomePage() {
  useTitle();
  return (
    <PageWrapper>
      <HeroRevolution />
      {/* DockBar parked; see git history. */}
      <InteractiveFeatureGrid />
      <InteractiveCapabilities />
      <Pricing />
      <ContactSection />
    </PageWrapper>
  );
}

function ChatGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="w-full flex-1" />;
  if (!user) return <SignInGate />;
  return CHAT_LIVE ? <ChatPage /> : <ChatComingSoonPage />;
}

const page = (el: React.ReactNode) => <PageWrapper>{el}</PageWrapper>;

/** New page: start at the top, or at the #section the link names once it has rendered. */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    let tries = 0;
    const id = window.setInterval(() => {
      const el = document.getElementById(hash.slice(1));
      if (el || ++tries > 20) {
        window.clearInterval(id);
        el?.scrollIntoView({ block: "start" });
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [pathname, hash]);
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();
  useScrollOnNavigate();
  // The Studio and settings draw their own full-screen frame.
  const isAppRoute = location.pathname === "/settings" || (location.pathname === "/chat" && !!user);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="fixed left-4 top-4 z-[10000] inline-flex min-h-11 -translate-y-24 items-center rounded-full bg-ink-950 px-5 text-sm text-white outline-2 outline-(--metal-400) focus:translate-y-0"
        >
          Skip to content
        </a>

        {!isAppRoute && <Navbar />}

        <div id="main" className="flex flex-1 flex-col">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/chat" element={page(<ChatGate />)} />
              <Route path="/settings" element={page(<SettingsPage />)} />
              <Route path="/technology" element={page(<TechnologyPage />)} />
              <Route path="/journal" element={page(<JournalPage />)} />
              <Route path="/journal/:slug" element={page(<JournalArticlePage />)} />
              <Route path="/docs" element={page(<DocsPage />)} />
              <Route path="/support" element={page(<SupportPage />)} />
              <Route path="/changelog" element={page(<ChangelogPage />)} />
              <Route path="/about" element={page(<AboutPage />)} />
              <Route path="/privacy" element={page(<PrivacyPage />)} />

              {/* Old addresses. */}
              <Route path="/blog" element={<Navigate to="/journal" replace />} />
              <Route path="/mesh" element={<Navigate to="/technology" replace />} />
              <Route path="/careers" element={<Navigate to="/" replace />} />
              <Route path="/partners" element={<Navigate to="/" replace />} />

              <Route path="*" element={page(<NotFoundPage />)} />
            </Routes>
          </AnimatePresence>
        </div>

        {!isAppRoute && <Footer />}
        {!isAppRoute && <div className="grain-layer" aria-hidden="true" />}
      </div>
    </MotionConfig>
  );
}
