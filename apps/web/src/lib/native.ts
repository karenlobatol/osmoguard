import { Capacitor } from "@capacitor/core";

/** Integración con Android (Capacitor). En la web no hace nada. */
export function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  void (async () => {
    const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import("@capacitor/app"),
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
    ]);
    await StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    await StatusBar.setBackgroundColor({ color: "#FFFFFF" }).catch(() => undefined);
    await SplashScreen.hide();
    // Botón atrás: navega en el historial; en la raíz, sale de la app.
    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.location.pathname !== "/") window.history.back();
      else void App.exitApp();
    });
  })();
}
