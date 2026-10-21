/** Conversiones de unidades. Todas las funciones son puras. */

/** Glucosa: 1 mmol/L = 18.016 mg/dL (peso molecular 180.16 g/mol). */
export const GLUCOSE_MGDL_PER_MMOLL = 18.016;
/** Creatinina: 1 mg/dL = 88.42 µmol/L (peso molecular 113.12 g/mol). */
export const CREATININE_UMOLL_PER_MGDL = 88.42;

export const glucoseMmolToMgDl = (mmolL: number): number => mmolL * GLUCOSE_MGDL_PER_MMOLL;
export const glucoseMgDlToMmol = (mgDl: number): number => mgDl / GLUCOSE_MGDL_PER_MMOLL;
export const creatinineUmolToMgDl = (umolL: number): number => umolL / CREATININE_UMOLL_PER_MGDL;
export const creatinineMgDlToUmol = (mgDl: number): number => mgDl * CREATININE_UMOLL_PER_MGDL;

/** Para iones monovalentes (Na⁺, K⁺) 1 mEq/L = 1 mmol/L. */
export const mEqToMmol = (mEq: number): number => mEq;

export const mlToL = (ml: number): number => ml / 1000;

export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}
