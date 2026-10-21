import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Sheet } from "./ui/sheet";

/** Hoja para elegir qué analizar (botón "+"). */
export function ModuleSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="¿Qué quiere analizar?">
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-slate-50">
        {MODULES.map((m) => (
          <li key={m.id}>
            <Link to={m.path} onClick={() => onOpenChange(false)} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-100 active:bg-slate-200/60">
              <span className={cn("flex size-11 items-center justify-center rounded-2xl", m.tint)}>
                <m.icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">{m.title}</span>
                <span className="block text-[13px] text-slate-500">{m.subtitle}</span>
              </span>
              <ChevronRight className="size-5 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
