import { z } from "zod";
import { ENGINE_VERSION } from "../version";
import { MODULE_DISCLAIMER, r1, type ModuleFinding, type ModuleResult, type ReasoningStep } from "./common";

export const osmolalityInputSchema = z.object({
  sodium: z.number().min(100).max(200),
  glucoseMgDl: z.number().min(10).max(3000),
  bunMgDl: z.number().min(1).max(250),
  ethanolMgDl: z.number().min(0).max(1000).optional(),
  measuredOsm: z.number().min(200).max(450).optional(),
});
export type OsmolalityInput = z.input<typeof osmolalityInputSchema>;

export interface OsmolalitySummary {
  calculated: number;
  effective: number;
  measured: number | null;
  gap: number | null;
  tonicity: "hipotónica" | "isotónica" | "hipertónica";
}

/** Osmolalidad calculada = 2·Na⁺ + glucosa/18 + BUN/2,8 (+ etanol/3,7). Tonicidad efectiva = 2·Na⁺ + glucosa/18. */
export const calculatedOsm = (na: number, glu: number, bun: number, etoh = 0) => 2 * na + glu / 18 + bun / 2.8 + etoh / 3.7;
export const effectiveOsm = (na: number, glu: number) => 2 * na + glu / 18;

export function interpretOsmolality(raw: OsmolalityInput): ModuleResult<OsmolalitySummary> {
  const x = osmolalityInputSchema.parse(raw);
  const calc = calculatedOsm(x.sodium, x.glucoseMgDl, x.bunMgDl, x.ethanolMgDl ?? 0);
  const eff = effectiveOsm(x.sodium, x.glucoseMgDl);
  const tonicity = eff < 275 ? "hipotónica" : eff > 295 ? "hipertónica" : "isotónica";
  const steps: ReasoningStep[] = [
    {
      id: "calc",
      title: "Osmolalidad calculada",
      result: `${r1(calc)} mOsm/kg`,
      detail: `2 × ${x.sodium} + ${x.glucoseMgDl}/18 + ${x.bunMgDl}/2,8${x.ethanolMgDl ? ` + ${x.ethanolMgDl}/3,7` : ""} = ${r1(calc)} (normal 275–295).`,
      tone: calc < 275 || calc > 295 ? "abnormal" : "normal",
    },
    {
      id: "effective",
      title: "Tonicidad efectiva",
      result: `${r1(eff)} mOsm/kg · ${tonicity}`,
      detail: "La urea atraviesa las membranas y no mueve agua: la tonicidad depende del sodio y la glucosa. Es la que determina el volumen de las células (incluidas las neuronas).",
      tone: tonicity === "isotónica" ? "normal" : "abnormal",
    },
  ];
  const findings: ModuleFinding[] = [];
  let gap: number | null = null;
  if (x.measuredOsm !== undefined) {
    gap = r1(x.measuredOsm - calc);
    steps.push({
      id: "gap",
      title: "Brecha osmolar",
      result: gap > 10 ? "Elevada" : "Normal",
      detail: `${x.measuredOsm} (medida) − ${r1(calc)} (calculada) = ${gap} mOsm/kg (normal < 10).`,
      tone: gap > 10 ? "abnormal" : "normal",
    });
    if (gap > 10)
      findings.push({ level: "warning", title: "Brecha osmolar elevada", message: "Sugiere osmoles no medidos: metanol, etilenglicol, isopropanol, manitol, glicina o etanol no incluido en el cálculo." });
  }
  if (x.sodium < 135 && tonicity !== "hipotónica")
    findings.push({ level: "info", title: "Hiponatremia no hipotónica", message: "Con tonicidad normal o alta, la hiponatremia puede deberse a hiperglucemia, manitol o pseudohiponatremia." });
  if (x.glucoseMgDl >= 600 && eff > 320)
    findings.push({ level: "danger", title: "Hiperosmolaridad marcada", message: "Glucosa ≥ 600 mg/dL con osmolalidad efectiva > 320: patrón de estado hiperosmolar hiperglucémico." });
  return {
    module: "osmolality",
    engineVersion: ENGINE_VERSION,
    summary: { calculated: r1(calc), effective: r1(eff), measured: x.measuredOsm ?? null, gap, tonicity },
    steps,
    findings,
    differentials: gap !== null && gap > 10 ? [{ group: "Brecha osmolar elevada", items: ["Metanol", "Etilenglicol", "Isopropanol", "Etanol", "Manitol / glicerol", "Propilenglicol"] }] : [],
    references: ["kraut"],
    disclaimer: MODULE_DISCLAIMER,
  };
}
