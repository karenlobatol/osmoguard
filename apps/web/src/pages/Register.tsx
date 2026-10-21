import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Check, Loader2, Lock, Mail, UserRound } from "lucide-react";
import { registerSchema, type RegisterInput } from "@osmoguard/contracts";
import { AuthInput, authPrimary } from "@/components/ui/auth-input";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AuthLayout } from "./AuthLayout";
import { FormError } from "./FormError";

/** Indicador de requisitos de la contraseña (los mismos que valida el servidor). */
function PasswordChecklist({ value }: { value: string }) {
  const rules = [
    { ok: value.length >= 10, label: "10+ caracteres" },
    { ok: /[a-zA-Z]/.test(value), label: "Letras" },
    { ok: /\d/.test(value), label: "Números" },
  ];
  const score = rules.filter((r) => r.ok).length;
  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < score ? (score === 3 ? "bg-ok-500" : "bg-amber-400") : "bg-slate-200")} />
        ))}
      </div>
      <div className="mt-2 flex gap-3 text-[12px]">
        {rules.map((r) => (
          <span key={r.label} className={cn("flex items-center gap-1 font-medium transition-colors", r.ok ? "text-ok-700" : "text-slate-500")}>
            <Check className={cn("size-3.5", !r.ok && "opacity-30")} /> {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const { errors, isSubmitting } = form.formState;
  const password = useWatch({ control: form.control, name: "password" }) ?? "";

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await signup(data);
      navigate("/", { replace: true });
    } catch (e) {
      form.setError("root", { message: e instanceof ApiError ? e.message : "No se pudo crear la cuenta" });
    }
  });

  return (
    <AuthLayout title="Crear cuenta" subtitle="Gratis para estudiantes y profesionales de la salud.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={errors.root?.message} />
        <Field label="Nombre" error={errors.name?.message}>
          <AuthInput icon={<UserRound />} autoComplete="name" placeholder="Nombre y apellido" {...form.register("name")} />
        </Field>
        <Field label="Correo electrónico" error={errors.email?.message}>
          <AuthInput icon={<Mail />} type="email" autoComplete="email" inputMode="email" placeholder="nombre@hospital.com" {...form.register("email")} />
        </Field>
        <div>
          <Field label="Contraseña" error={errors.password?.message}>
            <AuthInput icon={<Lock />} type="password" autoComplete="new-password" placeholder="Mínimo 10 caracteres" {...form.register("password")} />
          </Field>
          {password.length > 0 && <PasswordChecklist value={password} />}
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-900/[0.04]">
          <input type="checkbox" className="peer sr-only" {...form.register("acceptTerms")} />
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-white transition-colors peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/15 [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-[13px] leading-snug text-slate-600">
            <span className="block font-semibold text-slate-800">Entiendo que Osmoguard es una herramienta educativa</span>
            No prescribe tratamientos ni sustituye el juicio clínico. No introduciré datos identificables de pacientes.
          </span>
        </label>
        {errors.acceptTerms && (
          <p role="alert" className="-mt-2 text-xs font-medium text-red-700">
            {errors.acceptTerms.message}
          </p>
        )}
        <button type="submit" disabled={isSubmitting} className={`${authPrimary} flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer`}>
          {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <>Crear cuenta <ArrowRight className="size-[18px]" /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-[14px] text-slate-500">
        ¿Ya tiene cuenta?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
