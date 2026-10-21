import { NavLink, Outlet, useNavigate } from "react-router";
import { BookOpen, FlaskConical, History, LayoutDashboard, LogOut, Plus, UserRound, WifiOff } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useAuth } from "@/lib/auth";
import { useOnline } from "@/lib/online";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { UpdatePrompt } from "./UpdatePrompt";

const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/simulaciones/nueva", label: "Nueva", icon: Plus },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/ciencia", label: "Ciencia", icon: BookOpen },
  { to: "/perfil", label: "Perfil", icon: UserRound },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const initials = user?.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 pb-6 pt-6">
          <Logo />
        </div>
        <nav aria-label="Principal" className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-ink",
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden />
              {label === "Nueva" ? "Nueva simulación" : label === "Ciencia" ? "Ciencia y límites" : label}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-brand-50 p-4 text-xs leading-relaxed text-brand-800">
          <FlaskConical className="mb-2 size-4 text-teal-700" aria-hidden />
          Herramienta <strong>educativa</strong>. Los resultados son simulaciones matemáticas, no prescripciones.
        </div>
      </aside>

      {/* Barra superior */}
      <header className="safe-top sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden text-sm text-slate-500 lg:block">
            Hola, <span className="font-medium text-ink">{user?.name.split(" ")[0]}</span>
          </div>
          <div className="flex items-center gap-2">
            {!online && (
              <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                <WifiOff className="size-3.5" aria-hidden /> Sin conexión
              </span>
            )}
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/simulaciones/nueva")}>
              <Plus /> Nueva simulación
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white cursor-pointer" aria-label="Menú de usuario">
                  {initials}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg data-[state=open]:animate-in">
                  <div className="px-2.5 py-2">
                    <div className="truncate text-sm font-medium">{user?.name}</div>
                    <div className="truncate text-xs text-slate-500">{user?.email}</div>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                  <DropdownMenu.Item onSelect={() => navigate("/perfil")} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-slate-100">
                    <UserRound className="size-4" /> Perfil y configuración
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => void logout().then(() => navigate("/login"))}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-700 outline-none data-[highlighted]:bg-red-50"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
        <Outlet />
      </main>

      {/* Navegación inferior (móvil) */}
      <nav aria-label="Principal" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium", isActive ? "text-brand-600" : "text-slate-500")}
              >
                {to === "/simulaciones/nueva" ? (
                  <span className="-mt-0.5 flex size-7 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Icon className="size-4" aria-hidden />
                  </span>
                ) : (
                  <Icon className="size-[22px]" aria-hidden />
                )}
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <UpdatePrompt />
    </div>
  );
}
