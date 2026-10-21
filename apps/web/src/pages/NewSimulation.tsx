import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch, type FieldPath, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Beaker, Check, Droplets, FlaskConical, Pencil, Play, Plus, Save, Trash2, UserRound, WifiOff } from "lucide-react";
import { SOLUTIONS, LOSS_TYPES, getSolution, type SimulationOutput, type SimulationRequestRaw } from "@osmoguard/engine";
import { simulationTitleSchema } from "@osmoguard/contracts";
import { PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResultsView } from "@/features/results/ResultsView";
import { EXAMPLE_CASES, STEP_FIELDS, creatinineHint, emptyForm, formSchema, fromRequest, glucoseHint, toRequest, type FormValues } from "@/features/simulation/form";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useOnline } from "@/lib/online";
import { useCreateSimulation, usePreview, useSimulation } from "@/lib/queries";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Paciente", icon: UserRound },
  { title: "Laboratorio", icon: Beaker },
  { title: "Balance", icon: Droplets },
  { title: "Escenarios", icon: FlaskConical },
  { title: "Revisar", icon: Check },
];

const num = { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(",", "."))) };

export function NewSimulationPage() {
  const { user } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const source = useSimulation(params.get("desde") ?? undefined);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ output: SimulationOutput; request: SimulationRequestRaw } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const preview = usePreview();

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyForm, mode: "onTouched" });

  useEffect(() => {
    if (source.data) {
      form.reset(fromRequest(source.data.request));
      setStep(3);
    }
  }, [source.data, form]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, result]);

  const next = async () => {
    const ok = await form.trigger(STEP_FIELDS[step] as unknown as FieldPath<FormValues>[], { shouldFocus: true });
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const run = form.handleSubmit(async (values) => {
    const request = toRequest(values, user?.alertConfig);
    try {
      const output = await preview.mutateAsync(request);
      setResult({ output, request });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo ejecutar la simulación");
    }
  }, () => toast.error("Revise los campos marcados"));

  const loadExample = (id: string) => {
    const ex = EXAMPLE_CASES.find((c) => c.id === id);
    if (!ex) return;
    form.reset(ex.values);
    setStep(4);
    toast.success(`Caso ficticio cargado: ${ex.title}`);
  };

  if (result)
    return (
      <div ref={topRef} className="scroll-mt-20">
        <PageHeader
          eyebrow="Resultado sin guardar"
          title="Resultados de la simulación"
          description="Revise supuestos y alertas antes de guardar. Puede volver a editar los datos sin perderlos."
          actions={
            <Button variant="outline" onClick={() => setResult(null)}>
              <Pencil /> Editar datos
            </Button>
          }
        />
        <SaveBar
          request={result.request}
          onSaved={(id) => navigate(`/simulaciones/${id}`, { replace: true })}
          defaultTitle={defaultTitle(result.output)}
        />
        <ResultsView output={result.output} alertConfig={user!.alertConfig} />
      </div>
    );

  return (
    <div ref={topRef} className="scroll-mt-20">
      <PageHeader
        eyebrow="Nueva simulación"
        title="Datos del escenario"
        description="Introduzca parámetros de un caso anónimo o ficticio. No incluya nombres, documentos ni números de historia clínica."
      />

      {!online && (
        <div role="status" className="mb-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 size-4 shrink-0" /> Sin conexión: puede rellenar el formulario, pero el motor se ejecuta en el servidor y no estará disponible hasta recuperar la conexión.
        </div>
      )}

      <Stepper step={step} onJump={(i) => i < step && setStep(i)} />

      <form onSubmit={(e) => e.preventDefault()} noValidate className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
            {step === 0 && <StepPatient form={form} onExample={loadExample} />}
            {step === 1 && <StepLab form={form} />}
            {step === 2 && <StepBalance form={form} />}
            {step === 3 && <StepScenarios form={form} />}
            {step === 4 && <StepReview form={form} onEdit={setStep} />}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-[72px] z-10 mt-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur lg:bottom-4">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft /> Anterior
          </Button>
          <span className="text-xs text-slate-500">
            Paso {step + 1} de {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => void next()}>
              Siguiente <ArrowRight />
            </Button>
          ) : (
            <Button type="button" onClick={() => void run()} loading={preview.isPending} disabled={!online}>
              <Play /> Ejecutar simulación
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function defaultTitle(o: SimulationOutput) {
  const cls = { hyponatremia: "Hiponatremia", hypernatremia: "Hipernatremia", normonatremia: "Normonatremia" }[o.patient.classification];
  return `${cls} Na ${o.patient.measuredSodium} · ${o.scenarios.length} escenario${o.scenarios.length > 1 ? "s" : ""}`;
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Progreso">
      <ol className="flex items-center gap-1.5 sm:gap-3">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s.title} className="flex flex-1 items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                className={cn("flex items-center gap-2 text-left", done && "cursor-pointer")}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    current ? "bg-brand-600 text-white ring-4 ring-brand-100" : done ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600",
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn("hidden text-sm font-medium md:inline", current ? "text-ink" : "text-slate-500")}>{s.title}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cn("h-0.5 flex-1 rounded", done ? "bg-teal-600" : "bg-slate-200")} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm font-medium text-slate-700 md:hidden">{STEPS[step]!.title}</p>
    </nav>
  );
}

type F = { form: UseFormReturn<FormValues> };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StepPatient({ form, onExample }: F & { onExample: (id: string) => void }) {
  const e = form.formState.errors.patient;
  return (
    <div className="space-y-5">
      <Section title="Datos demográficos" description="Determinan la estimación del agua corporal total.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Edad" error={e?.ageYears?.message} hint="El motor solo admite adultos (≥ 18 años).">
            <Input type="number" inputMode="numeric" unit="años" {...form.register("patient.ageYears", num)} />
          </Field>
          <Field label="Sexo biológico" error={e?.sex?.message} hint="Usado en las fórmulas de agua corporal y eGFR.">
            <Select defaultValue="" {...form.register("patient.sex")}>
              <option value="" disabled>
                Seleccione…
              </option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
            </Select>
          </Field>
          <Field label="Peso" error={e?.weightKg?.message}>
            <Input type="number" inputMode="decimal" step="0.1" unit="kg" {...form.register("patient.weightKg", num)} />
          </Field>
          <Field label="Talla" optional error={e?.heightCm?.message} hint="Permite comparar con la fórmula de Watson.">
            <Input type="number" inputMode="decimal" unit="cm" {...form.register("patient.heightCm", num)} />
          </Field>
          <Field label="Cronología de la disnatremia" className="sm:col-span-2" hint="Si se desconoce, las guías recomiendan tratarla como crónica.">
            <Select {...form.register("patient.chronicity")}>
              <option value="unknown">Desconocida</option>
              <option value="chronic">Crónica (≥ 48 h)</option>
              <option value="acute">Aguda documentada (&lt; 48 h)</option>
            </Select>
          </Field>
        </div>
      </Section>
      <Card className="border-dashed bg-brand-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Casos de ejemplo <Badge tone="teal">Ficticios</Badge>
          </CardTitle>
          <CardDescription>Cargue un caso docente para explorar el simulador.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {EXAMPLE_CASES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onExample(c.id)}
              className="rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/60 cursor-pointer"
            >
              <div className="text-sm font-medium">{c.title}</div>
              <div className="mt-0.5 text-xs text-slate-500">{c.summary}</div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StepLab({ form }: F) {
  const e = form.formState.errors.patient;
  const [glu, gluUnit, cr, crUnit] = useWatch({ control: form.control, name: ["patient.glucose", "patient.glucoseUnit", "patient.creatinine", "patient.creatinineUnit"] });
  return (
    <Section title="Laboratorio" description="Valores séricos. Las unidades se convierten automáticamente.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sodio sérico" error={e?.serumSodiumMmolL?.message} hint="Normal 135–145 mmol/L (mEq/L).">
          <Input type="number" inputMode="decimal" step="0.1" unit="mmol/L" {...form.register("patient.serumSodiumMmolL", num)} />
        </Field>
        <Field label="Potasio sérico" optional error={e?.serumPotassiumMmolL?.message} hint="< 3,5 mmol/L se considera factor de riesgo de desmielinización.">
          <Input type="number" inputMode="decimal" step="0.1" unit="mmol/L" {...form.register("patient.serumPotassiumMmolL", num)} />
        </Field>
        <div className="grid grid-cols-[1fr_auto] items-start gap-2">
          <Field label="Glucosa" optional error={e?.glucose?.message} hint={glucoseHint(glu, gluUnit) ?? "Permite calcular el sodio corregido."}>
            <Input type="number" inputMode="decimal" step="0.1" {...form.register("patient.glucose", num)} />
          </Field>
          <UnitToggle form={form} name="patient.glucoseUnit" options={["mg/dL", "mmol/L"]} />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-start gap-2">
          <Field label="Creatinina" optional error={e?.creatinine?.message} hint={creatinineHint(cr, crUnit) ?? "Para eGFR (CKD-EPI 2021)."}>
            <Input type="number" inputMode="decimal" step="0.01" {...form.register("patient.creatinine", num)} />
          </Field>
          <UnitToggle form={form} name="patient.creatinineUnit" options={["mg/dL", "µmol/L"]} />
        </div>
        <Checkbox
          className="sm:col-span-2"
          label="En terapia de reemplazo renal (diálisis / hemofiltración)"
          description="El modelo no es aplicable y bloqueará los resultados."
          {...form.register("patient.onKidneyReplacementTherapy")}
        />
      </div>
    </Section>
  );
}

function UnitToggle({ form, name, options }: F & { name: "patient.glucoseUnit" | "patient.creatinineUnit"; options: [string, string] }) {
  const value = useWatch({ control: form.control, name });
  return (
    <div role="radiogroup" aria-label="Unidad" className="mt-[26px] flex h-11 rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => form.setValue(name, o as never, { shouldValidate: true })}
          className={cn("rounded-md px-2.5 text-xs font-medium cursor-pointer", value === o ? "bg-white text-brand-700 shadow-sm" : "text-slate-600")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function StepBalance({ form }: F) {
  const e = form.formState.errors.patient;
  const urineKnown = useWatch({ control: form.control, name: "patient.urineKnown" });
  const losses = useFieldArray({ control: form.control, name: "patient.otherLosses" });
  return (
    <div className="space-y-5">
      <Section title="Diuresis y composición urinaria" description="Las pérdidas urinarias son el principal determinante de la evolución real del sodio.">
        <div className="space-y-4">
          <div className="flex rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="¿Se conoce la diuresis?">
            {[
              [true, "Diuresis conocida"],
              [false, "Desconocida"],
            ].map(([v, label]) => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={urineKnown === v}
                onClick={() => form.setValue("patient.urineKnown", v as boolean, { shouldValidate: false })}
                className={cn("flex-1 rounded-md py-2 text-sm font-medium cursor-pointer", urineKnown === v ? "bg-white text-brand-700 shadow-sm" : "text-slate-600")}
              >
                {label as string}
              </button>
            ))}
          </div>
          {urineKnown ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Diuresis" error={e?.urineOutputMlH?.message} hint="Promedio horario reciente.">
                <Input type="number" inputMode="decimal" unit="mL/h" {...form.register("patient.urineOutputMlH", num)} />
              </Field>
              <Field label="Sodio urinario" optional error={e?.urineSodiumMmolL?.message}>
                <Input type="number" inputMode="decimal" unit="mmol/L" {...form.register("patient.urineSodiumMmolL", num)} />
              </Field>
              <Field label="Potasio urinario" optional error={e?.urinePotassiumMmolL?.message}>
                <Input type="number" inputMode="decimal" unit="mmol/L" {...form.register("patient.urinePotassiumMmolL", num)} />
              </Field>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Sin diuresis el modelo asume un sistema cerrado y solo mostrará estimaciones durante las primeras 6 horas.
            </p>
          )}
        </div>
      </Section>
      <Section title="Otras entradas y pérdidas" description="Opcional. Se suponen constantes durante el horizonte.">
        <div className="space-y-4">
          <Field label="Ingesta oral de agua libre" optional error={e?.oralWaterIntakeMlH?.message} className="sm:max-w-xs">
            <Input type="number" inputMode="decimal" unit="mL/h" {...form.register("patient.oralWaterIntakeMlH", num)} />
          </Field>
          {losses.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
              <Field label={i === 0 ? "Tipo de pérdida" : `Pérdida ${i + 1}`}>
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
            <Button type="button" variant="outline" size="sm" onClick={() => losses.append({ type: "diarrhea", mlPerHour: undefined as unknown as number })}>
              <Plus /> Añadir pérdida
            </Button>
          )}
        </div>
      </Section>
      <Section title="Factores de riesgo de desmielinización osmótica" description="Si hay alguno, se aplica el umbral de corrección para alto riesgo.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox label="Consumo crónico de alcohol" {...form.register("patient.riskFactors.alcoholism")} />
          <Checkbox label="Desnutrición" {...form.register("patient.riskFactors.malnutrition")} />
          <Checkbox label="Hepatopatía avanzada" {...form.register("patient.riskFactors.advancedLiverDisease")} />
          <Checkbox label="Hipopotasemia" description="Se detecta también si K⁺ < 3,5." {...form.register("patient.riskFactors.hypokalemia")} />
        </div>
      </Section>
    </div>
  );
}

function StepScenarios({ form }: F) {
  const scenarios = useFieldArray({ control: form.control, name: "scenarios" });
  const values = useWatch({ control: form.control, name: "scenarios" });
  const e = form.formState.errors.scenarios;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">
        Las velocidades son <strong>hipotéticas</strong> y las introduce usted con fines de comparación. Osmoguard no recomienda velocidades de infusión.
      </div>
      {scenarios.fields.map((f, i) => {
        const sol = getSolution(values?.[i]?.solutionId ?? "");
        return (
          <Card key={f.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Escenario {String.fromCharCode(65 + i)}</CardTitle>
              {scenarios.fields.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => scenarios.remove(i)}>
                  <Trash2 /> Quitar
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Etiqueta" error={e?.[i]?.label?.message}>
                <Input {...form.register(`scenarios.${i}.label`)} />
              </Field>
              <Field label="Solución (catálogo educativo)" error={e?.[i]?.solutionId?.message} hint={sol ? `Na⁺ ${sol.sodiumMmolL} + K⁺ ${sol.potassiumMmolL} mmol/L · ${sol.tonicityClass}${sol.note ? ` · ${sol.note}` : ""}` : undefined}>
                <Select {...form.register(`scenarios.${i}.solutionId`)}>
                  {SOLUTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Velocidad hipotética" error={e?.[i]?.rateMlH?.message}>
                <Input type="number" inputMode="decimal" unit="mL/h" {...form.register(`scenarios.${i}.rateMlH`, num)} />
              </Field>
              <Field label="Horizonte temporal" error={e?.[i]?.horizonHours?.message} hint="Máximo 48 h. Más allá de 24 h la confianza es baja.">
                <Input type="number" inputMode="numeric" unit="horas" {...form.register(`scenarios.${i}.horizonHours`, num)} />
              </Field>
            </CardContent>
          </Card>
        );
      })}
      {scenarios.fields.length < 4 && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() =>
            scenarios.append({
              label: `Escenario ${String.fromCharCode(65 + scenarios.fields.length)}`,
              solutionId: "ringer-lactate",
              rateMlH: undefined as unknown as number,
              horizonHours: values?.[0]?.horizonHours ?? 24,
            })
          }
        >
          <Plus /> Añadir escenario para comparar ({scenarios.fields.length}/4)
        </Button>
      )}
    </div>
  );
}

function StepReview({ form, onEdit }: F & { onEdit: (s: number) => void }) {
  const v = form.getValues();
  const p = v.patient;
  const rows: [number, string, [string, string][]][] = [
    [0, "Paciente", [["Edad", `${p.ageYears ?? "—"} años`], ["Sexo", p.sex === "male" ? "Masculino" : p.sex === "female" ? "Femenino" : "—"], ["Peso", `${p.weightKg ?? "—"} kg`], ["Talla", p.heightCm ? `${p.heightCm} cm` : "—"]]],
    [1, "Laboratorio", [["Na⁺", `${p.serumSodiumMmolL ?? "—"} mmol/L`], ["K⁺", p.serumPotassiumMmolL ? `${p.serumPotassiumMmolL} mmol/L` : "—"], ["Glucosa", p.glucose ? `${p.glucose} ${p.glucoseUnit}` : "—"], ["Creatinina", p.creatinine ? `${p.creatinine} ${p.creatinineUnit}` : "—"]]],
    [2, "Balance", [["Diuresis", p.urineKnown ? `${p.urineOutputMlH ?? "—"} mL/h` : "Desconocida"], ["Na⁺+K⁺ orina", p.urineSodiumMmolL !== undefined ? `${p.urineSodiumMmolL} + ${p.urinePotassiumMmolL ?? "?"}` : "—"], ["Otras pérdidas", p.otherLosses.length ? `${p.otherLosses.length}` : "Ninguna"], ["Factores ODS", Object.values(p.riskFactors).filter(Boolean).length ? "Sí" : "No"]]],
  ];
  return (
    <div className="space-y-4">
      {rows.map(([s, title, items]) => (
        <Card key={title}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(s)}>
              <Pencil /> Editar
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map(([k, val]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="tabular text-sm font-medium">{val}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Escenarios ({v.scenarios.length})</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(3)}>
            <Pencil /> Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {v.scenarios.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="tabular text-slate-600">
                {getSolution(s.solutionId)?.shortName} · {s.rateMlH ?? "—"} mL/h · {s.horizonHours} h
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
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
    <Card className="mb-6">
      <CardContent className="p-4">
        {!open ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Esta simulación aún no se ha guardado en su historial.</p>
            <Button onClick={() => setOpen(true)}>
              <Save /> Guardar en historial
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Título" error={titleCheck.success ? undefined : titleCheck.error.issues[0]?.message} hint="Sin datos identificables del paciente.">
              <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Notas" optional>
              <Textarea className="min-h-11" rows={1} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button onClick={() => void save()} loading={create.isPending} disabled={!titleCheck.success} className="sm:mb-[22px]">
              <Save /> Guardar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
