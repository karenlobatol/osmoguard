import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, History, Plus, TriangleAlert } from "lucide-react";
import type { SimulationSummaryDto } from "@osmoguard/contracts";
import { EmptyState, ErrorState, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/results/parts";
import { useAuth } from "@/lib/auth";
import { CLASSIFICATION_LABEL, fmt1, fmtDate } from "@/lib/format";
import { useEngineInfo, useStats } from "@/lib/queries";

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useStats();
  const engine = useEngineInfo();
  const s = stats.data;

  return (
    <div>
      <PageHeader
        eyebrow="Panel"
        title={`Hola, ${user?.name.split(" ")[0] ?? ""}`}
        description="Explore escenarios de agua y sodio con supuestos explícitos e incertidumbre visible."
        actions={
          <Button asChild size="lg">
            <Link to="/simulaciones/nueva">
              <Plus /> Nueva simulación
            </Link>
          </Button>
        }
      />

      {stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Simulaciones", s?.total],
            ["Últimos 30 días", s?.last30Days],
            ["Con advertencias", s?.withAlerts],
            ["Motor clínico", engine.data ? `v${engine.data.version}` : undefined],
          ].map(([label, value], i) => (
            <motion.div key={label as string} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                {value === undefined ? <Skeleton className="mt-2 h-8 w-16" /> : <div className="tabular mt-1.5 text-[28px] font-semibold tracking-tight">{value}</div>}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Simulaciones recientes</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link to="/historial">
                Ver historial <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : s && s.recent.length ? (
              <ul className="divide-y divide-slate-100">
                {s.recent.map((r) => (
                  <RecentRow key={r.id} sim={r} />
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Aún no hay simulaciones"
                description="Cree la primera o cargue un caso de ejemplo ficticio desde el asistente."
                action={
                  <Button asChild>
                    <Link to="/simulaciones/nueva">
                      <Plus /> Crear simulación
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["hyponatremia", "normonatremia", "hypernatremia"] as const).map((k) => {
                const n = s?.byClassification[k] ?? 0;
                const pct = s?.total ? (n / s.total) * 100 : 0;
                return (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700">{CLASSIFICATION_LABEL[k]}</span>
                      <span className="tabular font-medium">{n}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100" role="presentation">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <QuickLink to="/historial" icon={History} title="Historial" text="Consulte, duplique o elimine escenarios guardados." />
          <QuickLink to="/ciencia" icon={BookOpen} title="Ciencia y limitaciones" text="Fórmulas, supuestos, referencias y alcance del motor." />
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>Las predicciones matemáticas no son resultados clínicos garantizados. En la práctica, la corrección del sodio exige controles analíticos seriados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentRow({ sim }: { sim: SimulationSummaryDto }) {
  return (
    <li>
      <Link to={`/simulaciones/${sim.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50">
        <span className="tabular flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <span className="text-[13px] font-semibold leading-none">{fmt1(sim.serumSodium).replace(",0", "")}</span>
          <span className="text-[9px] uppercase">Na⁺</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{sim.title}</span>
          <span className="text-xs text-slate-500">
            {CLASSIFICATION_LABEL[sim.classification]} · {fmtDate(sim.createdAt)}
          </span>
        </span>
        <StatusBadge status={sim.status} />
      </Link>
    </li>
  );
}

function QuickLink({ to, icon: Icon, title, text }: { to: string; icon: typeof History; title: string; text: string }) {
  return (
    <Link to={to} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-200">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="size-[18px]" />
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-xs text-slate-500">{text}</span>
      </span>
    </Link>
  );
}
