import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      'motion/react': 'framer-motion',
    }
  },
  // The geometry worker loads the OCCT kernel with a dynamic import, so its
  // bundle is code-split — and Vite's default worker format, IIFE, cannot
  // code-split. Dev never notices (modules are served unbundled), so without
  // this the first sign of trouble is a failed production build. The workers are
  // already created with { type: "module" }, so ES output is what they expect.
  worker: {
    format: "es",
  },
  build: {
    outDir: "dist", // Explicitly matching Vercel's expectation
  }
});