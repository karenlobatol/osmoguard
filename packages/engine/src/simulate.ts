import {
  MAX_HOURS_WITHOUT_URINE_DATA,
  SODIUM_HIGH,
  SODIUM_LOW,
  assessApplicability,
  assessPatient,
  compareSolutions,
  lossComposition,
  urineCation,
} from "./assessment";
import { effectiveCation, getSolution } from "./catalog";
import { adrogueMadiasDeltaPerLiter, edelmanMassBalance } from "./formulas";
import { simulationRequestSchema, type AlertConfig, type PatientInput, type ScenarioInput, type SimulationRequestRaw } from "./schemas";
import type { Finding, FormulaUsed, PatientAssessment, ResultStatus, ScenarioResult, SimulationOutput, TimelinePoint } from "./types";
import { ENGINE_NAME, ENGINE_VERSION } from "./version";
import { round } from "./units";

/** Horas en las que se evalúa el modelo. Son estimaciones PUNTUALES; no se interpolan. */
export const CHECKPOINT_HOURS = [1, 2, 4, 6, 8, 12, 16, 20, 24, 30, 36, 42, 48] as const;
/** A partir de este horizonte la confianza se marca siempre como baja. */
export const LOW_CONFIDENCE_AFTER_HOURS = 24;

export const DISCLAIMER =
  "Simulación matemática con fines exclusivamente educativos. No constituye una prescripción, no sustituye el juicio clínico ni la monitorización analítica seriada, y no ha sido validada para la toma de decisiones asistenciales.";

interface Params {
  tbw: number;
  urineLH: number;
  urineCation: number;
  lossLH: number;
  lossCationMmolH: number;
}

function checkpointsFor(horizon: number): number[] {
  const hours: number[] = CHECKPOINT_HOURS.filter((h) => h <= horizon);
  if (!hours.includes(horizon)) hours.push(horizon);
  return [0, ...hours];
}

/** Genera las combinaciones extremas de parámetros (análisis de sensibilidad determinista). */
function parameterCorners(p: PatientInput, tbwLow: number, tbwHigh: number): Params[] {
  const urineL = (p.urineOutputMlH ?? 0) / 1000;
  const uc = urineCation(p);
  const tbwOptions = [tbwLow, tbwHigh];
  const urineVol = urineL > 0 ? [urineL * 0.8, urineL * 1.2] : [0];
  const urineConc = urineL > 0 ? [uc.low, uc.high] : [0];
  const losses = p.otherLosses.filter((l) => l.mlPerHour > 0);
  const lossVolFactors = losses.length ? [0.8, 1.2] : [1];
  const lossConcSide = losses.length ? (["low", "high"] as const) : (["nominal"] as const);
  const out: Params[] = [];
  for (const tbw of tbwOptions)
    for (const uv of urineVol)
      for (const ucc of urineConc)
        for (const lf of lossVolFactors)
          for (const side of lossConcSide) {
            let lossLH = 0;
            let lossCation = 0;
            for (const l of losses) {
              const comp = lossComposition(l.type, l.measuredCationMmolL);
              const v = (l.mlPerHour / 1000) * lf;
              lossLH += v;
              lossCation += v * comp[side];
            }
            out.push({ tbw, urineLH: uv, urineCation: ucc, lossLH, lossCationMmolH: lossCation });
          }
  return out;
}

function nominalParams(p: PatientInput, tbw: number): Params {
  let lossLH = 0;
  let lossCation = 0;
  for (const l of p.otherLosses) {
    const v = l.mlPerHour / 1000;
    lossLH += v;
    lossCation += v * lossComposition(l.type, l.measuredCationMmolL).nominal;
  }
  return { tbw, urineLH: (p.urineOutputMlH ?? 0) / 1000, urineCation: urineCation(p).nominal, lossLH, lossCationMmolH: lossCation };
}

function evaluate(p: PatientInput, s: ScenarioInput, cation: number, prm: Params, hour: number): number | null {
  const infusionLH = s.rateMlH / 1000;
  const oralLH = p.oralWaterIntakeMlH / 1000;
  return edelmanMassBalance(
    p.serumSodiumMmolL * prm.tbw,
    prm.tbw,
    infusionLH * cation,
    prm.urineLH * prm.urineCation + prm.lossCationMmolH,
    infusionLH + oralLH,
    prm.urineLH + prm.lossLH,
    hour,
  );
}

function scenarioAlerts(p: PatientInput, a: PatientAssessment, s: ScenarioInput, cation: number, points: TimelinePoint[], cfg: AlertConfig): Finding[] {
  const alerts: Finding[] = [];
  const na0 = p.serumSodiumMmolL;
  const valid = points.filter((pt) => pt.hour > 0 && pt.estimate !== null && pt.confidence !== "blocked");
  const last = valid.at(-1);
  const upTo = (h: number) => valid.filter((pt) => pt.hour <= h);
  const push = (x: Finding) => {
    if (!alerts.some((y) => y.code === x.code)) alerts.push(x);
  };

  if (a.classification === "hyponatremia") {
    const limit24 = a.odsHighRisk ? cfg.hypoMaxRise24hHighRisk : cfg.hypoMaxRise24hStandard;
    for (const pt of upTo(24)) {
      const rise = pt.estimate! - na0;
      if (rise > limit24)
        push({
          code: "OVERCORRECTION_24H",
          level: "danger",
          title: "Sobrecorrección estimada en 24 h",
          message: `A las ${pt.hour} h el aumento estimado (${round(rise, 1)} mmol/L) supera el límite configurado de ${limit24} mmol/L en 24 h${a.odsHighRisk ? " (alto riesgo)" : ""}.`,
          references: ["verbalis", "spasovski"],
        });
      else if (pt.high !== null && pt.high - na0 > limit24)
        push({
          code: "OVERCORRECTION_24H_POSSIBLE",
          level: "warning",
          title: "Posible sobrecorrección dentro de la incertidumbre",
          message: `El extremo superior de la banda a las ${pt.hour} h (+${round(pt.high - na0, 1)} mmol/L) supera el límite de ${limit24} mmol/L en 24 h.`,
          references: ["verbalis", "spasovski"],
        });
    }
    for (const pt of valid.filter((x) => x.hour > 24)) {
      const rise = pt.estimate! - na0;
      if (rise > cfg.hypoMaxRise48h)
        push({
          code: "OVERCORRECTION_48H",
          level: "danger",
          title: "Sobrecorrección estimada en 48 h",
          message: `A las ${pt.hour} h el aumento acumulado estimado (${round(rise, 1)} mmol/L) supera ${cfg.hypoMaxRise48h} mmol/L.`,
          references: ["verbalis"],
        });
    }
    if (valid.some((pt) => pt.estimate! > SODIUM_HIGH))
      push({ code: "OVERSHOOT_HYPER", level: "danger", title: "Sobrepaso a hipernatremia", message: "El escenario estima un sodio por encima de 145 mmol/L." });
    if (last && last.estimate! < na0 - 0.5)
      push({
        code: "WORSENING",
        level: "warning",
        title: "El escenario reduce aún más el sodio",
        message: "Con las entradas y pérdidas introducidas, el balance neto estimado empeora la hiponatremia.",
        references: ["adrogueHypo"],
      });
    const uc = urineCation(p);
    if (uc.measured && p.urineOutputMlH && uc.nominal > cation)
      push({
        code: "URINE_EXCEEDS_INFUSATE",
        level: "warning",
        title: "Orina más concentrada que la solución",
        message: `Na⁺+K⁺ urinario (${round(uc.nominal, 0)} mmol/L) supera al de la solución (${cation} mmol/L): parte del agua infundida puede retenerse y descender el sodio (patrón típico del SIADH).`,
        references: ["adrogueHypo", "spasovski"],
      });
  }

  if (a.classification === "hypernatremia") {
    for (const pt of upTo(24)) {
      const fall = na0 - pt.estimate!;
      if (fall > cfg.hyperMaxFall24h)
        push({
          code: "HYPER_FAST_CORRECTION",
          level: p.chronicity === "acute" ? "warning" : "danger",
          title: "Descenso estimado rápido en 24 h",
          message: `A las ${pt.hour} h el descenso estimado (${round(fall, 1)} mmol/L) supera ${cfg.hyperMaxFall24h} mmol/L en 24 h.${p.chronicity === "acute" ? " En hipernatremia aguda documentada la literatura admite correcciones más rápidas." : ""}`,
          references: ["adrogueHyper"],
        });
    }
    if (valid.some((pt) => pt.estimate! < SODIUM_LOW))
      push({ code: "OVERSHOOT_HYPO", level: "danger", title: "Sobrepaso a hiponatremia", message: "El escenario estima un sodio por debajo de 135 mmol/L." });
    if (last && last.estimate! > na0 + 0.5)
      push({
        code: "WORSENING",
        level: "warning",
        title: "El escenario aumenta aún más el sodio",
        message: "Con las entradas y pérdidas introducidas, el balance neto estimado empeora la hipernatremia.",
        references: ["adrogueHyper"],
      });
  }

  if (a.classification === "normonatremia" && valid.some((pt) => pt.estimate! < SODIUM_LOW || pt.estimate! > SODIUM_HIGH))
    push({ code: "INDUCED_DYSNATREMIA", level: "warning", title: "El escenario induce disnatremia", message: "El sodio estimado sale del rango 135–145 mmol/L." });

  const sol = getSolution(s.solutionId);
  if (sol?.id === "nacl-3")
    push({
      code: "HYPERTONIC",
      level: "info",
      title: "Solución hipertónica",
      message: "En la práctica clínica su uso se rige por protocolos institucionales con controles analíticos frecuentes; el simulador no reemplaza esa monitorización.",
      references: ["spasovski", "verbalis"],
    });
  if (s.rateMlH > 500)
    push({ code: "HIGH_RATE", level: "warning", title: "Velocidad hipotética elevada", message: "Velocidades > 500 mL/h implican riesgo de sobrecarga de volumen no representado por el modelo de sodio." });
  if (last && last.netBalanceL > 3)
    push({ code: "POSITIVE_BALANCE", level: "warning", title: "Balance hídrico muy positivo", message: `Balance neto estimado de +${last.netBalanceL} L al final del horizonte.` });
  if (points.some((pt) => pt.hour > 0 && pt.estimate === null && pt.confidence === "blocked" && p.urineOutputMlH === undefined && pt.hour > MAX_HOURS_WITHOUT_URINE_DATA))
    push({
      code: "TRUNCATED_NO_URINE",
      level: "info",
      title: "Horizonte truncado",
      message: `Sin diuresis informada solo se muestran estimaciones hasta ${MAX_HOURS_WITHOUT_URINE_DATA} h.`,
    });
  if (points.some((pt) => pt.hour > 0 && pt.estimate === null && pt.confidence === "blocked" && !(p.urineOutputMlH === undefined && pt.hour > MAX_HOURS_WITHOUT_URINE_DATA)))
    push({
      code: "IMPLAUSIBLE_BALANCE",
      level: "blocked",
      title: "Balance implausible",
      message: "Las pérdidas superan a los aportes hasta un punto en que el agua corporal estimada cae por debajo del 50 %. El modelo deja de ser interpretable.",
    });
  return alerts;
}

function runScenario(p: PatientInput, a: PatientAssessment, s: ScenarioInput, cfg: AlertConfig, globalBlocked: boolean): ScenarioResult {
  const sol = getSolution(s.solutionId);
  if (!sol) throw new Error(`Solución desconocida: ${s.solutionId}`);
  const cation = effectiveCation(sol);
  const na0 = p.serumSodiumMmolL;
  const nominal = nominalParams(p, a.tbw.liters);
  const corners = parameterCorners(p, a.tbw.low, a.tbw.high);
  const urineMeasured = urineCation(p).measured || (p.urineOutputMlH ?? 0) === 0;
  const fluidOutLH = nominal.urineLH + nominal.lossLH;
  const fluidInLH = s.rateMlH / 1000 + p.oralWaterIntakeMlH / 1000;

  const points: TimelinePoint[] = checkpointsFor(s.horizonHours).map((hour) => {
    const infusedL = round((s.rateMlH / 1000) * hour, 2);
    const netBalanceL = round((fluidInLH - fluidOutLH) * hour, 2);
    if (hour === 0)
      return { hour, estimate: na0, low: na0, high: na0, deltaFromBaseline: 0, infusedL, netBalanceL, confidence: globalBlocked ? "blocked" : "standard" };
    const blockedNoUrine = p.urineOutputMlH === undefined && hour > MAX_HOURS_WITHOUT_URINE_DATA;
    if (globalBlocked || blockedNoUrine)
      return { hour, estimate: null, low: null, high: null, deltaFromBaseline: null, infusedL, netBalanceL, confidence: "blocked" };
    const est = evaluate(p, s, cation, nominal, hour);
    if (est === null) return { hour, estimate: null, low: null, high: null, deltaFromBaseline: null, infusedL, netBalanceL, confidence: "blocked" };
    const values = corners.map((c) => evaluate(p, s, cation, c, hour));
    const finite = values.filter((v): v is number => v !== null);
    const unbounded = finite.length < values.length;
    const low = Math.min(est, ...finite);
    const high = Math.max(est, ...finite);
    const lowConfidence = hour > LOW_CONFIDENCE_AFTER_HOURS || !urineMeasured || unbounded || p.urineOutputMlH === undefined;
    return {
      hour,
      estimate: round(est, 1),
      low: round(low, 1),
      high: round(high, 1),
      deltaFromBaseline: round(est - na0, 1),
      infusedL,
      netBalanceL,
      confidence: lowConfidence ? "low" : "standard",
    };
  });

  const alerts = globalBlocked ? [] : scenarioAlerts(p, a, s, cation, points, cfg);
  const deltaOf = (pt: TimelinePoint | undefined) =>
    pt && pt.estimate !== null && pt.low !== null && pt.high !== null
      ? { estimate: round(pt.estimate - na0, 1), low: round(pt.low - na0, 1), high: round(pt.high - na0, 1) }
      : null;
  const lastValid = [...points].reverse().find((pt) => pt.hour > 0 && pt.estimate !== null);
  const status: ResultStatus =
    globalBlocked || alerts.some((x) => x.level === "blocked") || !lastValid
      ? "blocked"
      : alerts.some((x) => x.level === "danger" || x.level === "warning")
        ? "warning"
        : "ok";

  return {
    label: s.label,
    solutionId: sol.id,
    solutionName: sol.name,
    rateMlH: s.rateMlH,
    horizonHours: s.horizonHours,
    status,
    points,
    summary: {
      deltaAt24h: deltaOf(points.find((pt) => pt.hour === 24)),
      deltaAtEnd: deltaOf(lastValid),
      adrogueMadiasDeltaPerLiter: globalBlocked ? null : round(adrogueMadiasDeltaPerLiter(cation, na0, a.tbw.liters), 1),
    },
    alerts,
  };
}

export const FORMULAS: FormulaUsed[] = [
  {
    id: "tbw-fraction",
    name: "Agua corporal total por fracción de peso",
    expression: "ACT = peso × f (f: 0,6 H < 65 a · 0,5 M < 65 a · 0,5 H ≥ 65 a · 0,45 M ≥ 65 a)",
    units: "kg → L",
    references: ["adrogueHypo"],
  },
  {
    id: "tbw-watson",
    name: "Agua corporal total (Watson), comparación",
    expression: "H: 2,447 − 0,09516·edad + 0,1074·talla + 0,3362·peso · M: −2,097 + 0,1069·talla + 0,2466·peso",
    units: "años, cm, kg → L",
    references: ["watson"],
  },
  {
    id: "adrogue-madias",
    name: "Adrogué-Madias (cambio por litro)",
    expression: "ΔNa = ((Na_inf + K_inf) − Na_s) / (ACT + 1)",
    units: "mmol/L por litro infundido",
    references: ["adrogueHypo", "adrogueHyper"],
  },
  {
    id: "edelman-balance",
    name: "Balance de masas tipo Edelman (escenario temporal)",
    expression: "Na(t) = (Na₀·ACT₀ + Σ(Na+K)entra − Σ(Na+K)sale) / (ACT₀ + V_entra − V_sale)",
    units: "mmol, L, h → mmol/L",
    references: ["edelman", "barsoum"],
  },
  {
    id: "free-water-deficit",
    name: "Déficit de agua libre",
    expression: "DAL = ACT × (Na / 140 − 1)",
    units: "L",
    references: ["adrogueHyper"],
  },
  {
    id: "glucose-correction",
    name: "Sodio corregido por glucosa",
    expression: "Na_c = Na + k × (glucosa − 100) / 100 (k = 1,6 Katz · 2,4 Hillier)",
    units: "mmol/L, mg/dL",
    references: ["katz", "hillier"],
  },
  {
    id: "egfr",
    name: "eGFR CKD-EPI 2021",
    expression: "142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1,2 × 0,9938^edad × 1,012 [mujer]",
    units: "mL/min/1,73 m²",
    references: ["ckdEpi2021"],
  },
];

export const ASSUMPTIONS: string[] = [
  "El sodio sérico se aproxima por (Na⁺ + K⁺ intercambiables) / agua corporal total (Edelman simplificado, sin término de intercepción).",
  "Las velocidades, diuresis y pérdidas se suponen constantes durante todo el horizonte.",
  "La dextrosa de las soluciones se metaboliza por completo y se comporta como agua libre.",
  "Se asume equilibrio osmótico instantáneo entre compartimentos.",
  "La banda de incertidumbre recorre combinaciones extremas de agua corporal (±10 % y Watson si hay talla), diuresis (±20 %), composición urinaria y de pérdidas; no es un intervalo de confianza estadístico.",
  "Las estimaciones son puntuales en horas predefinidas y no se interpolan entre ellas.",
  "No se modelan cambios de la respuesta renal (p. ej. supresión de ADH y acuaresis), que son la causa más frecuente de sobrecorrección.",
  "Más allá de 24 h la confianza se marca como baja aunque los datos sean completos.",
];

/**
 * Punto de entrada del motor. Determinista: mismas entradas → misma salida.
 * Lanza ZodError si la entrada no cumple el esquema.
 */
export function runSimulation(raw: SimulationRequestRaw): SimulationOutput {
  const req = simulationRequestSchema.parse(raw);
  const assessed = assessPatient(req.patient);
  const applicability = assessApplicability(req.patient, assessed);
  const globalBlocked = applicability.some((f) => f.level === "blocked");
  // Con el modelo bloqueado no se exponen magnitudes derivadas que puedan leerse como resultado.
  const patient = globalBlocked ? { ...assessed, freeWaterDeficit: null, electrolyteFreeWaterClearanceLH: null } : assessed;
  const scenarios = req.scenarios.map((s) => runScenario(req.patient, patient, s, req.alertConfig, globalBlocked));
  const status: ResultStatus = globalBlocked
    ? "blocked"
    : applicability.some((f) => f.level === "warning") || scenarios.some((s) => s.status !== "ok")
      ? "warning"
      : "ok";
  return {
    engine: { name: ENGINE_NAME, version: ENGINE_VERSION },
    status,
    patient,
    applicability,
    solutionComparison: globalBlocked ? [] : compareSolutions(req.patient, patient.tbw),
    scenarios,
    assumptions: ASSUMPTIONS,
    formulas: FORMULAS,
    disclaimer: DISCLAIMER,
  };
}
