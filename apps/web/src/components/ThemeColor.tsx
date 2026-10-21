import { useEffect } from "react";

/** Color de la barra del navegador / estado del sistema según la pantalla. */
export function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [color]);
  return null;
}
