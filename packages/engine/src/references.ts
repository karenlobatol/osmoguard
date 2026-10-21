/** Fuentes bibliográficas citadas por el motor. */
export interface Reference {
  id: string;
  citation: string;
  url?: string;
}

export const REFERENCES = {
  adrogueHypo: {
    id: "adrogueHypo",
    citation: "Adrogué HJ, Madias NE. Hyponatremia. N Engl J Med. 2000;342(21):1581-1589.",
    url: "https://doi.org/10.1056/NEJM200005253422107",
  },
  adrogueHyper: {
    id: "adrogueHyper",
    citation: "Adrogué HJ, Madias NE. Hypernatremia. N Engl J Med. 2000;342(20):1493-1499.",
    url: "https://doi.org/10.1056/NEJM200005183422006",
  },
  edelman: {
    id: "edelman",
    citation:
      "Edelman IS, Leibman J, O'Meara MP, Birkenfeld LW. Interrelations between serum sodium concentration, serum osmolarity and total exchangeable sodium, total exchangeable potassium and total body water. J Clin Invest. 1958;37(9):1236-1256.",
    url: "https://doi.org/10.1172/JCI103712",
  },
  watson: {
    id: "watson",
    citation:
      "Watson PE, Watson ID, Batt RD. Total body water volumes for adult males and females estimated from simple anthropometric measurements. Am J Clin Nutr. 1980;33(1):27-39.",
    url: "https://doi.org/10.1093/ajcn/33.1.27",
  },
  katz: {
    id: "katz",
    citation: "Katz MA. Hyperglycemia-induced hyponatremia—calculation of expected serum sodium depression. N Engl J Med. 1973;289(16):843-844.",
    url: "https://doi.org/10.1056/NEJM197310182891607",
  },
  hillier: {
    id: "hillier",
    citation:
      "Hillier TA, Abbott RD, Barrett EJ. Hyponatremia: evaluating the correction factor for hyperglycemia. Am J Med. 1999;106(4):399-403.",
    url: "https://doi.org/10.1016/S0002-9343(99)00055-8",
  },
  spasovski: {
    id: "spasovski",
    citation:
      "Spasovski G, Vanholder R, Allolio B, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. Eur J Endocrinol. 2014;170(3):G1-G47.",
    url: "https://doi.org/10.1530/EJE-13-1020",
  },
  verbalis: {
    id: "verbalis",
    citation:
      "Verbalis JG, Goldsmith SR, Greenberg A, et al. Diagnosis, evaluation, and treatment of hyponatremia: expert panel recommendations. Am J Med. 2013;126(10 Suppl 1):S1-S42.",
    url: "https://doi.org/10.1016/j.amjmed.2013.07.006",
  },
  ckdEpi2021: {
    id: "ckdEpi2021",
    citation:
      "Inker LA, Eneanya ND, Coresh J, et al. New creatinine- and cystatin C-based equations to estimate GFR without race. N Engl J Med. 2021;385(19):1737-1749.",
    url: "https://doi.org/10.1056/NEJMoa2102953",
  },
  barsoum: {
    id: "barsoum",
    citation:
      "Barsoum NR, Levine BS. Current prescriptions for the correction of hyponatraemia and hypernatraemia: are they too simple? Nephrol Dial Transplant. 2002;17(7):1176-1180.",
    url: "https://doi.org/10.1093/ndt/17.7.1176",
  },
  berend: {
    id: "berend",
    citation: "Berend K, de Vries APJ, Gans ROB. Physiological approach to assessment of acid-base disturbances. N Engl J Med. 2014;371(15):1434-1445.",
    url: "https://doi.org/10.1056/NEJMra1003327",
  },
  figge: {
    id: "figge",
    citation: "Figge J, Jabor A, Kazda A, Fencl V. Anion gap and hypoalbuminemia. Crit Care Med. 1998;26(11):1807-1810.",
    url: "https://doi.org/10.1097/00003246-199811000-00019",
  },
  albert: {
    id: "albert",
    citation: "Albert MS, Dell RB, Winters RW. Quantitative displacement of acid-base equilibrium in metabolic acidosis. Ann Intern Med. 1967;66(2):312-322.",
    url: "https://doi.org/10.7326/0003-4819-66-2-312",
  },
  kraut: {
    id: "kraut",
    citation: "Kraut JA, Kurtz I. Toxic alcohol ingestions: clinical features, diagnosis, and management. Clin J Am Soc Nephrol. 2008;3(1):208-225.",
    url: "https://doi.org/10.2215/CJN.03220807",
  },
  gennari: {
    id: "gennari",
    citation: "Gennari FJ. Hypokalemia. N Engl J Med. 1998;339(7):451-458.",
    url: "https://doi.org/10.1056/NEJM199808133390707",
  },
  weiner: {
    id: "weiner",
    citation: "Weiner ID, Wingo CS. Hyperkalemia: a potential silent killer. J Am Soc Nephrol. 1998;9(8):1535-1543.",
    url: "https://doi.org/10.1681/ASN.V981535",
  },
  adrogueK: {
    id: "adrogueK",
    citation: "Adrogué HJ, Madias NE. Changes in plasma potassium concentration during acute acid-base disturbances. Am J Med. 1981;71(3):456-467.",
    url: "https://doi.org/10.1016/0002-9343(81)90298-8",
  },
  payne: {
    id: "payne",
    citation: "Payne RB, Little AJ, Williams RB, Milner JR. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J. 1973;4(5893):643-646.",
    url: "https://doi.org/10.1136/bmj.4.5893.643",
  },
} as const satisfies Record<string, Reference>;

export type ReferenceId = keyof typeof REFERENCES;
