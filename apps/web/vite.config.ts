import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:3000" } },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(recharts|d3-[a-z-]+|victory-vendor|es-toolkit|redux|@reduxjs|immer|reselect|react-redux|decimal\.js-light|internmap|eventemitter3|tiny-invariant)\//.test(id)) return "charts";
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-is|use-sync-external-store)\//.test(id)) return "react";
          if (/node_modules\/(clsx|tailwind-merge|class-variance-authority)\//.test(id)) return "ui";
          if (/motion|framer-motion/.test(id)) return "motion";
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    tailwind(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Osmoguard — Simulador educativo de sodio",
        short_name: "Osmoguard",
        description: "Simulador clínico educativo de líquidos y electrolitos. No es un dispositivo de prescripción.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F8FAFC",
        theme_color: "#0B4F83",
        categories: ["education", "medical"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Solo recursos estáticos versionados. La API NUNCA se cachea: contiene tokens y datos clínicos.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
});
