import React from "react";
import { Button } from "./ui/button";

const logoUrl = "src/assets/logo.png";

export function Footer() {
  const year = new Date().getFullYear();

  const handleScrollToContact = () => {
    const el = document.querySelector("#contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer className="bg-gradient-to-b from-[#050003] via-[#13010c] to-[#050003] text-sm text-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        {/* Top section */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* Brand + short value prop */}
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <img
                  src={logoUrl}
                  alt="wireframe"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90 tracking-tight">
                  wireframe
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Jewelry design · CAD workflows
                </p>
              </div>
            </div>

            <p className="text-sm text-white/70">
              Design, iterate, and ship jewelry collections faster with a mesh-first,
              parametric workflow that feels as polished as the pieces you create.
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-(--gold-500)/30 bg-(--gold-500)/5 px-3 py-1 text-xs text-(--gold-500)">
              <span className="h-1.5 w-1.5 rounded-full bg-(--gold-500)" />
              <span>Currently onboarding select studios</span>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid flex-1 gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                Product
              </h3>
              <nav className="flex flex-col gap-2 text-sm">
                <a href="#features" className="hover:text-(--gold-500)">
                  Features
                </a>
                <a href="#mesh" className="hover:text-(--gold-500)">
                  Mesh engine
                </a>
                <a href="#pricing" className="hover:text-(--gold-500)">
                  Pricing
                </a>
                <a href="#blog" className="hover:text-(--gold-500)">
                  Changelog
                </a>
              </nav>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                Company
              </h3>
              <nav className="flex flex-col gap-2 text-sm">
                <a href="#about" className="hover:text-(--gold-500)">
                  About
                </a>
                <a href="#partners" className="hover:text-(--gold-500)">
                  Studio partners
                </a>
                <a href="#careers" className="hover:text-(--gold-500)">
                  Careers
                </a>
              </nav>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                Resources
              </h3>
              <nav className="flex flex-col gap-2 text-sm">
                <a href="#docs" className="hover:text-(--gold-500)">
                  Docs
                </a>
                <a href="#support" className="hover:text-(--gold-500)">
                  Support
                </a>
                <a href="#privacy" className="hover:text-(--gold-500)">
                  Privacy policy
                </a>
                <a href="#terms" className="hover:text-(--gold-500)">
                  Terms
                </a>
              </nav>
            </div>
          </div>

          {/* CTA + contact */}
          <div className="w-full max-w-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Book a demo
            </h3>
            <p className="text-sm text-white/70">
              Share your workflow and we will walk you through how wireframe can
              plug into your existing tools.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleScrollToContact}
                className="rounded-full border border-(--gold-500) bg-(--gold-500)/15 px-5 text-xs font-medium uppercase tracking-[0.18em] text-(--gold-500) hover:bg-(--gold-500)/25"
                size="sm"
              >
                Book a demo
              </Button>
              <a
                href="mailto:hello@wireframe.studio"
                className="text-xs text-white/70 hover:text-(--gold-500)"
              >
                hello@wireframe.studio
              </a>
            </div>
            <p className="text-xs text-white/40">
              Based in Canada · working with teams worldwide.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/5 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">
            © {year} wireframe. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-(--gold-500)"
            >
              X / Twitter
            </a>
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-(--gold-500)"
            >
              LinkedIn
            </a>
            <a
              href="#contact"
              className="hover:text-(--gold-500)"
              onClick={(e) => {
                e.preventDefault();
                handleScrollToContact();
              }}
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
