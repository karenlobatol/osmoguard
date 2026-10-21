import { describe, expect, it } from "vitest";
import {
  adrogueMadiasDeltaPerLiter,
  correctedSodiumForGlucose,
  edelmanMassBalance,
  egfrCkdEpi2021,
  electrolyteFreeWaterClearance,
  freeWaterDeficit,
  tbwByFraction,
  tbwFraction,
  tbwWatson,
} from "../src/formulas";
import { creatinineMgDlToUmol, creatinineUmolToMgDl, glucoseMgDlToMmol, glucoseMmolToMgDl, round } from "../src/units";

describe("fracción de agua corporal (Adrogué-Madias 2000)", () => {
  it.each([
    [40, "male", 0.6],
    [40, "female", 0.5],
    [64, "male", 0.6],
    [65, "male", 0.5],
    [65, "female", 0.45],
    [90, "female", 0.45],
    [10, "female", 0.6],
  ] as const)("edad %i, %s → %d", (age, sex, f) => {
    expect(tbwFraction(age, sex)).toBe(f);
  });

  it("ACT = peso × fracción", () => {
    expect(tbwByFraction(70, 40, "male")).toBeCloseTo(42, 10);
    expect(tbwByFraction(60, 70, "female")).toBeCloseTo(27, 10);
  });
});

describe("Watson 1980", () => {
  it("hombre 40 a, 175 cm, 70 kg", () => {
    // 2.447 − 0.09516·40 + 0.1074·175 + 0.3362·70 = 40.9696
    expect(tbwWatson(70, 175, 40, "male")).toBeCloseTo(40.9696, 4);
  });
  it("mujer 175 cm, 60 kg (no depende de la edad)", () => {
    // −2.097 + 0.1069·175 + 0.2466·60 = 31.4065
    expect(tbwWatson(60, 175, 30, "female")).toBeCloseTo(31.4065, 4);
    expect(tbwWatson(60, 175, 80, "female")).toBeCloseTo(31.4065, 4);
  });
});

describe("Adrogué-Madias — ejemplos trabajados con la fórmula publicada", () => {
  it("hiponatremia: mujer 60 kg < 65 a, Na 110, NaCl 3 % → +13,0 mmol/L por litro", () => {
    // ACT = 30 L; (513 − 110) / 31 = 13.0
    expect(round(adrogueMadiasDeltaPerLiter(513, 110, 30), 1)).toBe(13);
  });
  it("hipernatremia: hombre 76 a, 70 kg, Na 168, D5W → −4,7 mmol/L por litro", () => {
    // ACT = 0.5 × 70 = 35 L; (0 − 168) / 36 = −4.67
    expect(round(adrogueMadiasDeltaPerLiter(0, 168, 35), 1)).toBe(-4.7);
  });
  it("Ringer lactato en hipernatremia: (134 − 168)/36 = −0,9", () => {
    expect(round(adrogueMadiasDeltaPerLiter(134, 168, 35), 1)).toBe(-0.9);
  });
  it("solución con la misma concentración que el plasma no cambia el sodio", () => {
    expect(adrogueMadiasDeltaPerLiter(140, 140, 40)).toBe(0);
  });
  it("rechaza ACT no positiva", () => {
    expect(() => adrogueMadiasDeltaPerLiter(154, 120, 0)).toThrow(RangeError);
  });
});

describe("déficit de agua libre", () => {
  it("ACT 35 L, Na 168 → 7 L", () => {
    expect(freeWaterDeficit(35, 168)).toBeCloseTo(7, 10);
  });
  it("0 si Na ≤ 140", () => {
    expect(freeWaterDeficit(35, 140)).toBe(0);
    expect(freeWaterDeficit(35, 120)).toBe(0);
  });
});

describe("corrección por glucosa", () => {
  it("Na 128, glucosa 600 mg/dL → Katz 136, Hillier 140", () => {
    expect(correctedSodiumForGlucose(128, 600, 1.6)).toBeCloseTo(136, 10);
    expect(correctedSodiumForGlucose(128, 600, 2.4)).toBeCloseTo(140, 10);
  });
  it("sin corrección con glucosa ≤ 100", () => {
    expect(correctedSodiumForGlucose(130, 90, 2.4)).toBe(130);
  });
});

describe("Edelman / balance de masas", () => {
  it("1 L sin pérdidas reproduce exactamente Adrogué-Madias", () => {
    const tbw = 30;
    const na0 = 115;
    const na1 = edelmanMassBalance(na0 * tbw, tbw, 513, 0, 1, 0, 1)!;
    expect(na1 - na0).toBeCloseTo(adrogueMadiasDeltaPerLiter(513, na0, tbw), 10);
  });
  it("devuelve null si el agua corporal cae por debajo del 50 %", () => {
    expect(edelmanMassBalance(140 * 40, 40, 0, 0, 0, 1, 25)).toBeNull();
  });
});

describe("eGFR CKD-EPI 2021", () => {
  it("hombre 50 a, Scr 1,0 mg/dL ≈ 92", () => {
    // 142 × (1/0.9)^−1.2 × 0.9938^50 = 91.7
    expect(egfrCkdEpi2021(1.0, 50, "male")).toBeCloseTo(91.7, 0);
  });
  it("mujer 60 a, Scr 0,7 mg/dL ≈ 98", () => {
    // 142 × 1 × 0.9938^60 × 1.012 = 98.8
    expect(egfrCkdEpi2021(0.7, 60, "female")).toBeCloseTo(98.8, 0);
  });
  it("disminuye al aumentar la creatinina", () => {
    expect(egfrCkdEpi2021(2, 60, "male")).toBeLessThan(egfrCkdEpi2021(1, 60, "male"));
  });
});

describe("aclaramiento de agua libre de electrolitos", () => {
  it("orina diluida elimina agua libre", () => {
    expect(electrolyteFreeWaterClearance(0.1, 30, 20, 125)).toBeCloseTo(0.06, 10);
  });
  it("orina concentrada retiene agua libre (negativo)", () => {
    expect(electrolyteFreeWaterClearance(0.05, 150, 50, 125)).toBeLessThan(0);
  });
});

describe("unidades", () => {
  it("glucosa ida y vuelta", () => {
    expect(glucoseMgDlToMmol(glucoseMmolToMgDl(7.3))).toBeCloseTo(7.3, 10);
    expect(glucoseMmolToMgDl(10)).toBeCloseTo(180.16, 2);
  });
  it("creatinina ida y vuelta", () => {
    expect(creatinineUmolToMgDl(88.42)).toBeCloseTo(1, 10);
    expect(creatinineMgDlToUmol(creatinineUmolToMgDl(150))).toBeCloseTo(150, 10);
  });
  it("redondeo estable", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(-4.666, 1)).toBe(-4.7);
  });
});
