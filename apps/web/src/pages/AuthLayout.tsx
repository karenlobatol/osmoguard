import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Activity, LineChart, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

const POINTS = [
  { icon: Activity, title: "Motor determinista y versionado", text: "Adrogué-Madias y balance tipo Edelman con supuestos explícitos." },
  { icon: LineChart, title: "Incertidumbre visible", text: "Estimaciones puntuales con bandas de sensibilidad, sin curvas inventadas." },
  { icon: ShieldCheck, title: "Seguro por diseño", text: "Sin datos identificables de pacientes y entradas cifradas en reposo." },
];

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-800 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[480px] rounded-full bg-brand-600/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[420px] rounded-full bg-teal-600/25 blur-3xl" />
        <Logo light className="relative" />
        <div className="relative mt-auto max-w-md">
          <h2 className="text-[34px] font-semibold leading-tight tracking-tight">Simulación educativa de agua y sodio, con rigor y transparencia.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-5 text-teal-300" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{t}</span>
                  <span className="text-sm text-brand-100">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-brand-200">No es un dispositivo médico. No genera órdenes terapéuticas.</p>
      </section>
      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="m-auto w-full max-w-sm py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-slate-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </section>
    </div>
  );
}
