import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import type { SimulationSummaryDto } from "@osmoguard/contracts";
import { ErrorState } from "@/components/States";
import { Skeleton } from "@/components/ui/skeleton";
import { useSimulations } from "@/lib/queries";
import { CaseRow } from "./Dashboard";

function groupByDate(items: SimulationSummaryDto[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(startOfToday.getTime() - 6 * 86_400_000);
  const groups: { label: string; items: SimulationSummaryDto[] }[] = [
    { label: "Hoy", items: [] },
    { label: "Esta semana", items: [] },
    { label: "Anteriores", items: [] },
  ];
  for (const it of items) {
    const d = new Date(it.createdAt);
    groups[d >= startOfToday ? 0 : d >= weekAgo ? 1 : 2]!.items.push(it);
  }
  return groups.filter((g) => g.items.length);
}

export function HistoryPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const deferred = useDeferredValue(q);
  const list = useSimulations(deferred, page);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const groups = useMemo(() => groupByDate(list.data?.items ?? []), [list.data]);

  return (
    <div>
      <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">Mis casos</h1>
      <p className="mt-0.5 text-[15px] text-slate-500">{list.data ? `${list.data.total} simulación${list.data.total !== 1 ? "es" : ""} guardada${list.data.total !== 1 ? "s" : ""}` : " "}</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          placeholder="Buscar"
          aria-label="Buscar en mis casos"
          className="h-12 w-full rounded-2xl bg-slate-900/[0.05] pl-11 pr-10 text-base outline-none transition placeholder:text-slate-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 [&::-webkit-search-cancel-button]:hidden"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Borrar búsqueda" className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-400 text-white cursor-pointer">
            <X className="size-3.5" strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="mt-7">
        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.isLoading ? (
          <Skeleton className="h-64 rounded-3xl" />
        ) : !groups.length ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center">
            <p className="text-[15px] font-medium">{q ? "Sin resultados" : "Aún no hay casos guardados"}</p>
            <p className="mt-1 max-w-xs text-[13px] text-slate-500">{q ? "Pruebe con otras palabras del título." : "Simule un caso y guárdelo para volver a él cuando quiera."}</p>
            {!q && (
              <Link to="/simulaciones/nueva" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white">
                <Plus className="size-4" strokeWidth={2.5} /> Nueva simulación
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-7">
            {groups.map((g, gi) => (
              <motion.section key={g.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: gi * 0.05 }}>
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">{g.label}</h2>
                <ul className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-900/[0.04]">
                  {g.items.map((s, i) => (
                    <CaseRow key={s.id} sim={s} last={i === g.items.length - 1} />
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="flex size-10 items-center justify-center rounded-full bg-white shadow-card disabled:opacity-40 cursor-pointer">
            <ChevronLeft className="size-5" />
          </button>
          <span className="tabular text-sm font-medium text-slate-500">
            {page} de {totalPages}
          </span>
          <button aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="flex size-10 items-center justify-center rounded-full bg-white shadow-card disabled:opacity-40 cursor-pointer">
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
