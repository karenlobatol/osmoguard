import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import { BookOpen, FolderClosed, House, LogOut, Plus, UserRound, WifiOff, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOnline } from "@/lib/online";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ThemeColor } from "./ThemeColor";
import { ModuleSheet } from "./ModuleSheet";
import { MODULES } from "@/lib/modules";
import { SCROLL_ROOT_ID, scrollAppToTop } from "@/lib/scroll";
import { UpdatePrompt } from "./UpdatePrompt";

const TABS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Inicio", icon: House, end: true },
  { to: "/historial", label: "Casos", icon: FolderClosed },
  { to: "/ciencia", label: "Aprender", icon: BookOpen },
  { to: "/perfil", label: "Perfil", icon: UserRound },
];

const spring = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 } as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // En el asistente la barra inferior se sustituye por sus propios botones (modo enfocado).
  const focusMode = pathname === "/simulaciones/nueva" || pathname.startsWith("/herramientas/");
  const [modulesOpen, setModulesOpen] = useState(false);
  const initials = user?.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  // Como en una app nativa, desplaza el contenedor y no el documento: así Safari (iOS) no dibuja
  // su difuminado de borde superior sobre el contenido.
  useEffect(() => {
    document.documentElement.classList.add("app-locked");
    return () => document.documentElement.classList.remove("app-locked");
  }, []);
  useEffect(() => scrollAppToTop(false), [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <div id={SCROLL_ROOT_ID} className="h-dvh overflow-y-auto overscroll-y-contain lg:pl-[17rem]">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Saltar al contenido
        </a>

        {/* Barra lateral (escritorio) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-slate-200/70 bg-white/70 px-4 py-6 backdrop-blur-xl lg:flex">
          <Logo className="px-2" />
          <button
            type="button"
            onClick={() => setModulesOpen(true)}
            className="mt-8 flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="size-4" strokeWidth={2.5} /> Nuevo análisis
          </button>
          <LayoutGroup id="sidebar">
            <nav aria-label="Principal" className="mt-6 space-y-0.5">
              {TABS.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className="relative block">
                  {({ isActive }) => (
                    <span className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "text-ink" : "text-slate-500 hover:text-ink")}>
                      {isActive && <motion.span layoutId="side-active" transition={spring} className="absolute inset-0 rounded-xl bg-slate-100" />}
                      <Icon className="relative size-[18px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                      <span className="relative">{label === "Casos" ? "Mis casos" : label}</span>
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </LayoutGroup>
          <div className="mt-7 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Herramientas</div>
          <nav aria-label="Herramientas" className="mt-2 space-y-0.5">
            {MODULES.map((m) => (
              <NavLink
                key={m.id}
                to={m.path}
                className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-slate-100 text-ink" : "text-slate-500 hover:text-ink")}
              >
                <span className={cn("flex size-6 items-center justify-center rounded-lg", m.tint)}>
                  <m.icon className="size-3.5" />
                </span>
                {m.title}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-2xl p-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{user?.name}</span>
              <span className="block truncate text-xs text-slate-500">{user?.email}</span>
            </span>
            <button
              onClick={() => void logout().then(() => navigate("/login"))}
              className="flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink cursor-pointer"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </aside>

        {/* Banda sólida bajo la barra de estado (app instalada con notch). */}
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-canvas" />
        <ThemeColor color="#F2F5F9" />

        {!online && (
          <div role="status" className="safe-top fixed inset-x-0 top-0 z-50 flex justify-center pt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
              <WifiOff className="size-3.5" aria-hidden /> Sin conexión
            </span>
          </div>
        )}

        <main id="main" className="safe-top mx-auto max-w-3xl px-5 pb-36 pt-10 sm:px-8 lg:max-w-4xl lg:pb-16 lg:pt-12">
          <Outlet />
        </main>

        {/* Barra de pestañas flotante (móvil) */}
        {!focusMode && (
          <nav aria-label="Principal" className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 lg:hidden">
            <div className="pointer-events-auto mx-auto mb-3 flex w-fit items-center gap-2.5 px-4">
              <LayoutGroup id="tabbar">
                <ul className="flex items-center gap-0.5 rounded-full bg-white/80 p-1.5 shadow-[0_10px_40px_-10px_rgb(15_23_42/0.35),0_2px_6px_-2px_rgb(15_23_42/0.08)] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl">
                  {TABS.map(({ to, label, icon: Icon, end }) => (
                    <li key={to}>
                      <NavLink to={to} end={end} aria-label={label} className="relative flex h-11 items-center rounded-full outline-offset-2">
                        {({ isActive }) => (
                          <motion.span layout transition={spring} className={cn("relative flex h-11 items-center gap-1.5 rounded-full", isActive ? "px-4 text-white" : "w-12 justify-center text-slate-500")}>
                            {isActive && <motion.span layoutId="tab-active" transition={spring} className="absolute inset-0 rounded-full bg-slate-900" />}
                            <Icon className="relative size-[20px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                            {isActive && (
                              <motion.span
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.18, delay: 0.05 }}
                                className="relative text-[13px] font-semibold"
                              >
                                {label}
                              </motion.span>
                            )}
                          </motion.span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </LayoutGroup>
              <button
                type="button"
                onClick={() => setModulesOpen(true)}
                aria-label="Nuevo análisis"
                className="flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_10px_30px_-8px_rgb(11_79_131/0.7)] ring-4 ring-white/70 transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </button>
            </div>
          </nav>
        )}
        <ModuleSheet open={modulesOpen} onOpenChange={setModulesOpen} />
        <UpdatePrompt />
      </div>
    </MotionConfig>
  );
}
