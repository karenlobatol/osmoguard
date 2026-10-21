import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronLeft, Copy, Info, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/States";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultsView } from "@/features/results/ResultsView";
import { ApiError } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useDeleteSimulation, useDuplicateSimulation, useSimulation } from "@/lib/queries";

export function SimulationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sim = useSimulation(id);
  const del = useDeleteSimulation();
  const dup = useDuplicateSimulation();

  if (sim.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    );
  if (sim.isError || !sim.data) return <ErrorState error={sim.error} onRetry={() => void sim.refetch()} />;
  const s = sim.data;

  return (
    <div>
      <Link to="/historial" className="-ml-1 inline-flex items-center gap-0.5 text-[15px] font-medium text-brand-600">
        <ChevronLeft className="size-5" /> Mis casos
      </Link>
      <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em]">{s.title}</h1>
      <p className="mt-1.5 text-[13px] text-slate-500">
        {fmtDate(s.createdAt)} · motor v{s.engineVersion}
      </p>
      <div className="mb-7 mt-5 flex gap-6">
        <RoundAction icon={<Pencil />} label="Editar" onClick={() => navigate(`/simulaciones/nueva?desde=${s.id}`)} />
        <RoundAction
          icon={<Copy />}
          label="Duplicar"
          busy={dup.isPending}
          onClick={() =>
            dup.mutate(s.id, {
              onSuccess: (copy) => {
                toast.success("Duplicada con la versión actual del motor");
                navigate(`/simulaciones/${copy.id}`);
              },
              onError: (e) => toast.error(e instanceof ApiError ? e.message : "No se pudo duplicar"),
            })
          }
        />
        <ConfirmDialog
          trigger={<RoundAction icon={<Trash2 />} label="Eliminar" danger />}
          title="¿Eliminar esta simulación?"
          description="Se borrarán de forma permanente sus entradas y resultados. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          destructive
          loading={del.isPending}
          onConfirm={() =>
            del.mutate(s.id, {
              onSuccess: () => {
                toast.success("Simulación eliminada");
                navigate("/historial", { replace: true });
              },
              onError: (e) => toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar"),
            })
          }
        />
      </div>
      {s.engineOutdated && (
        <div className="mb-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          Calculada con una versión anterior del motor (v{s.engineVersion}). Los resultados se muestran tal como se guardaron; duplíquela para recalcular con la versión actual.
        </div>
      )}
      {s.notes && (
        <Card className="mb-5">
          <CardContent className="p-4 text-sm text-slate-700">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Notas</span>
            <p className="whitespace-pre-wrap">{s.notes}</p>
          </CardContent>
        </Card>
      )}
      <ResultsView output={s.output} alertConfig={s.request.alertConfig} request={s.request} />
    </div>
  );
}

/** Acción circular con etiqueta (estilo nativo). Compatible con Radix `asChild` mediante forwardRef. */
const RoundAction = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { icon: ReactNode; label: string; danger?: boolean; busy?: boolean }>(
  ({ icon, label, danger, busy, className, ...props }, ref) => (
    <button ref={ref} type="button" className={cn("group flex flex-col items-center gap-1.5 cursor-pointer", className)} {...props}>
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full bg-white shadow-card ring-1 ring-slate-900/5 transition-transform group-active:scale-95 [&_svg]:size-5",
          danger ? "text-red-600" : "text-brand-600",
        )}
      >
        {busy ? <Loader2 className="animate-spin" /> : icon}
      </span>
      <span className={cn("text-[12px] font-medium", danger ? "text-red-700" : "text-slate-600")}>{label}</span>
    </button>
  ),
);
RoundAction.displayName = "RoundAction";
