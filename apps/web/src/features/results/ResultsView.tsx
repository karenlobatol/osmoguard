import { useState } from "react";
import { motion } from "motion/react";
import { Ban, ChevronDown, Table2 } from "lucide-react";
import { REFERENCES, getSolution, type AlertConfig, type SimulationOutput } from "@osmoguard/engine";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CLASSIFICATION_LABEL, fmt, fmt1, signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SodiumChart } from "./SodiumChart";
import { DisclaimerBar, FindingList, PointsTable, ScenarioLegendDot, SolutionDeltaChart, Stat, StatusBadge } from "./parts";

export function limit24For(output: SimulationOutput, cfg: AlertConfig): number | null {
  if (output.patient.classification === "hyponatremia") return output.patient.odsHighRisk ? cfg.hypoMaxRise24hHighRisk : cfg.hypoMaxRise24hStandard;
  if (output.patient.classification === "hypernatremia") return -cfg.hyperMaxFall24h;
  return null;
}

export function ResultsView({ output, alertConfig }: { output: SimulationOutput; alertConfig: AlertConfig }) {
  const p = output.patient;
  const blocked = output.status === "blocked";
  const limit = limit24For(output, alertConfig);

  return (
    <div className="space-y-6">
      <DisclaimerBar text={output.disclaimer} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Sodio inicial"
          value={fmt1(p.measuredSodium)}
          unit="mmol/L"
          sub={
            <>
              {CLASSIFICATION_LABEL[p.classification]}
              {p.severity ? ` ${p.severity}` : ""}
            </>
          }
        />
        <Stat
          label="Agua corporal total"
          value={blocked ? "—" : fmt1(p.tbw.liters)}
          unit={blocked ? undefined : "L"}
          sub={blocked ? "No calculada" : `Rango ${fmt1(p.tbw.low)}–${fmt1(p.tbw.high)} L · f = ${p.tbw.fraction}`}
        />
        {p.freeWaterDeficit ? (
          <Stat label="Déficit de agua libre" value={fmt1(p.freeWaterDeficit.liters)} unit="L" sub={`Rango ${fmt1(p.freeWaterDeficit.low)}–${fmt1(p.freeWaterDeficit.high)} L, sin pérdidas en curso`} />
        ) : p.correctedSodium && p.correctedSodium.katz - p.measuredSodium >= 1 ? (
          <Stat label="Na⁺ corregido (glucosa)" value={fmt1(p.correctedSodium.katz)} unit="mmol/L" sub={`Katz 1,6 · Hillier 2,4: ${fmt1(p.correctedSodium.hillier)}`} />
        ) : (
          <Stat label="Riesgo de desmielinización" value={p.classification === "hyponatremia" ? (p.odsHighRisk ? "Alto" : "Estándar") : "N/A"} tone={p.odsHighRisk ? "warn" : "default"} sub={p.odsHighRisk ? p.riskFactorsDetected.join(", ") : "Según factores introducidos"} />
        )}
        <Stat
          label="Función renal"
          value={p.egfr !== null ? fmt(p.egfr) : "—"}
          unit={p.egfr !== null ? "mL/min/1,73 m²" : undefined}
          sub={
            p.electrolyteFreeWaterClearanceLH !== null
              ? `Aclar. agua libre de electrolitos ${signed(p.electrolyteFreeWaterClearanceLH * 1000)} mL/h`
              : p.egfr !== null
                ? "eGFR CKD-EPI 2021"
                : "Creatinina no informada"
          }
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Aplicabilidad del modelo</CardTitle>
            <CardDescription>Límites y supuestos que condicionan la interpretación.</CardDescription>
          </div>
          <StatusBadge
            status={
              output.applicability.some((f) => f.level === "blocked")
                ? "blocked"
                : output.applicability.some((f) => f.level === "warning" || f.level === "danger")
                  ? "warning"
                  : "ok"
            }
          />
        </CardHeader>
        <CardContent>
          <FindingList findings={output.applicability} empty="Sin limitaciones adicionales detectadas para estos datos." />
        </CardContent>
      </Card>

      {blocked ? (
        <Card className="flex flex-col items-center border-slate-300 px-6 py-12 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Ban className="size-6" />
          </div>
          <h3 className="text-lg font-semibold">Resultados no disponibles</h3>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Los datos quedan fuera del alcance del modelo. Osmoguard no muestra estimaciones numéricas cuando no puede respaldarlas.
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="scenarios">
          <TabsList aria-label="Secciones de resultados">
            <TabsTrigger value="scenarios">Escenarios</TabsTrigger>
            <TabsTrigger value="compare">Comparación</TabsTrigger>
            <TabsTrigger value="formulas">Fórmulas y supuestos</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-5">
            {output.scenarios.map((s, i) => (
              <ScenarioCard key={i} index={i} scenario={s} baseline={p.measuredSodium} limit={limit} />
            ))}
          </TabsContent>

          <TabsContent value="compare" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Escenarios superpuestos</CardTitle>
                <CardDescription>Cada forma identifica un escenario. Las barras verticales muestran la banda de sensibilidad.</CardDescription>
              </CardHeader>
              <CardContent>
                <SodiumChart scenarios={output.scenarios} baseline={p.measuredSodium} limit24h={limit} height={360} />
                <CompareTable output={output} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cambio estimado por litro según la solución</CardTitle>
                <CardDescription>
                  Adrogué-Madias, sistema cerrado (sin diuresis ni pérdidas). Útil para comparar soluciones, no para predecir la evolución.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SolutionDeltaChart rows={output.solutionComparison} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formulas">
            <FormulasPanel output={output} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ScenarioCard({ scenario: s, index, baseline, limit }: { scenario: SimulationOutput["scenarios"][number]; index: number; baseline: number; limit: number | null }) {
  const [table, setTable] = useState(false);
  const sol = getSolution(s.solutionId);
  const blockedFrom = s.points.find((pt) => pt.hour > 0 && pt.estimate === null)?.hour;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.04 }}>
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScenarioLegendDot index={index} />
              {s.label}
            </CardTitle>
            <CardDescription>
              {s.solutionName} ({sol ? sol.sodiumMmolL + sol.potassiumMmolL : "?"} mmol/L Na⁺+K⁺) · {fmt(s.rateMlH)} mL/h hipotéticos · {s.horizonHours} h
            </CardDescription>
          </div>
          <StatusBadge status={s.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="Δ por litro (Adrogué-Madias)" value={s.summary.adrogueMadiasDeltaPerLiter !== null ? `${signed(s.summary.adrogueMadiasDeltaPerLiter)} mmol/L` : "—"} />
            <MiniStat
              label="Cambio estimado a 24 h"
              value={s.summary.deltaAt24h ? `${signed(s.summary.deltaAt24h.estimate)} mmol/L` : "No evaluado"}
              sub={s.summary.deltaAt24h ? `Banda ${signed(s.summary.deltaAt24h.low)} a ${signed(s.summary.deltaAt24h.high)}` : s.horizonHours < 24 ? "Horizonte < 24 h" : "Sin estimación"}
            />
            <MiniStat
              label="Al final del horizonte válido"
              value={s.summary.deltaAtEnd ? `${signed(s.summary.deltaAtEnd.estimate)} mmol/L` : "—"}
              sub={s.summary.deltaAtEnd ? `Banda ${signed(s.summary.deltaAtEnd.low)} a ${signed(s.summary.deltaAtEnd.high)}` : undefined}
            />
          </div>
          <SodiumChart scenarios={[s]} baseline={baseline} limit24h={limit} />
          {blockedFrom !== undefined && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Sin estimación a partir de {blockedFrom} h: los datos disponibles no la respaldan.</p>
          )}
          <FindingList findings={s.alerts} empty="Este escenario no genera alertas con los umbrales configurados." />
          <button
            type="button"
            onClick={() => setTable((v) => !v)}
            aria-expanded={table}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline cursor-pointer"
          >
            <Table2 className="size-4" /> {table ? "Ocultar" : "Ver"} tabla de datos
            <ChevronDown className={cn("size-4 transition-transform", table && "rotate-180")} />
          </button>
          {table && <PointsTable scenario={s} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="tabular mt-0.5 font-semibold text-ink">{value}</div>
      {sub && <div className="tabular text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function CompareTable({ output }: { output: SimulationOutput }) {
  return (
    <div tabIndex={0} role="region" aria-label="Tabla comparativa" className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Resumen comparativo de escenarios</caption>
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Escenario</th>
            <th className="px-3 py-2 text-right font-medium">mL/h</th>
            <th className="px-3 py-2 text-right font-medium">Δ / litro</th>
            <th className="px-3 py-2 text-right font-medium">Δ 24 h</th>
            <th className="px-3 py-2 text-right font-medium">Δ final</th>
            <th className="px-3 py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-slate-100">
          {output.scenarios.map((s, i) => (
            <tr key={i}>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2 font-medium">
                  <ScenarioLegendDot index={i} /> {s.label}
                </span>
                <span className="text-xs text-slate-500">{getSolution(s.solutionId)?.shortName}</span>
              </td>
              <td className="px-3 py-2 text-right">{fmt(s.rateMlH)}</td>
              <td className="px-3 py-2 text-right">{s.summary.adrogueMadiasDeltaPerLiter !== null ? signed(s.summary.adrogueMadiasDeltaPerLiter) : "—"}</td>
              <td className="px-3 py-2 text-right">{s.summary.deltaAt24h ? signed(s.summary.deltaAt24h.estimate) : "—"}</td>
              <td className="px-3 py-2 text-right">{s.summary.deltaAtEnd ? signed(s.summary.deltaAtEnd.estimate) : "—"}</td>
              <td className="px-3 py-2">
                <StatusBadge status={s.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FormulasPanel({ output }: { output: Pick<SimulationOutput, "formulas" | "assumptions" | "engine"> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Fórmulas utilizadas</CardTitle>
          <CardDescription>
            Motor {output.engine.name} v{output.engine.version}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {output.formulas.map((f) => (
            <div key={f.id}>
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {f.name} <Badge tone="neutral">{f.units}</Badge>
              </div>
              <code tabIndex={0} className="mt-1 block overflow-x-auto rounded-md bg-brand-50 px-3 py-2 font-mono text-[12.5px] text-brand-800">{f.expression}</code>
              <p className="mt-1 text-xs text-slate-500">{f.references.map((r) => REFERENCES[r].citation.split(".")[0]).join(" · ")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Supuestos del modelo</CardTitle>
          <CardDescription>Si alguno no se cumple, la estimación pierde validez.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 marker:text-slate-400">
            {output.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
