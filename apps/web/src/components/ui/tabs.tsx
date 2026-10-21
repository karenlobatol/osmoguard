import type { ComponentProps } from "react";
import { Tabs as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsList = ({ className, ...p }: ComponentProps<typeof T.List>) => (
  <T.List className={cn("flex w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1", className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: ComponentProps<typeof T.Trigger>) => (
  <T.Trigger
    className={cn(
      "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-ink data-[state=active]:bg-white data-[state=active]:text-brand-700 data-[state=active]:shadow-sm cursor-pointer",
      className,
    )}
    {...p}
  />
);
export const TabsContent = ({ className, ...p }: ComponentProps<typeof T.Content>) => <T.Content className={cn("mt-4 focus-visible:outline-none", className)} {...p} />;
