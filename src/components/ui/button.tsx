import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui Button — restylé verre. Zone tactile ≥ 44px sur mobile (size "icon" / "default").
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none transition-[background-color,color,border-color,opacity] duration-[120ms] disabled:pointer-events-none disabled:opacity-30 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text",
  {
    variants: {
      variant: {
        glass:
          "rounded-[var(--radius-control)] border border-line bg-glass text-text backdrop-blur-xl hover:bg-glass-hi hover:border-white/15",
        ghost: "rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-white/[0.04]",
      },
      size: {
        default: "h-11 px-4 text-[13px] md:h-9",
        sm: "h-11 px-3 text-xs md:h-8",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "glass", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
