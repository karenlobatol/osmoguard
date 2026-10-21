import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router";
import { loginSchema, type LoginInput } from "@osmoguard/contracts";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthLayout } from "./AuthLayout";
import { FormError } from "./FormError";

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
    <AuthLayout title="Bienvenido de nuevo" subtitle="Inicie sesión para continuar con sus simulaciones.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={errors.root?.message} />
        <Field label="Correo electrónico" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link to="/recuperar" className="text-sm font-medium text-brand-600 hover:underline">
            ¿Olvidó su contraseña?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Iniciar sesión
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-600">
        ¿No tiene cuenta?{" "}
        <Link to="/registro" className="font-medium text-brand-600 hover:underline">
          Crear cuenta
        </Link>
      </p>
      <p className="mt-3 text-center text-sm">
        <Link to="/ciencia/publica" className="text-slate-500 hover:text-brand-600 hover:underline">
          Información científica y limitaciones
        </Link>
      </p>
    </AuthLayout>
  );
}
