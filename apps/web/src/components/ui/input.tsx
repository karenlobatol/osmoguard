import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-base sm:text-[15px] text-ink placeholder:text-slate-400 shadow-xs transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-100";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Unidad visible a la derecha del campo. */
  unit?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, unit, ...props }, ref) =>
  unit ? (
    <div className="relative">
      <input ref={ref} className={cn(base, "h-12 pr-16 tabular", className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">{unit}</span>
    </div>
  ) : (
    <input ref={ref} className={cn(base, "h-12", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(base, "h-12 appearance-none pr-9", className)} {...props}>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
  </div>
));
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-24 py-2", className)} {...props} />
));
Textarea.displayName = "Textarea";
