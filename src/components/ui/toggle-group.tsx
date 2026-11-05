import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

// shadcn/ui ToggleGroup — restylé : piste en verre, item actif plus clair.
export const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(
      "relative inline-flex items-center rounded-[var(--radius-control)] border border-line bg-glass p-[3px] backdrop-blur-xl",
      className,
    )}
    {...props}
  />
));
ToggleGroup.displayName = "ToggleGroup";

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "relative z-0 inline-flex h-11 min-w-11 items-center justify-center rounded-[7px] px-3 font-mono text-xs tabular-nums text-muted outline-none transition-colors duration-[120ms] hover:text-text focus-visible:outline-2 focus-visible:outline-text data-[state=on]:text-text md:h-[30px] md:min-w-10",
      className,
    )}
    {...props}
  >
    {children}
  </ToggleGroupPrimitive.Item>
));
ToggleGroupItem.displayName = "ToggleGroupItem";
