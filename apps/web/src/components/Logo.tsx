import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9", className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0B4F83" />
      <path d="M32 12c-7 9-14 17.5-14 25a14 14 0 0 0 28 0c0-7.5-7-16-14-25z" fill="#EAF4FA" />
      <path d="M24 38h5l2.5-5 4 9 2.5-4h2" fill="none" stroke="#0D9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-tight">
        <span className={cn("block text-[17px] font-semibold tracking-tight", light ? "text-white" : "text-brand-800")}>Osmoguard</span>
        <span className={cn("block text-[11px] font-medium uppercase tracking-wider", light ? "text-brand-100" : "text-teal-700")}>Simulador educativo</span>
      </span>
    </span>
  );
}
