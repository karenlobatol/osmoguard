import { z } from "zod";
import { ENGINE_VERSION } from "../version";
import { MODULE_DISCLAIMER, r1, r2, type ModuleFinding, type ModuleResult, type ReasoningStep } from "./common";

export const calciumInputSchema = z.object({
  /** Calcio total en mg/dL. */
  totalCalcium: z.number().min(3).max(20),
  albumin: z.number().min(0.5).max(6),
  /** Calcio iónico en mmol/L, si se dispone. */
  ionizedMmolL: z.number().min(0.5).max(3).optional(),
});
export type CalciumInput = z.input<typeof calciumInputSchema>;

export interface CalciumSummary {
  corrected: number;
  correctedMmolL: number;
  classification: "hipocalcemia" | "normocalcemia" | "hipercalcemia";
  ionizedClassification: "bajo" | "normal" | "alto" | null;
}

export const MG_DL_PER_MMOL_CA = 4.008;
/** Payne: Ca corregido = Ca total + 0,8 × (4 − albúmina g/dL). */
export const correctedCalcium = (ca: number, alb: number) => ca + 0.8 * (4 - alb);

export function interpretCalcium(raw: CalciumInput): ModuleResult<CalciumSummary> {
  const x = calciumInputSchema.parse(raw);
  const corr = correctedCalcium(x.totalCalcium, x.albumin);
  const classification = corr < 8.5 ? "hipocalcemia" : corr > 10.5 ? "hipercalcemia" : "normocalcemia";
  const ion = x.ionizedMmolL === undefined ? null : x.ionizedMmolL < 1.15 ? "bajo" : x.ionizedMmolL > 1.32 ? "alto" : "normal";
  const steps: ReasoningStep[] = [
    {
      id: "corrected",
      title: "Calcio corregido por albúmina",
      result: `${r1(corr)} mg/dL · ${classification}`,
      detail: `${x.totalCalcium} + 0,8 × (4 − ${x.albumin}) = ${r1(corr)} mg/dL (${r2(corr / MG_DL_PER_MMOL_CA)} mmol/L). Normal 8,5–10,5 mg/dL.`,
      tone: classification === "normocalcemia" ? "normal" : "abnormal",
    },
  ];
  const findings: ModuleFinding[] = [];
  if (ion) {
    steps.push({
      id: "ionized",
      title: "Calcio iónico",
      result: `${x.ionizedMmolL} mmol/L · ${ion}`,
      detail: "Normal 1,15–1,32 mmol/L. Es la fracción fisiológicamente activa y prevalece sobre la corrección por albúmina.",
      tone: ion === "normal" ? "normal" : "abnormal",
    });
    const corrState = classification === "hipocalcemia" ? "bajo" : classification === "hipercalcemia" ? "alto" : "normal";
    if (corrState !== ion)
      findings.push({ level: "info", title: "Discrepancia corregido / iónico", message: "La fórmula de corrección es poco fiable (en especial con hipoalbuminemia marcada, insuficiencia renal o alteraciones del pH). Prevalece el calcio iónico." });
  } else if (x.albumin < 3) {
    findings.push({ level: "info", title: "Albúmina baja", message: "Con hipoalbuminemia la corrección es imprecisa: si es posible, mida el calcio iónico." });
  }
  if (corr >= 14) findings.push({ level: "danger", title: "Hipercalcemia grave", message: "≥ 14 mg/dL: riesgo de arritmias, deshidratación y alteración neurológica." });
  if (corr < 7) findings.push({ level: "danger", title: "Hipocalcemia grave", message: "< 7 mg/dL: riesgo de tetania, convulsiones y QT largo." });
  return {
    module: "calcium",
    engineVersion: ENGINE_VERSION,
    summary: { corrected: r1(corr), correctedMmolL: r2(corr / MG_DL_PER_MMOL_CA), classification, ionizedClassification: ion },
    steps,
    findings,
    differentials:
      classification === "hipercalcemia"
        ? [{ group: "Hipercalcemia", items: ["Hiperparatiroidismo primario", "Neoplasia (PTHrP, metástasis)", "Exceso de vitamina D", "Granulomatosis", "Tiazidas, litio", "Inmovilización"] }]
        : classification === "hipocalcemia"
          ? [{ group: "Hipocalcemia", items: ["Hipoparatiroidismo (posquirúrgico)", "Déficit de vitamina D", "Insuficiencia renal crónica", "Hipomagnesemia", "Pancreatitis", "Transfusión masiva (citrato)"] }]
          : [],
    references: ["payne"],
    disclaimer: MODULE_DISCLAIMER,
  };
}
