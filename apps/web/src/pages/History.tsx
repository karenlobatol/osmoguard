import { useDeferredValue, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { EmptyState, ErrorState, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/features/results/parts";
import { CLASSIFICATION_LABEL, fmt1, fmtDate } from "@/lib/format";
import { useSimulations } from "@/lib/queries";

export function HistoryPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const deferred = useDeferredValue(q);
  const list = useSimulations(deferred, page);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div>
      <PageHeader eyebrow="Historial" title="Simulaciones guardadas" description="Cada simulación conserva sus entradas, la versión del motor y los resultados." />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <Input
          type="search"
          placeholder="Buscar por título…"
          aria-label="Buscar simulaciones"
          className="pl-9"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !list.data?.items.length ? (
        <EmptyState
          title={q ? "Sin resultados" : "Historial vacío"}
          description={q ? "Ninguna simulación coincide con la búsqueda." : "Las simulaciones que guarde aparecerán aquí."}
          action={
            !q && (
              <Button asChild>
                <Link to="/simulaciones/nueva">
                  <Plus /> Nueva simulación
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.data.items.map((s) => (
              <li key={s.id}>
                <Link to={`/simulaciones/${s.id}`} className="block h-full">
                  <Card className="flex h-full flex-col p-4 transition-colors hover:border-brand-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 font-medium">{s.title}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="mt-auto pt-4 text-sm text-slate-600">
                      <span className="tabular font-semibold text-ink">Na⁺ {fmt1(s.serumSodium)}</span> · {CLASSIFICATION_LABEL[s.classification]}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {s.scenarioCount} escenario{s.scenarioCount !== 1 && "s"} · {fmtDate(s.createdAt)} · motor v{s.engineVersion}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
              </Button>
              <span className="tabular text-sm text-slate-600">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="icon" aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
