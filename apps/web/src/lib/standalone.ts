import { Capacitor } from "@capacitor/core";

/** true cuando la app corre instalada (PWA standalone o APK), no en una pestaña del navegador. */
export function isStandalone(): boolean {
  return (
    Capacitor.isNativePlatform() ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Instalada como app, se comporta como nativa: sin zoom por pellizco ni doble toque.
 * En el navegador se mantiene el zoom (accesibilidad, WCAG 1.4.4).
 */
export function lockZoomWhenStandalone() {
  if (!isStandalone()) return;
  document.querySelector('meta[name="viewport"]')?.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  );
  document.documentElement.classList.add("standalone");
  // iOS ignora user-scalable=no: se bloquean los gestos de pellizco directamente.
  const block = (e: Event) => e.preventDefault();
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, block, { passive: false });
  document.addEventListener("touchmove", (e) => (e as TouchEvent).touches.length > 1 && e.preventDefault(), { passive: false });
}
