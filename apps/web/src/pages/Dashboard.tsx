import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowUpRight, ChevronRight, Droplets, Plus } from "lucide-react";
import { MODULES } from "@/lib/modules";
import type { SimulationSummaryDto } from "@osmoguard/contracts";
import { ErrorState } from "@/components/States";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniScale } from "@/features/results/MiniScale";
import { EXAMPLE_CASES } from "@/features/simulation/form";
import { useAuth } from "@/lib/auth";
import { fmt1 } from "@/lib/format";
import { useStats } from "@/lib/queries";
import { ZONE_STYLE, describeSodium, zoneOf } from "@/lib/sodium";
import { cn } from "@/lib/utils";

const rise = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] as const } });

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useStats();
  const s = stats.data;
  const firstName = user?.name.split(" ")[0] ?? "";
  const initials = user?.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const today = new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="space-y-9">
      <motion.header {...rise(0)} className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-slate-500 first-letter:uppercase">{today}</p>
          <h1 className="mt-0.5 text-[34px] font-semibold leading-tight tracking-[-0.03em]">Hola, {firstName}</h1>
        </div>
        <Link to="/perfil" aria-label="Perfil" className="mt-1 flex size-11 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700 shadow-card ring-1 ring-slate-900/5 lg:hidden">
          {initials}
        </Link>
      </motion.header>

      {/* Herramientas */}
      <motion.section {...rise(1)} aria-labelledby="herramientas">
        <SectionHeader id="herramientas" title="Herramientas" subtitle="Simule, interprete y aprenda medio interno." />
        <Link to="/simulaciones/nueva" className="group block rounded-[28px] bg-white p-6 shadow-card ring-1 ring-slate-900/[0.04] transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Droplets className="size-6" />
              </span>
              <div>
                <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.02em]">Sodio y líquidos</h3>
                <p className="mt-0.5 text-[14px] leading-snug text-slate-500">Simule soluciones y vea si la corrección respeta el límite seguro.</p>
              </div>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-transform group-hover:rotate-45 group-active:scale-95">
              <Plus className="size-5" strokeWidth={2.5} />
            </span>
          </div>
          <div className="mt-5 flex h-2 overflow-hidden rounded-full">
            <span className="w-5/12 bg-low-100" />
            <span className="w-2/12 bg-ok-100" />
            <span className="flex-1 bg-high-100" />
          </div>
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {MODULES.filter((m) => m.id !== "sodium").map((m) => (
            <Link key={m.id} to={m.path} className="group rounded-3xl bg-white p-4 shadow-card ring-1 ring-slate-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]">
              <span className={cn("flex size-10 items-center justify-center rounded-2xl", m.tint)}>
                <m.icon className="size-5" />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold leading-tight">{m.title}</h3>
              <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{m.subtitle}</p>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Casos de práctica */}
      <motion.section {...rise(2)} aria-labelledby="practica">
        <SectionHeader id="practica" title="Practicar sodio" subtitle="Casos ficticios listos para simular." />
        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {EXAMPLE_CASES.map((c) => {
            const na = c.values.patient.serumSodiumMmolL;
            const d = describeSodium(na);
            return (
              <Link
                key={c.id}
                to={`/simulaciones/nueva?practica=${c.id}`}
                className="group flex w-[78%] shrink-0 snap-start flex-col rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
              >
                <div className="flex items-baseline justify-between">
                  <span className="tabular text-[28px] font-bold leading-none tracking-tight">{na}</span>
                  <span className={cn("text-xs font-semibold", ZONE_STYLE[d.zone].text)}>{d.title}</span>
                </div>
                <MiniScale value={na} className="mt-3" />
                <h3 className="mt-5 text-[15px] font-semibold leading-snug">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-500">{c.summary}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600">
                  Simular <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* Recientes */}
      <motion.section {...rise(3)} aria-labelledby="recientes">
        <SectionHeader
          id="recientes"
          title="Recientes"
          action={
            s && s.total > 0 ? (
              <Link to="/historial" className="text-[13px] font-semibold text-brand-600">
                Ver todos
              </Link>
            ) : undefined
          }
        />
        {stats.isError ? (
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
        ) : stats.isLoading ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : s && s.recent.length ? (
          <ul className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-900/[0.04]">
            {s.recent.map((r, i) => (
              <CaseRow key={r.id} sim={r} last={i === s.recent.length - 1} />
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-8 text-center">
            <p className="text-[15px] font-medium">Sin casos guardados</p>
            <p className="mt-1 text-[13px] text-slate-500">Lo que guarde aparecerá aquí, con su posición en la escala de sodio.</p>
          </div>
        )}
      </motion.section>
    </div>
  );
}

function SectionHeader({ id, title, subtitle, action }: { id: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <div>
        <h2 id={id} className="text-[20px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Fila de caso con su "firma" en la escala de sodio. */
export function CaseRow({ sim, last }: { sim: SimulationSummaryDto; last?: boolean }) {
  const z = ZONE_STYLE[zoneOf(sim.serumSodium)];
  const date = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" }).format(new Date(sim.createdAt));
  return (
    <li>
      <Link to={`/simulaciones/${sim.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 active:bg-slate-100">
        <span className="w-14 shrink-0">
          <span className={cn("tabular block text-[19px] font-bold leading-none", z.text)}>{fmt1(sim.serumSodium).replace(",0", "")}</span>
          <MiniScale value={sim.serumSodium} className="mt-2" />
        </span>
        <span className={cn("min-w-0 flex-1 border-slate-100", !last && "")}>
          <span className="block truncate text-[15px] font-medium">{sim.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-slate-500">
            {date} · {sim.scenarioCount} escenario{sim.scenarioCount !== 1 && "s"}
            {sim.status === "warning" && <span className="size-1.5 rounded-full bg-amber-500" aria-label="con advertencias" />}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-slate-300" />
      </Link>
      {!last && <div className="ml-[5.75rem] h-px bg-slate-100" />}
    </li>
  );
}
