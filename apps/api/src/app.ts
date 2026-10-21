import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyServerOptions } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { ENGINE_VERSION } from "@osmoguard/engine";
import type { Env } from "./env";
import { createAuditor, type Auditor } from "./lib/audit";
import { FieldCipher } from "./lib/crypto";
import { AppError, unauthorized } from "./lib/errors";
import { createMailer, type Mailer } from "./lib/mailer";
import { createSessionService, type SessionService } from "./lib/sessions";
import { createAccessTokens, type AccessClaims, type AccessTokens } from "./lib/tokens";
import { authRoutes } from "./routes/auth";
import { engineRoutes } from "./routes/engine";
import { simulationRoutes } from "./routes/simulations";
import { userRoutes } from "./routes/users";

declare module "fastify" {
  interface FastifyInstance {
    env: Env;
    prisma: PrismaClient;
    cipher: FieldCipher;
    tokens: AccessTokens;
    sessions: SessionService;
    audit: Auditor;
    mailer: Mailer;
    authenticate: (req: FastifyRequest) => Promise<void>;
    csrfGuard: (req: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    auth: AccessClaims;
  }
}

/** Origen igual al host al que se dirigió la petición (p. ej. acceso por el túnel de Cloudflare). */
function isSameOrigin(origin: string, req: FastifyRequest): boolean {
  try {
    const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ?? req.headers.host;
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export interface BuildOptions {
  env: Env;
  prisma?: PrismaClient;
  logger?: FastifyServerOptions["logger"];
  mailer?: Mailer;
}

export async function buildApp({ env, prisma = new PrismaClient(), logger, mailer }: BuildOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ?? {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      // Nunca registrar credenciales, cookies ni tokens.
      redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
    },
    // Con un número N se confía en los N saltos más cercanos (evita falsear X-Forwarded-For).
    trustProxy: typeof env.TRUST_PROXY === "number" ? ((_addr: string, hop: number) => hop < (env.TRUST_PROXY as number)) : env.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    disableRequestLogging: env.NODE_ENV === "test",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const tokens = createAccessTokens(env.JWT_SECRET, env.ACCESS_TOKEN_TTL_SECONDS);
  app.decorate("env", env);
  app.decorate("prisma", prisma);
  app.decorate("cipher", new FieldCipher(env.DATA_ENCRYPTION_KEY));
  app.decorate("tokens", tokens);
  app.decorate("sessions", createSessionService(prisma, env, tokens));
  app.decorate("audit", createAuditor(prisma, env.AUDIT_HMAC_KEY));
  app.decorate("mailer", mailer ?? createMailer(env, app.log));
  app.decorateRequest("auth", null as unknown as AccessClaims);

  const allowedOrigins = new Set(env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean));
  allowedOrigins.add(new URL(env.APP_URL).origin);

  app.decorate("authenticate", async (req) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized();
    try {
      req.auth = await tokens.verify(header.slice(7));
    } catch {
      throw new AppError(401, "TOKEN_INVALID", "Sesión caducada o inválida");
    }
  });

  // Defensa CSRF para endpoints que dependen de la cookie: cabecera personalizada
  // (fuerza preflight CORS) + verificación de Origin cuando el navegador lo envía.
  app.decorate("csrfGuard", async (req) => {
    if (req.headers["x-osmoguard-csrf"] !== "1") throw new AppError(403, "CSRF", "Solicitud rechazada");
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin) && !isSameOrigin(origin, req)) throw new AppError(403, "CSRF", "Origen no permitido");
  });

  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: "same-site" },
  });
  // Swagger UI necesita una CSP más laxa; se aplica solo a /api/docs.
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Osmoguard-Csrf"],
    maxAge: 600,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300 * env.RATE_LIMIT_FACTOR,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      error: { code: "RATE_LIMITED", message: `Demasiadas solicitudes. Reintente en ${Math.ceil(ctx.ttl / 1000)} s.` },
    }),
  });

  if (env.ENABLE_DOCS) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: "Osmoguard API",
          version: ENGINE_VERSION,
          description: "API del simulador educativo Osmoguard. Los resultados son simulaciones matemáticas, no prescripciones.",
        },
        components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, {
      routePrefix: "/api/docs",
      staticCSP: true,
      transformStaticCSP: () => "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'",
    });
  }

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err))
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: err.validation.map((v) => ({ path: v.instancePath, message: v.message })) } });
    if (err instanceof ZodError)
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Datos inválidos", details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } });
    if (err instanceof AppError) return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message, details: err.details } });
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) return reply.code(429).send(err);
    if (status && status >= 400 && status < 500) return reply.code(status).send({ error: { code: "BAD_REQUEST", message: (err as Error).message } });
    req.log.error({ err }, "unhandled error");
    return reply.code(500).send({ error: { code: "INTERNAL", message: "Error interno del servidor" } });
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: { code: "NOT_FOUND", message: "Ruta no encontrada" } }));

  app.get("/api/health", { config: { rateLimit: false }, schema: { hide: true } }, async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", engine: ENGINE_VERSION };
    } catch {
      return reply.code(503).send({ status: "degraded" });
    }
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(engineRoutes, { prefix: "/api/engine" });
  await app.register(simulationRoutes, { prefix: "/api/simulations" });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
  return app;
}
