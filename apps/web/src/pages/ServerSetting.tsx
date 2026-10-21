import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getApiUrl, setApiServer } from "@/lib/api";

/** Solo en la app Android: permite apuntar a otro servidor HTTPS de Osmoguard. */
export function ServerSetting() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(getApiUrl());
  const [error, setError] = useState<string>();
  if (!Capacitor.isNativePlatform()) return null;
  return (
    <div className="mt-6 rounded-lg border border-slate-200 p-3 text-sm">
      <button type="button" className="flex w-full items-center gap-2 text-slate-600 cursor-pointer" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Server className="size-4" /> Servidor: <span className="truncate font-medium text-ink">{getApiUrl().replace(/^https:\/\//, "")}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <Field label="URL del servidor" hint="Debe empezar por https://" error={error}>
            <Input type="url" inputMode="url" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button
              size="sm"
              type="button"
              onClick={() => {
                try {
                  setApiServer(value.trim());
                  window.location.reload();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "URL no válida");
                }
              }}
            >
              Guardar
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => (setApiServer(null), window.location.reload())}>
              Restablecer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
