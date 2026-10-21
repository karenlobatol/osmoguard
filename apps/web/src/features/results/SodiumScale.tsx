import { motion } from "motion/react";
import { fmt1 } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  start: number;
  estimate?: number | null;
  low?: number | null;
  high?: number | null;
  /** Valor máximo (hipo) o mínimo (hiper) al que permite llegar el límite de 24 h. */
  limitValue?: number | null;
  estimateLabel?: string;
  className?: string;
}

/**
 * Escala horizontal de sodio con zonas (bajo · normal · alto). Muestra de un vistazo dónde
 * está el paciente, a dónde llevaría el escenario y hasta dónde llega el límite seguro.
 */
export function SodiumScale({ start, estimate, low, high, limitValue, estimateLabel = "Estimado", className }: Props) {
  const values = [start, 135, 145, estimate, low, high, limitValue].filter((v): v is number => typeof v === "number");
  const min = Math.floor(Math.min(...values) - 4);
  const max = Math.ceil(Math.max(...values) + 4);
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const width = (a: number, b: number) => `${((Math.max(a, b) - Math.min(a, b)) / (max - min)) * 100}%`;
  const hasEst = typeof estimate === "number";
  // Fracción de la barra que ocupa cada zona: su nombre solo se muestra si cabe sin chocar con 135/145.
  const lowShare = (135 - min) / (max - min);
  const normalShare = 10 / (max - min);
  const highShare = (max - 145) / (max - min);
  // Si los dos marcadores quedan muy juntos, las etiquetas se abren hacia lados opuestos.
  const close = hasEst && Math.abs(estimate - start) / (max - min) < 0.14;
  const startAlign = close ? (estimate >= start ? "right" : "left") : "center";
  const estAlign = close ? (estimate >= start ? "left" : "right") : "center";
  const safeFrom = limitValue != null ? Math.min(start, limitValue) : null;
  const safeTo = limitValue != null ? Math.max(start, limitValue) : null;

  return (
    <div className={cn("select-none", className)} role="img" aria-label={`Sodio inicial ${fmt1(start)}${hasEst ? `, ${estimateLabel.toLowerCase()} ${fmt1(estimate)}` : ""} mmol/L`}>
      {/* Etiquetas superiores */}
      <div className="relative h-11">
        <Pin at={pos(start)} label="Inicial" value={start} tone="start" align={startAlign} />
        {hasEst && <Pin at={pos(estimate)} from={pos(start)} label={estimateLabel} value={estimate} tone="estimate" align={estAlign} />}
      </div>

      {/* Barra con zonas */}
      <div className="relative h-3.5 overflow-hidden rounded-full">
        <div className="absolute inset-y-0 left-0 bg-low-100" style={{ width: pos(135) }} />
        <div className="absolute inset-y-0 bg-ok-100" style={{ left: pos(135), width: width(135, 145) }} />
        <div className="absolute inset-y-0 right-0 bg-high-100" style={{ left: pos(145) }} />
        {safeFrom != null && safeTo != null && (
          <motion.div
            className="absolute inset-y-[3px] origin-left rounded-full bg-ok-500/35 ring-1 ring-ok-500/50"
            style={{ left: pos(safeFrom), width: width(safeFrom, safeTo), transformOrigin: limitValue! >= start ? "left" : "right" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
          />
        )}
        {low != null && high != null && (
          <motion.div
            className="absolute inset-y-[5px] rounded-full bg-brand-600/30"
            style={{ left: pos(low), width: width(low, high) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          />
        )}
      </div>

      {/* Marcadores sobre la barra */}
      <div className="relative -mt-[18px] h-[22px]">
        <span className="absolute top-0 size-[22px] -translate-x-1/2 rounded-full border-[3px] border-slate-500 bg-white" style={{ left: pos(start) }} />
        {hasEst && (
          <motion.span
            className="absolute top-0 size-[22px] -translate-x-1/2 rounded-full border-[3px] border-white bg-brand-600 shadow-md"
            initial={{ left: pos(start) }}
            animate={{ left: pos(estimate) }}
            transition={SLIDE}
          />
        )}
        {limitValue != null && <span className="absolute -top-1 h-[30px] w-[3px] -translate-x-1/2 rounded-full bg-red-600" style={{ left: pos(limitValue) }} />}
      </div>

      {/* Escala inferior */}
      <div className="relative mt-1.5 h-5 text-[11px] font-medium text-slate-500">
        <span className="absolute -translate-x-1/2" style={{ left: pos(135) }}>135</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(145) }}>145</span>
        {lowShare > 0.2 && <span className="absolute -translate-x-1/2 text-low-700" style={{ left: pos((min + 135) / 2) }}>Bajo</span>}
        {normalShare > 0.16 && <span className="absolute -translate-x-1/2 text-ok-700" style={{ left: pos(140) }}>Normal</span>}
        {highShare > 0.2 && <span className="absolute -translate-x-1/2 text-high-700" style={{ left: pos((145 + max) / 2) }}>Alto</span>}
      </div>
      {limitValue != null && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-ok-500/40 ring-1 ring-ok-500/60" /> Corrección dentro del límite
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-[3px] rounded-full bg-red-600" /> Límite 24 h ({fmt1(limitValue)})
          </span>
          {low != null && high != null && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-brand-600/30" /> Rango de incertidumbre
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const SLIDE = { duration: 0.9, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] } as const;

function Pin({ at, from, label, value, tone, align }: { at: string; from?: string; label: string; value: number; tone: "start" | "estimate"; align: "left" | "right" | "center" }) {
  const shift = align === "center" ? "-translate-x-1/2 items-center" : align === "right" ? "-translate-x-full items-end pr-1" : "items-start pl-1";
  return (
    <motion.div
      className={cn("absolute bottom-0 flex flex-col whitespace-nowrap leading-tight", shift)}
      initial={{ left: from ?? at }}
      animate={{ left: at }}
      transition={SLIDE}
    >
      <span className={cn("text-[10px] font-semibold uppercase tracking-wide", tone === "start" ? "text-slate-500" : "text-brand-600")}>{label}</span>
      <span className={cn("tabular text-sm font-bold", tone === "start" ? "text-slate-700" : "text-brand-700")}>{fmt1(value)}</span>
    </motion.div>
  );
}
