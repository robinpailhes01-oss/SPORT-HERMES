import * as React from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Card — surface verre. CardHeader : titre Inter + méta mono à droite.
export const Card = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <section ref={ref} className={cn("glass p-4 md:p-6", className)} {...props} />
));
Card.displayName = "Card";

export function CardHeader({
  title,
  meta,
  children,
  className,
  id,
}: {
  title: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header className={cn("mb-4 flex min-h-8 items-center justify-between gap-3 md:mb-5", className)}>
      <div className="flex min-w-0 items-baseline gap-3">
        <h2 id={id} className="text-[13px] font-medium tracking-[-0.005em] text-text">
          {title}
        </h2>
        {meta ? <span className="mono truncate text-[11px] text-muted">{meta}</span> : null}
      </div>
      {children}
    </header>
  );
}
