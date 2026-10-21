import { z } from "zod";
import { ENGINE_VERSION } from "../version";
import { MODULE_DISCLAIMER, r1, type ModuleFinding, type ModuleResult, type ReasoningStep } from "./common";

export const potassiumInputSchema = z.object({
  potassium: z.number().min(1).max(10),
  ph: z.number().min(6.8).max(7.8).optional(),
  /** Para el gradiente transtubular (TTKG). */
  urineK: z.number().min(0).max(300).optional(),
  urineOsm: z.number().min(50).max(1400).optional(),
  plasmaOsm: z.number().min(200).max(400).optional(),
  hemolysis: z.boolean().default(false),
});
export type PotassiumInput = z.input<typeof potassiumInputSchema>;

export type KSeverity = "grave" | "moderada" | "leve" | null;

export interface PotassiumSummary {
  classification: "hipopotasemia" | "normopotasemia" | "hiperpotasemia";
  severity: KSeverity;
  /** K⁺ estimado a pH 7,40 (rango por variabilidad 0,2–1,7 mmol/L por 0,1 de pH). */
  adjustedAtPh740: { estimate: number; low: number; high: number } | null;
  ttkg: number | null;
  ecg: string[];
}

/** Clasificación (UK Kidney Association / práctica habitual). */
export function classifyPotassium(k: number): { classification: PotassiumSummary["classification"]; severity: KSeverity } {
  if (k < 3.5) return { classification: "hipopotasemia", severity: k < 2.5 ? "grave" : k < 3.0 ? "moderada" : "leve" };
  if (k > 5.4) return { classification: "hiperpotasemia", severity: k >= 6.5 ? "grave" : k >= 6.0 ? "moderada" : "leve" };
  return { classification: "normopotasemia", severity: null };
}

/** TTKG = (K orina / K plasma) / (Osm orina / Osm plasma). Válido si Osm orina > Osm plasma. */
export const ttkg = (uk: number, pk: number, uosm: number, posm: number) => uk / pk / (uosm / posm);

export function interpretPotassium(raw: PotassiumInput): ModuleResult<PotassiumSummary> {
  const x = potassiumInputSchema.parse(raw);
  const { classification, severity } = classifyPotassium(x.potassium);
  const steps: ReasoningStep[] = [];
  const findings: ModuleFinding[] = [];

  steps.push({
    id: "class",
    title: "Clasificación",
    result: severity ? `${classification[0]!.toUpperCase()}${classification.slice(1)} ${severity}` : "Potasio normal",
    detail: `K⁺ ${x.potassium} mmol/L (normal 3,5–5,4). Hipo: leve 3,0–3,4 · moderada 2,5–2,9 · grave < 2,5. Hiper: leve 5,5–5,9 · moderada 6,0–6,4 · grave ≥ 6,5.`,
    tone: severity ? "abnormal" : "normal",
  });

  if (x.hemolysis && classification === "hiperpotasemia")
    findings.push({ level: "warning", title: "Posible pseudohiperpotasemia", message: "Con hemólisis, trombocitosis o leucocitosis extrema el K⁺ medido puede estar falsamente elevado. Confirmar con nueva muestra." });

  let adjusted: PotassiumSummary["adjustedAtPh740"] = null;
  if (x.ph !== undefined) {
    const d = (7.4 - x.ph) * 10; // décimas de pH por debajo de 7,40
    const est = x.potassium - 0.6 * d;
    const a = x.potassium - 0.2 * d;
    const b = x.potassium - 1.7 * d;
    adjusted = { estimate: r1(est), low: r1(Math.min(a, b)), high: r1(Math.max(a, b)) };
    steps.push({
      id: "ph",
      title: "Efecto del pH",
      result: Math.abs(x.ph - 7.4) < 0.05 ? "pH casi normal: sin corrección relevante" : `K⁺ estimado a pH 7,40 ≈ ${r1(est)} mmol/L`,
      detail: `En acidosis el K⁺ sale de las células y en alcalosis entra. Por cada 0,1 de cambio de pH el K⁺ varía en sentido contrario ≈ 0,6 mmol/L (rango 0,2–1,7): estimación ${adjusted.low}–${adjusted.high}. Es un efecto mayor en acidosis minerales que en orgánicas.`,
      tone: "info",
    });
  }

  let ttkgValue: number | null = null;
  if (x.urineK !== undefined && x.urineOsm !== undefined && x.plasmaOsm !== undefined) {
    if (x.urineOsm > x.plasmaOsm) {
      ttkgValue = r1(ttkg(x.urineK, x.potassium, x.urineOsm, x.plasmaOsm));
      const interp =
        classification === "hipopotasemia"
          ? ttkgValue > 3
            ? "Pérdida renal de K⁺"
            : "Pérdida extrarrenal o desplazamiento"
          : classification === "hiperpotasemia"
            ? ttkgValue < 7
              ? "Excreción renal insuficiente (¿hipoaldosteronismo?)"
              : "Respuesta renal adecuada"
            : "Orientativo";
      steps.push({ id: "ttkg", title: "Gradiente transtubular (TTKG)", result: `${ttkgValue} · ${interp}`, detail: "Índice clásico de la acción de la aldosterona; hoy se usa con cautela y como orientación docente.", tone: "info" });
    } else {
      findings.push({ level: "info", title: "TTKG no interpretable", message: "Requiere orina más concentrada que el plasma." });
    }
  }

  const ecg =
    classification === "hiperpotasemia"
      ? ["T altas y picudas", "PR largo y P aplanada", "QRS ancho", "Patrón sinusoidal → FV / asistolia"].slice(0, severity === "grave" ? 4 : severity === "moderada" ? 3 : 1)
      : classification === "hipopotasemia"
        ? ["T aplanadas", "Ondas U", "Depresión del ST", "QT(U) largo, arritmias"].slice(0, severity === "grave" ? 4 : severity === "moderada" ? 3 : 2)
        : [];
  if (ecg.length)
    steps.push({ id: "ecg", title: "Cambios esperables en el ECG", result: ecg.join(" · "), detail: "Orientativo: la correlación entre el nivel de K⁺ y el ECG es imperfecta; un ECG normal no descarta riesgo.", tone: "info" });

  if (severity === "grave")
    findings.push({ level: "danger", title: `${classification === "hiperpotasemia" ? "Hiperpotasemia" : "Hipopotasemia"} grave`, message: "Riesgo de arritmias potencialmente mortales: en la práctica requiere valoración urgente y monitorización." });

  return {
    module: "potassium",
    engineVersion: ENGINE_VERSION,
    summary: { classification, severity, adjustedAtPh740: adjusted, ttkg: ttkgValue, ecg },
    steps,
    findings,
    differentials:
      classification === "hipopotasemia"
        ? [
            { group: "Desplazamiento intracelular", items: ["Insulina", "Agonistas β2", "Alcalosis", "Parálisis periódica"] },
            { group: "Pérdida renal", items: ["Diuréticos", "Hiperaldosteronismo", "Vómitos (vía bicarbonaturia)", "Hipomagnesemia", "ATR"] },
            { group: "Pérdida extrarrenal", items: ["Diarrea", "Laxantes", "Fístulas"] },
          ]
        : classification === "hiperpotasemia"
          ? [
              { group: "Pseudohiperpotasemia", items: ["Hemólisis", "Trombocitosis / leucocitosis", "Puño apretado"] },
              { group: "Redistribución", items: ["Acidosis (mineral)", "Déficit de insulina", "β-bloqueantes", "Rabdomiólisis / lisis tumoral"] },
              { group: "Excreción reducida", items: ["Insuficiencia renal", "IECA / ARA-II / espironolactona", "Hipoaldosteronismo", "AINE, trimetoprima"] },
            ]
          : [],
    references: classification === "hiperpotasemia" ? ["weiner", "adrogueK"] : ["gennari", "adrogueK"],
    disclaimer: MODULE_DISCLAIMER,
  };
}
