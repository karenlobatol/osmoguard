import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ENGINE_VERSION, runSimulation, type SimulationRequestRaw } from "../src";

const basePatient = {
  ageYears: 55,
  sex: "female" as const,
  weightKg: 60,
  serumSodiumMmolL: 118,
  urineOutputMlH: 50,
  urineSodiumMmolL: 60,
  urinePotassiumMmolL: 30,
};

const req = (over: Partial<SimulationRequestRaw> = {}, patient: Record<string, unknown> = {}): SimulationRequestRaw => ({
  patient: { ...basePatient, ...patient } as SimulationRequestRaw["patient"],
  scenarios: [{ label: "A", solutionId: "nacl-09", rateMlH: 100, horizonHours: 24 }],
  ...over,
});

describe("runSimulation — estructura y determinismo", () => {
  it("es determinista", () => {
    expect(runSimulation(req())).toEqual(runSimulation(req()));
  });
  it("incluye versión del motor, supuestos, fórmulas y descargo", () => {
    const out = runSimulation(req());
    expect(out.engine.version).toBe(ENGINE_VERSION);
    expect(out.assumptions.length).toBeGreaterThan(3);
    expect(out.formulas.map((f) => f.id)).toContain("adrogue-madias");
    expect(out.disclaimer).toMatch(/educativos/);
  });
  it("clasifica la hiponatremia profunda", () => {
    const out = runSimulation(req());
    expect(out.patient.classification).toBe("hyponatremia");
    expect(out.patient.severity).toBe("profunda");
    expect(out.patient.tbw.liters).toBe(30);
  });
  it("estimaciones solo en horas predefinidas (sin interpolar)", () => {
    const out = runSimulation(req());
    expect(out.scenarios[0]!.points.map((p) => p.hour)).toEqual([0, 1, 2, 4, 6, 8, 12, 16, 20, 24]);
  });
  it("añade el horizonte si no coincide con un punto predefinido", () => {
    const out = runSimulation(req({ scenarios: [{ label: "A", solutionId: "nacl-09", rateMlH: 100, horizonHours: 10 }] }));
    expect(out.scenarios[0]!.points.at(-1)!.hour).toBe(10);
  });
  it("la banda contiene siempre la estimación nominal", () => {
    for (const p of runSimulation(req()).scenarios[0]!.points) {
      if (p.estimate === null) continue;
      expect(p.low!).toBeLessThanOrEqual(p.estimate);
      expect(p.high!).toBeGreaterThanOrEqual(p.estimate);
    }
  });
});

describe("aplicabilidad y bloqueos", () => {
  it("bloquea pacientes pediátricos sin mostrar estimaciones", () => {
    const out = runSimulation(req({}, { ageYears: 12 }));
    expect(out.status).toBe("blocked");
    expect(out.applicability.some((f) => f.code === "PEDIATRIC")).toBe(true);
    expect(out.scenarios[0]!.points.slice(1).every((p) => p.estimate === null)).toBe(true);
    expect(out.solutionComparison).toEqual([]);
  });
  it("bloquea terapia de reemplazo renal", () => {
    expect(runSimulation(req({}, { onKidneyReplacementTherapy: true })).status).toBe("blocked");
  });
  it.each([95, 190])("bloquea Na fuera de rango (%i)", (na) => {
    expect(runSimulation(req({}, { serumSodiumMmolL: na })).status).toBe("blocked");
  });
  it("bloquea crisis hiperglucémica", () => {
    expect(runSimulation(req({}, { glucoseMgDl: 700 })).status).toBe("blocked");
  });
  it("sin diuresis informada bloquea los puntos > 6 h", () => {
    const out = runSimulation(req({}, { urineOutputMlH: undefined, urineSodiumMmolL: undefined, urinePotassiumMmolL: undefined }));
    const pts = out.scenarios[0]!.points;
    expect(pts.filter((p) => p.hour <= 6 && p.hour > 0).every((p) => p.estimate !== null)).toBe(true);
    expect(pts.filter((p) => p.hour > 6).every((p) => p.confidence === "blocked" && p.estimate === null)).toBe(true);
    expect(out.applicability.some((f) => f.code === "NO_URINE_OUTPUT")).toBe(true);
  });
  it("detecta hiponatremia por translocación (glucosa)", () => {
    const out = runSimulation(req({}, { serumSodiumMmolL: 128, glucoseMgDl: 550 }));
    expect(out.applicability.map((f) => f.code)).toContain("TRANSLOCATIONAL");
  });
  it("confianza baja más allá de 24 h", () => {
    const out = runSimulation(req({ scenarios: [{ label: "A", solutionId: "nacl-09", rateMlH: 80, horizonHours: 48 }] }));
    expect(out.scenarios[0]!.points.filter((p) => p.hour > 24).every((p) => p.confidence === "low")).toBe(true);
  });
  it("rechaza entradas inválidas (Zod)", () => {
    expect(() => runSimulation(req({}, { weightKg: -5 }))).toThrow();
    expect(() => runSimulation(req({ scenarios: [] }))).toThrow();
    expect(() => runSimulation(req({ scenarios: [{ label: "x", solutionId: "inventada", rateMlH: 1, horizonHours: 1 }] }))).toThrow();
  });
});

describe("alertas", () => {
  it("detecta sobrecorrección con NaCl 3 % a velocidad alta", () => {
    const out = runSimulation(req({ scenarios: [{ label: "3%", solutionId: "nacl-3", rateMlH: 100, horizonHours: 24 }] }, { urineOutputMlH: 30 }));
    expect(out.scenarios[0]!.alerts.map((a) => a.code)).toContain("OVERCORRECTION_24H");
    expect(out.scenarios[0]!.status).toBe("warning");
  });
  it("usa el umbral de alto riesgo cuando hay hipopotasemia", () => {
    const out = runSimulation(req({}, { serumPotassiumMmolL: 3.0 }));
    expect(out.patient.odsHighRisk).toBe(true);
    expect(out.applicability.map((f) => f.code)).toContain("ODS_HIGH_RISK");
  });
  it("los umbrales son configurables", () => {
    const sc = [{ label: "A", solutionId: "nacl-3", rateMlH: 30, horizonHours: 24 }];
    const strict = runSimulation(req({ scenarios: sc, alertConfig: { hypoMaxRise24hStandard: 6 } }));
    const loose = runSimulation(req({ scenarios: sc, alertConfig: { hypoMaxRise24hStandard: 12 } }));
    const rise = strict.scenarios[0]!.summary.deltaAt24h!.estimate;
    expect(rise).toBeGreaterThan(6);
    expect(rise).toBeLessThan(12);
    expect(strict.scenarios[0]!.alerts.map((a) => a.code)).toContain("OVERCORRECTION_24H");
    expect(loose.scenarios[0]!.alerts.map((a) => a.code)).not.toContain("OVERCORRECTION_24H");
  });
  it("advierte cuando la orina es más concentrada que la solución (patrón SIADH)", () => {
    const out = runSimulation(req({}, { urineSodiumMmolL: 150, urinePotassiumMmolL: 60 }));
    expect(out.scenarios[0]!.alerts.map((a) => a.code)).toEqual(expect.arrayContaining(["URINE_EXCEEDS_INFUSATE", "WORSENING"]));
  });
  it("hipernatremia con D5W rápido: descenso > 10 mmol/L/24 h", () => {
    const out = runSimulation({
      patient: { ageYears: 76, sex: "male", weightKg: 70, serumSodiumMmolL: 168, urineOutputMlH: 40, urineSodiumMmolL: 40, urinePotassiumMmolL: 30 },
      scenarios: [{ label: "D5W", solutionId: "d5w", rateMlH: 300, horizonHours: 24 }],
    });
    expect(out.patient.freeWaterDeficit!.liters).toBe(7);
    expect(out.scenarios[0]!.alerts.map((a) => a.code)).toContain("HYPER_FAST_CORRECTION");
  });
});

describe("propiedades matemáticas", () => {
  const patientArb = fc.record({
    ageYears: fc.integer({ min: 18, max: 95 }),
    sex: fc.constantFrom("male" as const, "female" as const),
    weightKg: fc.double({ min: 40, max: 150, noNaN: true }),
    serumSodiumMmolL: fc.double({ min: 105, max: 175, noNaN: true }),
    urineOutputMlH: fc.double({ min: 0, max: 200, noNaN: true }),
    urineSodiumMmolL: fc.double({ min: 10, max: 200, noNaN: true }),
    urinePotassiumMmolL: fc.double({ min: 5, max: 100, noNaN: true }),
  });

  it("mayor concentración de la solución → sodio estimado mayor o igual", () => {
    fc.assert(
      fc.property(patientArb, fc.integer({ min: 10, max: 300 }), (patient, rate) => {
        const out = runSimulation({
          patient,
          scenarios: [
            { label: "D5W", solutionId: "d5w", rateMlH: rate, horizonHours: 12 },
            { label: "0,45", solutionId: "nacl-045", rateMlH: rate, horizonHours: 12 },
            { label: "0,9", solutionId: "nacl-09", rateMlH: rate, horizonHours: 12 },
            { label: "3", solutionId: "nacl-3", rateMlH: rate, horizonHours: 12 },
          ],
        });
        const ends = out.scenarios.map((s) => s.points.at(-1)!.estimate);
        if (ends.some((e) => e === null)) return true;
        for (let i = 1; i < ends.length; i++) if (ends[i]! + 1e-9 < ends[i - 1]!) return false;
        return true;
      }),
      { numRuns: 150 },
    );
  });

  it("la banda nunca se invierte y contiene la estimación", () => {
    fc.assert(
      fc.property(patientArb, fc.constantFrom("d5w", "nacl-09", "nacl-3", "ringer-lactate"), fc.integer({ min: 0, max: 400 }), (patient, sol, rate) => {
        const out = runSimulation({ patient, scenarios: [{ label: "x", solutionId: sol, rateMlH: rate, horizonHours: 48 }] });
        return out.scenarios[0]!.points.every((p) => p.estimate === null || (p.low! <= p.estimate && p.estimate <= p.high!));
      }),
      { numRuns: 150 },
    );
  });

  it("velocidad 0 sin pérdidas ni ingesta → sodio constante", () => {
    fc.assert(
      fc.property(patientArb, (patient) => {
        const out = runSimulation({ patient: { ...patient, urineOutputMlH: 0 }, scenarios: [{ label: "x", solutionId: "nacl-3", rateMlH: 0, horizonHours: 24 }] });
        return out.scenarios[0]!.points.every((p) => p.estimate === null || Math.abs(p.estimate - patient.serumSodiumMmolL) < 0.06);
      }),
    );
  });

  it("primer litro sin pérdidas coincide con Adrogué-Madias", () => {
    fc.assert(
      fc.property(patientArb, fc.constantFrom("d5w", "nacl-045", "nacl-09", "nacl-3"), (patient, sol) => {
        const out = runSimulation({ patient: { ...patient, urineOutputMlH: 0 }, scenarios: [{ label: "x", solutionId: sol, rateMlH: 1000, horizonHours: 1 }] });
        const s = out.scenarios[0]!;
        const p1 = s.points.find((p) => p.hour === 1)!;
        if (p1.estimate === null) return true;
        return Math.abs(p1.deltaFromBaseline! - s.summary.adrogueMadiasDeltaPerLiter!) <= 0.11;
      }),
    );
  });
});
