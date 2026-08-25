import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The frontend never computes inference itself — it only issues requests under
// /api. In dev those are proxied to the FastAPI backend on :8000; when
// VITE_USE_MOCK=true they are served by src/mocks instead.
export default defineConfig(({ mode }) => {
  // "." is the project root here, which avoids needing @types/node for process.cwd().
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          // Override with VITE_API_TARGET when the backend is not on :8000.
          target: env.VITE_API_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
