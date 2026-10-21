import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().default(3000),
    HOST: z.string().default("0.0.0.0"),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
    DATA_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, "base64").length === 32, "DATA_ENCRYPTION_KEY debe ser 32 bytes en base64"),
    AUDIT_HMAC_KEY: z.string().min(32),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),
    APP_URL: z.string().url().default("http://localhost:5173"),
    REFRESH_COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).default("lax"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(60).default(14),
    SMTP_URL: z.string().optional().transform((v) => (v ? v : undefined)),
    MAIL_FROM: z.string().default("Osmoguard <no-reply@osmoguard.local>"),
    TRUST_PROXY: bool.default("false"),
    ENABLE_DOCS: bool.default("true"),
    /** Multiplicador de los límites de peticiones (1 en producción; mayor solo en desarrollo/E2E). */
    RATE_LIMIT_FACTOR: z.coerce.number().int().min(1).max(100).default(1),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && /change-me/.test(env.JWT_SECRET + env.AUDIT_HMAC_KEY))
      ctx.addIssue({ code: "custom", message: "Secretos de ejemplo no permitidos en producción" });
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuración inválida: ${msg}`);
  }
  return parsed.data;
}
