import { Link } from "react-router";
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { ErrorState, PageHeader } from "@/components/States";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/Logo";
import { FormulasPanel } from "@/features/results/ResultsView";
import { useEngineInfo } from "@/lib/queries";

const DOES = [
  "Estima el agua corporal total con fracciones publicadas y la compara con Watson si hay talla.",
  "Calcula el cambio por litro de Adrogué-Madias para todo el catálogo educativo.",
  "Simula escenarios temporales con balance de masas tipo Edelman e incertidumbre por sensibilidad.",
  "Compara hasta cuatro escenarios hipotéticos y señala posibles sobrecorrecciones.",
  "Bloquea resultados cuando los datos son insuficientes o el modelo no es aplicable.",
];
const DOESNT = [
  "No prescribe soluciones, volúmenes ni velocidades de infusión.",
  "No predice la respuesta renal (supresión de ADH, acuaresis), principal causa de sobrecorrección.",
  "No está validado clínicamente ni es un dispositivo médico.",
  "No contempla pacientes pediátricos, diálisis ni crisis hiperglucémicas.",
  "No sustituye el juicio clínico ni la monitorización analítica seriada.",
];

export function SciencePage({ standalone }: { standalone?: boolean }) {
  const info = useEngineInfo();
  const content = (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ciencia y limitaciones"
        title="Cómo calcula Osmoguard"
        description="Transparencia completa: fórmulas, supuestos, fuentes y lo que el simulador no hace."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Qué hace</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm">
              {DOES.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Qué no hace</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm">
              {DOESNT.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-red-700" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Que una fórmula esté publicada no la convierte en una predicción validada para un paciente concreto. La fórmula de Adrogué-Madias describe el
          efecto de <em>un litro</em> en un sistema cerrado; extrapolarla a 24–48 h ignora la diuresis y los cambios fisiológicos. Antes de cualquier uso
          asistencial se requiere validación clínica, gestión de riesgos y evaluación regulatoria.
        </p>
      </div>
      {info.isError ? (
        <ErrorState error={info.error} onRetry={() => void info.refetch()} />
      ) : !info.data ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <FormulasPanel output={{ formulas: info.data.formulas, assumptions: info.data.assumptions, engine: { name: info.data.name, version: info.data.version } }} />
          <Card>
            <CardHeader>
              <CardTitle>Catálogo educativo de soluciones</CardTitle>
              <CardDescription>Composiciones nominales; las formulaciones comerciales varían.</CardDescription>
            </CardHeader>
            <CardContent tabIndex={0} role="region" aria-label="Catálogo de soluciones" className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Solución</th>
                    <th className="py-2 pr-3 text-right font-medium">Na⁺</th>
                    <th className="py-2 pr-3 text-right font-medium">K⁺</th>
                    <th className="py-2 pr-3 text-right font-medium">Dextrosa</th>
                    <th className="py-2 font-medium">Tonicidad</th>
                  </tr>
                </thead>
                <tbody className="tabular divide-y divide-slate-100">
                  {info.data.solutions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-3">{s.name}</td>
                      <td className="py-2 pr-3 text-right">{s.sodiumMmolL}</td>
                      <td className="py-2 pr-3 text-right">{s.potassiumMmolL}</td>
                      <td className="py-2 pr-3 text-right">{s.dextrosePercent} %</td>
                      <td className="py-2 capitalize">{s.tonicityClass}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-4" /> Referencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 marker:text-slate-400">
                {info.data.references.map((r) => (
                  <li key={r.id}>
                    {r.citation}{" "}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer noopener" className="text-brand-600 underline underline-offset-2">
                        DOI
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
  if (!standalone) return content;
  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            <ArrowLeft className="size-4" /> Iniciar sesión
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{content}</main>
    </div>
  );
}
