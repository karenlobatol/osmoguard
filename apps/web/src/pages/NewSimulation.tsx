import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch, type FieldPath, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, ChevronDown, ChevronRight, ClipboardPen, Loader2, Pencil, Play, Plus, Save, Trash2, WifiOff, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { SOLUTIONS, LOSS_TYPES, getSolution, type Solution, type SimulationOutput, type SimulationRequestRaw } from "@osmoguard/engine";
import { simulationTitleSchema } from "@osmoguard/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ResultsView } from "@/features/results/ResultsView";
import { SodiumScale } from "@/features/results/SodiumScale";
import { EXAMPLE_CASES, STEP_FIELDS, creatinineHint, emptyForm, formSchema, fromRequest, glucoseHint, toRequest, type FormValues } from "@/features/simulation/form";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useOnline } from "@/lib/online";
import { useCreateSimulation, usePreview, useSimulation } from "@/lib/queries";
import { ZONE_STYLE, describeSodium } from "@/lib/sodium";
import { cn } from "@/lib/utils";
import { scrollAppToTop } from "@/lib/scroll";

/** Pasos del asistente. El 0 es la pantalla de inicio (caso de práctica o caso propio). */
const STEPS = [
  { title: "Empezar", question: "¿Cómo quiere empezar?", hint: "Practique con un caso preparado o introduzca uno propio (anónimo)." },
  { title: "Paciente", question: "¿Quién es el paciente?", hint: "Edad, sexo y peso permiten estimar el agua corporal total." },
  { title: "Laboratorio", question: "¿Qué muestra el laboratorio?", hint: "El sodio es obligatorio; el resto mejora la interpretación." },
  { title: "Balance", question: "¿Qué entra y qué sale?", hint: "La orina y otras pérdidas cambian mucho la evolución del sodio." },
  { title: "Escenarios", question: "¿Qué quiere comparar?", hint: "Elija la solución y una velocidad hipotética. Puede comparar hasta 4." },
  { title: "Revisar", question: "Revise y simule", hint: "Compruebe los datos antes de ejecutar el modelo." },
] as const;
const LAST = STEPS.length - 1;

const num = { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(",", "."))) };

export function NewSimulationPage() {
  const { user } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const source = useSimulation(params.get("desde") ?? undefined);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ output: SimulationOutput; request: SimulationRequestRaw } | null>(null);
  const preview = usePreview();

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyForm, mode: "onTouched" });

  useEffect(() => {
    if (source.data) {
      form.reset(fromRequest(source.data.request));
      setStep(4);
    }
  }, [source.data, form]);

  // Caso de práctica abierto desde el panel: /simulaciones/nueva?practica=<id>
  const practice = params.get("practica");
  useEffect(() => {
    const ex = practice ? EXAMPLE_CASES.find((c) => c.id === practice) : undefined;
    if (ex) {
      form.reset(ex.values);
      setStep(LAST);
    }
  }, [practice, form]);

  useEffect(() => {
    scrollAppToTop();
  }, [step, result]);

  const next = async () => {
    const fields = step > 0 && step < LAST ? STEP_FIELDS[step - 1] : [];
    const ok = await form.trigger(fields as unknown as FieldPath<FormValues>[], { shouldFocus: true });
    if (ok) setStep((s) => Math.min(s + 1, LAST));
  };

  const run = form.handleSubmit(
    async (values) => {
      const request = toRequest(values, user?.alertConfig);
      try {
        const output = await preview.mutateAsync(request);
        setResult({ output, request });
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "No se pudo ejecutar la simulación");
      }
    },
    () => toast.error("Revise los campos marcados"),
  );

  const loadExample = (id: string) => {
    const ex = EXAMPLE_CASES.find((c) => c.id === id);
    if (!ex) return;
    form.reset(ex.values);
    setStep(LAST);
    toast.success(`Caso de práctica cargado: ${ex.title}`);
  };

  if (result)
    return (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setResult(null)}>
            <Pencil /> Editar datos
          </Button>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Sin guardar</span>
        </div>
        <h1 className="mb-5 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em]">Resultados de la simulación</h1>
        <ResultsView output={result.output} alertConfig={user!.alertConfig} request={result.request} />
        <SaveBar request={result.request} onSaved={(id) => navigate(`/simulaciones/${id}`, { replace: true })} defaultTitle={defaultTitle(result.output)} />
      </div>
    );

  const meta = STEPS[step]!;
  return (
    <div className="pb-24">
      {/* Cabecera del asistente */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-slate-600 hover:bg-white cursor-pointer"
          aria-label={step === 0 ? "Salir" : "Paso anterior"}
        >
          {step === 0 ? <X className="size-5" /> : <ArrowLeft className="size-5" />}
        </button>
        {step > 0 && (
          <span className="text-xs font-semibold text-slate-500">
            Paso {step} de {LAST} · {meta.title}
          </span>
        )}
        <span className="size-10" />
      </div>
      {step > 0 && (
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={1} aria-valuemax={LAST} aria-valuenow={step} aria-label="Progreso">
          <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${(step / LAST) * 100}%` }} />
        </div>
      )}

      <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em]">{meta.question}</h1>
      <p className="mt-1 text-[15px] text-slate-600">{meta.hint}</p>

      {!online && (
        <div role="status" className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 size-4 shrink-0" /> Sin conexión: puede rellenar los datos, pero el cálculo se hace en el servidor.
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} noValidate className="mt-6">
        {/* Sin animación de salida: el paso nuevo se monta al instante y sus campos ya existen al validar. */}
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
            {step === 0 && <StepStart onExample={loadExample} onOwn={() => setStep(1)} />}
            {step === 1 && <StepPatient form={form} />}
            {step === 2 && <StepLab form={form} />}
            {step === 3 && <StepBalance form={form} />}
            {step === 4 && <StepScenarios form={form} />}
            {step === 5 && <StepReview form={form} onEdit={setStep} />}
        </motion.div>

        {step > 0 && (
          <BottomBar>
            <button type="button" aria-label="Anterior" className={barBack} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ArrowLeft className="size-5" />
            </button>
            {step < LAST ? (
              <button type="button" className={barMain} onClick={() => void next()}>
                Siguiente <ArrowRight className="size-[18px]" />
              </button>
            ) : (
              <button type="button" className={cn(barMain, "bg-gradient-to-b from-brand-500 to-brand-600 shadow-[0_8px_20px_-8px_rgb(11_79_131/0.7)]")} onClick={() => void run()} disabled={!online || preview.isPending}>
                {preview.isPending ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-[18px]" />} Ejecutar simulación
              </button>
            )}
          </BottomBar>
        )}
      </form>
    </div>
  );
}

/** Barra de acciones fija en la parte inferior (sustituye a la navegación durante el asistente). */
function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:left-[17rem]">
      <div className="pointer-events-auto mx-auto mb-3 flex max-w-md items-center gap-2 rounded-full bg-white/85 p-1.5 shadow-[0_10px_40px_-10px_rgb(15_23_42/0.35)] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl max-sm:mx-4">
        {children}
      </div>
    </div>
  );
}

const barBack = "flex size-12 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 active:scale-95 cursor-pointer";
const barMain = "flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 cursor-pointer";

function defaultTitle(o: SimulationOutput) {
  const cls = { hyponatremia: "Hiponatremia", hypernatremia: "Hipernatremia", normonatremia: "Normonatremia" }[o.patient.classification];
  return `${cls} Na ${o.patient.measuredSodium} · ${o.scenarios.length} escenario${o.scenarios.length > 1 ? "s" : ""}`;
}

type F = { form: UseFormReturn<FormValues> };

function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      {title && <h2 className="mb-4 text-[15px] font-semibold text-slate-800">{title}</h2>}
      {children}
    </Card>
  );
}

/** Grupo de opciones grandes (radios nativos accesibles con aspecto de botón). */
function ChoiceGroup({
  form,
  name,
  options,
  label,
  error,
  columns = 2,
}: F & { name: FieldPath<FormValues>; options: { value: string; label: string; sub?: string }[]; label: string; error?: string; columns?: 2 | 3 }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-800">{label}</legend>
      <div className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" value={o.value} className="peer sr-only" {...form.register(name)} />
            <span className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-2 py-3 text-center transition-colors peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-focus-visible:ring-3 peer-focus-visible:ring-brand-100">
              <span className="text-[15px] font-semibold">{o.label}</span>
              {o.sub && <span className="mt-0.5 text-[11px] leading-tight text-slate-500">{o.sub}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function StepStart({ onExample, onOwn }: { onExample: (id: string) => void; onOwn: () => void }) {
  return (
    <div className="space-y-7">
      <button
        type="button"
        onClick={onOwn}
        className="group flex w-full items-center gap-4 rounded-2xl bg-brand-600 p-5 text-left text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700 cursor-pointer"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <ClipboardPen className="size-6" />
        </span>
        <span className="flex-1">
          <span className="block text-[17px] font-semibold">Introducir un caso propio</span>
          <span className="block text-sm text-brand-100">Anónimo: sin nombres ni números de historia clínica.</span>
        </span>
        <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <BookOpenCheck className="size-5 text-teal-700" />
          <h2 className="text-[17px] font-semibold">Casos de práctica</h2>
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800">Ficticios</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {EXAMPLE_CASES.map((c) => {
            const na = c.values.patient.serumSodiumMmolL;
            const z = ZONE_STYLE[describeSodium(na).zone];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onExample(c.id)}
                className="flex flex-col rounded-2xl bg-white p-4 text-left shadow-card ring-1 ring-slate-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              >
                <span className={cn("self-start rounded-full px-2.5 py-0.5 text-xs font-semibold", z.chip)}>Na {na}</span>
                <span className="mt-2 text-[15px] font-semibold">{c.title}</span>
                <span className="mt-1 text-[13px] leading-snug text-slate-500">{c.summary}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                  Usar este caso <ArrowRight className="size-4" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepPatient({ form }: F) {
  const e = form.formState.errors.patient;
  return (
    <div className="space-y-4">
      <Panel>
        <div className="space-y-5">
          <ChoiceGroup
            form={form}
            name="patient.sex"
            label="Sexo biológico"
            error={e?.sex?.message}
            options={[
              { value: "female", label: "Mujer" },
              { value: "male", label: "Hombre" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Edad" error={e?.ageYears?.message}>
              <Input type="number" inputMode="numeric" unit="años" {...form.register("patient.ageYears", num)} />
            </Field>
            <Field label="Peso" error={e?.weightKg?.message}>
              <Input type="number" inputMode="decimal" step="0.1" unit="kg" {...form.register("patient.weightKg", num)} />
            </Field>
          </div>
          <Field label="Talla" optional error={e?.heightCm?.message} hint="Permite contrastar con la fórmula de Watson.">
            <Input type="number" inputMode="decimal" unit="cm" {...form.register("patient.heightCm", num)} />
          </Field>
        </div>
      </Panel>
      <Panel>
        <ChoiceGroup
          form={form}
          name="patient.chronicity"
          label="¿Desde cuándo está alterado el sodio?"
          columns={3}
          options={[
            { value: "acute", label: "< 48 h", sub: "Aguda" },
            { value: "chronic", label: "≥ 48 h", sub: "Crónica" },
            { value: "unknown", label: "No se sabe", sub: "Se trata como crónica" },
          ]}
        />
      </Panel>
    </div>
  );
}

function StepLab({ form }: F) {
  const e = form.formState.errors.patient;
  const na = useWatch({ control: form.control, name: "patient.serumSodiumMmolL" });
  const [glu, gluUnit, cr, crUnit] = useWatch({ control: form.control, name: ["patient.glucose", "patient.glucoseUnit", "patient.creatinine", "patient.creatinineUnit"] });
  const d = typeof na === "number" && na >= 80 && na <= 220 ? describeSodium(na) : null;
  return (
    <div className="space-y-4">
      <Panel>
        <Field label="Sodio sérico" error={e?.serumSodiumMmolL?.message} hint="Normal: 135–145 mmol/L (mEq/L).">
          <Input type="number" inputMode="decimal" step="0.1" unit="mmol/L" className="text-lg font-semibold" {...form.register("patient.serumSodiumMmolL", num)} />
        </Field>
        {d && (
          <div className="mt-4 animate-in rounded-xl bg-slate-50 p-4">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", ZONE_STYLE[d.zone].chip)}>{d.title}</span>
            <p className="mt-1.5 text-[13px] text-slate-600">{d.plain}</p>
            <SodiumScale className="mt-2" start={na} />
          </div>
        )}
      </Panel>
      <Panel title="Otros valores (opcionales)">
        <div className="space-y-4">
          <Field label="Potasio sérico" optional error={e?.serumPotassiumMmolL?.message} hint="< 3,5 mmol/L aumenta el riesgo de desmielinización.">
            <Input type="number" inputMode="decimal" step="0.1" unit="mmol/L" {...form.register("patient.serumPotassiumMmolL", num)} />
          </Field>
          <div className="grid grid-cols-[1fr_auto] items-start gap-2">
            <Field label="Glucosa" optional error={e?.glucose?.message} hint={glucoseHint(glu, gluUnit) ?? "Para corregir el sodio si hay hiperglucemia."}>
              <Input type="number" inputMode="decimal" step="0.1" {...form.register("patient.glucose", num)} />
            </Field>
            <UnitToggle form={form} name="patient.glucoseUnit" options={["mg/dL", "mmol/L"]} />
          </div>
          <div className="grid grid-cols-[1fr_auto] items-start gap-2">
            <Field label="Creatinina" optional error={e?.creatinine?.message} hint={creatinineHint(cr, crUnit) ?? "Para estimar la función renal."}>
              <Input type="number" inputMode="decimal" step="0.01" {...form.register("patient.creatinine", num)} />
            </Field>
            <UnitToggle form={form} name="patient.creatinineUnit" options={["mg/dL", "µmol/L"]} />
          </div>
          <ToggleRow label="En diálisis o hemofiltración" description="El modelo no es aplicable y no mostrará resultados." {...form.register("patient.onKidneyReplacementTherapy")} />
        </div>
      </Panel>
    </div>
  );
}

function UnitToggle({ form, name, options }: F & { name: "patient.glucoseUnit" | "patient.creatinineUnit"; options: [string, string] }) {
  const value = useWatch({ control: form.control, name });
  return (
    <div role="radiogroup" aria-label="Unidad" className="mt-[26px] flex h-12 rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => form.setValue(name, o as never, { shouldValidate: true })}
          className={cn("rounded-lg px-2.5 text-xs font-semibold cursor-pointer", value === o ? "bg-white text-brand-700 shadow-sm" : "text-slate-500")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Interruptor (checkbox nativo con aspecto de switch). */
function ToggleRow({ label, description, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 p-3.5">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <span className="relative shrink-0">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span className="block h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-3 peer-focus-visible:ring-brand-100" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function StepBalance({ form }: F) {
  const e = form.formState.errors.patient;
  const urineKnown = useWatch({ control: form.control, name: "patient.urineKnown" });
  const losses = useFieldArray({ control: form.control, name: "patient.otherLosses" });
  return (
    <div className="space-y-4">
      <Panel title="Orina">
        <div className="flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="¿Se conoce la diuresis?">
          {(
            [
              [true, "Conozco la diuresis"],
              [false, "No la conozco"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={urineKnown === v}
              onClick={() => form.setValue("patient.urineKnown", v, { shouldValidate: false })}
              className={cn("flex-1 rounded-lg py-2.5 text-sm font-semibold cursor-pointer", urineKnown === v ? "bg-white text-brand-700 shadow-sm" : "text-slate-500")}
            >
              {label}
            </button>
          ))}
        </div>
        {urineKnown ? (
          <div className="mt-4 space-y-4">
            <Field label="Diuresis" error={e?.urineOutputMlH?.message} hint="Promedio por hora en las últimas horas.">
              <Input type="number" inputMode="decimal" unit="mL/h" {...form.register("patient.urineOutputMlH", num)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Na⁺ urinario" optional error={e?.urineSodiumMmolL?.message}>
                <Input type="number" inputMode="decimal" unit="mmol/L" {...form.register("patient.urineSodiumMmolL", num)} />
              </Field>
              <Field label="K⁺ urinario" optional error={e?.urinePotassiumMmolL?.message}>
                <Input type="number" inputMode="decimal" unit="mmol/L" {...form.register("patient.urinePotassiumMmolL", num)} />
              </Field>
            </div>
            <p className="text-xs text-slate-500">Sin Na⁺ y K⁺ urinarios el rango de incertidumbre será mucho más amplio.</p>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Sin diuresis el modelo supone que no se pierde orina y solo muestra estimaciones durante las primeras 6 horas.
          </p>
        )}
      </Panel>

      <Panel title="Factores de riesgo de desmielinización">
        <p className="-mt-2 mb-3 text-xs text-slate-500">Si hay alguno, se usa un límite de corrección más estricto.</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["alcoholism", "Alcoholismo"],
              ["malnutrition", "Desnutrición"],
              ["advancedLiverDisease", "Hepatopatía avanzada"],
              ["hypokalemia", "Hipopotasemia"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="cursor-pointer">
              <input type="checkbox" className="peer sr-only" {...form.register(`patient.riskFactors.${k}`)} />
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white px-3.5 py-2 text-sm font-medium transition-colors peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-800 peer-focus-visible:ring-3 peer-focus-visible:ring-brand-100">
                {label}
              </span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel>
        <details className="group" open={losses.fields.length > 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
            Otras entradas y pérdidas
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              Opcional <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-4 space-y-4">
            <Field label="Agua por boca" optional error={e?.oralWaterIntakeMlH?.message}>
              <Input type="number" inputMode="decimal" unit="mL/h" {...form.register("patient.oralWaterIntakeMlH", num)} />
            </Field>
            {losses.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_7.5rem_auto] items-end gap-2">
                <Field label={`Pérdida ${i + 1}`}>
                  <Select {...form.register(`patient.otherLosses.${i}.type`)}>
                    {Object.entries(LOSS_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Volumen" error={e?.otherLosses?.[i]?.mlPerHour?.message}>
                  <Input type="number" inputMode="decimal" unit="mL/h" {...form.register(`patient.otherLosses.${i}.mlPerHour`, num)} />
                </Field>
                <Button type="button" variant="ghost" size="icon" aria-label="Quitar pérdida" onClick={() => losses.remove(i)}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {losses.fields.length < 5 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => losses.append({ type: "diarrhea", mlPerHour: undefined as unknown as number })}>
                <Plus /> Añadir pérdida (vómito, diarrea, drenaje…)
              </Button>
            )}
          </div>
        </details>
      </Panel>
    </div>
  );
}

const TONICITY: Record<Solution["tonicityClass"], { bar: string; text: string; effect: string }> = {
  hipotónica: { bar: "bg-low-500", text: "text-low-700", effect: "Tiende a bajar el sodio" },
  isotónica: { bar: "bg-ok-500", text: "text-ok-700", effect: "Efecto pequeño" },
  hipertónica: { bar: "bg-high-500", text: "text-high-700", effect: "Tiende a subir el sodio" },
};

function SolutionPicker({ form, index }: F & { index: number }) {
  const value = useWatch({ control: form.control, name: `scenarios.${index}.solutionId` });
  const [open, setOpen] = useState(false);
  const selected = getSolution(value ?? "");
  const groups: Solution["tonicityClass"][] = ["hipertónica", "isotónica", "hipotónica"];
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-800">Solución</span>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3.5 text-left ring-1 ring-slate-200 transition hover:ring-slate-300 cursor-pointer">
        {selected && <span className={cn("h-10 w-1.5 shrink-0 rounded-full", TONICITY[selected.tonicityClass].bar)} />}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{selected?.name ?? "Elegir solución"}</span>
          {selected && (
            <span className="block text-xs text-slate-500">
              Na⁺+K⁺ {selected.sodiumMmolL + selected.potassiumMmolL} mmol/L · {TONICITY[selected.tonicityClass].effect.toLowerCase()}
            </span>
          )}
        </span>
        <ChevronRight className="size-5 text-slate-400" />
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Elegir solución" description="Agrupadas por su efecto sobre el sodio. El número es Na⁺+K⁺ en mmol/L.">
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <div className={cn("mb-2 text-[12px] font-semibold uppercase tracking-[0.06em]", TONICITY[g].text)}>
                {g}s · {TONICITY[g].effect.toLowerCase()}
              </div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-slate-50">
                {SOLUTIONS.filter((s) => s.tonicityClass === g).map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-100">
                    <input type="radio" value={s.id} className="peer sr-only" {...form.register(`scenarios.${index}.solutionId`, { onChange: () => setOpen(false) })} />
                    <span className={cn("h-7 w-1.5 shrink-0 rounded-full", TONICITY[g].bar)} />
                    <span className="flex-1 text-[15px] font-medium">{s.name}</span>
                    <span className="tabular text-[13px] font-semibold text-slate-500">{s.sodiumMmolL + s.potassiumMmolL}</span>
                    <Check className="size-5 text-brand-600 opacity-0 peer-checked:opacity-100" />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function StepScenarios({ form }: F) {
  const scenarios = useFieldArray({ control: form.control, name: "scenarios" });
  const values = useWatch({ control: form.control, name: "scenarios" });
  const e = form.formState.errors.scenarios;
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-brand-50 p-3 text-[13px] text-brand-800">
        Las velocidades son <strong>hipotéticas</strong>: las elige usted para comparar. Osmoguard no recomienda tratamientos.
      </p>
      {scenarios.fields.map((f, i) => (
        <Panel key={f.id}>
          <div className="mb-4 flex items-center justify-between">
            <span className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">{String.fromCharCode(65 + i)}</span>
            {scenarios.fields.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => scenarios.remove(i)}>
                <Trash2 /> Quitar
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <SolutionPicker form={form} index={i} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Velocidad hipotética" error={e?.[i]?.rateMlH?.message}>
                <Input type="number" inputMode="decimal" unit="mL/h" {...form.register(`scenarios.${i}.rateMlH`, num)} />
              </Field>
              <Field label="Durante" error={e?.[i]?.horizonHours?.message}>
                <Input type="number" inputMode="numeric" unit="horas" {...form.register(`scenarios.${i}.horizonHours`, num)} />
              </Field>
            </div>
            <Field label="Nombre del escenario" error={e?.[i]?.label?.message}>
              <Input {...form.register(`scenarios.${i}.label`)} />
            </Field>
          </div>
        </Panel>
      ))}
      {scenarios.fields.length < 4 && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-500 hover:text-brand-600 cursor-pointer"
          onClick={() =>
            scenarios.append({
              label: `Escenario ${String.fromCharCode(65 + scenarios.fields.length)}`,
              solutionId: "ringer-lactate",
              rateMlH: undefined as unknown as number,
              horizonHours: values?.[0]?.horizonHours ?? 24,
            })
          }
        >
          <Plus className="size-4" /> Añadir otro escenario para comparar ({scenarios.fields.length}/4)
        </button>
      )}
    </div>
  );
}

function StepReview({ form, onEdit }: F & { onEdit: (s: number) => void }) {
  const v = form.getValues();
  const p = v.patient;
  const d = typeof p.serumSodiumMmolL === "number" ? describeSodium(p.serumSodiumMmolL) : null;
  const rows: [number, string, [string, string][]][] = [
    [1, "Paciente", [["Edad", `${p.ageYears ?? "—"} años`], ["Sexo", p.sex === "male" ? "Hombre" : p.sex === "female" ? "Mujer" : "—"], ["Peso", `${p.weightKg ?? "—"} kg`], ["Talla", p.heightCm ? `${p.heightCm} cm` : "—"]]],
    [2, "Laboratorio", [["Na⁺", `${p.serumSodiumMmolL ?? "—"} mmol/L`], ["K⁺", p.serumPotassiumMmolL ? `${p.serumPotassiumMmolL} mmol/L` : "—"], ["Glucosa", p.glucose ? `${p.glucose} ${p.glucoseUnit}` : "—"], ["Creatinina", p.creatinine ? `${p.creatinine} ${p.creatinineUnit}` : "—"]]],
    [3, "Balance", [["Diuresis", p.urineKnown ? `${p.urineOutputMlH ?? "—"} mL/h` : "Desconocida"], ["Na⁺+K⁺ orina", p.urineSodiumMmolL !== undefined ? `${p.urineSodiumMmolL} + ${p.urinePotassiumMmolL ?? "?"}` : "—"], ["Otras pérdidas", p.otherLosses.length ? `${p.otherLosses.length}` : "Ninguna"], ["Riesgo ODS", Object.values(p.riskFactors).filter(Boolean).length ? "Sí" : "No"]]],
  ];
  return (
    <div className="space-y-4">
      {d && (
        <Card className="p-5">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", ZONE_STYLE[d.zone].chip)}>{d.title}</span>
          <SodiumScale className="mt-2" start={p.serumSodiumMmolL} />
        </Card>
      )}
      {rows.map(([s, title, items]) => (
        <Card key={title} className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(s)}>
              <Pencil /> Editar
            </Button>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4">
            {items.map(([k, val]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="tabular text-sm font-semibold">{val}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Escenarios ({v.scenarios.length})</h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(4)}>
            <Pencil /> Editar
          </Button>
        </div>
        <div className="space-y-2">
          {v.scenarios.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
              <span className="flex size-6 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">{String.fromCharCode(65 + i)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.label}</span>
                <span className="tabular block text-xs text-slate-500">
                  {getSolution(s.solutionId)?.shortName} · {s.rateMlH ?? "—"} mL/h · {s.horizonHours} h
                </span>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <p className="flex items-center gap-2 px-1 text-xs text-slate-500">
        <Check className="size-4 text-ok-500" /> El cálculo se hace en el servidor con el motor clínico versionado.
      </p>
    </div>
  );
}

function SaveBar({ request, onSaved, defaultTitle: initial }: { request: SimulationRequestRaw; onSaved: (id: string) => void; defaultTitle: string }) {
  const create = useCreateSimulation();
  const [title, setTitle] = useState(initial);
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const titleCheck = simulationTitleSchema.safeParse(title);
  const save = async () => {
    try {
      const sim = await create.mutateAsync({ title, notes: notes || undefined, request });
      toast.success("Simulación guardada");
      onSaved(sim.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo guardar");
    }
  };
  return (
    <>
      {open && (
        <Card className="mt-5 animate-in p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Guardar en mis casos</h2>
          <div className="space-y-3">
            <Field label="Título" error={titleCheck.success ? undefined : titleCheck.error.issues[0]?.message} hint="Sin datos que identifiquen al paciente.">
              <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Notas" optional>
              <Textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>
      )}
      <BottomBar>
        <Link to="/" aria-label="Salir" className={barBack}>
          <X className="size-5" />
        </Link>
        {!open ? (
          <button type="button" className={barMain} onClick={() => setOpen(true)}>
            <Save className="size-[18px]" /> Guardar en historial
          </button>
        ) : (
          <button type="button" className={barMain} onClick={() => void save()} disabled={!titleCheck.success || create.isPending}>
            {create.isPending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-[18px]" />} Guardar
          </button>
        )}
      </BottomBar>
      <div className="h-24" aria-hidden />
    </>
  );
}
