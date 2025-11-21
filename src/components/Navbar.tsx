// src/components/Navbar.tsx
import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const logoUrl = "/icons/Wireframe.png";

const links = [
  { href: "#features", label: "Features", type: "anchor" as const },
  { href: "/mesh", label: "Mesh", type: "route" as const },
  { href: "#blog", label: "Blog", type: "anchor" as const },
];

export function Navbar() {
  const handleBookDemoClick = () => {
    // Smooth scroll to contact section if present
    if (typeof document !== "undefined") {
      const target = document.getElementById("contact");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    // Fallback: update location hash
    if (typeof window !== "undefined") {
      window.location.hash = "#contact";
    }
  };

  return (
    <motion.nav
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto max-w-xl px-3 sm:px-4 lg:px-6">
        {/* reduced top margin + tighter container */}
        <div className="mt-4 flex h-6 items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-2.5 backdrop-blur-md md:h-14 md:rounded-3xl md:px-3">
          {/* brand */}
          <a href="/" className="flex items-center gap-3">
            <img src={logoUrl} alt="wireframe" className="h-5 w-auto md:h-6" />
          </a>

          {/* center links (md+) */}
          <div className="hidden md:flex items-center gap-12 text-[12px] text-white/80 md:text-sm">
            {links.map((l) =>
              l.type === "route" ? (
                <Link
                  key={l.label}
                  to={l.href}
                  className="transition-colors hover:text-[var(--gold-400)]"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  className="transition-colors hover:text-[var(--gold-400)]"
                >
                  {l.label}
                </a>
              )
            )}
          </div>

          {/* right CTA */}
          <div className="flex items-center gap-2">
            <Button
              className="h-8 rounded-2xl px-3 text-xs md:h-9 md:rounded-3xl md:px-4 md:text-sm"
              onClick={handleBookDemoClick}
            >
              <span className="shiny-text hover:text-black">Book a Demo</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
