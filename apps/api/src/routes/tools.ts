import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { acidBaseInputSchema, calciumInputSchema, interpretAcidBase, interpretCalcium, interpretOsmolality, interpretPotassium, osmolalityInputSchema, potassiumInputSchema } from "@osmoguard/engine";

/** Módulos de interpretación (sin persistencia). El cálculo ocurre siempre en el servidor. */
export const TOOLS = {
  "acid-base": { schema: acidBaseInputSchema, run: interpretAcidBase },
  osmolality: { schema: osmolalityInputSchema, run: interpretOsmolality },
  potassium: { schema: potassiumInputSchema, run: interpretPotassium },
  calcium: { schema: calciumInputSchema, run: interpretCalcium },
} as const;
export type ToolId = keyof typeof TOOLS;

export const toolRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);
  const security = [{ bearerAuth: [] }];
  const limit = { rateLimit: { max: 120 * app.env.RATE_LIMIT_FACTOR, timeWindow: "1 minute" } };

  app.post("/acid-base", { schema: { tags: ["tools"], security, body: acidBaseInputSchema }, config: limit }, async (req) => interpretAcidBase(req.body));
  app.post("/osmolality", { schema: { tags: ["tools"], security, body: osmolalityInputSchema }, config: limit }, async (req) => interpretOsmolality(req.body));
  app.post("/potassium", { schema: { tags: ["tools"], security, body: potassiumInputSchema }, config: limit }, async (req) => interpretPotassium(req.body));
  app.post("/calcium", { schema: { tags: ["tools"], security, body: calciumInputSchema }, config: limit }, async (req) => interpretCalcium(req.body));
};

export const toolIdSchema = z.enum(["sodium", "acid-base", "osmolality", "potassium", "calcium"]);
