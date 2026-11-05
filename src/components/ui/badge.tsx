import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Badge — version mono, discrète.
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-[var(--radius-chip)] border border-line bg-white/[0.03] px-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted",
        className,
      )}
      {...props}
    />
  );
}
