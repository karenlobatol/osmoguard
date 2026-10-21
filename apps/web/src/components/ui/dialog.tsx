import type { ReactNode } from "react";
import { AlertDialog as AD } from "radix-ui";
import { Button } from "./button";

interface ConfirmProps {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm, destructive, loading, children }: ConfirmProps) {
  return (
    <AD.Root>
      <AD.Trigger asChild>{trigger}</AD.Trigger>
      <AD.Portal>
        <AD.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <AD.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl data-[state=open]:animate-in">
          <AD.Title className="text-lg font-semibold">{title}</AD.Title>
          <AD.Description className="mt-2 text-sm text-slate-600">{description}</AD.Description>
          {children}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AD.Cancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AD.Cancel>
            <AD.Action asChild>
              <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </AD.Action>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  );
}
