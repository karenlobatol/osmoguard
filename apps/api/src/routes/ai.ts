import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { runSimulation, simulationRequestSchema } from "@osmoguard/engine";
import { explainWithAi } from "../lib/ai";
import { badRequest } from "../lib/errors";
import { TOOLS, toolIdSchema } from "./tools";

/** Resume la salida de sodio para la IA: sin los puntos horarios completos (ahorra tokens). */
function compactSodium(input: unknown) {
  const out = runSimulation(simulationRequestSchema.parse(input));
  return {
    estado: out.status,
    paciente: out.patient,
    aplicabilidad: out.applicability.map((f) => ({ nivel: f.level, titulo: f.title, mensaje: f.message })),
    escenarios: out.scenarios.map((s) => ({
      etiqueta: s.label,
      solucion: s.solutionName,
      velocidadHipoteticaMlH: s.rateMlH,
      horizonteH: s.horizonHours,
      estado: s.status,
      cambio24h: s.summary.deltaAt24h,
      cambioFinal: s.summary.deltaAtEnd,
      deltaPorLitroAdrogueMadias: s.summary.adrogueMadiasDeltaPerLiter,
      alertas: s.alerts.map((a) => ({ nivel: a.level, titulo: a.title, mensaje: a.message })),
    })),
    supuestos: out.assumptions,
  };
}

export const aiRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", app.authenticate);

  app.get("/status", { schema: { tags: ["ai"], security: [{ bearerAuth: [] }] } }, async () => ({ enabled: !!app.env.OPENAI_API_KEY, model: app.env.OPENAI_MODEL }));

  app.post(
    "/explain",
    {
      schema: { tags: ["ai"], security: [{ bearerAuth: [] }], body: z.object({ module: toolIdSchema, input: z.unknown() }) },
      config: { rateLimit: { max: 10 * app.env.RATE_LIMIT_FACTOR, timeWindow: "1 minute" } },
    },
    async (req) => {
      const { module, input } = req.body;
      // Siempre se recalcula en el servidor: la IA nunca recibe números aportados por el cliente sin validar.
      let payload: unknown;
      if (module === "sodium") payload = compactSodium(input);
      else {
        const tool = TOOLS[module];
        const parsed = tool.schema.safeParse(input);
        if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Datos inválidos para el módulo");
        payload = (tool.run as (x: unknown) => unknown)(parsed.data);
      }
      const result = await explainWithAi(app.env, module, payload);
      await app.audit(req, "ai.explain", { userId: req.auth.sub, metadata: { module, model: result.model } });
      return result;
    },
  );
};
