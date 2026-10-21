import { calciumInputSchema, type CalciumInput, type CalciumSummary } from "@osmoguard/engine";
import { RangeScale } from "@/features/tools/RangeScale";
import { ResultHero, ToolPage, type Example, type FieldDef } from "@/features/tools/ToolPage";
import { Stat } from "./AcidBase";

type F = CalciumInput;
const FIELDS: FieldDef<F>[] = [
  { name: "totalCalcium", label: "Calcio total", unit: "mg/dL", step: "0.1" },
  { name: "albumin", label: "Albúmina", unit: "g/dL", step: "0.1" },
  { name: "ionizedMmolL", label: "Calcio iónico", unit: "mmol/L", step: "0.01", optional: true, wide: true },
];
const EXAMPLES: Example<F>[] = [
  { label: "Hipoalbuminemia", values: { totalCalcium: 7.6, albumin: 2 } },
  { label: "Hiperparatiroidismo", values: { totalCalcium: 11.8, albumin: 4.1, ionizedMmolL: 1.45 } },
  { label: "Posquirúrgico de tiroides", values: { totalCalcium: 6.9, albumin: 3.9, ionizedMmolL: 0.88 } },
];

export function CalciumPage() {
  return (
    <ToolPage<F, CalciumSummary>
      module="calcium"
      title="Calcio"
      subtitle="Calcio corregido por albúmina y comparación con el calcio iónico."
      schema={calciumInputSchema}
      fields={FIELDS}
      examples={EXAMPLES}
      renderVisual={(r) => {
        const s = r.summary;
        const tone = s.classification === "normocalcemia" ? "normal" : s.classification === "hipocalcemia" ? "low" : "high";
        return (
          <ResultHero label={s.classification[0]!.toUpperCase() + s.classification.slice(1)} title={`${String(s.corrected).replace(".", ",")} mg/dL corregido`} tone={tone}>
            <RangeScale
              min={5}
              max={15}
              zones={[
                { from: 5, to: 8.5, className: "bg-low-100", label: "Bajo", labelClass: "text-low-700" },
                { from: 8.5, to: 10.5, className: "bg-ok-100", label: "Normal 8,5–10,5", labelClass: "text-ok-700" },
                { from: 10.5, to: 15, className: "bg-high-100", label: "Alto", labelClass: "text-high-700" },
              ]}
              value={s.corrected}
              valueLabel="Corregido"
              ticks={[7, 8.5, 10.5, 13]}
              format={(n) => String(n).replace(".", ",")}
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="En mmol/L" value={String(s.correctedMmolL).replace(".", ",")} sub="corregido" />
              <Stat label="Calcio iónico" value={s.ionizedClassification ?? "—"} sub="ref. 1,15–1,32" warn={!!s.ionizedClassification && s.ionizedClassification !== "normal"} />
            </div>
          </ResultHero>
        );
      }}
    />
  );
}
