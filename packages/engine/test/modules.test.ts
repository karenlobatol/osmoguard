import { describe, expect, it } from "vitest";
import { interpretAcidBase, interpretCalcium, interpretOsmolality, interpretPotassium, hendersonPh, wintersExpectedPco2 } from "../src";

describe("gasometría", () => {
  it("Henderson-Hasselbalch y Winter", () => {
    expect(hendersonPh(24, 40)).toBeCloseTo(7.4, 2);
    expect(wintersExpectedPco2(8)).toBe(20);
  });

  it("cetoacidosis: AG elevado, delta-delta puro y acidosis respiratoria asociada", () => {
    const r = interpretAcidBase({ ph: 7.1, pco2: 25, hco3: 8, sodium: 135, chloride: 100, albumin: 4 });
    expect(r.summary.status).toBe("acidemia");
    expect(r.summary.primary).toEqual(["metabolic-acidosis"]);
    expect(r.summary.anionGap?.value).toBe(27);
    expect(r.summary.compensation?.expectedLow).toBe(18);
    expect(r.summary.compensation?.secondary).toBe("Acidosis respiratoria asociada");
    expect(r.summary.deltaRatio).toBeCloseTo(0.94, 2);
    expect(r.summary.diagnosis).toMatch(/anión gap elevado/);
    expect(r.differentials[0]?.group).toMatch(/GOLDMARK/);
  });

  it("vómitos: alcalosis metabólica compensada", () => {
    const r = interpretAcidBase({ ph: 7.5, pco2: 48, hco3: 36 });
    expect(r.summary.primary).toEqual(["metabolic-alkalosis"]);
    expect(r.summary.compensation?.adequate).toBe(true);
  });

  it("acidosis respiratoria aguda adecuadamente compensada", () => {
    const r = interpretAcidBase({ ph: 7.26, pco2: 60, hco3: 26, respiratoryChronicity: "acute" });
    expect(r.summary.primary).toEqual(["respiratory-acidosis"]);
    expect(r.summary.compensation?.adequate).toBe(true);
  });

  it("corrige el AG por albúmina y detecta AG elevado oculto", () => {
    const r = interpretAcidBase({ ph: 7.3, pco2: 32, hco3: 15, sodium: 138, chloride: 112, albumin: 2 });
    expect(r.summary.anionGap?.value).toBe(11);
    expect(r.summary.anionGap?.corrected).toBe(16);
    expect(r.summary.anionGap?.elevated).toBe(true);
  });

  it("detecta gasometría incoherente", () => {
    const r = interpretAcidBase({ ph: 7.45, pco2: 60, hco3: 10 });
    expect(r.summary.consistency.consistent).toBe(false);
  });

  it("alcoholes tóxicos: AG y brecha osmolar elevados", () => {
    const r = interpretAcidBase({ ph: 7.15, pco2: 22, hco3: 7, sodium: 140, chloride: 100, albumin: 4, measuredOsm: 330, glucoseMgDl: 90, bunMgDl: 14 });
    expect(r.summary.osmolarGap).toBe(40);
    expect(r.findings.some((f) => f.level === "danger")).toBe(true);
  });
});

describe("osmolalidad", () => {
  it("normal y brecha", () => {
    const r = interpretOsmolality({ sodium: 140, glucoseMgDl: 90, bunMgDl: 14, measuredOsm: 300 });
    expect(r.summary.calculated).toBe(290);
    expect(r.summary.gap).toBe(10);
    expect(r.summary.tonicity).toBe("isotónica");
  });
});

describe("potasio", () => {
  it("clasifica y ajusta por pH", () => {
    expect(interpretPotassium({ potassium: 6.8 }).summary.severity).toBe("grave");
    expect(interpretPotassium({ potassium: 2.8 }).summary.severity).toBe("moderada");
    const r = interpretPotassium({ potassium: 5.8, ph: 7.2 });
    expect(r.summary.adjustedAtPh740?.estimate).toBe(4.6);
  });
});

describe("calcio", () => {
  it("corrige por albúmina", () => {
    const r = interpretCalcium({ totalCalcium: 7.6, albumin: 2 });
    expect(r.summary.corrected).toBe(9.2);
    expect(r.summary.classification).toBe("normocalcemia");
  });
});
