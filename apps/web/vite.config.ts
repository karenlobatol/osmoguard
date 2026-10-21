import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    // changeOrigin: false conserva el Host original: la API lo usa para validar el mismo origen (CSRF).
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: false, xfwd: true } },
    // DEV_TUNNEL=1: servidor de desarrollo expuesto por un túnel HTTPS (Fast Refresh en un móvil real).
    ...(process.env.DEV_TUNNEL ? { allowedHosts: [".trycloudflare.com"], hmr: { clientPort: 443, protocol: "wss" } } : {}),
  },
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
        name: "Osmoguard — Electrolitos y ácido-base",
        short_name: "Osmoguard",
        description: "Simulación de sodio e interpretación educativa de gasometría, osmolalidad, potasio y calcio.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F2F5F9",
        theme_color: "#F2F5F9",
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
      // Con DEV_TUNNEL se puede instalar la versión de desarrollo para probar el modo standalone.
      devOptions: { enabled: !!process.env.DEV_TUNNEL, type: "module", navigateFallback: "index.html" },
    }),
  ],
});
