import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warning" | "error" | "success";
}

const variantStyles = {
  info: "border-white/10 bg-slate-900/60 text-slate-200 backdrop-blur-sm",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-100 [&_p]:text-amber-200/90",
  error: "border-red-500/50 bg-red-500/10 text-red-100 [&_p]:text-red-200/90",
  success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-100 [&_p]:text-emerald-200/90",
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-xl border p-4 text-sm [&_p]:mt-1 [&_p]:leading-relaxed",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

export { Alert };
