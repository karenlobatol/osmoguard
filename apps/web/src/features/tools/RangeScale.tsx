import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface Zone {
  from: number;
  to: number;
  className: string;
  label?: string;
  labelClass?: string;
}

/** Escala horizontal genérica con zonas, rango esperado opcional y marcador animado. */
export function RangeScale({
  min,
  max,
  zones,
  value,
  valueLabel,
  expected,
  ticks = [],
  format = (v: number) => String(v),
}: {
  min: number;
  max: number;
  zones: Zone[];
  value: number;
  valueLabel?: string;
  expected?: { from: number; to: number; label: string } | null;
  ticks?: number[];
  format?: (v: number) => string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const pos = (v: number) => `${((clamp(v) - min) / (max - min)) * 100}%`;
  const width = (a: number, b: number) => `${((clamp(b) - clamp(a)) / (max - min)) * 100}%`;
  return (
    <div className="select-none" role="img" aria-label={`${valueLabel ?? "Valor"} ${format(value)}`}>
      <div className="relative h-10">
        <motion.div className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center leading-tight" initial={{ left: pos((min + max) / 2), opacity: 0 }} animate={{ left: pos(value), opacity: 1 }} transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}>
          {valueLabel && <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">{valueLabel}</span>}
          <span className="tabular text-sm font-bold text-brand-700">{format(value)}</span>
        </motion.div>
      </div>
      <div className="relative h-3.5 overflow-hidden rounded-full">
        {zones.map((z, i) => (
          <div key={i} className={cn("absolute inset-y-0", z.className)} style={{ left: pos(z.from), width: width(z.from, z.to) }} />
        ))}
        {expected && (
          <motion.div
            className="absolute inset-y-[3px] rounded-full bg-slate-900/25 ring-1 ring-slate-900/40"
            style={{ left: pos(expected.from), width: width(expected.from, expected.to) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          />
        )}
      </div>
      <div className="relative -mt-[18px] h-[22px]">
        <motion.span
          className="absolute top-0 size-[22px] -translate-x-1/2 rounded-full border-[3px] border-white bg-brand-600 shadow-md"
          initial={{ left: pos((min + max) / 2) }}
          animate={{ left: pos(value) }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] font-medium text-slate-500">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: pos(t) }}>
            {format(t)}
          </span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium">
        {zones
          .filter((z) => z.label)
          .map((z) => (
            <span key={z.label} className={cn("inline-flex items-center gap-1.5", z.labelClass ?? "text-slate-600")}>
              <span className={cn("h-2 w-3 rounded-full", z.className)} /> {z.label}
            </span>
          ))}
        {expected && (
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-3 rounded-full bg-slate-900/25 ring-1 ring-slate-900/40" /> {expected.label}
          </span>
        )}
      </div>
    </div>
  );
}
