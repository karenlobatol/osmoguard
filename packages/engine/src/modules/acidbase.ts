import { z } from "zod";
import { ENGINE_VERSION } from "../version";
import { MODULE_DISCLAIMER, r1, r2, type ModuleFinding, type ModuleResult, type ReasoningStep } from "./common";

/** Gasometría arterial: interpretación ácido-base sistemática (enfoque fisiológico de Boston). */

export const acidBaseInputSchema = z.object({
  ph: z.number().min(6.5).max(8.0),
  pco2: z.number().min(5).max(150),
  hco3: z.number().min(1).max(60),
  sodium: z.number().min(100).max(180).optional(),
  chloride: z.number().min(60).max(140).optional(),
  albumin: z.number().min(0.5).max(6).optional(),
  lactate: z.number().min(0).max(30).optional(),
  /** Para osmolar gap. */
  measuredOsm: z.number().min(200).max(450).optional(),
  glucoseMgDl: z.number().min(10).max(3000).optional(),
  bunMgDl: z.number().min(1).max(250).optional(),
  urineNa: z.number().min(0).max(300).optional(),
  urineK: z.number().min(0).max(300).optional(),
  urineCl: z.number().min(0).max(300).optional(),
  respiratoryChronicity: z.enum(["acute", "chronic", "unknown"]).default("unknown"),
});
export type AcidBaseInput = z.input<typeof acidBaseInputSchema>;

export type PrimaryDisorder = "metabolic-acidosis" | "metabolic-alkalosis" | "respiratory-acidosis" | "respiratory-alkalosis";

export interface AcidBaseSummary {
  status: "acidemia" | "alkalemia" | "normal";
  primary: PrimaryDisorder[];
  /** Frase final, p. ej. "Acidosis metabólica con anión gap elevado y alcalosis metabólica asociada". */
  diagnosis: string;
  consistency: { calculatedPh: number; difference: number; consistent: boolean };
  compensation: { variable: "pco2" | "hco3"; expectedLow: number; expectedHigh: number; actual: number; adequate: boolean; secondary?: string } | null;
  anionGap: { value: number; corrected: number | null; elevated: boolean } | null;
  deltaRatio: number | null;
  osmolarGap: number | null;
  urineAnionGap: number | null;
}

const LABEL: Record<PrimaryDisorder, string> = {
  "metabolic-acidosis": "Acidosis metabólica",
  "metabolic-alkalosis": "Alcalosis metabólica",
  "respiratory-acidosis": "Acidosis respiratoria",
  "respiratory-alkalosis": "Alcalosis respiratoria",
};

/** pH calculado por Henderson-Hasselbalch: 6,1 + log10(HCO₃⁻ / (0,03 × pCO₂)). */
export const hendersonPh = (hco3: number, pco2: number) => 6.1 + Math.log10(hco3 / (0.03 * pco2));
/** Anión gap = Na⁺ − (Cl⁻ + HCO₃⁻); corrección por albúmina (Figge): + 2,5 × (4 − albúmina g/dL). */
export const anionGap = (na: number, cl: number, hco3: number) => na - (cl + hco3);
export const albuminCorrectedAg = (ag: number, albumin: number) => ag + 2.5 * (4 - albumin);
/** Fórmula de Winter: pCO₂ esperada = 1,5 × HCO₃⁻ + 8 ± 2. */
export const wintersExpectedPco2 = (hco3: number) => 1.5 * hco3 + 8;

export const NORMAL_AG = 12;

export function interpretAcidBase(raw: AcidBaseInput): ModuleResult<AcidBaseSummary> {
  const x = acidBaseInputSchema.parse(raw);
  const steps: ReasoningStep[] = [];
  const findings: ModuleFinding[] = [];
  const differentials: ModuleResult<AcidBaseSummary>["differentials"] = [];
  const extra: string[] = [];

  // 0. Coherencia interna
  const calcPh = hendersonPh(x.hco3, x.pco2);
  const diff = x.ph - calcPh;
  const consistent = Math.abs(diff) <= 0.05;
  steps.push({
    id: "consistency",
    title: "Coherencia de la gasometría",
    result: consistent ? "Valores coherentes" : "Valores incoherentes",
    detail: `pH calculado por Henderson-Hasselbalch ${r2(calcPh).toFixed(2)} frente al medido ${x.ph.toFixed(2)} (diferencia ${r2(Math.abs(diff)).toFixed(2)}).`,
    tone: consistent ? "normal" : "warning",
  });
  if (!consistent)
    findings.push({ level: "warning", title: "Posible error de muestra o de transcripción", message: "El pH no concuerda con pCO₂ y HCO₃⁻. Revise los valores antes de interpretar." });

  // 1. pH
  const status: AcidBaseSummary["status"] = x.ph < 7.35 ? "acidemia" : x.ph > 7.45 ? "alkalemia" : "normal";
  steps.push({
    id: "ph",
    title: "pH",
    result: status === "acidemia" ? "Acidemia" : status === "alkalemia" ? "Alcalemia" : "pH normal",
    detail: `pH ${x.ph.toFixed(2)} (normal 7,35–7,45).${status === "normal" ? " Un pH normal con pCO₂ o HCO₃⁻ alterados sugiere un trastorno mixto." : ""}`,
    tone: status === "normal" ? "normal" : "abnormal",
  });

  // 2. Trastorno primario
  const primary: PrimaryDisorder[] = [];
  const lowHco3 = x.hco3 < 22;
  const highHco3 = x.hco3 > 26;
  const highPco2 = x.pco2 > 45;
  const lowPco2 = x.pco2 < 35;
  if (status === "acidemia") {
    if (lowHco3) primary.push("metabolic-acidosis");
    if (highPco2) primary.push("respiratory-acidosis");
  } else if (status === "alkalemia") {
    if (highHco3) primary.push("metabolic-alkalosis");
    if (lowPco2) primary.push("respiratory-alkalosis");
  } else {
    if (lowHco3 && lowPco2) primary.push("metabolic-acidosis", "respiratory-alkalosis");
    else if (highHco3 && highPco2) primary.push("metabolic-alkalosis", "respiratory-acidosis");
    else if (lowHco3) primary.push("metabolic-acidosis");
    else if (highHco3) primary.push("metabolic-alkalosis");
    else if (highPco2) primary.push("respiratory-acidosis");
    else if (lowPco2) primary.push("respiratory-alkalosis");
  }
  steps.push({
    id: "primary",
    title: "Trastorno primario",
    result: primary.length ? primary.map((p) => LABEL[p]).join(" + ") : "Sin trastorno ácido-base evidente",
    detail: `HCO₃⁻ ${x.hco3} mmol/L (normal 22–26) · pCO₂ ${x.pco2} mmHg (normal 35–45).`,
    tone: primary.length ? "abnormal" : "normal",
  });

  // 3. Compensación (sobre el primer trastorno identificado)
  let compensation: AcidBaseSummary["compensation"] = null;
  const main = primary[0];
  if (main === "metabolic-acidosis") {
    const e = wintersExpectedPco2(x.hco3);
    const lo = e - 2;
    const hi = e + 2;
    const sec = x.pco2 > hi ? "Acidosis respiratoria asociada" : x.pco2 < lo ? "Alcalosis respiratoria asociada" : undefined;
    compensation = { variable: "pco2", expectedLow: r1(lo), expectedHigh: r1(hi), actual: x.pco2, adequate: !sec, secondary: sec };
    steps.push({
      id: "compensation",
      title: "Compensación respiratoria (Winter)",
      result: sec ?? "Compensación adecuada",
      detail: `pCO₂ esperada = 1,5 × ${x.hco3} + 8 ± 2 = ${r1(lo)}–${r1(hi)} mmHg; medida ${x.pco2} mmHg.`,
      tone: sec ? "abnormal" : "normal",
    });
    if (sec) extra.push(sec.toLowerCase());
  } else if (main === "metabolic-alkalosis") {
    const e = 0.7 * x.hco3 + 21;
    const lo = e - 2;
    const hi = e + 2;
    const sec = x.pco2 > hi ? "Acidosis respiratoria asociada" : x.pco2 < lo ? "Alcalosis respiratoria asociada" : undefined;
    compensation = { variable: "pco2", expectedLow: r1(lo), expectedHigh: r1(hi), actual: x.pco2, adequate: !sec, secondary: sec };
    steps.push({
      id: "compensation",
      title: "Compensación respiratoria",
      result: sec ?? "Compensación adecuada",
      detail: `pCO₂ esperada = 0,7 × ${x.hco3} + 21 ± 2 = ${r1(lo)}–${r1(hi)} mmHg; medida ${x.pco2} mmHg.`,
      tone: sec ? "abnormal" : "normal",
    });
    if (sec) extra.push(sec.toLowerCase());
  } else if (main === "respiratory-acidosis" || main === "respiratory-alkalosis") {
    const acid = main === "respiratory-acidosis";
    const delta = Math.abs(x.pco2 - 40) / 10;
    // HCO₃⁻ por cada 10 mmHg: acidosis aguda 1, crónica 3,5; alcalosis aguda 2, crónica 4.
    const [kAcute, kChronic] = acid ? [1, 3.5] : [2, 4];
    const sign = acid ? 1 : -1;
    const acute = 24 + sign * kAcute * delta;
    const chronic = 24 + sign * kChronic * delta;
    const which = x.respiratoryChronicity;
    const lo = which === "acute" ? acute - 2 : which === "chronic" ? chronic - 2 : Math.min(acute, chronic) - 2;
    const hi = which === "acute" ? acute + 2 : which === "chronic" ? chronic + 2 : Math.max(acute, chronic) + 2;
    const sec = x.hco3 > hi ? "Alcalosis metabólica asociada" : x.hco3 < lo ? "Acidosis metabólica asociada" : undefined;
    compensation = { variable: "hco3", expectedLow: r1(lo), expectedHigh: r1(hi), actual: x.hco3, adequate: !sec, secondary: sec };
    steps.push({
      id: "compensation",
      title: "Compensación metabólica",
      result: sec ?? (which === "unknown" ? `Compensación compatible (aguda ${r1(acute)} · crónica ${r1(chronic)})` : "Compensación adecuada"),
      detail: `HCO₃⁻ esperado: aguda ${r1(acute)}, crónica ${r1(chronic)} mmol/L (±2). Medido ${x.hco3} mmol/L.${which === "unknown" ? " Sin cronología se acepta el rango entre ambos." : ""}`,
      tone: sec ? "abnormal" : "normal",
    });
    if (sec) extra.push(sec.toLowerCase());
  }

  // 4. Anión gap
  let ag: AcidBaseSummary["anionGap"] = null;
  let deltaRatio: number | null = null;
  if (x.sodium !== undefined && x.chloride !== undefined) {
    const value = anionGap(x.sodium, x.chloride, x.hco3);
    const corrected = x.albumin !== undefined ? albuminCorrectedAg(value, x.albumin) : null;
    const used = corrected ?? value;
    const elevated = used > NORMAL_AG + 2;
    ag = { value: r1(value), corrected: corrected === null ? null : r1(corrected), elevated };
    steps.push({
      id: "anion-gap",
      title: "Anión gap",
      result: elevated ? "Elevado" : "Normal",
      detail: `AG = ${x.sodium} − (${x.chloride} + ${x.hco3}) = ${r1(value)} mmol/L${corrected !== null ? `; corregido por albúmina ${x.albumin} g/dL = ${r1(corrected)}` : ""} (referencia ≈ ${NORMAL_AG} ± 2).${x.albumin === undefined ? " Sin albúmina, una hipoalbuminemia puede ocultar un AG elevado." : ""}`,
      tone: elevated ? "abnormal" : "normal",
    });
    if (primary.includes("metabolic-acidosis") || elevated) {
      if (elevated) {
        // 5. Delta-delta
        const dAg = used - NORMAL_AG;
        const dHco3 = 24 - x.hco3;
        if (dHco3 > 0) {
          deltaRatio = r2(dAg / dHco3);
          const interp =
            deltaRatio < 0.4
              ? "Acidosis hiperclorémica (AG normal) predominante"
              : deltaRatio < 0.8
                ? "Acidosis con AG elevado + acidosis con AG normal"
                : deltaRatio <= 2
                  ? "Acidosis con AG elevado pura"
                  : "Acidosis con AG elevado + alcalosis metabólica asociada";
          steps.push({
            id: "delta",
            title: "Delta-delta",
            result: interp,
            detail: `Δ AG / Δ HCO₃⁻ = (${r1(used)} − ${NORMAL_AG}) / (24 − ${x.hco3}) = ${deltaRatio}. Referencia: < 0,4 · 0,4–0,8 · 0,8–2 · > 2.`,
            tone: deltaRatio >= 0.8 && deltaRatio <= 2 ? "normal" : "abnormal",
          });
          if (deltaRatio > 2) extra.push("alcalosis metabólica asociada (delta-delta)");
          if (deltaRatio >= 0.4 && deltaRatio < 0.8) extra.push("acidosis con AG normal asociada (delta-delta)");
        } else if (!primary.includes("metabolic-acidosis")) {
          extra.push("acidosis con AG elevado oculta");
          findings.push({ level: "warning", title: "AG elevado con HCO₃⁻ normal o alto", message: "Sugiere una acidosis con AG elevado enmascarada por una alcalosis metabólica." });
        }
        differentials.push({
          group: "AG elevado (GOLDMARK)",
          items: ["Glicoles (etilen/propilenglicol)", "Oxoprolina (paracetamol)", "L-lactato", "D-lactato", "Metanol", "Ácido acetilsalicílico", "Insuficiencia renal", "Cetoacidosis (diabética, alcohólica, ayuno)"],
        });
      } else if (primary.includes("metabolic-acidosis")) {
        differentials.push({
          group: "AG normal (hiperclorémica)",
          items: ["Diarrea / fístulas intestinales", "Acidosis tubular renal", "Infusión masiva de NaCl 0,9 %", "Ureterosigmoidostomía", "Inhibidores de la anhidrasa carbónica"],
        });
      }
    }
  } else if (primary.includes("metabolic-acidosis")) {
    findings.push({ level: "info", title: "Falta Na⁺ y Cl⁻", message: "Añádalos para calcular el anión gap y orientar la causa de la acidosis metabólica." });
  }

  // Anión gap urinario (acidosis con AG normal)
  let uag: number | null = null;
  if (x.urineNa !== undefined && x.urineK !== undefined && x.urineCl !== undefined) {
    uag = r1(x.urineNa + x.urineK - x.urineCl);
    if (primary.includes("metabolic-acidosis") && ag && !ag.elevated)
      steps.push({
        id: "urine-ag",
        title: "Anión gap urinario",
        result: uag < 0 ? "Negativo: pérdida digestiva más probable" : "Positivo: causa renal (ATR) más probable",
        detail: `AGu = ${x.urineNa} + ${x.urineK} − ${x.urineCl} = ${uag} mmol/L.`,
        tone: "info",
      });
  }

  // Brecha osmolar
  let osmolarGap: number | null = null;
  if (x.measuredOsm !== undefined && x.sodium !== undefined && x.glucoseMgDl !== undefined && x.bunMgDl !== undefined) {
    const calc = 2 * x.sodium + x.glucoseMgDl / 18 + x.bunMgDl / 2.8;
    osmolarGap = r1(x.measuredOsm - calc);
    steps.push({
      id: "osm-gap",
      title: "Brecha osmolar",
      result: osmolarGap > 10 ? "Elevada" : "Normal",
      detail: `Osm calculada = 2 × ${x.sodium} + ${x.glucoseMgDl}/18 + ${x.bunMgDl}/2,8 = ${r1(calc)}; medida ${x.measuredOsm}; brecha ${osmolarGap} mOsm/kg (normal < 10).`,
      tone: osmolarGap > 10 ? "abnormal" : "normal",
    });
    if (osmolarGap > 10 && ag?.elevated)
      findings.push({ level: "danger", title: "AG y brecha osmolar elevados", message: "Combinación clásica de intoxicación por alcoholes tóxicos (metanol, etilenglicol). Requiere valoración urgente." });
  }

  if (x.lactate !== undefined && x.lactate > 2)
    findings.push({ level: x.lactate >= 4 ? "danger" : "warning", title: `Lactato ${x.lactate} mmol/L`, message: "Hiperlactatemia: considere hipoperfusión, sepsis, isquemia o fármacos." });

  if (primary.includes("metabolic-alkalosis"))
    differentials.push({ group: "Alcalosis metabólica", items: ["Vómitos / aspiración nasogástrica", "Diuréticos de asa o tiazidas", "Hiperaldosteronismo", "Posthipercapnia", "Administración de álcalis"] });
  if (primary.includes("respiratory-acidosis"))
    differentials.push({ group: "Acidosis respiratoria", items: ["EPOC / asma grave", "Depresión del centro respiratorio (opioides, sedantes)", "Enfermedad neuromuscular", "Obesidad-hipoventilación"] });
  if (primary.includes("respiratory-alkalosis"))
    differentials.push({ group: "Alcalosis respiratoria", items: ["Ansiedad / dolor", "Hipoxemia (TEP, neumonía)", "Sepsis", "Embarazo", "Salicilatos (fase inicial)", "Hepatopatía"] });

  const parts: string[] = [];
  if (primary.length) {
    const first = primary.map((p) => LABEL[p]);
    if (primary[0] === "metabolic-acidosis" && ag) first[0] += ag.elevated ? " con anión gap elevado" : " con anión gap normal";
    parts.push(first.join(" y ").toLowerCase().replace(/^./, (c) => c.toUpperCase()));
  }
  const uniqueExtra = [...new Set(extra)];
  const diagnosis = parts.length
    ? `${parts[0]}${uniqueExtra.length ? `, con ${uniqueExtra.join(" y ")}` : ""}`
    : "Gasometría sin trastorno ácido-base evidente";

  return {
    module: "acid-base",
    engineVersion: ENGINE_VERSION,
    summary: { status, primary, diagnosis, consistency: { calculatedPh: r2(calcPh), difference: r2(diff), consistent }, compensation, anionGap: ag, deltaRatio, osmolarGap, urineAnionGap: uag },
    steps,
    findings,
    differentials,
    references: ["berend", "figge", "albert"],
    disclaimer: MODULE_DISCLAIMER,
  };
}
