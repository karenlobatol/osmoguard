import { osmolalityInputSchema, type OsmolalityInput, type OsmolalitySummary } from "@osmoguard/engine";
import { RangeScale } from "@/features/tools/RangeScale";
import { ResultHero, ToolPage, type Example, type FieldDef } from "@/features/tools/ToolPage";
import { Stat } from "./AcidBase";

type F = OsmolalityInput;
const FIELDS: FieldDef<F>[] = [
  { name: "sodium", label: "Na⁺", unit: "mmol/L" },
  { name: "glucoseMgDl", label: "Glucosa", unit: "mg/dL" },
  { name: "bunMgDl", label: "BUN", unit: "mg/dL" },
  { name: "measuredOsm", label: "Osm medida", unit: "mOsm/kg", optional: true },
  { name: "ethanolMgDl", label: "Etanol", unit: "mg/dL", optional: true, wide: true },
];
const EXAMPLES: Example<F>[] = [
  { label: "Normal", values: { sodium: 140, glucoseMgDl: 90, bunMgDl: 14, measuredOsm: 292 } },
  { label: "Estado hiperosmolar", values: { sodium: 150, glucoseMgDl: 900, bunMgDl: 40 } },
  { label: "Etilenglicol", values: { sodium: 138, glucoseMgDl: 100, bunMgDl: 15, measuredOsm: 322 } },
  { label: "Hiperglucemia con Na bajo", values: { sodium: 128, glucoseMgDl: 700, bunMgDl: 20 } },
];

export function OsmolalityPage() {
  return (
    <ToolPage<F, OsmolalitySummary>
      module="osmolality"
      title="Osmolalidad"
      subtitle="Osmolalidad calculada, tonicidad efectiva y brecha osmolar."
      schema={osmolalityInputSchema}
      fields={FIELDS}
      examples={EXAMPLES}
      renderVisual={(r) => {
        const s = r.summary;
        const tone = s.tonicity === "isotónica" ? "normal" : s.tonicity === "hipotónica" ? "low" : "high";
        return (
          <ResultHero label={`Tonicidad ${s.tonicity}`} title={`${s.effective.toLocaleString("es-EC")} mOsm/kg efectivos`} tone={tone}>
            <RangeScale
              min={240}
              max={360}
              zones={[
                { from: 240, to: 275, className: "bg-low-100", label: "Hipotónica", labelClass: "text-low-700" },
                { from: 275, to: 295, className: "bg-ok-100", label: "Normal", labelClass: "text-ok-700" },
                { from: 295, to: 360, className: "bg-high-100", label: "Hipertónica", labelClass: "text-high-700" },
              ]}
              value={s.effective}
              valueLabel="Efectiva"
              ticks={[275, 295, 330]}
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="Calculada" value={String(s.calculated)} sub="mOsm/kg" />
              {s.gap !== null ? <Stat label="Brecha osmolar" value={String(s.gap)} sub="ref. < 10" warn={s.gap > 10} /> : <Stat label="Brecha osmolar" value="—" sub="Requiere osm medida" />}
            </div>
          </ResultHero>
        );
      }}
    />
  );
}
