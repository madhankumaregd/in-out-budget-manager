import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    // ─── Manual Chunk Splitting ──────────────────────────────
    // Splits large vendor libs into separate cached chunks so
    // the main bundle stays small and loads faster.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/firebase")) return "firebase";
          if (id.includes("node_modules/recharts")) return "recharts";
          if (id.includes("node_modules/framer-motion")) return "framer-motion";
          if (id.includes("node_modules/lucide-react")) return "lucide-react";
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) return "router";
        },
      },
    },
    // Increase chunk warning threshold (our manual chunks are intentionally large)
    chunkSizeWarningLimit: 600,
  },
});
