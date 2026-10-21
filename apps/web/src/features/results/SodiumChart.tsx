import { useMemo } from "react";
import { CartesianGrid, ComposedChart, ErrorBar, Legend, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { ScenarioResult } from "@osmoguard/engine";
import { SERIES_HEX, fmt1, signed } from "@/lib/format";

const SHAPES = ["circle", "square", "diamond", "triangle"] as const;

interface Props {
  scenarios: ScenarioResult[];
  baseline: number;
  /** Límite de cambio en 24 h (positivo = subida máxima en hipo, negativo = bajada máxima en hiper). */
  limit24h?: number | null;
  height?: number;
}

interface Datum {
  x: number;
  hour: number;
  y: number;
  err: [number, number];
  low: number;
  high: number;
  confidence: string;
  scenario: string;
  color: string;
}

/**
 * Estimaciones PUNTUALES con barras de incertidumbre. Deliberadamente sin líneas que unan los
 * puntos: el modelo no respalda una trayectoria continua entre horas evaluadas.
 */
export function SodiumChart({ scenarios, baseline, limit24h, height = 320 }: Props) {
  const series = useMemo(() => {
    const n = scenarios.length;
    return scenarios.map((s, i) => {
      // Desplazamiento horizontal mínimo para que los escenarios no se oculten entre sí.
      const offset = n > 1 ? (i - (n - 1) / 2) * 0.35 : 0;
      const data: Datum[] = s.points
        .filter((p) => p.estimate !== null && p.low !== null && p.high !== null)
        .map((p) => ({
          x: p.hour + (p.hour === 0 ? 0 : offset),
          hour: p.hour,
          y: p.estimate!,
          err: [p.estimate! - p.low!, p.high! - p.estimate!],
          low: p.low!,
          high: p.high!,
          confidence: p.confidence,
          scenario: s.label,
          color: SERIES_HEX[i % SERIES_HEX.length]!,
        }));
      return { name: s.label, color: SERIES_HEX[i % SERIES_HEX.length]!, shape: SHAPES[i % SHAPES.length]!, data };
    });
  }, [scenarios]);

  const all = series.flatMap((s) => s.data);
  const maxHour = Math.max(...scenarios.map((s) => s.horizonHours), 1);
  const limitValue = limit24h ? baseline + limit24h : null;
  const ys = [...all.flatMap((d) => [d.low, d.high]), baseline, ...(limitValue ? [limitValue] : [])];
  const yMin = Math.floor(Math.min(...ys) - 2);
  const yMax = Math.ceil(Math.max(...ys) + 2);

  if (!all.length) return null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 12, right: 12, bottom: 8, left: -8 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
          <ReferenceArea y1={135} y2={145} fill="#0F9F8F" fillOpacity={0.07} ifOverflow="hidden" label={{ value: "Rango 135–145", position: "insideTopLeft", fill: "#0F766E", fontSize: 11 }} />
          <ReferenceLine y={baseline} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: `Inicial ${fmt1(baseline)}`, position: "insideBottomRight", fill: "#475569", fontSize: 11 }} />
          {limitValue !== null && (
            <ReferenceLine
              y={limitValue}
              stroke="#B91C1C"
              strokeDasharray="6 3"
              label={{ value: `Límite 24 h (${signed(limit24h!)})`, position: "insideTopRight", fill: "#B91C1C", fontSize: 11 }}
            />
          )}
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, maxHour]}
            ticks={[...new Set(scenarios.flatMap((s) => s.points.map((p) => p.hour)))].sort((a, b) => a - b)}
            tick={{ fontSize: 12, fill: "#64748B" }}
            tickLine={false}
            axisLine={{ stroke: "#CBD5E1" }}
            label={{ value: "Horas", position: "insideBottom", offset: -4, fontSize: 12, fill: "#64748B" }}
            height={40}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[yMin, yMax]}
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            width={52}
            label={{ value: "Na⁺ mmol/L", angle: -90, position: "insideLeft", offset: 18, fontSize: 12, fill: "#64748B" }}
          />
          <Tooltip cursor={{ strokeDasharray: "3 3", stroke: "#94A3B8" }} content={<PointTooltip baseline={baseline} />} />
          {series.length > 1 && <Legend verticalAlign="top" height={32} iconSize={10} wrapperStyle={{ fontSize: 12, color: "#334155" }} />}
          {series.map((s) => (
            <Scatter key={s.name} name={s.name} data={s.data} fill={s.color} shape={s.shape} legendType={s.shape === "diamond" ? "diamond" : s.shape === "triangle" ? "triangle" : s.shape === "square" ? "square" : "circle"} stroke="#fff" strokeWidth={1.5} isAnimationActive={false}>
              <ErrorBar dataKey="err" width={6} strokeWidth={2} stroke={s.color} direction="y" isAnimationActive={false} />
            </Scatter>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PointTooltip({ active, payload, baseline }: { active?: boolean; payload?: { payload: Datum }[]; baseline: number }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-ink">
        <span className="size-2.5 rounded-full" style={{ background: d.color }} aria-hidden />
        {d.scenario} · {d.hour} h
      </div>
      <div className="tabular text-slate-700">
        Estimación <strong className="text-ink">{fmt1(d.y)}</strong> mmol/L ({signed(d.y - baseline)})
      </div>
      <div className="tabular text-slate-500">
        Banda {fmt1(d.low)} – {fmt1(d.high)}
      </div>
      {d.confidence === "low" && <div className="mt-1 font-medium text-amber-700">Confianza baja</div>}
    </div>
  );
}
