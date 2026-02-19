// Vite config with a dev proxy to the backend.
// Proxies /api to the Flask server.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // Forward API calls to Flask in dev.
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        // Keep paths the same.
      },
    },
  },
});
