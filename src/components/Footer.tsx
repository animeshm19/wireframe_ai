import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-10 text-sm text-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <p>© {new Date().getFullYear()} wireframe. All rights reserved.</p>
        <nav className="flex items-center gap-6">
          <a href="#" className="hover:text-[var(--gold-500)]">Privacy</a>
          <a href="#" className="hover:text-[var(--gold-500)]">Terms</a>
          <a href="#" className="hover:text-[var(--gold-500)]">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
