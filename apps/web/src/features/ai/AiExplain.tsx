import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Markdown from "react-markdown";
import { RefreshCw, Sparkles } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export type AiModule = "sodium" | "acid-base" | "osmolality" | "potassium" | "calcium";

/** Explicación docente generada por IA a partir del resultado determinista (el servidor recalcula). */
export function AiExplain({ module, input, className }: { module: AiModule; input: unknown; className?: string }) {
  return <AiExplanation key={JSON.stringify([module, input])} module={module} input={input} className={className} />;
}

function AiExplanation({ module, input, className }: { module: AiModule; input: unknown; className?: string }) {
  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => api<{ enabled: boolean; model: string }>("/ai/status"), staleTime: 10 * 60_000 });
  const explain = useMutation({ mutationFn: () => api<{ text: string; model: string }>("/ai/explain", { method: "POST", json: { module, input } }) });
  const [opened, setOpened] = useState(false);
  if (status.data && !status.data.enabled) return null;

  const run = () => {
    setOpened(true);
    explain.mutate();
  };

  return (
    <section className={cn("relative overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-900/[0.04]", className)}>
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br from-violet-400/20 via-sky-400/15 to-teal-300/10 blur-2xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-brand-500 to-teal-500 text-white shadow-[0_8px_20px_-8px_rgb(109_40_217/0.6)]">
            <Sparkles className="size-5" />
          </span>
          <div className="flex-1">
            <h3 className="text-[17px] font-semibold tracking-tight">Explicación con IA</h3>
            <p className="text-[13px] text-slate-500">Un tutor que explica este resultado paso a paso.</p>
          </div>
        </div>

        {!opened && (
          <button
            type="button"
            onClick={run}
            className="group relative mt-4 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-900 text-[15px] font-semibold text-white transition active:scale-[0.98] cursor-pointer"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-brand-600 to-teal-600 opacity-0 transition-opacity group-hover:opacity-100" />
            <Sparkles className="relative size-[18px]" />
            <span className="relative">Explicar este resultado</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {opened && explain.isPending && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 space-y-2.5" role="status" aria-label="Generando explicación">
              {[92, 78, 85, 60].map((w, i) => (
                <div key={i} className="h-3 overflow-hidden rounded-full bg-slate-100" style={{ width: `${w}%` }}>
                  <motion.div
                    className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-violet-200 to-transparent"
                    animate={{ x: ["-100%", "220%"] }}
                    transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                  />
                </div>
              ))}
              <p className="pt-1 text-[13px] text-slate-500">Analizando el resultado…</p>
            </motion.div>
          )}
          {explain.isError && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl bg-red-50 p-4 text-[14px] text-red-800">
              {explain.error instanceof ApiError ? explain.error.message : "No se pudo generar la explicación."}
              <button onClick={() => explain.mutate()} className="ml-2 font-semibold underline cursor-pointer">
                Reintentar
              </button>
            </motion.div>
          )}
          {explain.isSuccess && explain.data && (
            <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-4">
              <div className="ai-prose">
                <Markdown>{explain.data.text}</Markdown>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] leading-snug text-slate-500">
                  Generado por IA a partir del cálculo del motor. Puede contener errores y no es consejo clínico.
                </p>
                <button onClick={() => explain.mutate()} aria-label="Generar de nuevo" className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer">
                  <RefreshCw className="size-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
