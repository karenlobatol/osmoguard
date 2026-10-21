import { z } from "zod";
import { SOLUTIONS, creatinineMgDlToUmol, creatinineUmolToMgDl, glucoseMgDlToMmol, glucoseMmolToMgDl, round, type SimulationRequest, type SimulationRequestRaw } from "@osmoguard/engine";

/** Esquema del FORMULARIO (con unidades seleccionables). El servidor vuelve a validar con el esquema del motor. */

const req = (min: number, max: number) =>
  z.number({ required_error: "Obligatorio", invalid_type_error: "Obligatorio" }).min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`);
const opt = (min: number, max: number) => z.number({ invalid_type_error: "Número no válido" }).min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`).optional();

const solutionIds = SOLUTIONS.map((s) => s.id) as [string, ...string[]];

export const formSchema = z
  .object({
    patient: z.object({
      ageYears: req(0, 120).int("Años enteros"),
      sex: z.enum(["male", "female"], { errorMap: () => ({ message: "Seleccione el sexo biológico" }) }),
      weightKg: req(1, 400),
      heightCm: opt(40, 250),
      chronicity: z.enum(["acute", "chronic", "unknown"]),
      serumSodiumMmolL: req(80, 220),
      serumPotassiumMmolL: opt(1, 10),
      glucose: z.number({ invalid_type_error: "Número no válido" }).positive().optional(),
      glucoseUnit: z.enum(["mg/dL", "mmol/L"]),
      creatinine: z.number({ invalid_type_error: "Número no válido" }).positive().optional(),
      creatinineUnit: z.enum(["mg/dL", "µmol/L"]),
      onKidneyReplacementTherapy: z.boolean(),
      urineKnown: z.boolean(),
      urineOutputMlH: opt(0, 2000),
      urineSodiumMmolL: opt(0, 400),
      urinePotassiumMmolL: opt(0, 300),
      oralWaterIntakeMlH: opt(0, 1000),
      otherLosses: z
        .array(z.object({ type: z.enum(["insensible", "sweat", "vomiting", "diarrhea", "drain"]), mlPerHour: req(0, 1000) }))
        .max(5),
      riskFactors: z.object({
        alcoholism: z.boolean(),
        malnutrition: z.boolean(),
        advancedLiverDisease: z.boolean(),
        hypokalemia: z.boolean(),
        thiazideUse: z.boolean(),
      }),
    }),
    scenarios: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Obligatorio").max(60),
          solutionId: z.enum(solutionIds, { errorMap: () => ({ message: "Seleccione una solución" }) }),
          rateMlH: req(0, 1000),
          horizonHours: req(1, 48).int("Horas enteras"),
        }),
      )
      .min(1)
      .max(4),
  })
  .superRefine((v, ctx) => {
    const p = v.patient;
    if (p.urineKnown && p.urineOutputMlH === undefined) ctx.addIssue({ code: "custom", path: ["patient", "urineOutputMlH"], message: "Indique la diuresis o márquela como desconocida" });
    if (p.glucose !== undefined) {
      const mg = p.glucoseUnit === "mg/dL" ? p.glucose : glucoseMmolToMgDl(p.glucose);
      if (mg < 10 || mg > 3000) ctx.addIssue({ code: "custom", path: ["patient", "glucose"], message: "Valor fuera de rango plausible" });
    }
    if (p.creatinine !== undefined) {
      const mg = p.creatinineUnit === "mg/dL" ? p.creatinine : creatinineUmolToMgDl(p.creatinine);
      if (mg < 0.1 || mg > 30) ctx.addIssue({ code: "custom", path: ["patient", "creatinine"], message: "Valor fuera de rango plausible" });
    }
  });

export type FormValues = z.infer<typeof formSchema>;

export const STEP_FIELDS = [
  ["patient.ageYears", "patient.sex", "patient.weightKg", "patient.heightCm", "patient.chronicity"],
  ["patient.serumSodiumMmolL", "patient.serumPotassiumMmolL", "patient.glucose", "patient.creatinine"],
  ["patient.urineOutputMlH", "patient.urineSodiumMmolL", "patient.urinePotassiumMmolL", "patient.oralWaterIntakeMlH", "patient.otherLosses"],
  ["scenarios"],
] as const;

export const emptyForm: FormValues = {
  patient: {
    ageYears: undefined as unknown as number,
    sex: undefined as unknown as "male",
    weightKg: undefined as unknown as number,
    chronicity: "unknown",
    serumSodiumMmolL: undefined as unknown as number,
    glucoseUnit: "mg/dL",
    creatinineUnit: "mg/dL",
    onKidneyReplacementTherapy: false,
    urineKnown: true,
    otherLosses: [],
    riskFactors: { alcoholism: false, malnutrition: false, advancedLiverDisease: false, hypokalemia: false, thiazideUse: false },
  },
  scenarios: [{ label: "Escenario A", solutionId: "nacl-09", rateMlH: undefined as unknown as number, horizonHours: 24 }],
};

/** Convierte el formulario a la entrada del motor (unidades canónicas mg/dL). */
export function toRequest(v: FormValues, alertConfig: SimulationRequestRaw["alertConfig"]): SimulationRequestRaw {
  const p = v.patient;
  const glucoseMgDl = p.glucose === undefined ? undefined : round(p.glucoseUnit === "mg/dL" ? p.glucose : glucoseMmolToMgDl(p.glucose), 1);
  const creatinineMgDl = p.creatinine === undefined ? undefined : round(p.creatinineUnit === "mg/dL" ? p.creatinine : creatinineUmolToMgDl(p.creatinine), 3);
  return {
    patient: {
      ageYears: p.ageYears,
      sex: p.sex,
      weightKg: p.weightKg,
      heightCm: p.heightCm,
      chronicity: p.chronicity,
      serumSodiumMmolL: p.serumSodiumMmolL,
      serumPotassiumMmolL: p.serumPotassiumMmolL,
      glucoseMgDl,
      creatinineMgDl,
      onKidneyReplacementTherapy: p.onKidneyReplacementTherapy,
      urineOutputMlH: p.urineKnown ? p.urineOutputMlH : undefined,
      urineSodiumMmolL: p.urineKnown ? p.urineSodiumMmolL : undefined,
      urinePotassiumMmolL: p.urineKnown ? p.urinePotassiumMmolL : undefined,
      oralWaterIntakeMlH: p.oralWaterIntakeMlH ?? 0,
      otherLosses: p.otherLosses,
      riskFactors: p.riskFactors,
    },
    scenarios: v.scenarios,
    alertConfig,
  };
}

export function fromRequest(r: SimulationRequest): FormValues {
  const p = r.patient;
  return {
    patient: {
      ...emptyForm.patient,
      ageYears: p.ageYears,
      sex: p.sex,
      weightKg: p.weightKg,
      heightCm: p.heightCm,
      chronicity: p.chronicity,
      serumSodiumMmolL: p.serumSodiumMmolL,
      serumPotassiumMmolL: p.serumPotassiumMmolL,
      glucose: p.glucoseMgDl,
      creatinine: p.creatinineMgDl,
      onKidneyReplacementTherapy: p.onKidneyReplacementTherapy,
      urineKnown: p.urineOutputMlH !== undefined,
      urineOutputMlH: p.urineOutputMlH,
      urineSodiumMmolL: p.urineSodiumMmolL,
      urinePotassiumMmolL: p.urinePotassiumMmolL,
      oralWaterIntakeMlH: p.oralWaterIntakeMlH || undefined,
      otherLosses: p.otherLosses.map((l) => ({ type: l.type, mlPerHour: l.mlPerHour })),
      riskFactors: p.riskFactors,
    },
    scenarios: r.scenarios,
  };
}

/** Casos FICTICIOS para docencia y demostración. No corresponden a pacientes reales. */
export const EXAMPLE_CASES: { id: string; title: string; summary: string; values: FormValues }[] = [
  {
    id: "siadh",
    title: "Hiponatremia tipo SIADH",
    summary: "Mujer 58 a, Na 118, orina concentrada. Compara NaCl 0,9 % frente a 3 %.",
    values: {
      patient: {
        ...emptyForm.patient,
        ageYears: 58,
        sex: "female",
        weightKg: 62,
        heightCm: 160,
        chronicity: "chronic",
        serumSodiumMmolL: 118,
        serumPotassiumMmolL: 3.9,
        glucose: 105,
        creatinine: 0.7,
        urineOutputMlH: 45,
        urineSodiumMmolL: 110,
        urinePotassiumMmolL: 45,
      },
      scenarios: [
        { label: "Salino isotónico", solutionId: "nacl-09", rateMlH: 80, horizonHours: 24 },
        { label: "Salino hipertónico", solutionId: "nacl-3", rateMlH: 25, horizonHours: 24 },
      ],
    },
  },
  {
    id: "hyper",
    title: "Hipernatremia en adulto mayor",
    summary: "Hombre 81 a, Na 162, ingesta pobre. Compara D5W y NaCl 0,45 %.",
    values: {
      patient: {
        ...emptyForm.patient,
        ageYears: 81,
        sex: "male",
        weightKg: 64,
        chronicity: "chronic",
        serumSodiumMmolL: 162,
        serumPotassiumMmolL: 4.1,
        creatinine: 1.6,
        urineOutputMlH: 35,
        urineSodiumMmolL: 40,
        urinePotassiumMmolL: 35,
        otherLosses: [{ type: "insensible", mlPerHour: 40 }],
      },
      scenarios: [
        { label: "Dextrosa 5 %", solutionId: "d5w", rateMlH: 120, horizonHours: 24 },
        { label: "Salino 0,45 %", solutionId: "nacl-045", rateMlH: 150, horizonHours: 24 },
      ],
    },
  },
  {
    id: "ods",
    title: "Hiponatremia con alto riesgo de ODS",
    summary: "Hombre 49 a, Na 112, alcoholismo e hipopotasemia, diuresis abundante.",
    values: {
      patient: {
        ...emptyForm.patient,
        ageYears: 49,
        sex: "male",
        weightKg: 70,
        chronicity: "unknown",
        serumSodiumMmolL: 112,
        serumPotassiumMmolL: 2.9,
        urineOutputMlH: 160,
        urineSodiumMmolL: 25,
        urinePotassiumMmolL: 15,
        riskFactors: { ...emptyForm.patient.riskFactors, alcoholism: true, malnutrition: true },
      },
      scenarios: [{ label: "Salino isotónico", solutionId: "nacl-09", rateMlH: 100, horizonHours: 24 }],
    },
  },
];

export const glucoseHint = (v?: number, unit?: string) =>
  v === undefined ? undefined : unit === "mg/dL" ? `≈ ${round(glucoseMgDlToMmol(v), 1)} mmol/L` : `≈ ${round(glucoseMmolToMgDl(v), 0)} mg/dL`;
export const creatinineHint = (v?: number, unit?: string) =>
  v === undefined ? undefined : unit === "mg/dL" ? `≈ ${round(creatinineMgDlToUmol(v), 0)} µmol/L` : `≈ ${round(creatinineUmolToMgDl(v), 2)} mg/dL`;
