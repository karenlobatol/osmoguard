import { acidBaseInputSchema, type AcidBaseInput, type AcidBaseSummary } from "@osmoguard/engine";
import { RangeScale } from "@/features/tools/RangeScale";
import { ResultHero, Segmented, ToolPage, type Example, type FieldDef } from "@/features/tools/ToolPage";

type F = AcidBaseInput;

const FIELDS: FieldDef<F>[] = [
  { name: "ph", label: "pH", step: "0.01" },
  { name: "pco2", label: "pCO₂", unit: "mmHg" },
  { name: "hco3", label: "HCO₃⁻", unit: "mmol/L" },
  { name: "sodium", label: "Na⁺", unit: "mmol/L", optional: true },
  { name: "chloride", label: "Cl⁻", unit: "mmol/L", optional: true },
  { name: "albumin", label: "Albúmina", unit: "g/dL", step: "0.1", optional: true },
];

const EXTRA: FieldDef<F>[] = [
  { name: "lactate", label: "Lactato", unit: "mmol/L", step: "0.1", optional: true },
  { name: "measuredOsm", label: "Osm medida", unit: "mOsm/kg", optional: true },
  { name: "glucoseMgDl", label: "Glucosa", unit: "mg/dL", optional: true },
  { name: "bunMgDl", label: "BUN", unit: "mg/dL", optional: true },
  { name: "urineNa", label: "Na⁺ orina", unit: "mmol/L", optional: true },
  { name: "urineK", label: "K⁺ orina", unit: "mmol/L", optional: true },
  { name: "urineCl", label: "Cl⁻ orina", unit: "mmol/L", optional: true, wide: true },
];

const EXAMPLES: Example<F>[] = [
  { label: "Cetoacidosis diabética", values: { ph: 7.1, pco2: 25, hco3: 8, sodium: 135, chloride: 100, albumin: 4 } },
  { label: "Diarrea", values: { ph: 7.3, pco2: 30, hco3: 14, sodium: 138, chloride: 114, albumin: 4, urineNa: 30, urineK: 25, urineCl: 80 } },
  { label: "Vómitos persistentes", values: { ph: 7.5, pco2: 48, hco3: 36, sodium: 138, chloride: 88, albumin: 4 } },
  { label: "Sobredosis de opioides", values: { ph: 7.24, pco2: 60, hco3: 26, respiratoryChronicity: "acute" } },
  { label: "Metanol", values: { ph: 7.15, pco2: 22, hco3: 7, sodium: 140, chloride: 100, albumin: 4, measuredOsm: 330, glucoseMgDl: 90, bunMgDl: 14 } },
];

const PH_ZONES = [
  { from: 6.9, to: 7.35, className: "bg-rose-100", label: "Acidemia", labelClass: "text-rose-700" },
  { from: 7.35, to: 7.45, className: "bg-ok-100", label: "Normal", labelClass: "text-ok-700" },
  { from: 7.45, to: 7.7, className: "bg-violet-100", label: "Alcalemia", labelClass: "text-violet-700" },
];

export function AcidBasePage() {
  return (
    <ToolPage<F, AcidBaseSummary>
      module="acid-base"
      title="Gasometría"
      subtitle="Interpretación ácido-base sistemática: trastorno primario, compensación, anión gap y delta-delta."
      schema={acidBaseInputSchema}
      fields={FIELDS}
      extraFields={{ title: "Lactato, osmolalidad y orina", fields: EXTRA }}
      examples={EXAMPLES}
      defaults={{ respiratoryChronicity: "unknown" }}
      controls={(form) => (
        <Segmented
          form={form}
          name="respiratoryChronicity"
          label="Si es respiratorio, ¿desde cuándo?"
          options={[
            { value: "acute", label: "Agudo" },
            { value: "chronic", label: "Crónico" },
            { value: "unknown", label: "No se sabe" },
          ]}
        />
      )}
      renderVisual={(r, v) => {
        const s = r.summary;
        const tone = s.status === "acidemia" ? "alert" : s.status === "alkalemia" ? "high" : "normal";
        const label = s.status === "acidemia" ? "Acidemia" : s.status === "alkalemia" ? "Alcalemia" : "pH normal";
        return (
          <ResultHero label={label} title={s.diagnosis} tone={tone}>
            <RangeScale min={6.9} max={7.7} zones={PH_ZONES} value={v.ph} valueLabel="pH" ticks={[7.0, 7.35, 7.45, 7.6]} format={(n) => n.toFixed(2)} />
            {s.compensation && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-1 text-[13px] font-semibold text-slate-600">{s.compensation.variable === "pco2" ? "pCO₂ medida frente a la esperada" : "HCO₃⁻ medido frente al esperado"}</div>
                {s.compensation.variable === "pco2" ? (
                  <RangeScale
                    min={10}
                    max={80}
                    zones={[
                      { from: 10, to: 35, className: "bg-slate-100" },
                      { from: 35, to: 45, className: "bg-ok-100", label: "Normal 35–45", labelClass: "text-ok-700" },
                      { from: 45, to: 80, className: "bg-slate-100" },
                    ]}
                    value={s.compensation.actual}
                    valueLabel="pCO₂"
                    expected={{ from: s.compensation.expectedLow, to: s.compensation.expectedHigh, label: `Esperada ${s.compensation.expectedLow}–${s.compensation.expectedHigh}` }}
                    ticks={[20, 40, 60]}
                  />
                ) : (
                  <RangeScale
                    min={5}
                    max={50}
                    zones={[
                      { from: 5, to: 22, className: "bg-slate-100" },
                      { from: 22, to: 26, className: "bg-ok-100", label: "Normal 22–26", labelClass: "text-ok-700" },
                      { from: 26, to: 50, className: "bg-slate-100" },
                    ]}
                    value={s.compensation.actual}
                    valueLabel="HCO₃⁻"
                    expected={{ from: s.compensation.expectedLow, to: s.compensation.expectedHigh, label: `Esperado ${s.compensation.expectedLow}–${s.compensation.expectedHigh}` }}
                    ticks={[10, 24, 40]}
                  />
                )}
              </div>
            )}
            {(s.anionGap || s.deltaRatio !== null) && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {s.anionGap && (
                  <Stat label="Anión gap" value={String(s.anionGap.corrected ?? s.anionGap.value)} sub={s.anionGap.corrected !== null ? `corregido (bruto ${s.anionGap.value})` : "ref. ≈ 12"} warn={s.anionGap.elevated} />
                )}
                {s.deltaRatio !== null && <Stat label="Delta-delta" value={String(s.deltaRatio).replace(".", ",")} sub="ref. 0,8–2" warn={s.deltaRatio < 0.8 || s.deltaRatio > 2} />}
                {s.osmolarGap !== null && <Stat label="Brecha osmolar" value={String(s.osmolarGap)} sub="ref. < 10" warn={s.osmolarGap > 10} />}
              </div>
            )}
          </ResultHero>
        );
      }}
    />
  );
}

export function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3.5">
      <div className="text-[12px] font-medium text-slate-500">{label}</div>
      <div className={`tabular mt-0.5 text-[22px] font-bold leading-tight ${warn ? "text-red-600" : "text-ink"}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
