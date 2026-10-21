import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, type AuthResponse } from "@osmoguard/contracts";
import { randomToken, sha256 } from "../lib/crypto";
import { AppError, unauthorized } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";
import { toUserDto } from "../lib/serializers";
import { REFRESH_COOKIE } from "../lib/sessions";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MS = 30 * 60_000;

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, sessions, audit, tokens } = app;

  app.post(
    "/register",
    { schema: { tags: ["auth"], body: registerSchema }, config: { rateLimit: { max: 5 * app.env.RATE_LIMIT_FACTOR, timeWindow: "10 minutes" } } },
    async (req, reply) => {
      const { name, email, password } = req.body;
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw new AppError(409, "EMAIL_TAKEN", "Ya existe una cuenta con ese correo");
      const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
      const { accessToken } = await sessions.issue(user, req, reply);
      await audit(req, "auth.register", { userId: user.id });
      const body: AuthResponse = { accessToken, expiresIn: tokens.ttlSeconds, user: toUserDto(user) };
      return reply.code(201).send(body);
    },
  );

  app.post(
    "/login",
    { schema: { tags: ["auth"], body: loginSchema }, config: { rateLimit: { max: 10 * app.env.RATE_LIMIT_FACTOR, timeWindow: "5 minutes" } } },
    async (req, reply) => {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        await verifyPassword(null, password);
        throw new AppError(423, "ACCOUNT_LOCKED", "Cuenta bloqueada temporalmente por intentos fallidos. Inténtelo más tarde.");
      }
      const ok = await verifyPassword(user?.passwordHash ?? null, password);
      if (!user || !ok) {
        if (user) {
          const failed = user.failedLogins + 1;
          const lock = failed >= MAX_FAILED_LOGINS;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
          });
          await audit(req, lock ? "auth.locked" : "auth.login_failed", { userId: user.id });
        }
        throw new AppError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos");
      }
      if (user.failedLogins || user.lockedUntil) await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
      const { accessToken } = await sessions.issue(user, req, reply);
      await audit(req, "auth.login", { userId: user.id });
      const body: AuthResponse = { accessToken, expiresIn: tokens.ttlSeconds, user: toUserDto(user) };
      return body;
    },
  );

  app.post(
    "/refresh",
    { schema: { tags: ["auth"] }, preHandler: app.csrfGuard, config: { rateLimit: { max: 60 * app.env.RATE_LIMIT_FACTOR, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const result = await sessions.rotate(req.cookies[REFRESH_COOKIE], req, reply);
      if (!result.ok) {
        if (result.reason === "reuse") await audit(req, "auth.refresh_reuse");
        if (result.reason === "race") throw new AppError(409, "REFRESH_RACE", "Renovación concurrente; reintente");
        sessions.clearCookie(reply);
        throw unauthorized("Sesión caducada");
      }
      const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId } });
      const body: AuthResponse = { accessToken: result.accessToken, expiresIn: tokens.ttlSeconds, user: toUserDto(user) };
      return body;
    },
  );

  app.post("/logout", { schema: { tags: ["auth"] }, preHandler: app.csrfGuard }, async (req, reply) => {
    await sessions.revokeByRaw(req.cookies[REFRESH_COOKIE]);
    sessions.clearCookie(reply);
    await audit(req, "auth.logout");
    return reply.code(204).send();
  });

  app.post("/logout-all", { schema: { tags: ["auth"], security: [{ bearerAuth: [] }] }, preHandler: app.authenticate }, async (req, reply) => {
    await sessions.revokeAll(req.auth.sub, "logout_all");
    sessions.clearCookie(reply);
    await audit(req, "auth.logout_all", { userId: req.auth.sub });
    return reply.code(204).send();
  });

  app.post(
    "/forgot-password",
    { schema: { tags: ["auth"], body: forgotPasswordSchema }, config: { rateLimit: { max: 5 * app.env.RATE_LIMIT_FACTOR, timeWindow: "1 hour" } } },
    async (req, reply) => {
      const user = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (user) {
        const raw = randomToken();
        await prisma.$transaction([
          prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
          prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
        ]);
        const link = `${app.env.APP_URL.replace(/\/$/, "")}/restablecer?token=${encodeURIComponent(raw)}`;
        await app.mailer.sendPasswordReset(user.email, link).catch((err) => req.log.error({ err }, "mail failed"));
        await audit(req, "auth.password_reset_requested", { userId: user.id });
      }
      // Respuesta idéntica exista o no la cuenta (evita enumeración de usuarios).
      return reply.code(202).send({ message: "Si la cuenta existe, recibirá un correo con instrucciones." });
    },
  );

  app.post(
    "/reset-password",
    { schema: { tags: ["auth"], body: resetPasswordSchema }, config: { rateLimit: { max: 10 * app.env.RATE_LIMIT_FACTOR, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(req.body.token) } });
      if (!record || record.usedAt || record.expiresAt < new Date()) throw new AppError(400, "RESET_TOKEN_INVALID", "El enlace no es válido o ha caducado");
      const passwordHash = await hashPassword(req.body.password);
      const claimed = await prisma.$transaction(async (tx) => {
        const res = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
        if (res.count !== 1) return false;
        await tx.user.update({ where: { id: record.userId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } });
        return true;
      });
      if (!claimed) throw new AppError(400, "RESET_TOKEN_INVALID", "El enlace no es válido o ha caducado");
      await sessions.revokeAll(record.userId, "password_reset");
      await audit(req, "auth.password_reset", { userId: record.userId });
      return reply.code(204).send();
    },
  );
};
