import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { motion } from "motion/react";
import { AlertOctagon, AlertTriangle, ChevronLeft, Info, Loader2, Microscope } from "lucide-react";
import type { ZodTypeAny } from "zod";
import { REFERENCES, type ModuleResult, type ReferenceId } from "@osmoguard/engine";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AiExplain, type AiModule } from "@/features/ai/AiExplain";
import { ApiError } from "@/lib/api";
import { useTool } from "@/lib/queries";
import { cn } from "@/lib/utils";

export interface FieldDef<T extends FieldValues> {
  name: Path<T>;
  label: string;
  unit?: string;
  step?: string;
  optional?: boolean;
  hint?: string;
  wide?: boolean;
}

export interface Example<T> {
  label: string;
  values: Partial<T>;
}

const num = { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(",", "."))) };

/** Pantalla genérica de módulo: formulario → análisis en el servidor → resultado visual + IA. */
export function ToolPage<T extends FieldValues, S>({
  module,
  title,
  subtitle,
  schema,
  fields,
  extraFields,
  examples,
  defaults,
  renderVisual,
  controls,
}: {
  module: Exclude<AiModule, "sodium">;
  title: string;
  subtitle: string;
  schema: ZodTypeAny;
  fields: FieldDef<T>[];
  /** Campos opcionales agrupados (se muestran plegados). */
  extraFields?: { title: string; fields: FieldDef<T>[] };
  examples: Example<T>[];
  defaults?: Partial<T>;
  renderVisual: (result: ModuleResult<S>, input: T) => ReactNode;
  /** Controles adicionales (no numéricos) bajo los campos principales. */
  controls?: (form: UseFormReturn<T>) => ReactNode;
}) {
  const form = useForm<T>({ resolver: zodResolver(schema), defaultValues: defaults as never, mode: "onTouched" });
  const tool = useTool<ModuleResult<S>>(module);
  const resultRef = useRef<HTMLDivElement>(null);
  const [lastInput, setLastInput] = useState<T | null>(null);

  const analyze = form.handleSubmit((values) => {
    setLastInput(values);
    tool.mutate(values);
  });

  useEffect(() => {
    if (!tool.data) return;
    const timer = setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(timer);
  }, [tool.data]);

  const loadExample = (ex: Example<T>) => {
    form.reset({ ...(defaults ?? {}), ...ex.values } as never);
    const values = schema.parse({ ...(defaults ?? {}), ...ex.values }) as T;
    setLastInput(values);
    tool.mutate(values);
  };

  const renderField = (f: FieldDef<T>) => (
    <Field key={f.name} label={f.label} optional={f.optional} hint={f.hint} error={(form.formState.errors[f.name]?.message as string | undefined) ?? undefined} className={f.wide ? "col-span-2" : undefined}>
      <Input type="number" inputMode="decimal" step={f.step ?? "any"} unit={f.unit} {...form.register(f.name, num)} />
    </Field>
  );

  const r = tool.data;
  return (
    <div className="pb-24">
      <Link to="/" className="-ml-1 inline-flex items-center gap-0.5 text-[15px] font-medium text-brand-600">
        <ChevronLeft className="size-5" /> Inicio
      </Link>
      <h1 className="mt-3 text-[32px] font-semibold leading-[1.08] tracking-[-0.03em]">{title}</h1>
      <p className="mt-1 text-[15px] leading-relaxed text-slate-500">{subtitle}</p>

      <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {examples.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => loadExample(ex)}
            className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 shadow-card ring-1 ring-slate-900/[0.05] transition hover:text-brand-700 active:scale-95 cursor-pointer"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form onSubmit={analyze} noValidate className="mt-4">
        <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/[0.04] sm:p-6">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">{fields.map(renderField)}</div>
          {controls && <div className="mt-5">{controls(form)}</div>}
          {extraFields && (
            <details className="group mt-5 border-t border-slate-100 pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                {extraFields.title}
                <span className="text-xs font-medium text-slate-500">Opcional</span>
              </summary>
              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">{extraFields.fields.map(renderField)}</div>
            </details>
          )}
        </div>

        <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:left-[17rem]">
          <div className="pointer-events-auto mx-auto mb-3 max-w-md rounded-full bg-white/85 p-1.5 shadow-[0_10px_40px_-10px_rgb(15_23_42/0.35)] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl max-sm:mx-4">
            <button
              type="submit"
              disabled={tool.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-900 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {tool.isPending ? <Loader2 className="size-5 animate-spin" /> : <Microscope className="size-[18px]" />} Analizar
            </button>
          </div>
        </div>
      </form>

      {tool.isError && (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-[14px] text-red-800">
          {tool.error instanceof ApiError ? tool.error.message : "No se pudo analizar."}
        </p>
      )}

      {r && lastInput && (
        <motion.div ref={resultRef} key={JSON.stringify(lastInput)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-8 scroll-mt-6 space-y-5">
          {renderVisual(r, lastInput)}
          {r.findings.length > 0 && <Findings items={r.findings} />}
          <Reasoning steps={r.steps} />
          {r.differentials.length > 0 && <Differentials groups={r.differentials} />}
          <AiExplain module={module} input={lastInput} />
          <References ids={r.references} disclaimer={r.disclaimer} />
        </motion.div>
      )}
    </div>
  );
}

/** Tarjeta principal del resultado: etiqueta, conclusión grande y visual. */
/** Selector segmentado accesible (radios nativos). */
export function Segmented<T extends FieldValues>({ form, name, label, options }: { form: UseFormReturn<T>; name: Path<T>; label: string; options: { value: string; label: string }[] }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-800">{label}</legend>
      <div className="flex rounded-2xl bg-slate-100 p-1">
        {options.map((o) => (
          <label key={o.value} className="flex-1 cursor-pointer">
            <input type="radio" value={o.value} className="peer sr-only" {...form.register(name)} />
            <span className="block rounded-xl py-2 text-center text-[13px] font-semibold text-slate-500 transition peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ResultHero({ label, title, tone, children }: { label: string; title: string; tone: "normal" | "low" | "high" | "alert"; children?: ReactNode }) {
  const chip = { normal: "bg-ok-100 text-ok-700", low: "bg-low-100 text-low-700", high: "bg-high-100 text-high-700", alert: "bg-red-100 text-red-700" }[tone];
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/[0.04] sm:p-6">
      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", chip)}>{label}</span>
      <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-[-0.02em]">{title}</h2>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

function Findings({ items }: { items: ModuleResult<unknown>["findings"] }) {
  const style = { info: ["bg-brand-50 text-brand-800", Info], warning: ["bg-amber-50 text-amber-900", AlertTriangle], danger: ["bg-red-50 text-red-900", AlertOctagon] } as const;
  return (
    <div className="space-y-2">
      {items.map((f) => {
        const [cls, Icon] = style[f.level];
        return (
          <div key={f.title} className={cn("flex gap-3 rounded-2xl p-4 text-sm", cls)}>
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <div className="font-semibold">{f.title}</div>
              <p className="mt-0.5">{f.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Reasoning({ steps }: { steps: ModuleResult<unknown>["steps"] }) {
  const dot = { normal: "bg-ok-500", abnormal: "bg-red-500", warning: "bg-amber-500", info: "bg-brand-500" };
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/[0.04] sm:p-6">
      <h3 className="text-[17px] font-semibold tracking-tight">Razonamiento paso a paso</h3>
      <ol className="mt-4">
        {steps.map((s, i) => (
          <motion.li key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="relative flex gap-4 pb-5 last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden />}
            <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
              {i + 1}
              <span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white", dot[s.tone])} />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-slate-500">{s.title}</div>
              <div className="text-[15px] font-semibold leading-snug">{s.result}</div>
              <p className="tabular mt-1 text-[13px] leading-relaxed text-slate-500">{s.detail}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function Differentials({ groups }: { groups: ModuleResult<unknown>["differentials"] }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/[0.04] sm:p-6">
      <h3 className="text-[17px] font-semibold tracking-tight">Causas a considerar</h3>
      <p className="text-[13px] text-slate-500">Orientativo y docente, no exhaustivo.</p>
      <div className="mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">{g.group}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((it) => (
                <span key={it} className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-700">
                  {it}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function References({ ids, disclaimer }: { ids: ReferenceId[]; disclaimer: string }) {
  return (
    <footer className="space-y-2 px-1 pb-2 text-[12px] leading-relaxed text-slate-500">
      <p>{disclaimer}</p>
      <p>
        Fuentes:{" "}
        {ids.map((id, i) => {
          const ref = REFERENCES[id];
          return (
            <span key={id}>
              {i > 0 && " · "}
              <a href={ref.url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
                {ref.citation.split(".")[0]}
              </a>
            </span>
          );
        })}
      </p>
    </footer>
  );
}
