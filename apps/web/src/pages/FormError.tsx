import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}
