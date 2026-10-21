import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, Props>(({ label, description, className, ...props }, ref) => (
  <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-brand-200 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/60", className)}>
    <input ref={ref} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-brand-600" {...props} />
    <span className="text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      {description && <span className="block text-xs text-slate-500">{description}</span>}
    </span>
  </label>
));
Checkbox.displayName = "Checkbox";
