import type { Prisma, PrismaClient } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { hmac } from "./crypto";

export type AuditAction =
  | "auth.register"
  | "auth.login"
  | "auth.login_failed"
  | "auth.locked"
  | "auth.logout"
  | "auth.logout_all"
  | "auth.refresh_reuse"
  | "auth.password_reset_requested"
  | "auth.password_reset"
  | "user.password_changed"
  | "user.updated"
  | "user.deleted"
  | "simulation.created"
  | "simulation.viewed"
  | "simulation.duplicated"
  | "simulation.deleted";

export function createAuditor(prisma: PrismaClient, hmacKey: string) {
  return async function audit(
    req: FastifyRequest,
    action: AuditAction,
    opts: { userId?: string | null; entityType?: string; entityId?: string; metadata?: Prisma.InputJsonValue } = {},
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          userId: opts.userId ?? null,
          entityType: opts.entityType,
          entityId: opts.entityId,
          ipHash: req.ip ? hmac(hmacKey, req.ip) : null,
          metadata: opts.metadata,
        },
      });
    } catch (err) {
      // La auditoría nunca debe romper la petición, pero el fallo queda registrado.
      req.log.error({ err, action }, "audit log failed");
    }
  };
}

export type Auditor = ReturnType<typeof createAuditor>;
