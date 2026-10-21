import type { ReactNode } from "react";
import { AlertOctagon, AlertTriangle, Ban, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Finding, ReferenceId, ResultStatus, ScenarioResult, SolutionComparisonRow } from "@osmoguard/engine";
import { REFERENCES } from "@osmoguard/engine";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SERIES_HEX, fmt, fmt1, signed } from "@/lib/format";

const LEVEL = {
  info: { icon: Info, cls: "bg-brand-50 text-brand-800", label: "Información" },
  warning: { icon: AlertTriangle, cls: "bg-amber-50 text-amber-900", label: "Advertencia" },
  danger: { icon: AlertOctagon, cls: "bg-red-50 text-red-900", label: "Alerta" },
  blocked: { icon: Ban, cls: "bg-slate-100 text-slate-900", label: "Bloqueado" },
} as const;

export function FindingList({ findings, empty }: { findings: Finding[]; empty?: string }) {
  if (!findings.length) return empty ? <p className="text-sm text-slate-500">{empty}</p> : null;
  const order = { blocked: 0, danger: 1, warning: 2, info: 3 };
  return (
    <ul className="space-y-2">
      {[...findings]
        .sort((a, b) => order[a.level] - order[b.level])
        .map((f) => {
          const { icon: Icon, cls, label } = LEVEL[f.level];
          return (
            <li key={f.code} className={cn("flex gap-3 rounded-xl p-3.5 text-sm", cls)}>
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <div className="font-medium">
                  <span className="sr-only">{label}: </span>
                  {f.title}
                </div>
                <p className="mt-0.5 opacity-90">{f.message}</p>
                {f.references && f.references.length > 0 && <RefLinks ids={f.references} />}
              </div>
            </li>
          );
        })}
    </ul>
  );
}

function RefLinks({ ids }: { ids: ReferenceId[] }) {
  return (
    <p className="mt-1 text-xs opacity-75">
      Fuente:{" "}
      {ids.map((id, i) => {
        const r = REFERENCES[id];
        const short = r.citation.split(".")[0];
        return (
          <span key={id}>
            {i > 0 && "; "}
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
                {short}
              </a>
            ) : (
              short
            )}
          </span>
        );
      })}
    </p>
  );
}

export function StatusBadge({ status }: { status: ResultStatus }) {
  if (status === "ok")
    return (
      <Badge tone="success">
        <CheckCircle2 /> Sin alertas
      </Badge>
    );
  if (status === "warning")
    return (
      <Badge tone="warning">
        <AlertTriangle /> Con advertencias
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <Ban /> Bloqueado
    </Badge>
  );
}

export function DisclaimerBar({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
      <p>
        <strong className="font-semibold">Simulación educativa.</strong> {text.replace(/^Simulación matemática con fines exclusivamente educativos\. /, "")}
      </p>
    </div>
  );
}

export function Stat({ label, value, unit, sub, tone }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: "default" | "warn" }) {
  return (
    <div className={cn("rounded-xl border bg-white p-4", tone === "warn" ? "border-amber-200" : "border-slate-200")}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="tabular text-2xl font-semibold tracking-tight text-ink">{value}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function PointsTable({ scenario }: { scenario: ScenarioResult }) {
  const na0 = scenario.points[0]?.estimate ?? 0;
  return (
    <div tabIndex={0} role="region" aria-label={`Datos de ${scenario.label}`} className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="sr-only">Estimaciones puntuales del escenario {scenario.label}</caption>
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Hora</th>
            <th className="px-3 py-2 text-right font-medium">Na⁺ estimado</th>
            <th className="px-3 py-2 text-right font-medium">Cambio</th>
            <th className="px-3 py-2 text-right font-medium">Banda</th>
            <th className="px-3 py-2 text-right font-medium">Infundido</th>
            <th className="px-3 py-2 text-right font-medium">Balance neto</th>
            <th className="px-3 py-2 font-medium">Confianza</th>
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-slate-100">
          {scenario.points.map((p) => (
            <tr key={p.hour} className={p.confidence === "blocked" ? "text-slate-400" : ""}>
              <td className="px-3 py-2 font-medium">{p.hour} h</td>
              <td className="px-3 py-2 text-right">{p.estimate !== null ? fmt1(p.estimate) : "—"}</td>
              <td className="px-3 py-2 text-right">{p.estimate !== null ? signed(p.estimate - na0) : "—"}</td>
              <td className="px-3 py-2 text-right">{p.low !== null && p.high !== null ? `${fmt1(p.low)}–${fmt1(p.high)}` : "—"}</td>
              <td className="px-3 py-2 text-right">{fmt(p.infusedL)} L</td>
              <td className="px-3 py-2 text-right">{p.netBalanceL > 0 ? "+" : ""}{fmt(p.netBalanceL)} L</td>
              <td className="px-3 py-2">
                {p.confidence === "standard" ? (
                  <span className="text-slate-600">Estándar</span>
                ) : p.confidence === "low" ? (
                  <span className="font-medium text-amber-700">Baja</span>
                ) : (
                  <span>Sin estimación</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScenarioLegendDot({ index }: { index: number }) {
  const shapes = ["rounded-full", "rounded-[2px]", "rotate-45 rounded-[1px]", "[clip-path:polygon(50%_0,100%_100%,0_100%)]"];
  return <span className={cn("inline-block size-2.5 shrink-0", shapes[index % 4])} style={{ background: SERIES_HEX[index % 4] }} aria-hidden />;
}

/** Δ Na por litro de cada solución del catálogo (una sola serie → un solo color). */
export function SolutionDeltaChart({ rows }: { rows: SolutionComparisonRow[] }) {
  const data = rows.map((r) => ({ ...r, err: [r.deltaPerLiter - r.low, r.high - r.deltaPerLiter] as [number, number] }));
  return (
    <div style={{ height: Math.max(260, rows.length * 38) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={8}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} unit="" />
          <YAxis type="category" dataKey="name" width={138} tick={{ fontSize: 12, fill: "#334155" }} tickLine={false} axisLine={false} />
          <ReferenceLine x={0} stroke="#64748B" />
          <Tooltip
            cursor={{ fill: "#F1F5F9" }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !d) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                  <div className="font-medium text-ink">{d.name}</div>
                  <div className="tabular text-slate-700">
                    Na⁺+K⁺ {d.cationMmolL} mmol/L · Δ por litro <strong>{signed(d.deltaPerLiter)}</strong>
                  </div>
                  <div className="tabular text-slate-500">
                    Rango {signed(d.low)} a {signed(d.high)} (ACT ±)
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="deltaPerLiter" fill={SERIES_HEX[0]} radius={4} maxBarSize={18} isAnimationActive={false}>
            <ErrorBar dataKey="err" width={4} strokeWidth={1.5} stroke="#0F172A" direction="x" isAnimationActive={false} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
