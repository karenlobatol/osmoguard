import { cn } from "@/lib/utils";

/** Firma visual compacta: posición del sodio sobre la escala bajo · normal · alto (110–170 mmol/L). */
export function MiniScale({ value, className }: { value: number; className?: string }) {
  const min = 110;
  const max = 170;
  const pos = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100}%`;
  const zone = value < 135 ? "bg-low-500" : value > 145 ? "bg-high-500" : "bg-ok-500";
  return (
    <div className={cn("relative h-1.5", className)} aria-hidden>
      <div className="absolute inset-0 flex overflow-hidden rounded-full">
        <span className="bg-low-100" style={{ width: pos(135) }} />
        <span className="bg-ok-100" style={{ width: `${(10 / (max - min)) * 100}%` }} />
        <span className="flex-1 bg-high-100" />
      </div>
      <span className={cn("absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white", zone)} style={{ left: pos(value) }} />
    </div>
  );
}
