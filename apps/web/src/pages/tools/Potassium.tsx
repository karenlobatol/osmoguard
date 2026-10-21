import { potassiumInputSchema, type PotassiumInput, type PotassiumSummary } from "@osmoguard/engine";
import { RangeScale } from "@/features/tools/RangeScale";
import { ResultHero, ToolPage, type Example, type FieldDef } from "@/features/tools/ToolPage";
import { Stat } from "./AcidBase";

type F = PotassiumInput;
const FIELDS: FieldDef<F>[] = [
  { name: "potassium", label: "K⁺", unit: "mmol/L", step: "0.1" },
  { name: "ph", label: "pH", step: "0.01", optional: true },
];
const EXTRA: FieldDef<F>[] = [
  { name: "urineK", label: "K⁺ orina", unit: "mmol/L", optional: true },
  { name: "urineOsm", label: "Osm orina", unit: "mOsm/kg", optional: true },
  { name: "plasmaOsm", label: "Osm plasma", unit: "mOsm/kg", optional: true, wide: true },
];
const EXAMPLES: Example<F>[] = [
  { label: "Enfermedad renal crónica", values: { potassium: 6.8 } },
  { label: "Cetoacidosis", values: { potassium: 5.8, ph: 7.1 } },
  { label: "Diuréticos", values: { potassium: 2.8, urineK: 45, urineOsm: 500, plasmaOsm: 290 } },
  { label: "Diarrea crónica", values: { potassium: 3.1, urineK: 10, urineOsm: 450, plasmaOsm: 285 } },
];

export function PotassiumPage() {
  return (
    <ToolPage<F, PotassiumSummary>
      module="potassium"
      title="Potasio"
      subtitle="Gravedad, efecto del pH, gradiente transtubular y cambios esperables en el ECG."
      schema={potassiumInputSchema}
      fields={FIELDS}
      extraFields={{ title: "Orina (gradiente transtubular)", fields: EXTRA }}
      examples={EXAMPLES}
      renderVisual={(r, input) => {
        const s = r.summary;
        const k = input.potassium;
        const tone = s.classification === "normopotasemia" ? "normal" : s.severity === "grave" ? "alert" : s.classification === "hipopotasemia" ? "low" : "high";
        const title = s.severity ? `${s.classification[0]!.toUpperCase()}${s.classification.slice(1)} ${s.severity}` : "Potasio normal";
        return (
          <ResultHero label={`K⁺ ${String(k).replace(".", ",")} mmol/L`} title={title} tone={tone}>
            <RangeScale
              min={1.5}
              max={8}
              zones={[
                { from: 1.5, to: 2.5, className: "bg-low-500/40" },
                { from: 2.5, to: 3.5, className: "bg-low-100", label: "Hipo", labelClass: "text-low-700" },
                { from: 3.5, to: 5.4, className: "bg-ok-100", label: "Normal 3,5–5,4", labelClass: "text-ok-700" },
                { from: 5.4, to: 6.5, className: "bg-high-100", label: "Hiper", labelClass: "text-high-700" },
                { from: 6.5, to: 8, className: "bg-red-300/60", label: "Grave", labelClass: "text-red-700" },
              ]}
              value={k}
              valueLabel="K⁺"
              ticks={[2.5, 3.5, 5.4, 6.5]}
              format={(n) => n.toFixed(1).replace(".", ",")}
            />
            {(s.adjustedAtPh740 || s.ttkg !== null) && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {s.adjustedAtPh740 && <Stat label="K⁺ a pH 7,40" value={String(s.adjustedAtPh740.estimate).replace(".", ",")} sub={`rango ${s.adjustedAtPh740.low}–${s.adjustedAtPh740.high}`} />}
                {s.ttkg !== null && <Stat label="TTKG" value={String(s.ttkg).replace(".", ",")} sub="orientativo" />}
              </div>
            )}
          </ResultHero>
        );
      }}
    />
  );
}
