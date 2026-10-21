import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/app";
import { loadEnv } from "../src/env";

export const sentLinks: { to: string; link: string }[] = [];

export async function makeApp(): Promise<FastifyInstance> {
  const env = loadEnv({
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: "test-secret-test-secret-test-secret-1234",
    DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    AUDIT_HMAC_KEY: "audit-key-audit-key-audit-key-audit-key",
    CORS_ORIGINS: "http://localhost:5173",
    APP_URL: "http://localhost:5173",
    ENABLE_DOCS: "true",
  });
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const app = await buildApp({
    env,
    prisma,
    logger: false,
    mailer: { sendPasswordReset: async (to, link) => void sentLinks.push({ to, link }) },
  });
  await app.ready();
  return app;
}

export function cookieFrom(res: LightMyRequestResponse, name = "og_rt"): string | undefined {
  const c = res.cookies.find((x) => x.name === name);
  return c?.value;
}

let counter = 0;
export async function registerUser(app: FastifyInstance, overrides: Partial<{ email: string; password: string; name: string }> = {}) {
  const body = {
    name: "Dra. Prueba",
    email: `user${Date.now()}${counter++}@example.com`,
    password: "Clave-segura-123",
    acceptTerms: true,
    ...overrides,
  };
  const res = await app.inject({ method: "POST", url: "/api/auth/register", payload: body, remoteAddress: `10.0.${Math.floor(counter / 250)}.${counter % 250}` });
  if (res.statusCode !== 201) throw new Error(`register failed ${res.statusCode} ${res.body}`);
  return { ...body, accessToken: res.json().accessToken as string, refresh: cookieFrom(res)!, userId: res.json().user.id as string };
}

export const csrf = { "x-osmoguard-csrf": "1" };
export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

export const sampleRequest = {
  patient: { ageYears: 55, sex: "female", weightKg: 60, serumSodiumMmolL: 118, urineOutputMlH: 50, urineSodiumMmolL: 60, urinePotassiumMmolL: 30 },
  scenarios: [
    { label: "Salino 0,9 %", solutionId: "nacl-09", rateMlH: 100, horizonHours: 24 },
    { label: "Salino 3 %", solutionId: "nacl-3", rateMlH: 30, horizonHours: 24 },
  ],
};
