import { defineConfig, devices } from "@playwright/test";

// Requiere la API (puerto 3000) y Vite (5173) en marcha, o E2E_BASE_URL apuntando a un despliegue.
export default defineConfig({
  testDir: "./e2e",
  timeout: process.env.E2E_BASE_URL ? 150_000 : 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { reducedMotion: "reduce", baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173", trace: "retain-on-failure", locale: "es-EC" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
