import type { ReferenceId } from "../references";

/** Paso del razonamiento clínico mostrado al estudiante. */
export interface ReasoningStep {
  id: string;
  title: string;
  /** Conclusión breve del paso (p. ej. "Acidemia"). */
  result: string;
  /** Explicación con los números utilizados. */
  detail: string;
  tone: "normal" | "abnormal" | "warning" | "info";
}

export interface ModuleFinding {
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
}

export interface ModuleResult<TSummary> {
  module: string;
  engineVersion: string;
  summary: TSummary;
  steps: ReasoningStep[];
  findings: ModuleFinding[];
  /** Diagnóstico diferencial orientativo (docente, no exhaustivo). */
  differentials: { group: string; items: string[] }[];
  references: ReferenceId[];
  disclaimer: string;
}

export const MODULE_DISCLAIMER =
  "Interpretación educativa basada en reglas publicadas. No sustituye la valoración clínica, puede no aplicarse a trastornos mixtos complejos y no indica tratamientos.";

export const r1 = (v: number) => Math.round(v * 10) / 10;
export const r2 = (v: number) => Math.round(v * 100) / 100;
