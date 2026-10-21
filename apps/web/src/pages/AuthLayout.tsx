import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { ThemeColor } from "@/components/ThemeColor";
import { cn } from "@/lib/utils";

/**
 * Pantallas de acceso con el mismo lenguaje visual que el interior de la app:
 * fondo claro, tipografía editorial, tarjeta blanca de resultado y botón píldora oscuro.
 * `fixed`: pantalla única sin desplazamiento en móvil (inicio de sesión).
 */
export function AuthLayout({ title, subtitle, children, fixed }: { title: string; subtitle?: ReactNode; children: ReactNode; fixed?: boolean }) {
  return (
    <div className={cn("bg-canvas", fixed ? "flex h-dvh flex-col overflow-hidden lg:h-auto lg:min-h-dvh lg:overflow-visible" : "min-h-dvh")}>
      <ThemeColor color="#F2F5F9" />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-10 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:py-12">
        {/* Presentación */}
        <section className={cn("flex flex-col", fixed && "min-h-0 flex-1 lg:flex-none")}>
          <div className="og-rise flex items-center gap-2.5">
            <LogoMark className="size-9 rounded-[11px]" />
            <span className="text-[17px] font-semibold tracking-tight text-ink">Osmoguard</span>
          </div>

          <div className={cn("flex flex-col", fixed ? "flex-1 justify-center py-3 lg:py-0" : "pt-8 lg:pt-0")}>
            <h2 className="og-rise text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink [@media(max-height:760px)]:text-[32px] sm:text-[48px] lg:mt-16 lg:text-[60px] lg:[@media(max-height:760px)]:text-[60px]" style={{ animationDelay: "60ms" }}>
              El sodio,
              <br />
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-teal-600 bg-clip-text text-transparent">a la vista.</span>
            </h2>
            <p className="og-rise mt-3 hidden max-w-md text-[16px] leading-relaxed text-slate-500 sm:block" style={{ animationDelay: "100ms" }}>
              Simule escenarios de líquidos y vea si la corrección respeta el límite seguro.
            </p>
            <div
              className={cn("og-rise mt-6 lg:mt-12", fixed && "[@media(max-height:760px)]:mt-4 [@media(max-height:640px)]:hidden lg:[@media(max-height:640px)]:block")}
              style={{ animationDelay: "160ms" }}
            >
              <PreviewCard />
            </div>
          </div>
        </section>

        {/* Formulario */}
        <section className="og-rise shrink-0 lg:rounded-[32px] lg:bg-white lg:p-10 lg:shadow-card lg:ring-1 lg:ring-slate-900/[0.04]" style={{ animationDelay: "120ms" }}>
          <div className="mx-auto w-full max-w-[400px]">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-slate-500">{subtitle}</p>}
            <div className={fixed ? "mt-5" : "mt-6"}>{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** La misma tarjeta de resultado que se ve dentro de la app. */
function PreviewCard() {
  const pos = (v: number) => `${((v - 110) / 40) * 100}%`;
  return (
    <div className="og-float max-w-[440px] rounded-[24px] bg-white p-4 sm:p-5 shadow-[0_20px_50px_-20px_rgb(15_23_42/0.25)] ring-1 ring-slate-900/[0.05]" style={{ ["--r" as string]: "0deg" }} aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-ink">
          <span className="size-2 shrink-0 rounded-[3px] bg-[#D9611E]" /> NaCl 3 %
          <span className="truncate font-normal text-slate-500">· 25 mL/h</span>
        </div>
        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-ok-50 px-2 py-0.5 text-[11px] font-semibold text-ok-700">
          <Check className="size-3" strokeWidth={3} /> Dentro del límite
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="tabular flex items-baseline gap-2 text-[26px] sm:text-[30px] font-bold leading-none tracking-tight text-ink">
          <span className="text-slate-400">118</span>
          <span className="text-lg text-slate-300">→</span>
          <span>124,5</span>
        </div>
        <span className="tabular text-[13px] font-semibold text-ok-700">+6,5 en 24 h</span>
      </div>
      <div className="relative mt-4">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          <span className="bg-low-100" style={{ width: pos(135) }} />
          <span className="bg-ok-100" style={{ width: "25%" }} />
          <span className="flex-1 bg-high-100" />
        </div>
        <span className="absolute inset-y-[2px] rounded-full bg-ok-500/35" style={{ left: pos(118), width: `${(10 / 40) * 100}%` }} />
        <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-slate-500 bg-white" style={{ left: pos(118) }} />
        <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white bg-brand-600 shadow" style={{ left: pos(124.5) }} />
        <span className="absolute -top-1.5 h-[22px] w-[2px] -translate-x-1/2 rounded-full bg-red-500" style={{ left: pos(128) }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-500 [@media(max-height:760px)]:hidden lg:[@media(max-height:760px)]:flex">
        <span>Bajo</span>
        <span className="text-ok-700">Normal 135–145</span>
        <span>Alto</span>
      </div>
    </div>
  );
}
