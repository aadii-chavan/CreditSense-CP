import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend never talks to the fuzzy engine directly — it only ever issues
// POST /api/score. In dev that is proxied to the FastAPI backend on :8000;
// when VITE_USE_MOCK=true the request is served by src/mocks instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
