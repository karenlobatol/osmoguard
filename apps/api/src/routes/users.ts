import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { changePasswordSchema, updateProfileSchema } from "@osmoguard/contracts";
import { AppError, notFound } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";
import { toUserDto } from "../lib/serializers";

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, audit, sessions } = app;
  app.addHook("preHandler", app.authenticate);
  const security = [{ bearerAuth: [] }];

  app.get("/me", { schema: { tags: ["users"], security } }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
    if (!user) throw notFound("Usuario no encontrado");
    return toUserDto(user);
  });

  app.patch("/me", { schema: { tags: ["users"], security, body: updateProfileSchema } }, async (req) => {
    const user = await prisma.user.update({
      where: { id: req.auth.sub },
      data: { name: req.body.name, profession: req.body.profession, alertConfig: req.body.alertConfig },
    });
    await audit(req, "user.updated", { userId: user.id, metadata: { fields: Object.keys(req.body) } });
    return toUserDto(user);
  });

  app.post(
    "/me/password",
    { schema: { tags: ["users"], security, body: changePasswordSchema }, config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth.sub } });
      if (!(await verifyPassword(user.passwordHash, req.body.currentPassword))) throw new AppError(400, "WRONG_PASSWORD", "La contraseña actual no es correcta");
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(req.body.newPassword) } });
      // Cierra todas las demás sesiones; la actual conserva su refresh token.
      await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null, NOT: { familyId: req.auth.fam } }, data: { revokedAt: new Date(), revokeReason: "password_changed" } });
      await audit(req, "user.password_changed", { userId: user.id });
      return reply.code(204).send();
    },
  );

  app.get("/me/sessions", { schema: { tags: ["users"], security } }, async (req) => {
    const rows = await prisma.session.findMany({
      where: { userId: req.auth.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
      select: { familyId: true, userAgent: true, createdAt: true, lastUsedAt: true },
    });
    return rows.map((r) => ({ ...r, current: r.familyId === req.auth.fam }));
  });

  // Derecho de supresión: elimina la cuenta y todas sus simulaciones (cascada).
  app.delete(
    "/me",
    { schema: { tags: ["users"], security, body: z.object({ password: z.string().min(1).max(128) }) } },
    async (req, reply) => {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth.sub } });
      if (!(await verifyPassword(user.passwordHash, req.body.password))) throw new AppError(400, "WRONG_PASSWORD", "La contraseña no es correcta");
      await audit(req, "user.deleted", { userId: null, metadata: { deletedUser: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      sessions.clearCookie(reply);
      return reply.code(204).send();
    },
  );
};
