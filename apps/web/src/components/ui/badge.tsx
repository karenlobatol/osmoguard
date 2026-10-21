import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "bg-slate-100 text-slate-700",
      brand: "bg-brand-50 text-brand-700",
      teal: "bg-teal-50 text-teal-800",
      success: "bg-emerald-50 text-emerald-800",
      warning: "bg-amber-50 text-amber-800",
      danger: "bg-red-50 text-red-800",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const Badge = ({ className, tone, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) => <span className={cn(badge({ tone }), className)} {...p} />;
