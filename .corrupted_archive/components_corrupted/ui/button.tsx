import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22D3EE] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563EB] text-[#F7FAFC] hover:bg-[#3B82F6] shadow-none",
        primary:
          "bg-[#2563EB] text-[#F7FAFC] hover:bg-[#3B82F6] shadow-none",
        destructive:
          "bg-[#FF3B5C] text-white hover:bg-[#DC2626] shadow-none",
        outline:
          "border border-[#1A2A3F] bg-[#0D1727] text-[#CBD5E1] hover:bg-[#101B2D] hover:text-[#F7FAFC] hover:border-[#29415F]",
        secondary:
          "bg-[#0D1727] text-[#CBD5E1] border border-[#1A2A3F] hover:bg-[#101B2D] hover:text-[#F7FAFC] hover:border-[#29415F]",
        ghost:
          "hover:bg-[#101B2D] text-[#7C8CA3] hover:text-[#F7FAFC]",
        link:
          "text-[#22D3EE] underline-offset-4 hover:underline",
        buy:
          "bg-[#00E890] text-[#060B14] font-bold hover:bg-[#10B981]",
        sell:
          "bg-[#FF3B5C] text-white font-bold hover:bg-[#DC2626]",
        profit:
          "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30 hover:bg-[#00E890]/25",
        loss:
          "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30 hover:bg-[#FF3B5C]/25",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs",
        sm: "h-7 rounded-md px-2.5 text-[11px]",
        lg: "h-10 rounded-lg px-5 text-sm",
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
