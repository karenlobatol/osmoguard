import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ChevronLeft, X } from "lucide-react";
import { ErrorState } from "@/components/States";
import { Skeleton } from "@/components/ui/skeleton";
import { Disclosure, FormulasPanel } from "@/features/results/ResultsView";
import { useEngineInfo } from "@/lib/queries";
import { cn } from "@/lib/utils";

function Lesson({ n, title, children, visual }: { n: number; title: string; children: ReactNode; visual?: ReactNode }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-slate-900/[0.04] sm:p-7"
    >
      <span className="tabular text-[13px] font-semibold text-brand-600">{String(n).padStart(2, "0")}</span>
      <h2 className="mt-1 text-[22px] font-semibold leading-snug tracking-[-0.02em]">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-slate-600">{children}</div>
      {visual && <div className="mt-5">{visual}</div>}
    </motion.article>
  );
}

function ZoneBar() {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        <span className="w-5/12 bg-low-100" />
        <span className="w-2/12 bg-ok-500/70" />
        <span className="flex-1 bg-high-100" />
      </div>
      <div className="mt-2 grid grid-cols-12 text-[12px] font-medium">
        <span className="col-span-5 text-low-700">Hiponatremia &lt; 135</span>
        <span className="col-span-2 text-center text-ok-700">Normal</span>
        <span className="col-span-5 text-right text-high-700">&gt; 145 Hipernatremia</span>
      </div>
    </div>
  );
}

function TbwBars() {
  const rows = [
    ["Hombre < 65 años", 60],
    ["Mujer < 65 años", 50],
    ["Hombre ≥ 65 años", 50],
    ["Mujer ≥ 65 años", 45],
  ] as const;
  return (
    <ul className="space-y-3">
      {rows.map(([label, pct], i) => (
        <li key={label}>
          <div className="flex justify-between text-[13px]">
            <span className="font-medium">{label}</span>
            <span className="tabular font-semibold">{pct} %</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-brand-600"
              initial={{ width: 0 }}
              whileInView={{ width: `${pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Formula() {
  return (
    <div className="rounded-2xl bg-slate-950 p-5 text-white">
      <div className="text-[12px] font-medium text-white/50">Adrogué-Madias · cambio por 1 litro</div>
      <div className="mt-2 font-mono text-[15px] leading-relaxed sm:text-base">
        ΔNa = <span className="text-sky-300">(Na⁺ + K⁺ solución − Na⁺ sérico)</span> ÷ <span className="text-teal-300">(agua corporal + 1)</span>
      </div>
      <div className="mt-4 border-t border-white/10 pt-4 text-[13px] text-white/70">
        Mujer de 60 kg (agua corporal 30 L), Na 118, NaCl 3 % (513):
        <div className="tabular mt-1 font-mono text-[15px] text-white">
          (513 − 118) ÷ (30 + 1) = <span className="font-semibold text-emerald-300">+12,7 mmol/L</span>
        </div>
      </div>
    </div>
  );
}

function UrineCompare() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-high-50 p-4">
        <ArrowUp className="size-5 text-high-700" />
        <div className="mt-2 text-[14px] font-semibold text-high-700">Orina diluida</div>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-600">Elimina agua libre: el sodio tiende a subir, a veces demasiado rápido.</p>
      </div>
      <div className="rounded-2xl bg-low-50 p-4">
        <ArrowDown className="size-5 text-low-700" />
        <div className="mt-2 text-[14px] font-semibold text-low-700">Orina concentrada</div>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-600">Retiene agua: incluso con suero salino el sodio puede bajar (SIADH).</p>
      </div>
    </div>
  );
}

function Limits() {
  const rows = [
    ["Hiponatremia, riesgo estándar", "≤ 10", "en 24 h"],
    ["Hiponatremia, alto riesgo", "≤ 8", "en 24 h"],
    ["Hiponatremia, acumulado", "≤ 18", "en 48 h"],
    ["Hipernatremia crónica", "≤ 10", "bajada en 24 h"],
  ];
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl bg-slate-50">
      {rows.map(([label, v, unit]) => (
        <li key={label} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[13px] font-medium">{label}</span>
          <span className="tabular shrink-0 text-right">
            <span className="text-[17px] font-bold">{v}</span> <span className="text-[11px] text-slate-500">mmol/L {unit}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const DOESNT = [
  "Recomendar soluciones, volúmenes ni velocidades",
  "Predecir la respuesta renal (ADH, acuaresis)",
  "Atender pediatría, diálisis o crisis hiperglucémicas",
  "Sustituir el juicio clínico ni los controles de laboratorio",
];

export function SciencePage({ standalone }: { standalone?: boolean }) {
  const info = useEngineInfo();
  const content = (
    <div className="space-y-5">
      <header className="mb-2">
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">Aprender</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-slate-500">Las ideas clave detrás de cada número del simulador, en 2 minutos.</p>
      </header>

      <Lesson n={1} title="¿Qué es un sodio normal?" visual={<ZoneBar />}>
        <p>El sodio sérico normal está entre 135 y 145 mmol/L. Por debajo hablamos de hiponatremia y por encima de hipernatremia.</p>
      </Lesson>
      <Lesson n={2} title="El agua corporal total" visual={<TbwBars />}>
        <p>El sodio se diluye en el agua del cuerpo. Se estima como un porcentaje del peso, que disminuye en mujeres y en personas mayores.</p>
      </Lesson>
      <Lesson n={3} title="Cada litro cuenta" visual={<Formula />}>
        <p>Cuanto más concentrada es una solución respecto al plasma, más sube el sodio por cada litro. Si es menos concentrada, lo baja.</p>
      </Lesson>
      <Lesson n={4} title="La orina decide" visual={<UrineCompare />}>
        <p>La fórmula por litro ignora lo que sale. Osmoguard añade la orina y otras pérdidas, porque pueden cambiar por completo el resultado.</p>
      </Lesson>
      <Lesson n={5} title="Despacio es seguro" visual={<Limits />}>
        <p>Corregir demasiado rápido una hiponatremia crónica puede causar desmielinización osmótica. Por eso cada resultado se compara con un límite.</p>
      </Lesson>
      <Lesson
        n={6}
        title="Lo que Osmoguard no hace"
        visual={
          <ul className="space-y-2.5">
            {DOESNT.map((t) => (
              <li key={t} className="flex items-start gap-3 text-[14px]">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <X className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        }
      >
        <p>Es un simulador educativo. Una fórmula publicada no es una predicción garantizada para un paciente concreto.</p>
      </Lesson>

      <section className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-slate-900/[0.04] sm:p-7">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Soluciones del catálogo</h2>
        <p className="mt-1 text-[13px] text-slate-500">Na⁺ + K⁺ en mmol/L. La línea marca el plasma normal (≈ 140).</p>
        {info.isError ? (
          <ErrorState error={info.error} onRetry={() => void info.refetch()} />
        ) : !info.data ? (
          <Skeleton className="mt-4 h-64" />
        ) : (
          <ul className="mt-5 space-y-3.5">
            {[...info.data.solutions]
              .sort((a, b) => b.sodiumMmolL + b.potassiumMmolL - (a.sodiumMmolL + a.potassiumMmolL))
              .map((s) => {
                const c = s.sodiumMmolL + s.potassiumMmolL;
                const color = s.tonicityClass === "hipertónica" ? "bg-high-500" : s.tonicityClass === "isotónica" ? "bg-ok-500" : "bg-low-500";
                return (
                  <li key={s.id}>
                    <div className="flex justify-between gap-3 text-[13px]">
                      <span className="font-medium">{s.name}</span>
                      <span className="tabular shrink-0 font-semibold">{c}</span>
                    </div>
                    <div className="relative mt-1.5 h-2 rounded-full bg-slate-100">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(2, (c / 513) * 100)}%` }} />
                      <span className="absolute -top-1 h-4 w-px bg-slate-400" style={{ left: `${(140 / 513) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {info.data && (
        <section className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-slate-900/[0.04] sm:p-7">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Para profundizar</h2>
          <Disclosure summary="Fórmulas y supuestos del motor" className="mt-3">
            <FormulasPanel output={{ formulas: info.data.formulas, assumptions: info.data.assumptions, engine: { name: info.data.name, version: info.data.version } }} />
          </Disclosure>
          <Disclosure summary={`Referencias (${info.data.references.length})`} className="mt-2">
            <ol className="list-decimal space-y-2 pl-5 text-[13px] text-slate-600 marker:text-slate-400">
              {info.data.references.map((r) => (
                <li key={r.id}>
                  {r.citation}{" "}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-600 underline underline-offset-2">
                      DOI
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </Disclosure>
        </section>
      )}
    </div>
  );
  if (!standalone) return content;
  return (
    <div className="min-h-dvh">
      <main className="mx-auto max-w-2xl px-5 py-8">
        <Link to="/login" className="mb-4 inline-flex items-center gap-0.5 text-[15px] font-medium text-brand-600">
          <ChevronLeft className="size-5" /> Volver
        </Link>
        {content}
      </main>
    </div>
  );
}
