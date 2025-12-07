// src/components/Navbar.tsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const logoUrl = "/icons/Wireframe.png";

const links = [
  { href: "#features", label: "Features", type: "anchor" as const },
  { href: "/mesh", label: "Mesh", type: "route" as const },
  { href: "/blog", label: "Blog" },
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
        <div className="mt-4 flex h-14 items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-3 backdrop-blur-md">
          {/* brand */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logoUrl} alt="wireframe" className="h-6 w-auto" />
          </Link>

          {/* center links (md+) */}
          <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
            {links.map((l) =>
              l.type === "route" ? (
                <Link
                  key={l.label}
                  to={l.href}
                  className="transition-colors hover:text-(--gold-400)"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  className="transition-colors hover:text-(--gold-400)"
                >
                  {l.label}
                </a>
              )
            )}
          </div>

          {/* right CTA - Magic Border Button (Themed) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBookDemoClick}
              className="relative inline-flex h-9 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-(--gold-500)/50 focus:ring-offset-2 focus:ring-offset-[#13010c]"
            >
              {/* Rotating Gradient Border - Uses --gold-500 and --gold-400 tones */}
              <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#13010c_0%,#836e76_25%,#c69bb2_50%,#836e76_75%,#13010c_100%)]" />
              
              {/* Inner Content */}
              <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-[#13010c] px-5 py-1 text-sm font-medium text-white backdrop-blur-3xl transition-all duration-300 hover:bg-[#1a0510] hover:text-(--gold-400)">
                Book a Demo
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}