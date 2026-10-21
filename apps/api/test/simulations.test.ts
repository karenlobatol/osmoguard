import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { ENGINE_VERSION } from "@osmoguard/engine";
import { bearer, makeApp, registerUser, sampleRequest } from "./helpers";

let app: FastifyInstance;
beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => {
  await app.close();
});

describe("simulaciones", () => {
  it("preview ejecuta el motor sin guardar", async () => {
    const u = await registerUser(app);
    const res = await app.inject({ method: "POST", url: "/api/simulations/preview", headers: bearer(u.accessToken), payload: sampleRequest });
    expect(res.statusCode).toBe(200);
    expect(res.json().engine.version).toBe(ENGINE_VERSION);
    expect(res.json().scenarios).toHaveLength(2);
    expect(await app.prisma.simulation.count({ where: { userId: u.userId } })).toBe(0);
  });

  it("guarda entradas cifradas, versión del motor y resultados por escenario", async () => {
    const u = await registerUser(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/simulations",
      headers: bearer(u.accessToken),
      payload: { title: "Caso docente SIADH", notes: "Nota privada", request: sampleRequest },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.engineVersion).toBe(ENGINE_VERSION);
    expect(body.output.scenarios).toHaveLength(2);
    expect(body.request.patient.serumSodiumMmolL).toBe(118);
    expect(body.notes).toBe("Nota privada");

    const row = await app.prisma.simulation.findUniqueOrThrow({ where: { id: body.id }, include: { scenarios: { include: { result: true } } } });
    expect(row.patientEnc.startsWith("v1:")).toBe(true);
    expect(row.patientEnc).not.toContain("118");
    expect(row.notesEnc).not.toContain("Nota privada");
    expect(row.scenarios.every((s) => s.result?.engineVersion === ENGINE_VERSION)).toBe(true);
  });

  it("calcula en el servidor e ignora cualquier resultado enviado por el cliente", async () => {
    const u = await registerUser(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/simulations",
      headers: bearer(u.accessToken),
      payload: { title: "Intento", request: sampleRequest, output: { status: "ok" } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().output.patient.classification).toBe("hyponatremia");
  });

  it("rechaza títulos con posibles identificadores de paciente", async () => {
    const u = await registerUser(app);
    const res = await app.inject({ method: "POST", url: "/api/simulations", headers: bearer(u.accessToken), payload: { title: "HC 12345678", request: sampleRequest } });
    expect(res.statusCode).toBe(400);
  });

  it("valida entradas clínicas con Zod", async () => {
    const u = await registerUser(app);
    const bad = { ...sampleRequest, patient: { ...sampleRequest.patient, serumSodiumMmolL: 500 } };
    const res = await app.inject({ method: "POST", url: "/api/simulations/preview", headers: bearer(u.accessToken), payload: bad });
    expect(res.statusCode).toBe(400);
  });

  it("aísla los datos entre usuarios (IDOR)", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const created = await app.inject({ method: "POST", url: "/api/simulations", headers: bearer(a.accessToken), payload: { title: "De A", request: sampleRequest } });
    const id = created.json().id;
    expect((await app.inject({ method: "GET", url: `/api/simulations/${id}`, headers: bearer(b.accessToken) })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: `/api/simulations/${id}`, headers: bearer(b.accessToken) })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/api/simulations/${id}/duplicate`, headers: bearer(b.accessToken) })).statusCode).toBe(404);
    const listB = await app.inject({ method: "GET", url: "/api/simulations", headers: bearer(b.accessToken) });
    expect(listB.json().items.map((s: { id: string }) => s.id)).not.toContain(id);
    expect((await app.inject({ method: "GET", url: `/api/simulations/${id}`, headers: bearer(a.accessToken) })).statusCode).toBe(200);
  });

  it("lista con búsqueda y paginación, estadísticas, duplicado y borrado", async () => {
    const u = await registerUser(app);
    for (const t of ["Hipo uno", "Hipo dos", "Otro caso"])
      await app.inject({ method: "POST", url: "/api/simulations", headers: bearer(u.accessToken), payload: { title: t, request: sampleRequest } });
    const list = await app.inject({ method: "GET", url: "/api/simulations?q=hipo&pageSize=1", headers: bearer(u.accessToken) });
    expect(list.json().total).toBe(2);
    expect(list.json().items).toHaveLength(1);

    const stats = await app.inject({ method: "GET", url: "/api/simulations/stats", headers: bearer(u.accessToken) });
    expect(stats.json().total).toBe(3);
    expect(stats.json().byClassification.hyponatremia).toBe(3);

    const id = list.json().items[0].id;
    const dup = await app.inject({ method: "POST", url: `/api/simulations/${id}/duplicate`, headers: bearer(u.accessToken) });
    expect(dup.statusCode).toBe(201);
    expect(dup.json().title).toMatch(/\(copia\)$/);

    const del = await app.inject({ method: "DELETE", url: `/api/simulations/${id}`, headers: bearer(u.accessToken) });
    expect(del.statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: `/api/simulations/${id}`, headers: bearer(u.accessToken) })).statusCode).toBe(404);
    expect(await app.prisma.auditLog.count({ where: { action: "simulation.deleted", entityId: id } })).toBe(1);
  });

  it("rechaza ids no UUID", async () => {
    const u = await registerUser(app);
    expect((await app.inject({ method: "GET", url: "/api/simulations/1%20OR%201=1", headers: bearer(u.accessToken) })).statusCode).toBe(400);
  });

  it("perfil: umbrales de alerta acotados y eliminación de cuenta", async () => {
    const u = await registerUser(app);
    const bad = await app.inject({ method: "PATCH", url: "/api/users/me", headers: bearer(u.accessToken), payload: { alertConfig: { hypoMaxRise24hStandard: 30 } } });
    expect(bad.statusCode).toBe(400);
    const ok = await app.inject({ method: "PATCH", url: "/api/users/me", headers: bearer(u.accessToken), payload: { alertConfig: { hypoMaxRise24hStandard: 8 } } });
    expect(ok.json().alertConfig.hypoMaxRise24hStandard).toBe(8);
    await app.inject({ method: "POST", url: "/api/simulations", headers: bearer(u.accessToken), payload: { title: "Para borrar", request: sampleRequest } });
    const del = await app.inject({ method: "DELETE", url: "/api/users/me", headers: bearer(u.accessToken), payload: { password: u.password } });
    expect(del.statusCode).toBe(204);
    expect(await app.prisma.simulation.count({ where: { userId: u.userId } })).toBe(0);
  });

  it("expone la documentación OpenAPI", async () => {
    const res = await app.inject({ method: "GET", url: "/api/docs/json" });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json().paths)).toEqual(expect.arrayContaining(["/api/auth/login", "/api/simulations/", "/api/simulations/{id}"]));
  });
});
