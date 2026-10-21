import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ChevronRight, KeyRound, Laptop, LogOut, MonitorSmartphone, ShieldAlert, Smartphone, Trash2 } from "lucide-react";
import { Slider } from "radix-ui";
import { z } from "zod";
import { DEFAULT_ALERT_CONFIG, type AlertConfig } from "@osmoguard/engine";
import { changePasswordSchema, type ChangePasswordInput, type UserDto } from "@osmoguard/contracts";
import { AuthInput, authPrimary } from "@/components/ui/auth-input";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<null | "password" | "delete" | "sessions">(null);
  if (!user) return null;
  const initials = user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="space-y-8">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-2 text-center">
        <span className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-semibold text-white shadow-[0_14px_30px_-10px_rgb(11_79_131/0.6)]">
          {initials}
        </span>
        <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.025em]">{user.name}</h1>
        <p className="text-[15px] text-slate-500">{user.profession || user.email}</p>
      </motion.header>

      <AccountGroup user={user} onSaved={setUser} />
      <ThresholdsGroup user={user} onSaved={setUser} />

      <Group title="Seguridad">
        <Row icon={<KeyRound />} label="Cambiar contraseña" onClick={() => setSheet("password")} />
        <Row icon={<MonitorSmartphone />} label="Sesiones activas" onClick={() => setSheet("sessions")} />
        <Row icon={<LogOut />} label="Cerrar sesión" onClick={() => void signOut()} />
      </Group>

      <Group>
        <Row icon={<Trash2 />} label="Eliminar cuenta" danger onClick={() => setSheet("delete")} />
      </Group>

      <p className="pb-2 text-center text-xs text-slate-500">Osmoguard · simulador educativo · no es un dispositivo médico</p>

      <Sheet open={sheet === "password"} onOpenChange={(o) => !o && setSheet(null)} title="Cambiar contraseña" description="Se cerrarán las demás sesiones abiertas.">
        <PasswordForm onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "sessions"} onOpenChange={(o) => !o && setSheet(null)} title="Sesiones activas" description="Dispositivos con la sesión abierta.">
        <SessionsList
          onLogoutAll={async () => {
            await api("/auth/logout-all", { method: "POST" });
            await signOut();
          }}
        />
      </Sheet>
      <Sheet open={sheet === "delete"} onOpenChange={(o) => !o && setSheet(null)} title="Eliminar cuenta" description="Se borrarán su cuenta y todas sus simulaciones. No se puede deshacer.">
        <DeleteForm onDeleted={signOut} />
      </Sheet>
    </div>
  );
}

/* ---------- Bloques de la lista agrupada ---------- */

function Group({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">{title}</h2>}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-900/[0.04]">{children}</div>
      {footer && <p className="mt-2 px-4 text-[13px] leading-snug text-slate-500">{footer}</p>}
    </section>
  );
}

function Row({ icon, label, value, onClick, danger }: { icon: ReactNode; label: string; value?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 cursor-pointer">
      <span className={cn("[&_svg]:size-[19px]", danger ? "text-red-600" : "text-slate-500")}>{icon}</span>
      <span className={cn("flex-1 text-[15px] font-medium", danger && "text-red-600")}>{label}</span>
      {value && <span className="text-[15px] text-slate-500">{value}</span>}
      {!danger && <ChevronRight className="size-5 text-slate-300" />}
    </button>
  );
}

const profileForm = z.object({ name: z.string().trim().min(2, "Demasiado corto").max(80), profession: z.string().trim().max(80) });

function AccountGroup({ user, onSaved }: { user: UserDto; onSaved: (u: UserDto) => void }) {
  const form = useForm<z.infer<typeof profileForm>>({ resolver: zodResolver(profileForm), defaultValues: { name: user.name, profession: user.profession ?? "" } });
  const dirty = form.formState.isDirty;
  const submit = form.handleSubmit(async (v) => {
    try {
      onSaved(await api<UserDto>("/users/me", { method: "PATCH", json: { name: v.name, profession: v.profession || null } }));
      form.reset(v);
      toast.success("Perfil actualizado");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo guardar");
    }
  });
  const inline = "w-full bg-transparent text-right text-[15px] text-slate-600 outline-none placeholder:text-slate-400 focus:text-ink";
  return (
    <form onSubmit={submit} noValidate>
      <Group title="Cuenta" footer={form.formState.errors.name?.message}>
        <label className="flex items-center gap-4 px-5 py-4">
          <span className="w-24 shrink-0 text-[15px] font-medium">Nombre</span>
          <input className={inline} autoComplete="name" {...form.register("name")} />
        </label>
        <label className="flex items-center gap-4 px-5 py-4">
          <span className="w-24 shrink-0 text-[15px] font-medium">Profesión</span>
          <input className={inline} placeholder="Opcional" {...form.register("profession")} />
        </label>
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="w-24 shrink-0 text-[15px] font-medium">Correo</span>
          <span className="flex-1 truncate text-right text-[15px] text-slate-500">{user.email}</span>
        </div>
      </Group>
      {dirty && (
        <motion.button initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} type="submit" className={cn(authPrimary, "mt-3 cursor-pointer")}>
          Guardar cambios
        </motion.button>
      )}
    </form>
  );
}

const THRESHOLDS: { key: keyof AlertConfig; label: string; help: string; min: number; max: number; sign: "+" | "−" }[] = [
  { key: "hypoMaxRise24hStandard", label: "Hiponatremia · 24 h", help: "Subida máxima", min: 6, max: 12, sign: "+" },
  { key: "hypoMaxRise24hHighRisk", label: "Alto riesgo de desmielinización · 24 h", help: "Subida máxima", min: 4, max: 10, sign: "+" },
  { key: "hypoMaxRise48h", label: "Hiponatremia · 48 h", help: "Subida acumulada máxima", min: 12, max: 20, sign: "+" },
  { key: "hyperMaxFall24h", label: "Hipernatremia · 24 h", help: "Bajada máxima", min: 6, max: 12, sign: "−" },
];

function ThresholdsGroup({ user, onSaved }: { user: UserDto; onSaved: (u: UserDto) => void }) {
  const [cfg, setCfg] = useState<AlertConfig>(user.alertConfig);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(cfg) !== JSON.stringify(user.alertConfig);
  const isDefault = JSON.stringify(cfg) === JSON.stringify(DEFAULT_ALERT_CONFIG);
  const save = async () => {
    setSaving(true);
    try {
      onSaved(await api<UserDto>("/users/me", { method: "PATCH", json: { alertConfig: cfg } }));
      toast.success("Umbrales actualizados");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div>
      <Group title="Umbrales de alerta" footer="Límites de corrección usados para avisar de una posible sobrecorrección. Acotados a los rangos de las guías clínicas.">
        {THRESHOLDS.map((t) => (
          <div key={t.key} className="px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span>
                <span className="block text-[15px] font-medium">{t.label}</span>
                <span className="text-[12px] text-slate-500">{t.help}</span>
              </span>
              <span className="tabular shrink-0 text-[17px] font-semibold">
                {t.sign}
                {cfg[t.key]} <span className="text-[12px] font-medium text-slate-500">mmol/L</span>
              </span>
            </div>
            <Slider.Root
              className="relative mt-3 flex h-6 touch-none select-none items-center"
              min={t.min}
              max={t.max}
              step={0.5}
              value={[cfg[t.key]]}
              onValueChange={([v]) => setCfg((c) => ({ ...c, [t.key]: v }))}
              aria-label={t.label}
            >
              <Slider.Track className="relative h-1.5 grow rounded-full bg-slate-200">
                <Slider.Range className="absolute h-full rounded-full bg-brand-600" />
              </Slider.Track>
              <Slider.Thumb className="block size-6 rounded-full border border-slate-200 bg-white shadow-[0_2px_8px_rgb(15_23_42/0.2)] outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20" />
            </Slider.Root>
            <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
              <span>{t.min}</span>
              <span>{t.max}</span>
            </div>
          </div>
        ))}
      </Group>
      <div className="mt-3 flex gap-2">
        {!isDefault && (
          <button type="button" onClick={() => setCfg(DEFAULT_ALERT_CONFIG)} className="h-11 rounded-full px-4 text-[14px] font-semibold text-brand-600 hover:bg-brand-50 cursor-pointer">
            Valores por defecto
          </button>
        )}
        {dirty && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} type="button" onClick={() => void save()} disabled={saving} className="ml-auto h-11 rounded-full bg-slate-900 px-5 text-[14px] font-semibold text-white disabled:opacity-60 cursor-pointer">
            {saving ? "Guardando…" : "Guardar umbrales"}
          </motion.button>
        )}
      </div>
    </div>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const e = form.formState.errors;
  const submit = form.handleSubmit(async (v) => {
    try {
      await api("/users/me/password", { method: "POST", json: v });
      toast.success("Contraseña actualizada");
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cambiar");
    }
  });
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Contraseña actual" error={e.currentPassword?.message}>
        <AuthInput icon={<KeyRound />} type="password" autoComplete="current-password" {...form.register("currentPassword")} />
      </Field>
      <Field label="Nueva contraseña" error={e.newPassword?.message} hint="Mínimo 10 caracteres, con letras y números.">
        <AuthInput icon={<KeyRound />} type="password" autoComplete="new-password" {...form.register("newPassword")} />
      </Field>
      <button type="submit" disabled={form.formState.isSubmitting} className={cn(authPrimary, "cursor-pointer disabled:opacity-60")}>
        Actualizar contraseña
      </button>
    </form>
  );
}

interface SessionRow {
  familyId: string;
  userAgent: string | null;
  createdAt: string;
  current: boolean;
}

function SessionsList({ onLogoutAll }: { onLogoutAll: () => Promise<void> }) {
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api<SessionRow[]>("/users/me/sessions") });
  const rows = [...new Map((sessions.data ?? []).map((s) => [s.familyId, s])).values()];
  return (
    <div>
      <ul className="divide-y divide-slate-100 rounded-2xl bg-slate-50">
        {rows.map((s) => {
          const mobile = /Android|iPhone|iPad/.test(s.userAgent ?? "");
          return (
            <li key={s.familyId} className="flex items-center gap-3 px-4 py-3.5">
              {mobile ? <Smartphone className="size-5 text-slate-500" /> : <Laptop className="size-5 text-slate-500" />}
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{describeAgent(s.userAgent)}</span>
                <span className="text-[12px] text-slate-500">Desde {new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(s.createdAt))}</span>
              </span>
              {s.current && <span className="rounded-full bg-ok-100 px-2 py-0.5 text-[11px] font-semibold text-ok-700">Este dispositivo</span>}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => void onLogoutAll()} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 text-[15px] font-semibold text-red-700 cursor-pointer">
        <LogOut className="size-4" /> Cerrar todas las sesiones
      </button>
    </div>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return "Dispositivo desconocido";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Otro";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${br} en ${os}`;
}

function DeleteForm({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-2xl bg-red-50 p-4 text-[13px] text-red-800">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" />
        Esta acción es permanente. Confirme con su contraseña.
      </div>
      <Field label="Contraseña">
        <AuthInput icon={<KeyRound />} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button
        type="button"
        disabled={!password || busy}
        onClick={async () => {
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
        className="h-[52px] w-full rounded-2xl bg-red-600 text-[15px] font-semibold text-white disabled:opacity-50 cursor-pointer"
      >
        {busy ? "Eliminando…" : "Eliminar definitivamente"}
      </button>
    </div>
  );
}
