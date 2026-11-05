import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "./AnimatedNumber";
import { duration, ease, load } from "@/lib/tokens";
import { useIsFirstRender } from "@/hooks/motion";

interface Props {
  value: number | null;
  color: string;
  size: number;
  stroke?: number;
  caption: string;
}

/** Grand anneau de récupération. Remplissage 0 → valeur au chargement (900 ms), puis transitions. */
export function RecoveryRing({ value, color, size, stroke = 12, caption }: Props) {
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  const r = (size - stroke) / 2;
  const c = size / 2;
  const progress = value == null ? 0 : value / 100;

  const transition = reduce
    ? { duration: 0 }
    : first
      ? { pathLength: { duration: duration.ring, delay: load.ring, ease: ease.soft }, stroke: { duration: 0 } }
      : { duration: duration.value, ease: ease.out };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* fines graduations 34 / 67 : seuils de zone */}
        {[0.34, 0.67].map((t) => {
          const a = t * 2 * Math.PI;
          const r1 = r - stroke / 2 - 5;
          const r2 = r - stroke / 2 - 1;
          return (
            <line
              key={t}
              x1={c + r1 * Math.cos(a)}
              y1={c + r1 * Math.sin(a)}
              x2={c + r2 * Math.cos(a)}
              y2={c + r2 * Math.sin(a)}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1}
            />
          );
        })}
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0, stroke: color }}
          animate={{ pathLength: Math.max(progress, 0.0001), stroke: color, opacity: value == null ? 0 : 1 }}
          transition={transition}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-start" style={{ fontSize: size * 0.27 }}>
          <AnimatedNumber
            value={value}
            className="display-num"
            initialDelay={load.ring}
            initialDuration={duration.ring}
          />
          {value != null ? (
            <span className="display-num mt-[0.12em] text-[0.36em] text-muted" aria-hidden>
              %
            </span>
          ) : null}
        </div>
        <span className="label mt-2">{caption}</span>
      </div>
    </div>
  );
}
