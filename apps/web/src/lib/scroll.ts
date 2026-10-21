/** Contenedor de desplazamiento de la app (las páginas internas no desplazan el documento). */
export const SCROLL_ROOT_ID = "app-scroll";

export function scrollAppToTop(smooth = true) {
  const el = document.getElementById(SCROLL_ROOT_ID);
  (el ?? window).scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}
