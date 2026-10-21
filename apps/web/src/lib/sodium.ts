import type { ScenarioResult, SimulationOutput } from "@osmoguard/engine";

/** Lenguaje sencillo y colores con significado fijo para el sodio (bajo = azul, normal = verde, alto = naranja). */

export type Zone = "low" | "normal" | "high";

export const zoneOf = (na: number): Zone => (na < 135 ? "low" : na > 145 ? "high" : "normal");

export const ZONE_STYLE: Record<Zone, { chip: string; dot: string; text: string; label: string }> = {
  low: { chip: "bg-low-100 text-low-700", dot: "bg-low-500", text: "text-low-700", label: "Bajo" },
  normal: { chip: "bg-ok-100 text-ok-700", dot: "bg-ok-500", text: "text-ok-700", label: "Normal" },
  high: { chip: "bg-high-100 text-high-700", dot: "bg-high-500", text: "text-high-700", label: "Alto" },
};

/** Nombre clínico + explicación breve para estudiantes. */
export function describeSodium(na: number): { title: string; plain: string; zone: Zone } {
  const zone = zoneOf(na);
  if (zone === "normal") return { zone, title: "Sodio normal", plain: "Está dentro del rango habitual (135–145 mmol/L)." };
  if (zone === "low") {
    const sev = na < 125 ? "profunda" : na < 130 ? "moderada" : "leve";
    return { zone, title: `Hiponatremia ${sev}`, plain: `El sodio está ${135 - na >= 10 ? "muy " : ""}por debajo de lo normal (135–145 mmol/L).` };
  }
  const sev = na >= 160 ? "grave" : na >= 150 ? "moderada" : "leve";
  return { zone, title: `Hipernatremia ${sev}`, plain: `El sodio está ${na - 145 >= 10 ? "muy " : ""}por encima de lo normal (135–145 mmol/L).` };
}

export type Verdict = { tone: "ok" | "caution" | "danger" | "blocked"; title: string; detail: string };

/** Veredicto en una frase a partir de las alertas deterministas del motor. */
export function scenarioVerdict(s: ScenarioResult, output: SimulationOutput, limit: number | null): Verdict {
  if (s.status === "blocked") return { tone: "blocked", title: "Sin estimación", detail: "Los datos no permiten calcular este escenario." };
  const danger = s.alerts.find((a) => a.level === "danger");
  if (danger) return { tone: "danger", title: danger.title, detail: danger.message };
  const warn = s.alerts.find((a) => a.level === "warning");
  if (warn) return { tone: "caution", title: warn.title, detail: warn.message };
  const d = s.summary.deltaAt24h ?? s.summary.deltaAtEnd;
  const cls = output.patient.classification;
  if (cls !== "normonatremia" && limit !== null && d)
    return {
      tone: "ok",
      title: "Dentro del límite de corrección",
      detail: `Cambio estimado de ${Math.abs(d.estimate).toLocaleString("es-EC", { maximumFractionDigits: 1 })} mmol/L; el límite configurado es ${Math.abs(limit)} mmol/L en 24 h.`,
    };
  return { tone: "ok", title: "Sin alertas", detail: "El escenario no genera alertas con los umbrales configurados." };
}

export const VERDICT_STYLE: Record<Verdict["tone"], { box: string; icon: string; badge: string }> = {
  ok: { box: "bg-ok-50 text-ok-700", icon: "text-ok-500", badge: "bg-ok-100 text-ok-700" },
  caution: { box: "bg-amber-50 text-amber-800", icon: "text-amber-500", badge: "bg-amber-100 text-amber-800" },
  danger: { box: "bg-red-50 text-red-800", icon: "text-red-600", badge: "bg-red-100 text-red-800" },
  blocked: { box: "bg-slate-100 text-slate-700", icon: "text-slate-500", badge: "bg-slate-200 text-slate-700" },
};
