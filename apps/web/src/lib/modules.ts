import { Bone, Droplets, FlaskConical, HeartPulse, Waves, type LucideIcon } from "lucide-react";

/** Catálogo de módulos de Osmoguard (orden de aparición en la app). */
export const MODULES: { id: string; title: string; subtitle: string; path: string; icon: LucideIcon; tint: string }[] = [
  { id: "sodium", title: "Sodio y líquidos", subtitle: "Simule escenarios y límites de corrección", path: "/simulaciones/nueva", icon: Droplets, tint: "bg-brand-50 text-brand-600" },
  { id: "acid-base", title: "Gasometría", subtitle: "Ácido-base paso a paso", path: "/herramientas/gasometria", icon: FlaskConical, tint: "bg-rose-50 text-rose-600" },
  { id: "potassium", title: "Potasio", subtitle: "Gravedad, pH y ECG", path: "/herramientas/potasio", icon: HeartPulse, tint: "bg-amber-50 text-amber-600" },
  { id: "osmolality", title: "Osmolalidad", subtitle: "Tonicidad y brecha osmolar", path: "/herramientas/osmolalidad", icon: Waves, tint: "bg-teal-50 text-teal-700" },
  { id: "calcium", title: "Calcio", subtitle: "Corrección por albúmina", path: "/herramientas/calcio", icon: Bone, tint: "bg-violet-50 text-violet-600" },
];
