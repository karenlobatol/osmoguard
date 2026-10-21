import { buildApp } from "./app";
import { loadEnv } from "./env";

const env = loadEnv();
const app = await buildApp({ env });

const shutdown = async (signal: string) => {
  app.log.info(`${signal} recibido, cerrando`);
  await app.close();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ port: env.PORT, host: env.HOST });
