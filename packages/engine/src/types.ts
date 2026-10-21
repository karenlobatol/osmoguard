import type { ReferenceId } from "./references";

export type FindingLevel = "info" | "warning" | "danger" | "blocked";

/** Hallazgo determinista (aplicabilidad o alerta). Nunca es una orden terapéutica. */
export interface Finding {
  code: string;
  level: FindingLevel;
  title: string;
  message: string;
  references?: ReferenceId[];
}

export type SodiumClass = "hyponatremia" | "normonatremia" | "hypernatremia";
export type Confidence = "standard" | "low" | "blocked";
export type ResultStatus = "ok" | "warning" | "blocked";

export interface TbwEstimate {
  method: "fraction";
  fraction: number;
  liters: number;
  low: number;
  high: number;
  watsonLiters: number | null;
}

export interface PatientAssessment {
  classification: SodiumClass;
  severity: "leve" | "moderada" | "profunda" | "grave" | null;
  measuredSodium: number;
  correctedSodium: { katz: number; hillier: number } | null;
  tbw: TbwEstimate;
  freeWaterDeficit: { liters: number; low: number; high: number } | null;
  egfr: number | null;
  odsHighRisk: boolean;
  riskFactorsDetected: string[];
  electrolyteFreeWaterClearanceLH: number | null;
}

export interface SolutionComparisonRow {
  solutionId: string;
  name: string;
  cationMmolL: number;
  deltaPerLiter: number;
  low: number;
  high: number;
  direction: "sube" | "baja" | "neutra";
}

export interface TimelinePoint {
  hour: number;
  estimate: number | null;
  low: number | null;
  high: number | null;
  deltaFromBaseline: number | null;
  infusedL: number;
  netBalanceL: number;
  confidence: Confidence;
}

export interface ScenarioResult {
  label: string;
  solutionId: string;
  solutionName: string;
  rateMlH: number;
  horizonHours: number;
  status: ResultStatus;
  points: TimelinePoint[];
  summary: {
    deltaAt24h: { estimate: number; low: number; high: number } | null;
    deltaAtEnd: { estimate: number; low: number; high: number } | null;
    adrogueMadiasDeltaPerLiter: number | null;
  };
  alerts: Finding[];
}

export interface FormulaUsed {
  id: string;
  name: string;
  expression: string;
  units: string;
  references: ReferenceId[];
}

export interface SimulationOutput {
  engine: { name: string; version: string };
  status: ResultStatus;
  patient: PatientAssessment;
  applicability: Finding[];
  solutionComparison: SolutionComparisonRow[];
  scenarios: ScenarioResult[];
  assumptions: string[];
  formulas: FormulaUsed[];
  disclaimer: string;
}
