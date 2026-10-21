import { randomUUID } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Env } from "../env";
import { randomToken, sha256 } from "./crypto";
import type { AccessTokens } from "./tokens";

export const REFRESH_COOKIE = "og_rt";
export const REFRESH_COOKIE_PATH = "/api/auth";
/** Ventana en la que reutilizar un refresh token recién rotado se trata como carrera benigna (varias pestañas). */
export const ROTATION_GRACE_MS = 15_000;

export function createSessionService(prisma: PrismaClient, env: Env, tokens: AccessTokens) {
  const ttlMs = env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;

  function setCookie(reply: FastifyReply, token: string) {
    reply.setCookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production" || env.REFRESH_COOKIE_SAMESITE === "none",
      sameSite: env.REFRESH_COOKIE_SAMESITE,
      path: REFRESH_COOKIE_PATH,
      maxAge: Math.floor(ttlMs / 1000),
    });
  }

  function clearCookie(reply: FastifyReply) {
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  async function issue(user: Pick<User, "id" | "role">, req: FastifyRequest, reply: FastifyReply, familyId: string = randomUUID()) {
    const raw = randomToken();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + ttlMs),
        userAgent: req.headers["user-agent"]?.slice(0, 200) ?? null,
      },
    });
    setCookie(reply, raw);
    const accessToken = await tokens.sign({ sub: user.id, role: user.role, fam: familyId });
    return { session, accessToken };
  }

  type RotateResult =
    | { ok: true; userId: string; accessToken: string }
    | { ok: false; reason: "missing" | "unknown" | "expired" | "reuse" | "race" };

  async function rotate(raw: string | undefined, req: FastifyRequest, reply: FastifyReply): Promise<RotateResult> {
    if (!raw) return { ok: false, reason: "missing" };
    const current = await prisma.session.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } });
    if (!current) return { ok: false, reason: "unknown" };
    if (current.revokedAt) {
      const benign = current.revokeReason === "rotated" && Date.now() - current.revokedAt.getTime() < ROTATION_GRACE_MS;
      if (benign) return { ok: false, reason: "race" };
      // Reutilización de un token ya rotado: posible robo. Se revoca toda la familia.
      await prisma.session.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: "reuse_detected" },
      });
      return { ok: false, reason: "reuse" };
    }
    if (current.expiresAt < new Date()) return { ok: false, reason: "expired" };

    const newRaw = randomToken();
    const next = await prisma.$transaction(async (tx) => {
      // Revocación condicional: si otra petición rotó a la vez, count = 0 y abortamos.
      const res = await tx.session.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: "rotated", lastUsedAt: new Date() },
      });
      if (res.count !== 1) return null;
      const created = await tx.session.create({
        data: {
          userId: current.userId,
          familyId: current.familyId,
          tokenHash: sha256(newRaw),
          // La familia conserva la caducidad absoluta de la sesión original.
          expiresAt: current.expiresAt,
          userAgent: req.headers["user-agent"]?.slice(0, 200) ?? null,
        },
      });
      await tx.session.update({ where: { id: current.id }, data: { replacedById: created.id } });
      return created;
    });
    if (!next) return { ok: false, reason: "race" };
    setCookie(reply, newRaw);
    const accessToken = await tokens.sign({ sub: current.userId, role: current.user.role, fam: current.familyId });
    return { ok: true, userId: current.userId, accessToken };
  }

  async function revokeByRaw(raw: string | undefined) {
    if (!raw) return;
    const s = await prisma.session.findUnique({ where: { tokenHash: sha256(raw) } });
    if (s) await prisma.session.updateMany({ where: { familyId: s.familyId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: "logout" } });
  }

  async function revokeAll(userId: string, reason: string) {
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: reason } });
  }

  return { issue, rotate, revokeByRaw, revokeAll, clearCookie };
}

export type SessionService = ReturnType<typeof createSessionService>;
