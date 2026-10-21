import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "./ui/button";

/** Actualización controlada: la nueva versión solo se activa cuando el usuario lo decide. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-brand-800 p-3 pl-4 text-sm text-white shadow-xl lg:bottom-6">
      <span className="flex-1">Hay una nueva versión de Osmoguard disponible.</span>
      <Button size="sm" variant="secondary" onClick={() => void updateServiceWorker(true)}>
        <RefreshCw /> Actualizar
      </Button>
      <button className="rounded p-1 text-brand-100 hover:text-white cursor-pointer" aria-label="Descartar" onClick={() => setNeedRefresh(false)}>
        <X className="size-4" />
      </button>
    </div>
  );
}
