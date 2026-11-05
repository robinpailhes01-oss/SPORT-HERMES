import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Skeleton — bloc de verre pulsé (désactivé en reduced-motion).
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-pulse rounded-[var(--radius-control)] bg-white/[0.05]", className)} {...props} />;
}
