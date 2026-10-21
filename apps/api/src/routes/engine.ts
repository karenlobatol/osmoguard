import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ASSUMPTIONS, DEFAULT_ALERT_CONFIG, DISCLAIMER, ENGINE_NAME, ENGINE_VERSION, FORMULAS, LOSS_TYPES, REFERENCES, SOLUTIONS } from "@osmoguard/engine";

/** Metadatos públicos del motor: catálogo, fórmulas, supuestos y referencias. */
export const engineRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/info", { schema: { tags: ["engine"] } }, async (_req, reply) => {
    reply.header("Cache-Control", "public, max-age=300");
    return {
      name: ENGINE_NAME,
      version: ENGINE_VERSION,
      solutions: SOLUTIONS,
      lossTypes: LOSS_TYPES,
      defaultAlertConfig: DEFAULT_ALERT_CONFIG,
      formulas: FORMULAS,
      assumptions: ASSUMPTIONS,
      references: Object.values(REFERENCES),
      disclaimer: DISCLAIMER,
    };
  });
};
