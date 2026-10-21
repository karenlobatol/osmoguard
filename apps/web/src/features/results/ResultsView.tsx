import { useEffect, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { AlertOctagon, AlertTriangle, ArrowRight, Ban, BookOpen, CheckCircle2, ChevronDown, Droplets, Gauge, Info, LineChart, ShieldAlert, Sigma, Users } from "lucide-react";
import { REFERENCES, getSolution, type AlertConfig, type ScenarioResult, type SimulationOutput } from "@osmoguard/engine";
import { Card } from "@/components/ui/card";
import { fmt, fmt1, signed } from "@/lib/format";
import { VERDICT_STYLE, ZONE_STYLE, describeSodium, scenarioVerdict, type Verdict } from "@/lib/sodium";
import { cn } from "@/lib/utils";
import { SodiumChart } from "./SodiumChart";
import { SodiumScale } from "./SodiumScale";
import { FindingList, PointsTable, ScenarioLegendDot, SolutionDeltaChart } from "./parts";
import { AiExplain } from "@/features/ai/AiExplain";

export function limit24For(output: SimulationOutput, cfg: AlertConfig): number | null {
  if (output.patient.classification === "hyponatremia") return output.patient.odsHighRisk ? cfg.hypoMaxRise24hHighRisk : cfg.hypoMaxRise24hStandard;
  if (output.patient.classification === "hypernatremia") return -cfg.hyperMaxFall24h;
  return null;
}

export function ResultsView({ output, alertConfig, request }: { output: SimulationOutput; alertConfig: AlertConfig; request?: unknown }) {
  const blocked = output.status === "blocked";
  const limit = limit24For(output, alertConfig);
  const important = output.applicability.filter((f) => f.level !== "info");
  const notes = output.applicability.filter((f) => f.level === "info");
  const [selected, setSelected] = useState(0);
  const multi = output.scenarios.length > 1;

  return (
    <div className="space-y-5">
      <PatientSummary output={output} blocked={blocked} />

      {(important.length > 0 || notes.length > 0) && (
        <Card className="p-5 sm:p-6">
          <SectionTitle icon={<ShieldAlert className="size-[18px]" />} title={blocked ? "Por qué no hay resultados" : "Antes de interpretar"} />
          {important.length > 0 && (
            <div className="mt-3">
              <FindingList findings={important} />
            </div>
          )}
          {notes.length > 0 && (
            <Disclosure summary={`${notes.length} nota${notes.length > 1 ? "s" : ""} informativa${notes.length > 1 ? "s" : ""}`} className="mt-3">
              <FindingList findings={notes} />
            </Disclosure>
          )}
        </Card>
      )}

      {blocked ? (
        <Card className="flex flex-col items-center px-6 py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Ban className="size-6" />
          </div>
          <h3 className="text-lg font-semibold">Resultados no disponibles</h3>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Con estos datos el modelo no es aplicable. Osmoguard prefiere no mostrar números antes que mostrar números engañosos.
          </p>
        </Card>
      ) : (
        <>
          {multi && <QuickCompare output={output} limit={limit} selected={selected} onSelect={setSelected} />}
          {multi && <ScenarioTabs output={output} selected={selected} onSelect={setSelected} />}
          <AnimatePresence mode="popLayout" initial={false}>
            <ScenarioCard key={selected} index={selected} scenario={output.scenarios[selected]!} output={output} limit={limit} />
          </AnimatePresence>

          {request !== undefined && <AiExplain module="sodium" input={request} />}

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<Droplets className="size-[18px]" />} title="Comparar todas las soluciones" subtitle="Cuánto cambiaría el sodio por cada litro, sin contar la orina ni otras pérdidas." />
            <Disclosure summary="Ver comparación por litro" className="mt-3">
              <h4 className="sr-only">Cambio estimado por litro según la solución</h4>
              <SolutionDeltaChart rows={output.solutionComparison} />
              <p className="mt-2 text-xs text-slate-500">
                Fórmula de Adrogué-Madias. Sirve para comparar soluciones entre sí, no para predecir la evolución: la orina y otras pérdidas pueden cambiar mucho el resultado.
              </p>
            </Disclosure>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<Sigma className="size-[18px]" />} title="Cómo se calculó" subtitle={`Motor v${output.engine.version}: fórmulas, supuestos y fuentes.`} />
            <Disclosure summary="Ver fórmulas y supuestos" className="mt-3">
              <FormulasPanel output={output} />
            </Disclosure>
          </Card>
        </>
      )}

      <p className="flex gap-2 px-1 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold text-slate-600">Simulación educativa.</strong> No es una prescripción, no sustituye el juicio clínico ni los controles de laboratorio, y no está validada para decisiones asistenciales.
        </span>
      </p>
    </div>
  );
}

function PatientSummary({ output, blocked }: { output: SimulationOutput; blocked: boolean }) {
  const p = output.patient;
  const d = describeSodium(p.measuredSodium);
  const z = ZONE_STYLE[d.zone];
  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", z.chip)}>
              <span className={cn("size-1.5 rounded-full", z.dot)} />
              Sodio {z.label.toLowerCase()}
            </span>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{d.title}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{d.plain}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="tabular text-[34px] font-bold leading-none tracking-tight">{fmt1(p.measuredSodium)}</div>
            <div className="mt-1 text-xs text-slate-500">mmol/L</div>
          </div>
        </div>
        <SodiumScale className="mt-4" start={p.measuredSodium} />
      </div>
      {!blocked && (
        <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/60 sm:grid-cols-4">
          <Fact label="Agua corporal total" value={`${fmt1(p.tbw.liters)} L`} hint={`Rango ${fmt1(p.tbw.low)}–${fmt1(p.tbw.high)} L. Volumen en el que se diluye el sodio.`} />
          {p.freeWaterDeficit ? (
            <Fact label="Déficit de agua libre" value={`${fmt1(p.freeWaterDeficit.liters)} L`} hint="Agua que falta para volver a 140 mmol/L, sin contar pérdidas en curso." />
          ) : p.correctedSodium && p.correctedSodium.katz - p.measuredSodium >= 1 ? (
            <Fact label="Na⁺ corregido por glucosa" value={`${fmt1(p.correctedSodium.katz)}`} hint={`Katz; con Hillier ${fmt1(p.correctedSodium.hillier)} mmol/L.`} />
          ) : (
            <Fact
              label="Riesgo de desmielinización"
              value={p.classification === "hyponatremia" ? (p.odsHighRisk ? "Alto" : "Estándar") : "No aplica"}
              hint={p.odsHighRisk ? p.riskFactorsDetected.join(", ") : "Según los factores introducidos."}
              warn={p.odsHighRisk}
            />
          )}
          <Fact label="Función renal (eGFR)" value={p.egfr !== null ? `${fmt(p.egfr)}` : "—"} hint={p.egfr !== null ? "mL/min/1,73 m², CKD-EPI 2021." : "Sin creatinina."} />
          <Fact
            label="Orina: agua libre"
            value={p.electrolyteFreeWaterClearanceLH !== null ? `${signed(p.electrolyteFreeWaterClearanceLH * 1000)} mL/h` : "—"}
            hint={
              p.electrolyteFreeWaterClearanceLH === null
                ? "Requiere diuresis, Na⁺ y K⁺ urinarios."
                : p.electrolyteFreeWaterClearanceLH < 0
                  ? "Negativo: la orina retiene agua libre (tiende a bajar el sodio)."
                  : "Positivo: la orina elimina agua libre (tiende a subir el sodio)."
            }
          />
        </div>
      )}
    </Card>
  );
}

function Fact({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className="border-slate-100 p-4 odd:border-r [&:nth-child(-n+2)]:border-b sm:border-r sm:[&:nth-child(-n+2)]:border-b-0 sm:last:border-r-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={cn("tabular mt-1 text-lg font-semibold", warn && "text-amber-700")}>{value}</div>
      <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</div>
    </div>
  );
}

function scenarioEnd(s: ScenarioResult) {
  const at24 = s.points.find((p) => p.hour === 24 && p.estimate !== null);
  const last = [...s.points].reverse().find((p) => p.hour > 0 && p.estimate !== null);
  return at24 ?? last ?? null;
}

function QuickCompare({ output, limit, selected, onSelect }: { output: SimulationOutput; limit: number | null; selected: number; onSelect: (i: number) => void }) {
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle icon={<Users className="size-[18px]" />} title="Comparación rápida" subtitle="Dónde quedaría el sodio con cada escenario." />
      <ul className="mt-4 space-y-2">
        {output.scenarios.map((s, i) => {
          const end = scenarioEnd(s);
          const v = scenarioVerdict(s, output, limit);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={selected === i}
                className={cn("flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors cursor-pointer", selected === i ? "bg-brand-50 ring-1 ring-brand-500/30" : "bg-slate-50 hover:bg-slate-100")}
              >
                <ScenarioLegendDot index={i} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.label}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {getSolution(s.solutionId)?.shortName} · {fmt(s.rateMlH)} mL/h
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-base font-bold">{end?.estimate != null ? fmt1(end.estimate) : "—"}</span>
                  <span className="tabular block text-xs text-slate-500">{end?.deltaFromBaseline != null ? `${signed(end.deltaFromBaseline)} en ${end.hour} h` : ""}</span>
                </span>
                <VerdictIcon tone={v.tone} />
              </button>
            </li>
          );
        })}
      </ul>
      <Disclosure summary="Ver los escenarios superpuestos" className="mt-3">
        <SodiumChart scenarios={output.scenarios} baseline={output.patient.measuredSodium} limit24h={limit} height={320} />
      </Disclosure>
    </Card>
  );
}

function ScenarioCard({ scenario: s, index, output, limit }: { scenario: ScenarioResult; index: number; output: SimulationOutput; limit: number | null }) {
  const sol = getSolution(s.solutionId);
  const end = scenarioEnd(s);
  const v = scenarioVerdict(s, output, limit);
  const vs = VERDICT_STYLE[v.tone];
  const na0 = output.patient.measuredSodium;
  const others = s.alerts.filter((a) => a.title !== v.title);
  const blockedFrom = s.points.find((pt) => pt.hour > 0 && pt.estimate === null)?.hour;

  return (
    <motion.div
      id={`escenario-${index}`}
      className="scroll-mt-20"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ScenarioLegendDot index={index} />
            <h3 className="text-[17px] font-semibold tracking-tight">{s.label}</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <Chip>{sol?.name}</Chip>
            <Chip>Na⁺+K⁺ {sol ? sol.sodiumMmolL + sol.potassiumMmolL : "?"} mmol/L</Chip>
            <Chip>{fmt(s.rateMlH)} mL/h (hipotético)</Chip>
            <Chip>{s.horizonHours} h</Chip>
          </div>

          <div className={cn("mt-4 flex gap-3 rounded-xl p-3.5", vs.box)}>
            <VerdictIcon tone={v.tone} className="mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{v.title}</div>
              <p className="mt-0.5 text-[13px] leading-snug">{v.detail}</p>
            </div>
          </div>

          {end && end.estimate !== null && (
            <>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-500">Sodio estimado a las {end.hour} h</div>
                  <div className="tabular mt-1 flex items-center gap-2 text-[28px] font-bold leading-none tracking-tight">
                    <span className="text-slate-500">{fmt1(na0)}</span>
                    <ArrowRight className="size-5 text-slate-500" aria-hidden />
                    <AnimatedNumber from={na0} to={end.estimate} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular text-lg font-semibold">{signed(end.deltaFromBaseline!)} mmol/L</div>
                  <div className="tabular text-xs text-slate-500">
                    Rango {fmt1(end.low!)}–{fmt1(end.high!)}
                    {end.confidence === "low" && <span className="ml-1 font-medium text-amber-700">· confianza baja</span>}
                  </div>
                </div>
              </div>
              <SodiumScale
                className="mt-4"
                start={na0}
                estimate={end.estimate}
                low={end.low}
                high={end.high}
                limitValue={limit !== null ? na0 + limit : null}
                estimateLabel={`${end.hour} h`}
              />
            </>
          )}

          {blockedFrom !== undefined && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Sin estimación desde las {blockedFrom} h: los datos disponibles no la respaldan.</p>
          )}

          {others.length > 0 && (
            <div className="mt-4">
              <FindingList findings={others} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-6">
          <Disclosure summary="Ver evolución hora a hora" icon={<LineChart className="size-4" />}>
            <p className="mb-2 text-xs text-slate-500">
              Cada punto es una estimación en esa hora; la barra vertical es el rango de incertidumbre. Los puntos no se unen porque el modelo no predice una curva continua.
            </p>
            <SodiumChart scenarios={[s]} baseline={na0} limit24h={limit} height={260} />
            <div className="mt-3">
              <PointsTable scenario={s} />
            </div>
          </Disclosure>
          {s.summary.adrogueMadiasDeltaPerLiter !== null && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Gauge className="size-3.5" aria-hidden /> Por cada litro de esta solución (sin pérdidas): {signed(s.summary.adrogueMadiasDeltaPerLiter)} mmol/L
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/** Cuenta desde el sodio inicial hasta la estimación (refuerza la idea de cambio). */
function AnimatedNumber({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const t = setTimeout(() => setValue(to), 200);
    return () => clearTimeout(t);
  }, [to]);
  return <NumberFlow value={value} locales="es-EC" format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} transformTiming={{ duration: 900, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }} spinTiming={{ duration: 900, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }} />;
}

function ScenarioTabs({ output, selected, onSelect }: { output: SimulationOutput; selected: number; onSelect: (i: number) => void }) {
  return (
    <LayoutGroup id="scenario-tabs">
      <div role="tablist" aria-label="Escenarios" className="sticky top-3 z-20 flex gap-1 rounded-2xl bg-slate-200/90 p-1 shadow-sm backdrop-blur-xl">
        {output.scenarios.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={selected === i}
            onClick={() => onSelect(i)}
            className={cn("relative flex-1 rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors cursor-pointer", selected === i ? "text-ink" : "text-slate-500")}
          >
            {selected === i && <motion.span layoutId="scenario-pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
            <span className="relative flex items-center justify-center gap-1.5 truncate">
              <ScenarioLegendDot index={i} />
              <span className="truncate">{getSolution(s.solutionId)?.shortName ?? s.label}</span>
            </span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

function VerdictIcon({ tone, className }: { tone: Verdict["tone"]; className?: string }) {
  const cls = cn("size-5 shrink-0", VERDICT_STYLE[tone].icon, className);
  if (tone === "ok") return <CheckCircle2 className={cls} aria-label="Sin riesgo detectado" />;
  if (tone === "caution") return <AlertTriangle className={cls} aria-label="Revisar" />;
  if (tone === "danger") return <AlertOctagon className={cls} aria-label="Riesgo" />;
  return <Ban className={cls} aria-label="Bloqueado" />;
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{children}</span>;
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Disclosure({ summary, children, className, icon }: { summary: string; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <details className={cn("group", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 text-sm font-semibold text-brand-600 [&::-webkit-details-marker]:hidden">
        {icon}
        {summary}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-3 animate-in">{children}</div>
    </details>
  );
}

export function FormulasPanel({ output }: { output: Pick<SimulationOutput, "formulas" | "assumptions" | "engine"> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4 text-brand-600" /> Fórmulas utilizadas
        </h4>
        <div className="space-y-4">
          {output.formulas.map((f) => (
            <div key={f.id}>
              <div className="text-sm font-medium">{f.name}</div>
              <code tabIndex={0} className="mt-1 block overflow-x-auto rounded-lg bg-brand-50 px-3 py-2 font-mono text-[12.5px] text-brand-800">
                {f.expression}
              </code>
              <p className="mt-1 text-xs text-slate-500">
                {f.units} · {f.references.map((r) => REFERENCES[r].citation.split(".")[0]).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold">Supuestos del modelo</h4>
        <p className="mb-2 text-xs text-slate-500">Si alguno no se cumple, la estimación pierde validez.</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 marker:text-slate-400">
          {output.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
