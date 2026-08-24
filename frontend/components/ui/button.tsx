import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--theme-accent)] text-black font-bold shadow-sm hover:brightness-110",
        destructive:
          "bg-[var(--theme-loss)] text-white shadow-sm hover:brightness-110",
        outline:
          "border border-[var(--theme-border)] bg-transparent hover:bg-[var(--theme-elevated)] hover:text-[var(--theme-text-primary)]",
        secondary:
          "bg-[var(--theme-elevated)] text-[var(--theme-text-primary)] border border-[var(--theme-border)] hover:bg-[var(--theme-surface)]",
        ghost:
          "hover:bg-[var(--theme-elevated)] hover:text-[var(--theme-text-primary)]",
        link:
          "text-[var(--theme-accent)] underline-offset-4 hover:underline",
        profit:
          "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border border-[var(--theme-profit)]/30 hover:bg-[var(--theme-profit)]/25",
        loss:
          "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border border-[var(--theme-loss)]/30 hover:bg-[var(--theme-loss)]/25",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 rounded-lg px-2.5 text-[11px]",
        lg: "h-11 rounded-xl px-6 text-sm",
        icon: "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
