/**
 * Fórmulas publicadas, implementadas como funciones puras.
 * Cada función documenta fuente, unidades y supuestos. Que una fórmula esté publicada
 * NO implica que sea una predicción clínica validada para un paciente concreto.
 */

/** Edad a partir de la cual Adrogué-Madias usa fracciones de "anciano". */
export const ELDERLY_AGE_YEARS = 65;

export type TbwMethod = "fraction" | "watson";

/**
 * Fracción de agua corporal total (ACT) según Adrogué & Madias (NEJM 2000):
 * niños 0,6 · hombres adultos 0,6 · mujeres adultas 0,5 · hombres ≥65 a 0,5 · mujeres ≥65 a 0,45.
 */
export function tbwFraction(ageYears: number, sex: "male" | "female"): number {
  if (ageYears < 18) return 0.6;
  const elderly = ageYears >= ELDERLY_AGE_YEARS;
  if (sex === "male") return elderly ? 0.5 : 0.6;
  return elderly ? 0.45 : 0.5;
}

/** ACT (L) = peso (kg) × fracción. */
export function tbwByFraction(weightKg: number, ageYears: number, sex: "male" | "female"): number {
  return weightKg * tbwFraction(ageYears, sex);
}

/**
 * Fórmula de Watson (1980), adultos. Unidades: edad años, talla cm, peso kg → litros.
 * Hombres: 2,447 − 0,09516·edad + 0,1074·talla + 0,3362·peso
 * Mujeres: −2,097 + 0,1069·talla + 0,2466·peso
 */
export function tbwWatson(weightKg: number, heightCm: number, ageYears: number, sex: "male" | "female"): number {
  if (sex === "male") return 2.447 - 0.09516 * ageYears + 0.1074 * heightCm + 0.3362 * weightKg;
  return -2.097 + 0.1069 * heightCm + 0.2466 * weightKg;
}

/**
 * Adrogué-Madias: cambio estimado del Na sérico tras infundir 1 L de una solución.
 * ΔNa (mmol/L) = ((Na_inf + K_inf) − Na_sérico) / (ACT + 1)
 * Supuestos: sistema cerrado (sin diuresis ni otras pérdidas), equilibrio osmótico completo.
 */
export function adrogueMadiasDeltaPerLiter(infusateCationMmolL: number, serumSodiumMmolL: number, tbwL: number): number {
  if (tbwL <= 0) throw new RangeError("El agua corporal total debe ser positiva");
  return (infusateCationMmolL - serumSodiumMmolL) / (tbwL + 1);
}

/**
 * Déficit de agua libre (L) en hipernatremia: ACT × (Na/Na_objetivo − 1).
 * Devuelve 0 si Na ≤ objetivo. No incluye pérdidas en curso.
 */
export function freeWaterDeficit(tbwL: number, serumSodiumMmolL: number, targetSodiumMmolL = 140): number {
  if (serumSodiumMmolL <= targetSodiumMmolL) return 0;
  return tbwL * (serumSodiumMmolL / targetSodiumMmolL - 1);
}

/**
 * Sodio corregido por hiperglucemia. Factor por cada 100 mg/dL de glucosa por encima de 100 mg/dL:
 * Katz 1,6 mmol/L · Hillier 2,4 mmol/L. Si glucosa ≤ 100 mg/dL no se corrige.
 */
export function correctedSodiumForGlucose(serumSodiumMmolL: number, glucoseMgDl: number, factor: 1.6 | 2.4): number {
  const excess = Math.max(0, glucoseMgDl - 100);
  return serumSodiumMmolL + (factor * excess) / 100;
}

/**
 * Edelman simplificado: Na sérico ≈ (Na_e + K_e) / ACT. Balance de masas con tasas constantes.
 * Devuelve el Na estimado tras `hours` horas.
 *
 * @param solute0 cationes intercambiables iniciales (mmol) = Na0 × ACT0
 * @param tbw0 ACT inicial (L)
 * @param cationInMmolH aporte de Na⁺+K⁺ (mmol/h)
 * @param cationOutMmolH salida de Na⁺+K⁺ (mmol/h)
 * @param waterInLH entrada de agua (L/h)
 * @param waterOutLH salida de agua (L/h)
 */
export function edelmanMassBalance(
  solute0: number,
  tbw0: number,
  cationInMmolH: number,
  cationOutMmolH: number,
  waterInLH: number,
  waterOutLH: number,
  hours: number,
): number | null {
  const tbw = tbw0 + (waterInLH - waterOutLH) * hours;
  // Una ACT que cae por debajo del 50 % de la inicial está fuera de cualquier interpretación fisiológica.
  if (tbw <= tbw0 * 0.5) return null;
  const solute = solute0 + (cationInMmolH - cationOutMmolH) * hours;
  if (solute <= 0) return null;
  return solute / tbw;
}

/**
 * eGFR CKD-EPI 2021 (sin raza), mL/min/1,73 m². Creatinina en mg/dL, edad en años (adultos).
 */
export function egfrCkdEpi2021(creatinineMgDl: number, ageYears: number, sex: "male" | "female"): number {
  const kappa = sex === "female" ? 0.7 : 0.9;
  const alpha = sex === "female" ? -0.241 : -0.302;
  const ratio = creatinineMgDl / kappa;
  const value = 142 * Math.min(ratio, 1) ** alpha * Math.max(ratio, 1) ** -1.2 * 0.9938 ** ageYears;
  return sex === "female" ? value * 1.012 : value;
}

/**
 * Aclaramiento de agua libre de electrolitos (L/h):
 * EFWC = V × (1 − (U_Na + U_K) / P_Na). Positivo: la orina elimina agua libre (tiende a subir el Na).
 */
export function electrolyteFreeWaterClearance(urineLH: number, urineNa: number, urineK: number, plasmaNa: number): number {
  return urineLH * (1 - (urineNa + urineK) / plasmaNa);
}
