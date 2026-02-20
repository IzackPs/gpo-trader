import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "have" | "want" | "neutral" | "success" | "warning";
}

const variantStyles = {
  have: "bg-emerald-500/90 text-slate-900 font-semibold",
  want: "bg-amber-500/90 text-slate-900 font-semibold",
  neutral: "bg-slate-600 text-slate-100",
  success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  warning: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
};

function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
