import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ApiError } from "@/lib/api";

export function EmptyState({ title, description, action, icon }: { title: string; description: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">{icon ?? <Inbox className="size-6" />}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof ApiError ? error.message : "Ha ocurrido un error inesperado.";
  return (
    <Card role="alert" className="flex flex-col items-center border-red-200 px-6 py-10 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-red-50 text-red-700">
        <AlertTriangle className="size-5" />
      </div>
      <h3 className="font-semibold">No se pudo cargar</h3>
      <p className="mt-1 text-sm text-slate-600">{msg}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Reintentar
        </Button>
      )}
    </Card>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal-700">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
