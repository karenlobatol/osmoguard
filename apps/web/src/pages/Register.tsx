import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { registerSchema, type RegisterInput } from "@osmoguard/contracts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthLayout } from "./AuthLayout";
import { FormError } from "./FormError";

export function RegisterPage() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await signup(data);
      navigate("/", { replace: true });
    } catch (e) {
      form.setError("root", { message: e instanceof ApiError ? e.message : "No se pudo crear la cuenta" });
    }
  });

  return (
    <AuthLayout title="Crear cuenta" subtitle="Acceso gratuito para estudiantes y profesionales de la salud.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={errors.root?.message} />
        <Field label="Nombre" error={errors.name?.message}>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="Correo electrónico" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </Field>
        <Field label="Contraseña" hint="Mínimo 10 caracteres, con letras y números." error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <div>
          <Checkbox
            label="Entiendo que Osmoguard es una herramienta educativa"
            description="No prescribe tratamientos ni sustituye el juicio clínico. No introduciré datos identificables de pacientes."
            {...form.register("acceptTerms")}
          />
          {errors.acceptTerms && <p className="mt-1 text-xs font-medium text-red-700">{errors.acceptTerms.message}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Crear cuenta
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-600">
        ¿Ya tiene cuenta?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
