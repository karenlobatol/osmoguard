import type { SimulationOutput } from "@osmoguard/engine";

const nf1 = new Intl.NumberFormat("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("es-EC", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const fmt1 = (n: number) => nf1.format(n);
export const fmt = (n: number) => nf2.format(n);
export const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${fmt1(Math.abs(n))}`;
export const fmtDate = (iso: string) => new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
export const fmtDateShort = (iso: string) => new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short" }).format(new Date(iso));

export const CLASSIFICATION_LABEL: Record<SimulationOutput["patient"]["classification"], string> = {
  hyponatremia: "Hiponatremia",
  normonatremia: "Normonatremia",
  hypernatremia: "Hipernatremia",
};

export const SERIES_COLORS = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)"] as const;
export const SERIES_HEX = ["#1F6FB2", "#D9611E", "#0F9F8F", "#8B5CF6"] as const;
