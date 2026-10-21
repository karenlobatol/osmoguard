import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Postgres real y efímero para las pruebas de integración (sin mocks de base de datos).
export default async function setup() {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    execSync("npx prisma migrate deploy", { stdio: "ignore", env: process.env });
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "osmoguard-pg-"));
  const port = 55000 + Math.floor(Math.random() * 1000);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "test", password: "test", port, persistent: false, onLog: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("osmoguard_test");
  const url = `postgresql://test:test@127.0.0.1:${port}/osmoguard_test`;
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { stdio: "ignore", env: { ...process.env, DATABASE_URL: url } });
  return async () => {
    await pg.stop();
    rmSync(dir, { recursive: true, force: true });
  };
}
