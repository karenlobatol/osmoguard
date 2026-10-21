import { defineConfig } from "tsup";

// Empaqueta el servidor junto con los paquetes del monorepo (@osmoguard/*);
// las dependencias de npm quedan externas y se instalan en la imagen.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@osmoguard\//],
});
