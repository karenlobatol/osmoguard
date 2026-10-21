import { z } from "zod";
import { LOSS_TYPES, SOLUTIONS } from "./catalog";

/**
 * Esquemas de entrada del motor. Los límites de validación son de PLAUSIBILIDAD de datos,
 * no de aplicabilidad clínica: un valor plausible puede seguir estando fuera del alcance
 * del modelo (ver applicability.ts).
 */

const lossTypeIds = Object.keys(LOSS_TYPES) as [keyof typeof LOSS_TYPES, ...(keyof typeof LOSS_TYPES)[]];
const solutionIds = SOLUTIONS.map((s) => s.id) as [string, ...string[]];

export const sexSchema = z.enum(["male", "female"]);
export const chronicitySchema = z.enum(["acute", "chronic", "unknown"]);

export const otherLossSchema = z.object({
  type: z.enum(lossTypeIds),
  mlPerHour: z.number().min(0).max(1000),
  /** Composición medida (Na⁺+K⁺ mmol/L), si se conoce. */
  measuredCationMmolL: z.number().min(0).max(300).optional(),
});

export const riskFactorsSchema = z.object({
  alcoholism: z.boolean().default(false),
  malnutrition: z.boolean().default(false),
  advancedLiverDisease: z.boolean().default(false),
  hypokalemia: z.boolean().default(false),
  thiazideUse: z.boolean().default(false),
});

export const patientInputSchema = z.object({
  ageYears: z.number().int().min(0).max(120),
  sex: sexSchema,
  weightKg: z.number().min(1).max(400),
  heightCm: z.number().min(40).max(250).optional(),
  serumSodiumMmolL: z.number().min(80).max(220),
  serumPotassiumMmolL: z.number().min(1).max(10).optional(),
  glucoseMgDl: z.number().min(10).max(3000).optional(),
  creatinineMgDl: z.number().min(0.1).max(30).optional(),
  onKidneyReplacementTherapy: z.boolean().default(false),
  urineOutputMlH: z.number().min(0).max(2000).optional(),
  urineSodiumMmolL: z.number().min(0).max(400).optional(),
  urinePotassiumMmolL: z.number().min(0).max(300).optional(),
  oralWaterIntakeMlH: z.number().min(0).max(1000).default(0),
  otherLosses: z.array(otherLossSchema).max(5).default([]),
  chronicity: chronicitySchema.default("unknown"),
  riskFactors: riskFactorsSchema.default({}),
});

export const scenarioInputSchema = z.object({
  label: z.string().trim().min(1).max(60),
  solutionId: z.enum(solutionIds),
  /** Velocidad HIPOTÉTICA introducida por el usuario con fines educativos. */
  rateMlH: z.number().min(0).max(1000),
  horizonHours: z.number().int().min(1).max(48),
});

/** Umbrales de alerta configurables por el usuario dentro de rangos acotados. */
export const alertConfigSchema = z.object({
  hypoMaxRise24hStandard: z.number().min(6).max(12).default(10),
  hypoMaxRise24hHighRisk: z.number().min(4).max(10).default(8),
  hypoMaxRise48h: z.number().min(12).max(20).default(18),
  hyperMaxFall24h: z.number().min(6).max(12).default(10),
});

export const simulationRequestSchema = z.object({
  patient: patientInputSchema,
  scenarios: z.array(scenarioInputSchema).min(1).max(4),
  alertConfig: alertConfigSchema.default({}),
});

export type PatientInput = z.infer<typeof patientInputSchema>;
export type PatientInputRaw = z.input<typeof patientInputSchema>;
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type AlertConfig = z.infer<typeof alertConfigSchema>;
export type SimulationRequest = z.infer<typeof simulationRequestSchema>;
export type SimulationRequestRaw = z.input<typeof simulationRequestSchema>;
export type OtherLoss = z.infer<typeof otherLossSchema>;
export type RiskFactors = z.infer<typeof riskFactorsSchema>;

export const DEFAULT_ALERT_CONFIG: AlertConfig = alertConfigSchema.parse({});
