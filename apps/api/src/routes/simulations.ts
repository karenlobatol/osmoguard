import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Prisma } from "@prisma/client";
import { runSimulation, simulationRequestSchema, type SimulationRequest } from "@osmoguard/engine";
import { createSimulationSchema, idParamSchema, listSimulationsQuerySchema, type DashboardStatsDto, type Paginated, type SimulationSummaryDto } from "@osmoguard/contracts";
import { notFound } from "../lib/errors";
import { toDetail, toSummary } from "../lib/serializers";

const withResults = { scenarios: { include: { result: true } } } as const;

export const simulationRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, cipher, audit } = app;
  app.addHook("preHandler", app.authenticate);
  const security = [{ bearerAuth: [] }];

  /** Ejecuta el motor y persiste entradas, versión y resultados en una transacción. */
  async function persist(userId: string, title: string, notes: string | undefined, request: SimulationRequest) {
    const output = runSimulation(request);
    const { scenarios, ...assessment } = output;
    return prisma.simulation.create({
      data: {
        userId,
        title,
        notesEnc: notes ? cipher.encrypt(notes) : null,
        patientEnc: cipher.encryptJson(request.patient),
        alertConfig: request.alertConfig as Prisma.InputJsonValue,
        assessment: assessment as unknown as Prisma.InputJsonValue,
        classification: output.patient.classification,
        status: output.status,
        serumSodium: request.patient.serumSodiumMmolL,
        engineVersion: output.engine.version,
        scenarios: {
          create: request.scenarios.map((s, position) => ({
            position,
            label: s.label,
            solutionId: s.solutionId,
            rateMlH: s.rateMlH,
            horizonHours: s.horizonHours,
            result: { create: { engineVersion: output.engine.version, output: scenarios[position] as unknown as Prisma.InputJsonValue } },
          })),
        },
      },
      include: withResults,
    });
  }

  async function findOwned(id: string, userId: string) {
    // La condición de propietario va en la propia consulta: un recurso ajeno es indistinguible de uno inexistente.
    const sim = await prisma.simulation.findFirst({ where: { id, userId, deletedAt: null }, include: withResults });
    if (!sim) throw notFound("Simulación no encontrada");
    return sim;
  }

  app.post(
    "/preview",
    { schema: { tags: ["simulations"], security, body: simulationRequestSchema, description: "Ejecuta el motor sin guardar." }, config: { rateLimit: { max: 60 * app.env.RATE_LIMIT_FACTOR, timeWindow: "1 minute" } } },
    async (req) => runSimulation(req.body),
  );

  app.get("/", { schema: { tags: ["simulations"], security, querystring: listSimulationsQuerySchema } }, async (req) => {
    const { q, page, pageSize } = req.query;
    const where: Prisma.SimulationWhereInput = { userId: req.auth.sub, deletedAt: null, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) };
    const [total, rows] = await prisma.$transaction([
      prisma.simulation.count({ where }),
      prisma.simulation.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { scenarios: true } } } }),
    ]);
    const body: Paginated<SimulationSummaryDto> = { items: rows.map(toSummary), total, page, pageSize };
    return body;
  });

  app.get("/stats", { schema: { tags: ["simulations"], security } }, async (req) => {
    const userId = req.auth.sub;
    const base = { userId, deletedAt: null };
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [total, last30Days, groups, withAlerts, recent] = await prisma.$transaction([
      prisma.simulation.count({ where: base }),
      prisma.simulation.count({ where: { ...base, createdAt: { gte: since } } }),
      prisma.simulation.groupBy({ by: ["classification"], where: base, _count: { _all: true }, orderBy: { classification: "asc" } }),
      prisma.simulation.count({ where: { ...base, status: { in: ["warning", "blocked"] } } }),
      prisma.simulation.findMany({ where: base, orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { scenarios: true } } } }),
    ]);
    const byClassification = { hyponatremia: 0, normonatremia: 0, hypernatremia: 0 };
    for (const g of groups) {
      const count = (g._count as { _all: number })._all;
      if (g.classification in byClassification) byClassification[g.classification as keyof typeof byClassification] = count;
    }
    const body: DashboardStatsDto = { total, last30Days, byClassification, withAlerts, recent: recent.map(toSummary) };
    return body;
  });

  app.post("/", { schema: { tags: ["simulations"], security, body: createSimulationSchema } }, async (req, reply) => {
    const sim = await persist(req.auth.sub, req.body.title, req.body.notes, req.body.request);
    await audit(req, "simulation.created", { userId: req.auth.sub, entityType: "simulation", entityId: sim.id });
    return reply.code(201).send(toDetail(sim, cipher));
  });

  app.get("/:id", { schema: { tags: ["simulations"], security, params: idParamSchema } }, async (req) => {
    const sim = await findOwned(req.params.id, req.auth.sub);
    await audit(req, "simulation.viewed", { userId: req.auth.sub, entityType: "simulation", entityId: sim.id });
    return toDetail(sim, cipher);
  });

  /** Duplica las entradas y las vuelve a ejecutar con la versión ACTUAL del motor. */
  app.post("/:id/duplicate", { schema: { tags: ["simulations"], security, params: idParamSchema } }, async (req, reply) => {
    const source = toDetail(await findOwned(req.params.id, req.auth.sub), cipher);
    const title = `${source.title.slice(0, 72)} (copia)`;
    const sim = await persist(req.auth.sub, title, source.notes ?? undefined, simulationRequestSchema.parse(source.request));
    await audit(req, "simulation.duplicated", { userId: req.auth.sub, entityType: "simulation", entityId: sim.id, metadata: { source: source.id } });
    return reply.code(201).send(toDetail(sim, cipher));
  });

  app.delete("/:id", { schema: { tags: ["simulations"], security, params: idParamSchema } }, async (req, reply) => {
    const res = await prisma.simulation.deleteMany({ where: { id: req.params.id, userId: req.auth.sub } });
    if (res.count === 0) throw notFound("Simulación no encontrada");
    await audit(req, "simulation.deleted", { userId: req.auth.sub, entityType: "simulation", entityId: req.params.id });
    return reply.code(204).send();
  });
};
