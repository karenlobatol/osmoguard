import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Monitor, Save, Trash2 } from "lucide-react";
import { z } from "zod";
import { alertConfigSchema, type AlertConfig } from "@osmoguard/engine";
import { changePasswordSchema, type ChangePasswordInput, type UserDto } from "@osmoguard/contracts";
import { PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { useEngineInfo } from "@/lib/queries";

const profileForm = z.object({ name: z.string().trim().min(2, "Demasiado corto").max(80), profession: z.string().trim().max(80) });
const num = { valueAsNumber: true } as const;

export function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Cuenta" title="Perfil y configuración" />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard user={user} onSaved={setUser} />
        <AlertsCard user={user} onSaved={setUser} />
        <PasswordCard />
        <SessionsCard
          onLogoutAll={async () => {
            await api("/auth/logout-all", { method: "POST" });
            await logout();
            navigate("/login");
          }}
        />
      </div>
      <DangerZone
        onDeleted={async () => {
          await logout();
          navigate("/login");
        }}
      />
    </div>
  );
}

function ProfileCard({ user, onSaved }: { user: UserDto; onSaved: (u: UserDto) => void }) {
  const form = useForm<z.infer<typeof profileForm>>({ resolver: zodResolver(profileForm), defaultValues: { name: user.name, profession: user.profession ?? "" } });
  const submit = form.handleSubmit(async (v) => {
    try {
      onSaved(await api<UserDto>("/users/me", { method: "PATCH", json: { name: v.name, profession: v.profession || null } }));
      toast.success("Perfil actualizado");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo guardar");
    }
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </Field>
          <Field label="Profesión o rol" optional>
            <Input placeholder="p. ej. Residente de medicina interna" {...form.register("profession")} />
          </Field>
          <Button type="submit" loading={form.formState.isSubmitting}>
            <Save /> Guardar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AlertsCard({ user, onSaved }: { user: UserDto; onSaved: (u: UserDto) => void }) {
  const engine = useEngineInfo();
  const form = useForm<AlertConfig>({ resolver: zodResolver(alertConfigSchema) as never, defaultValues: user.alertConfig });
  const e = form.formState.errors;
  const submit = form.handleSubmit(async (v) => {
    try {
      onSaved(await api<UserDto>("/users/me", { method: "PATCH", json: { alertConfig: v } }));
      toast.success("Umbrales actualizados");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar");
    }
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Umbrales de alerta</CardTitle>
        <CardDescription>Acotados a rangos de las guías. Se aplican a las nuevas simulaciones.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Hiponatremia: subida máx. 24 h" hint="Rango 6–12" error={e.hypoMaxRise24hStandard?.message}>
            <Input type="number" step="0.5" unit="mmol/L" {...form.register("hypoMaxRise24hStandard", num)} />
          </Field>
          <Field label="Alto riesgo ODS: subida máx. 24 h" hint="Rango 4–10" error={e.hypoMaxRise24hHighRisk?.message}>
            <Input type="number" step="0.5" unit="mmol/L" {...form.register("hypoMaxRise24hHighRisk", num)} />
          </Field>
          <Field label="Hiponatremia: subida máx. 48 h" hint="Rango 12–20" error={e.hypoMaxRise48h?.message}>
            <Input type="number" step="0.5" unit="mmol/L" {...form.register("hypoMaxRise48h", num)} />
          </Field>
          <Field label="Hipernatremia: bajada máx. 24 h" hint="Rango 6–12" error={e.hyperMaxFall24h?.message}>
            <Input type="number" step="0.5" unit="mmol/L" {...form.register("hyperMaxFall24h", num)} />
          </Field>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" loading={form.formState.isSubmitting}>
              <Save /> Guardar umbrales
            </Button>
            {engine.data && (
              <Button type="button" variant="ghost" onClick={() => form.reset(engine.data.defaultAlertConfig)}>
                Restablecer valores por defecto
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const e = form.formState.errors;
  const submit = form.handleSubmit(async (v) => {
    try {
      await api("/users/me/password", { method: "POST", json: v });
      form.reset({ currentPassword: "", newPassword: "" });
      toast.success("Contraseña actualizada. Se cerraron las demás sesiones.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cambiar");
    }
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>Cerrará todas las demás sesiones.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Contraseña actual" error={e.currentPassword?.message}>
            <Input type="password" autoComplete="current-password" {...form.register("currentPassword")} />
          </Field>
          <Field label="Nueva contraseña" error={e.newPassword?.message} hint="Mínimo 10 caracteres, con letras y números.">
            <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
          </Field>
          <Button type="submit" loading={form.formState.isSubmitting}>
            Actualizar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface SessionRow {
  familyId: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

function SessionsCard({ onLogoutAll }: { onLogoutAll: () => Promise<void> }) {
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api<SessionRow[]>("/users/me/sessions") });
  // Una familia puede tener varias filas activas solo transitoriamente; se muestra una por familia.
  const rows = [...new Map((sessions.data ?? []).map((s) => [s.familyId, s])).values()];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sesiones activas</CardTitle>
        <CardDescription>Dispositivos con sesión abierta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.familyId} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <Monitor className="size-4 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{describeAgent(s.userAgent)}</span>
                <span className="text-xs text-slate-500">Desde {fmtDate(s.createdAt)}</span>
              </span>
              {s.current && <Badge tone="teal">Actual</Badge>}
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={() => void onLogoutAll()}>
          <LogOut /> Cerrar todas las sesiones
        </Button>
      </CardContent>
    </Card>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return "Dispositivo desconocido";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Otro";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${br} en ${os}`;
}

function DangerZone({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-800">Eliminar cuenta</CardTitle>
        <CardDescription>Borra de forma permanente su cuenta y todas sus simulaciones.</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          trigger={
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              <Trash2 /> Eliminar mi cuenta
            </Button>
          }
          title="¿Eliminar la cuenta?"
          description="Esta acción es irreversible. Confirme con su contraseña."
          confirmLabel="Eliminar definitivamente"
          destructive
          loading={busy}
          onConfirm={async () => {
            setBusy(true);
            try {
              await api("/users/me", { method: "DELETE", json: { password } });
              toast.success("Cuenta eliminada");
              await onDeleted();
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="mt-4">
            <Field label="Contraseña">
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
        </ConfirmDialog>
      </CardContent>
    </Card>
  );
}
