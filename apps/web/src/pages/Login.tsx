import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { loginSchema, type LoginInput } from "@osmoguard/contracts";
import { AuthInput, authPrimary } from "@/components/ui/auth-input";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthLayout } from "./AuthLayout";
import { FormError } from "./FormError";
import { ServerSetting } from "./ServerSetting";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (e) {
      form.setError("root", { message: e instanceof ApiError ? e.message : "No se pudo iniciar sesión" });
    }
  });

  return (
    <AuthLayout title="Bienvenido de nuevo" fixed>
      <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
        <FormError message={errors.root?.message} />
        <Field label="Correo electrónico" error={errors.email?.message}>
          <AuthInput icon={<Mail />} type="email" autoComplete="email" inputMode="email" placeholder="nombre@hospital.com" {...form.register("email")} />
        </Field>
        <div className="relative">
          <Field label="Contraseña" error={errors.password?.message}>
            <AuthInput icon={<Lock />} type="password" autoComplete="current-password" placeholder="••••••••••" {...form.register("password")} />
          </Field>
          <Link to="/recuperar" className="absolute right-0 top-0 text-[13px] font-semibold text-brand-600 hover:text-brand-700">
            ¿La olvidó?
          </Link>
        </div>
        <button type="submit" disabled={isSubmitting} className={`${authPrimary} flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer`}>
          {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <>Iniciar sesión <ArrowRight className="size-[18px]" /></>}
        </button>
      </form>

      <p className="mt-4 text-center text-[14px] text-slate-500">
        ¿Nuevo aquí?{" "}
        <Link to="/registro" className="font-semibold text-brand-600 hover:text-brand-700">
          Crear cuenta
        </Link>
      </p>
      <ServerSetting />
    </AuthLayout>
  );
}
