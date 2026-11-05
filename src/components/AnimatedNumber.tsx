import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { duration as dur, ease } from "@/lib/tokens";
import { formatNumber } from "@/lib/format";

interface Props {
  value: number | null;
  decimals?: number;
  /** formateur personnalisé (ex. heures → "7 h 12") */
  format?: (v: number) => string;
  /** délai appliqué uniquement au premier affichage (séquence de chargement) */
  initialDelay?: number;
  /** durée du premier comptage (0 → valeur) */
  initialDuration?: number;
  className?: string;
}

/** Chiffre qui compte d'une valeur à l'autre — jamais de saut sec. */
export function AnimatedNumber({
  value,
  decimals = 0,
  format,
  initialDelay = 0,
  initialDuration = dur.value,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce || value == null ? (value ?? 0) : 0);
  const first = useRef(true);
  const text = useTransform(mv, (v) => (format ? format(v) : formatNumber(v, decimals)));

  useEffect(() => {
    if (value == null) return;
    if (reduce) {
      mv.set(value);
      first.current = false;
      return;
    }
    const isFirst = first.current;
    first.current = false;
    const ctrl = animate(mv, value, {
      duration: isFirst ? initialDuration : dur.value,
      delay: isFirst ? initialDelay : 0,
      ease: isFirst ? ease.soft : ease.out,
    });
    return () => ctrl.stop();
  }, [value, reduce, mv, initialDelay, initialDuration]);

  if (value == null) return <span className={className}>—</span>;
  return <motion.span className={className}>{text}</motion.span>;
}
