// Postgres embebido para desarrollo y pruebas locales sin Docker.
// Uso: node scripts/dev-db.mjs [puerto] [directorio]
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const port = Number(process.argv[2] ?? 54329);
const dir = process.argv[3] ?? new URL("../.pgdata", import.meta.url).pathname;
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "osmoguard", password: "osmoguard", port, persistent: true, onLog: () => {} });
if (!existsSync(dir)) await pg.initialise();
await pg.start();
try { await pg.createDatabase("osmoguard"); } catch {}
console.log(`postgres listo en postgresql://osmoguard:osmoguard@127.0.0.1:${port}/osmoguard`);
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
