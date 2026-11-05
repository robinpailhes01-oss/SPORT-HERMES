import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Delta } from "@/lib/metrics";
import { color, duration, ease } from "@/lib/tokens";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number | null;
  unit?: string;
  decimals?: number;
  format?: (v: number) => string;
  /** formateur de l'écart (même unité que la valeur) */
  formatDelta: (abs: number) => string;
  delta: Delta | null;
  /** jauge facultative 0..1 dans la couleur sémantique de la métrique */
  gauge?: { value: number | null; color: string; label: string };
  note?: ReactNode;
  /** texte affiché à la place de l'écart quand il n'y en a pas */
  emptyDelta?: string;
  index: number;
  initialDelay: number;
  className?: string;
}

const toneColor = { good: color.recHigh, bad: color.recLow, flat: color.muted };

export function StatTile(p: Props) {
  const reduce = useReducedMotion();
  const d = p.delta;
  // écart qui s'arrondit à zéro : « ≈ moy. 30 j » plutôt que « ↑ 0 »
  const nil = !!d && p.formatDelta(Math.abs(d.value)) === p.formatDelta(0);
  const arrow = !d ? "" : nil ? "≈" : d.value > 0 ? "↑" : "↓";
  return (
    <motion.div
      className={cn("glass flex min-h-[132px] flex-col justify-between p-4 md:min-h-[148px] md:p-5", p.className)}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.45, delay: p.initialDelay, ease: ease.out }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label">{p.label}</span>
        {p.note ? <span className="mono text-[10px] text-muted">{p.note}</span> : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <AnimatedNumber
          value={p.value}
          decimals={p.decimals}
          format={p.format}
          initialDelay={p.initialDelay}
          className="display-num text-[30px] md:text-[36px]"
        />
        {p.unit && p.value != null ? <span className="mono text-xs text-muted">{p.unit}</span> : null}
      </div>

      {p.gauge ? (
        <div className="mt-3" aria-label={p.gauge.label}>
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ backgroundColor: p.gauge.color }}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: p.gauge.value ?? 0 }}
              transition={reduce ? { duration: 0 } : { duration: duration.value, ease: ease.out, delay: 0 }}
            />
          </div>
        </div>
      ) : null}

      <motion.p
        className="mono mt-3 truncate text-[11px] leading-4"
        animate={{ color: d ? toneColor[d.tone] : color.muted }}
        transition={{ duration: reduce ? 0 : duration.value }}
      >
        {d ? (
          <>
            <span aria-hidden>{arrow} </span>
            {nil ? <span className="text-muted">moy. 30 j</span> : (
              <>
                {p.formatDelta(Math.abs(d.value))}
                <span className="text-muted"> vs moy. 30 j</span>
              </>
            )}
          </>
        ) : (
          <span className="text-muted">{p.emptyDelta ?? "pas de référence 30 j"}</span>
        )}
      </motion.p>
    </motion.div>
  );
}
