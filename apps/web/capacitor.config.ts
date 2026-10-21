import type { CapacitorConfig } from "@capacitor/cli";

// El APK empaqueta el frontend; la API se consume siempre por HTTPS (VITE_API_URL en el build).
const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID ?? "com.osmoguard.app",
  appName: "Osmoguard",
  webDir: "dist",
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  server: { androidScheme: "https", cleartext: false },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: false, backgroundColor: "#0B4F83", showSpinner: false },
  },
};

export default config;
