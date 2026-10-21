/**
 * Catálogo EDUCATIVO de soluciones intravenosas.
 * La concentración relevante para los modelos tipo Edelman es Na⁺ + K⁺ (mmol/L).
 * La dextrosa se considera agua libre tras su metabolismo (supuesto estándar).
 * Las composiciones son nominales; las formulaciones comerciales varían por fabricante.
 */
export interface Solution {
  id: string;
  name: string;
  shortName: string;
  sodiumMmolL: number;
  potassiumMmolL: number;
  dextrosePercent: number;
  tonicityClass: "hipotónica" | "isotónica" | "hipertónica";
  note?: string;
}

export const SOLUTIONS: readonly Solution[] = [
  { id: "nacl-3", name: "Cloruro de sodio 3 %", shortName: "NaCl 3 %", sodiumMmolL: 513, potassiumMmolL: 0, dextrosePercent: 0, tonicityClass: "hipertónica" },
  { id: "nacl-09", name: "Cloruro de sodio 0,9 %", shortName: "NaCl 0,9 %", sodiumMmolL: 154, potassiumMmolL: 0, dextrosePercent: 0, tonicityClass: "isotónica" },
  { id: "plasmalyte-148", name: "Solución balanceada tipo Plasma-Lyte 148", shortName: "Balanceada 148", sodiumMmolL: 140, potassiumMmolL: 5, dextrosePercent: 0, tonicityClass: "isotónica" },
  { id: "ringer-lactate", name: "Ringer lactato (Hartmann)", shortName: "Ringer lactato", sodiumMmolL: 130, potassiumMmolL: 4, dextrosePercent: 0, tonicityClass: "isotónica", note: "Ligeramente hipotónica respecto al plasma." },
  { id: "nacl-045", name: "Cloruro de sodio 0,45 %", shortName: "NaCl 0,45 %", sodiumMmolL: 77, potassiumMmolL: 0, dextrosePercent: 0, tonicityClass: "hipotónica" },
  { id: "d5-nacl-045", name: "Dextrosa 5 % en NaCl 0,45 %", shortName: "D5 + NaCl 0,45 %", sodiumMmolL: 77, potassiumMmolL: 0, dextrosePercent: 5, tonicityClass: "hipotónica" },
  { id: "d5-nacl-02", name: "Dextrosa 5 % en NaCl 0,2 %", shortName: "D5 + NaCl 0,2 %", sodiumMmolL: 34, potassiumMmolL: 0, dextrosePercent: 5, tonicityClass: "hipotónica" },
  { id: "d5w", name: "Dextrosa 5 % en agua", shortName: "D5W", sodiumMmolL: 0, potassiumMmolL: 0, dextrosePercent: 5, tonicityClass: "hipotónica", note: "Equivale a agua libre una vez metabolizada la glucosa." },
  { id: "nacl-09-kcl20", name: "NaCl 0,9 % + KCl 20 mmol/L", shortName: "NaCl 0,9 % + KCl 20", sodiumMmolL: 154, potassiumMmolL: 20, dextrosePercent: 0, tonicityClass: "hipertónica", note: "El potasio añadido contribuye al efecto sobre el sodio sérico (Edelman)." },
] as const;

export function getSolution(id: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.id === id);
}

/** Concentración efectiva Na⁺ + K⁺ (mmol/L). */
export function effectiveCation(solution: Pick<Solution, "sodiumMmolL" | "potassiumMmolL">): number {
  return solution.sodiumMmolL + solution.potassiumMmolL;
}

/**
 * Composición típica (Na⁺+K⁺, mmol/L) de pérdidas no urinarias, con rango para incertidumbre.
 * Valores orientativos de libros de texto; varían ampliamente entre pacientes.
 */
export const LOSS_TYPES = {
  insensible: { label: "Pérdidas insensibles (respiración/piel)", nominal: 0, low: 0, high: 0 },
  sweat: { label: "Sudor", nominal: 50, low: 30, high: 70 },
  vomiting: { label: "Vómito / sonda nasogástrica", nominal: 70, low: 40, high: 110 },
  diarrhea: { label: "Diarrea", nominal: 100, low: 60, high: 140 },
  drain: { label: "Drenaje / fístula", nominal: 140, low: 100, high: 155 },
} as const;

export type LossType = keyof typeof LOSS_TYPES;
