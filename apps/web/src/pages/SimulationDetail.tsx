import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Copy, Info, Pencil, Trash2 } from "lucide-react";
import { ErrorState, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
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
      <Link to="/historial" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600">
        <ArrowLeft className="size-4" /> Historial
      </Link>
      <PageHeader
        eyebrow={`Guardada el ${fmtDate(s.createdAt)}`}
        title={s.title}
        description={`Motor v${s.engineVersion} · ${s.scenarioCount} escenario${s.scenarioCount !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/simulaciones/nueva?desde=${s.id}`)}>
              <Pencil /> Editar como nueva
            </Button>
            <Button
              variant="outline"
              loading={dup.isPending}
              onClick={() =>
                dup.mutate(s.id, {
                  onSuccess: (copy) => {
                    toast.success("Simulación duplicada con la versión actual del motor");
                    navigate(`/simulaciones/${copy.id}`);
                  },
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : "No se pudo duplicar"),
                })
              }
            >
              <Copy /> Duplicar
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-red-700 hover:bg-red-50">
                  <Trash2 /> Eliminar
                </Button>
              }
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
          </>
        }
      />
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
      <ResultsView output={s.output} alertConfig={s.request.alertConfig} />
    </div>
  );
}
