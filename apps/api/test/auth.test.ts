import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, cookieFrom, csrf, makeApp, registerUser, sentLinks } from "./helpers";

let app: FastifyInstance;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => {
  await app.close();
});

describe("registro e inicio de sesión", () => {
  it("registra, guarda Argon2id y emite cookie HttpOnly", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/register", payload: { name: "Ana", email: "Ana@Example.com", password: "Clave-segura-123", acceptTerms: true }, remoteAddress: "10.9.9.8" });
    expect(res.statusCode).toBe(201);
    expect(res.json().user.email).toBe("ana@example.com");
    const cookie = res.cookies.find((c) => c.name === "og_rt")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.path).toBe("/api/auth");
    const user = await app.prisma.user.findUniqueOrThrow({ where: { email: "ana@example.com" } });
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    const session = await app.prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.tokenHash).not.toBe(cookie.value);
    expect(session.tokenHash).toHaveLength(64);
  });

  it("rechaza correo duplicado y contraseñas débiles", async () => {
    const u = await registerUser(app);
    const dup = await app.inject({ method: "POST", url: "/api/auth/register", payload: { name: "Xavier", email: u.email, password: "Clave-segura-123", acceptTerms: true } });
    expect(dup.statusCode).toBe(409);
    const weak = await app.inject({ method: "POST", url: "/api/auth/register", payload: { name: "Xavier", email: "weak@example.com", password: "corta", acceptTerms: true }, remoteAddress: "10.9.9.9" });
    expect(weak.statusCode).toBe(400);
    expect(weak.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("login con mensaje genérico ante credenciales erróneas", async () => {
    const u = await registerUser(app);
    const bad = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: u.email, password: "incorrecta-123" } });
    const ghost = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "nadie@example.com", password: "incorrecta-123" } });
    expect(bad.statusCode).toBe(401);
    expect(ghost.statusCode).toBe(401);
    expect(bad.json().error.message).toBe(ghost.json().error.message);
    const ok = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: u.email, password: u.password } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().accessToken).toBeTypeOf("string");
  });

  it("bloquea la cuenta tras 5 intentos fallidos", async () => {
    const u = await registerUser(app);
    for (let i = 0; i < 5; i++) await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: u.email, password: "mala-clave-1" } });
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: u.email, password: u.password } });
    expect(res.statusCode).toBe(423);
  });
});

describe("JWT de acceso", () => {
  it("protege /users/me", async () => {
    expect((await app.inject({ method: "GET", url: "/api/users/me" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/api/users/me", headers: bearer("x.y.z") })).statusCode).toBe(401);
    const u = await registerUser(app);
    const me = await app.inject({ method: "GET", url: "/api/users/me", headers: bearer(u.accessToken) });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(u.email);
    expect(me.json()).not.toHaveProperty("passwordHash");
  });

  it("rechaza tokens con firma alterada", async () => {
    const u = await registerUser(app);
    const [h, p] = u.accessToken.split(".");
    const forged = `${h}.${p}.AAAA`;
    expect((await app.inject({ method: "GET", url: "/api/users/me", headers: bearer(forged) })).statusCode).toBe(401);
  });
});

describe("refresh tokens rotativos", () => {
  it("exige la cabecera CSRF y un origen permitido", async () => {
    const u = await registerUser(app);
    const noHeader = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh } });
    expect(noHeader.statusCode).toBe(403);
    const evil = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh }, headers: { ...csrf, origin: "https://evil.example" } });
    expect(evil.statusCode).toBe(403);
  });

  it("acepta peticiones del mismo origen aunque no estén en la lista (túnel)", async () => {
    const u = await registerUser(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      cookies: { og_rt: u.refresh },
      headers: { ...csrf, origin: "https://demo.trycloudflare.com", host: "demo.trycloudflare.com" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rota el token y detecta reutilización revocando la familia", async () => {
    const u = await registerUser(app);
    const r1 = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh }, headers: csrf });
    expect(r1.statusCode).toBe(200);
    const t2 = cookieFrom(r1)!;
    expect(t2).not.toBe(u.refresh);

    // Reutilización fuera de la ventana de gracia: se simula envejeciendo la revocación.
    await app.prisma.session.updateMany({ where: { userId: u.userId, revokeReason: "rotated" }, data: { revokedAt: new Date(Date.now() - 60_000) } });
    const reuse = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh }, headers: csrf });
    expect(reuse.statusCode).toBe(401);
    // El token legítimo más reciente también queda revocado.
    const after = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: t2 }, headers: csrf });
    expect(after.statusCode).toBe(401);
    const audit = await app.prisma.auditLog.count({ where: { action: "auth.refresh_reuse" } });
    expect(audit).toBeGreaterThan(0);
  });

  it("trata la reutilización inmediata como carrera benigna (409) sin revocar", async () => {
    const u = await registerUser(app);
    const r1 = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh }, headers: csrf });
    const race = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh }, headers: csrf });
    expect(race.statusCode).toBe(409);
    const ok = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: cookieFrom(r1)! }, headers: csrf });
    expect(ok.statusCode).toBe(200);
  });

  it("logout revoca el refresh token", async () => {
    const u = await registerUser(app);
    const out = await app.inject({ method: "POST", url: "/api/auth/logout", cookies: { og_rt: u.refresh }, headers: csrf });
    expect(out.statusCode).toBe(204);
    const r = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh }, headers: csrf });
    expect(r.statusCode).toBe(401);
  });
});

describe("recuperación de contraseña", () => {
  it("no revela si la cuenta existe", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: "noexiste@example.com" } });
    expect(res.statusCode).toBe(202);
  });

  it("token de un solo uso que revoca sesiones", async () => {
    const u = await registerUser(app);
    await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: u.email } });
    const sent = sentLinks.findLast((l) => l.to === u.email)!;
    const token = new URL(sent.link).searchParams.get("token")!;
    const stored = await app.prisma.passwordResetToken.findFirstOrThrow({ where: { userId: u.userId } });
    expect(stored.tokenHash).not.toBe(token);

    const reset = await app.inject({ method: "POST", url: "/api/auth/reset-password", payload: { token, password: "Nueva-clave-456" } });
    expect(reset.statusCode).toBe(204);
    const again = await app.inject({ method: "POST", url: "/api/auth/reset-password", payload: { token, password: "Otra-clave-789" } });
    expect(again.statusCode).toBe(400);
    const oldRefresh = await app.inject({ method: "POST", url: "/api/auth/refresh", cookies: { og_rt: u.refresh }, headers: csrf });
    expect(oldRefresh.statusCode).toBe(401);
    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: u.email, password: "Nueva-clave-456" } });
    expect(login.statusCode).toBe(200);
  });
});

describe("rate limiting", () => {
  it("limita intentos de login por IP", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 12; i++)
      codes.push((await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "rl@example.com", password: "x" }, remoteAddress: "10.200.0.1" })).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
  });
});

describe("cabeceras de seguridad", () => {
  it("aplica CSP, nosniff y CORS restringido", async () => {
    const res = await app.inject({ method: "GET", url: "/api/engine/info", headers: { origin: "https://evil.example" } });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    const ok = await app.inject({ method: "GET", url: "/api/engine/info", headers: { origin: "http://localhost:5173" } });
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
