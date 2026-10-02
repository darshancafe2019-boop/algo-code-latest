import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:ring-offset-2 gap-1.5 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--theme-accent)] text-black font-bold",
        secondary:
          "border-[var(--theme-border)] bg-[var(--theme-elevated)] text-[var(--theme-text-primary)]",
        outline:
          "border-[var(--theme-border)] text-[var(--theme-text-secondary)]",
        live:
          "border-[var(--theme-loss)]/40 bg-[var(--theme-loss)]/15 text-[var(--theme-loss)]",
        paper:
          "border-[var(--theme-info)]/40 bg-[var(--theme-info)]/15 text-[var(--theme-info)]",
        running:
          "border-[var(--theme-profit)]/40 bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]",
        paused:
          "border-amber-500/40 bg-amber-500/15 text-amber-400",
        stopped:
          "border-slate-500/40 bg-slate-500/15 text-slate-400",
        error:
          "border-rose-500/50 bg-rose-500/20 text-rose-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

function Badge({ className, variant, dot = false, pulse = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full bg-current",
            pulse && "animate-ping"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
