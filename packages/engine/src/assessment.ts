import { LOSS_TYPES, SOLUTIONS, effectiveCation } from "./catalog";
import {
  adrogueMadiasDeltaPerLiter,
  correctedSodiumForGlucose,
  egfrCkdEpi2021,
  electrolyteFreeWaterClearance,
  freeWaterDeficit,
  tbwByFraction,
  tbwFraction,
  tbwWatson,
} from "./formulas";
import type { PatientInput } from "./schemas";
import type { Finding, PatientAssessment, SodiumClass, SolutionComparisonRow, TbwEstimate } from "./types";
import { round } from "./units";

/** Variación relativa asumida para la ACT estimada por fracción (±10 %). */
export const TBW_RELATIVE_UNCERTAINTY = 0.1;
/** Rango asumido de Na⁺+K⁺ urinario cuando no se ha medido (mmol/L). */
export const UNKNOWN_URINE_CATION = { nominal: 135, low: 20, high: 250 } as const;
/** K⁺ urinario asumido si solo se conoce el Na⁺ urinario (mmol/L). */
export const UNKNOWN_URINE_POTASSIUM = { nominal: 40, low: 20, high: 80 } as const;
/** Horizonte máximo (h) permitido cuando se desconoce la diuresis. */
export const MAX_HOURS_WITHOUT_URINE_DATA = 6;

export const SODIUM_LOW = 135;
export const SODIUM_HIGH = 145;

export function classifySodium(na: number): SodiumClass {
  if (na < SODIUM_LOW) return "hyponatremia";
  if (na > SODIUM_HIGH) return "hypernatremia";
  return "normonatremia";
}

function severityOf(na: number): PatientAssessment["severity"] {
  // Hiponatremia: clasificación bioquímica de la guía europea 2014.
  if (na < 125) return "profunda";
  if (na < 130) return "moderada";
  if (na < SODIUM_LOW) return "leve";
  // Hipernatremia: clasificación descriptiva habitual (no estandarizada internacionalmente).
  if (na >= 160) return "grave";
  if (na >= 150) return "moderada";
  if (na > SODIUM_HIGH) return "leve";
  return null;
}

export function estimateTbw(p: PatientInput): TbwEstimate {
  const fraction = tbwFraction(p.ageYears, p.sex);
  const liters = tbwByFraction(p.weightKg, p.ageYears, p.sex);
  const watson = p.heightCm !== undefined && p.ageYears >= 18 ? tbwWatson(p.weightKg, p.heightCm, p.ageYears, p.sex) : null;
  let low = liters * (1 - TBW_RELATIVE_UNCERTAINTY);
  let high = liters * (1 + TBW_RELATIVE_UNCERTAINTY);
  if (watson !== null && watson > 0) {
    low = Math.min(low, watson);
    high = Math.max(high, watson);
  }
  return {
    method: "fraction",
    fraction,
    liters: round(liters, 2),
    low: round(low, 2),
    high: round(high, 2),
    watsonLiters: watson === null ? null : round(watson, 2),
  };
}

/** Composición urinaria efectiva (Na⁺+K⁺) con su rango. `measured` indica si ambos iones se midieron. */
export function urineCation(p: PatientInput): { nominal: number; low: number; high: number; measured: boolean } {
  if (p.urineSodiumMmolL === undefined) return { ...UNKNOWN_URINE_CATION, measured: false };
  if (p.urinePotassiumMmolL === undefined) {
    return {
      nominal: p.urineSodiumMmolL + UNKNOWN_URINE_POTASSIUM.nominal,
      low: p.urineSodiumMmolL + UNKNOWN_URINE_POTASSIUM.low,
      high: p.urineSodiumMmolL + UNKNOWN_URINE_POTASSIUM.high,
      measured: false,
    };
  }
  const c = p.urineSodiumMmolL + p.urinePotassiumMmolL;
  // Incertidumbre analítica y de variación temporal de la muestra puntual: ±20 %.
  return { nominal: c, low: c * 0.8, high: c * 1.2, measured: true };
}

export function detectRiskFactors(p: PatientInput): string[] {
  const found: string[] = [];
  if (p.serumSodiumMmolL <= 105) found.push("Na sérico ≤ 105 mmol/L");
  if (p.riskFactors.hypokalemia || (p.serumPotassiumMmolL !== undefined && p.serumPotassiumMmolL < 3.5)) found.push("Hipopotasemia");
  if (p.riskFactors.alcoholism) found.push("Consumo crónico de alcohol");
  if (p.riskFactors.malnutrition) found.push("Desnutrición");
  if (p.riskFactors.advancedLiverDisease) found.push("Hepatopatía avanzada");
  return found;
}

export function assessPatient(p: PatientInput): PatientAssessment {
  const tbw = estimateTbw(p);
  const classification = classifySodium(p.serumSodiumMmolL);
  const riskFactorsDetected = classification === "hyponatremia" ? detectRiskFactors(p) : [];
  const correctedSodium =
    p.glucoseMgDl !== undefined && p.glucoseMgDl > 100
      ? {
          katz: round(correctedSodiumForGlucose(p.serumSodiumMmolL, p.glucoseMgDl, 1.6), 1),
          hillier: round(correctedSodiumForGlucose(p.serumSodiumMmolL, p.glucoseMgDl, 2.4), 1),
        }
      : null;
  const fwd =
    classification === "hypernatremia"
      ? {
          liters: round(freeWaterDeficit(tbw.liters, p.serumSodiumMmolL), 2),
          low: round(freeWaterDeficit(tbw.low, p.serumSodiumMmolL), 2),
          high: round(freeWaterDeficit(tbw.high, p.serumSodiumMmolL), 2),
        }
      : null;
  const egfr = p.creatinineMgDl !== undefined && p.ageYears >= 18 ? round(egfrCkdEpi2021(p.creatinineMgDl, p.ageYears, p.sex), 0) : null;
  const efwc =
    p.urineOutputMlH !== undefined && p.urineSodiumMmolL !== undefined && p.urinePotassiumMmolL !== undefined
      ? round(electrolyteFreeWaterClearance(p.urineOutputMlH / 1000, p.urineSodiumMmolL, p.urinePotassiumMmolL, p.serumSodiumMmolL), 3)
      : null;
  return {
    classification,
    severity: severityOf(p.serumSodiumMmolL),
    measuredSodium: p.serumSodiumMmolL,
    correctedSodium,
    tbw,
    freeWaterDeficit: fwd,
    egfr,
    odsHighRisk: riskFactorsDetected.length > 0,
    riskFactorsDetected,
    electrolyteFreeWaterClearanceLH: efwc,
  };
}

/**
 * Límites de aplicabilidad del modelo. Un hallazgo "blocked" impide mostrar resultados numéricos.
 */
export function assessApplicability(p: PatientInput, a: PatientAssessment): Finding[] {
  const f: Finding[] = [];
  if (p.ageYears < 18)
    f.push({
      code: "PEDIATRIC",
      level: "blocked",
      title: "Población pediátrica fuera del alcance",
      message: "El motor solo contempla adultos (≥ 18 años). Las fracciones de agua corporal y los límites de corrección pediátricos difieren.",
    });
  if (p.onKidneyReplacementTherapy)
    f.push({
      code: "KRT",
      level: "blocked",
      title: "Terapia de reemplazo renal",
      message: "La diálisis o hemofiltración modifica el balance de sodio y agua de forma que este modelo no representa.",
    });
  if (p.serumSodiumMmolL < 100 || p.serumSodiumMmolL > 185)
    f.push({
      code: "NA_OUT_OF_RANGE",
      level: "blocked",
      title: "Sodio fuera del rango del modelo",
      message: "Valores < 100 o > 185 mmol/L quedan fuera del rango en que el motor ha sido verificado. Confirme el valor de laboratorio.",
    });
  if (p.weightKg < 30 || p.weightKg > 250)
    f.push({
      code: "WEIGHT_OUT_OF_RANGE",
      level: "blocked",
      title: "Peso fuera del rango del modelo",
      message: "Las estimaciones de agua corporal por fracción de peso no son aplicables por debajo de 30 kg o por encima de 250 kg.",
    });
  if (p.glucoseMgDl !== undefined && p.glucoseMgDl >= 600)
    f.push({
      code: "HYPERGLYCEMIC_CRISIS",
      level: "blocked",
      title: "Hiperglucemia extrema",
      message: "Con glucosa ≥ 600 mg/dL el sodio cambia por desplazamiento osmótico de agua al corregir la glucemia; los modelos de Edelman no lo representan.",
      references: ["katz", "hillier"],
    });
  else if (p.glucoseMgDl !== undefined && p.glucoseMgDl > 250)
    f.push({
      code: "HYPERGLYCEMIA",
      level: "warning",
      title: "Hiperglucemia significativa",
      message: "La glucosa elevada desplaza agua al extracelular. Interprete el sodio corregido y considere que la evolución de la glucemia alterará el sodio de forma no modelada.",
      references: ["katz", "hillier"],
    });
  if (a.classification === "hyponatremia" && a.correctedSodium && a.correctedSodium.katz >= SODIUM_LOW)
    f.push({
      code: "TRANSLOCATIONAL",
      level: "warning",
      title: "Posible hiponatremia por translocación",
      message: "Con la corrección por glucosa el sodio queda en rango normal: la hiponatremia puede ser hipertónica y no responder a la lógica de este simulador.",
      references: ["katz", "hillier"],
    });
  if (a.egfr !== null && a.egfr < 30)
    f.push({
      code: "LOW_EGFR",
      level: "warning",
      title: "Función renal muy reducida",
      message: `eGFR estimado ${a.egfr} mL/min/1,73 m². La respuesta renal a la carga de sodio y agua es poco predecible; la incertidumbre real supera la mostrada.`,
      references: ["ckdEpi2021"],
    });
  if (p.urineOutputMlH === undefined)
    f.push({
      code: "NO_URINE_OUTPUT",
      level: "warning",
      title: "Diuresis no informada",
      message: `Sin diuresis el modelo asume un sistema cerrado. Las estimaciones se limitan a las primeras ${MAX_HOURS_WITHOUT_URINE_DATA} h y se bloquean después.`,
      references: ["barsoum"],
    });
  else {
    const uc = urineCation(p);
    if (!uc.measured && p.urineOutputMlH > 0)
      f.push({
        code: "URINE_COMPOSITION_UNKNOWN",
        level: "warning",
        title: "Composición urinaria desconocida",
        message: "Sin Na⁺ y K⁺ urinarios se asume un rango amplio (20–250 mmol/L). La banda de incertidumbre será ancha y la confianza baja.",
      });
    if (p.urineOutputMlH < 0.5 * p.weightKg)
      f.push({
        code: "OLIGURIA",
        level: "info",
        title: "Oliguria",
        message: "Diuresis < 0,5 mL/kg/h. Un cambio brusco de la diuresis (p. ej. acuaresis) invalidaría las estimaciones.",
      });
    if (a.classification === "hyponatremia" && p.urineOutputMlH > 2 * p.weightKg)
      f.push({
        code: "HIGH_URINE_OUTPUT",
        level: "warning",
        title: "Diuresis elevada en hiponatremia",
        message: "Una diuresis abundante y diluida puede producir sobrecorrección rápida no prevista por fórmulas de cambio inicial.",
        references: ["verbalis", "spasovski"],
      });
  }
  if (a.classification === "normonatremia")
    f.push({
      code: "NORMONATREMIA",
      level: "info",
      title: "Sodio en rango normal",
      message: "No hay disnatremia. Los escenarios se muestran solo con fines ilustrativos.",
    });
  if (a.classification === "hyponatremia" && p.chronicity === "unknown")
    f.push({
      code: "CHRONICITY_UNKNOWN",
      level: "info",
      title: "Cronología desconocida",
      message: "Si se desconoce la duración, las guías recomiendan tratar la hiponatremia como crónica (> 48 h) a efectos de límites de corrección.",
      references: ["spasovski", "verbalis"],
    });
  if (a.odsHighRisk)
    f.push({
      code: "ODS_HIGH_RISK",
      level: "warning",
      title: "Factores de riesgo de desmielinización osmótica",
      message: `Detectados: ${a.riskFactorsDetected.join(", ")}. Se aplica el umbral de corrección para alto riesgo.`,
      references: ["verbalis"],
    });
  return f;
}

/** Comparación de Δ Na por litro (Adrogué-Madias) para todo el catálogo. */
export function compareSolutions(p: PatientInput, tbw: TbwEstimate): SolutionComparisonRow[] {
  return SOLUTIONS.map((s) => {
    const c = effectiveCation(s);
    const nominal = adrogueMadiasDeltaPerLiter(c, p.serumSodiumMmolL, tbw.liters);
    const a = adrogueMadiasDeltaPerLiter(c, p.serumSodiumMmolL, tbw.low);
    const b = adrogueMadiasDeltaPerLiter(c, p.serumSodiumMmolL, tbw.high);
    return {
      solutionId: s.id,
      name: s.shortName,
      cationMmolL: c,
      deltaPerLiter: round(nominal, 1),
      low: round(Math.min(a, b), 1),
      high: round(Math.max(a, b), 1),
      direction: Math.abs(nominal) < 0.05 ? "neutra" : nominal > 0 ? "sube" : "baja",
    };
  });
}

export function lossComposition(type: keyof typeof LOSS_TYPES, measured?: number) {
  if (measured !== undefined) return { nominal: measured, low: measured * 0.8, high: measured * 1.2 };
  const t = LOSS_TYPES[type];
  return { nominal: t.nominal, low: t.low, high: t.high };
}
