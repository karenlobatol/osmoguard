import type { ReactNode } from "react";
import { Drawer } from "vaul";

/** Hoja inferior nativa (vaul): arrastrable en móvil, centrada en escritorio. */
export function Sheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" />
        <Drawer.Content className="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-[28px] bg-white outline-none sm:bottom-6 sm:rounded-[28px]">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />
          <div className="overflow-y-auto px-6 pb-8 pt-5">
            <Drawer.Title className="text-[22px] font-semibold tracking-[-0.02em]">{title}</Drawer.Title>
            {description && <Drawer.Description className="mt-1 text-[15px] text-slate-500">{description}</Drawer.Description>}
            <div className="mt-6">{children}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
