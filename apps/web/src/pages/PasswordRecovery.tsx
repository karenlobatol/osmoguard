import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { forgotPasswordSchema, passwordSchema, type ForgotPasswordInput } from "@osmoguard/contracts";
import { Loader2, Lock, Mail } from "lucide-react";
import { AuthInput, authPrimary } from "@/components/ui/auth-input";
import { Field } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { AuthLayout } from "./AuthLayout";
import { FormError, FormSuccess } from "./FormError";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await api("/auth/forgot-password", { method: "POST", json: data, auth: false });
      setSent(true);
    } catch (e) {
      form.setError("root", { message: e instanceof ApiError ? e.message : "No se pudo enviar la solicitud" });
    }
  });
  return (
    <AuthLayout title="Recuperar contraseña" subtitle="Le enviaremos un enlace de un solo uso válido durante 30 minutos.">
      {sent ? (
        <FormSuccess message="Si existe una cuenta con ese correo, recibirá un mensaje con instrucciones." />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={errors.root?.message} />
          <Field label="Correo electrónico" error={errors.email?.message}>
            <AuthInput icon={<Mail />} type="email" autoComplete="email" inputMode="email" placeholder="nombre@hospital.com" {...form.register("email")} />
          </Field>
          <button type="submit" disabled={isSubmitting} className={`${authPrimary} flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer`}>
            {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : "Enviar enlace"}
          </button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}

const resetForm = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const form = useForm<z.infer<typeof resetForm>>({ resolver: zodResolver(resetForm) });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await api("/auth/reset-password", { method: "POST", json: { token, password }, auth: false });
      navigate("/login", { replace: true, state: { reset: true } });
    } catch (e) {
      form.setError("root", { message: e instanceof ApiError ? e.message : "No se pudo restablecer" });
    }
  });
  return (
    <AuthLayout title="Nueva contraseña" subtitle="Al cambiarla se cerrarán todas las sesiones abiertas.">
      {!token ? (
        <FormError message="El enlace no es válido. Solicite uno nuevo." />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={errors.root?.message} />
          <Field label="Nueva contraseña" hint="Mínimo 10 caracteres, con letras y números." error={errors.password?.message}>
            <AuthInput icon={<Lock />} type="password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <Field label="Repetir contraseña" error={errors.confirm?.message}>
            <AuthInput icon={<Lock />} type="password" autoComplete="new-password" {...form.register("confirm")} />
          </Field>
          <button type="submit" disabled={isSubmitting} className={`${authPrimary} flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer`}>
            {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : "Guardar contraseña"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
