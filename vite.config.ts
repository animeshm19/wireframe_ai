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
  build: {
    outDir: "dist", // Explicitly matching Vercel's expectation
  }
});