import { useId, type ReactElement, type ReactNode, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactElement<Record<string, unknown>>;
}

/** Etiqueta + control + ayuda + error, con asociaciones ARIA correctas. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined,
      })
    : children;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-slate-800">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-slate-500">Opcional</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
