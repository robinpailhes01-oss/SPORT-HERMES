import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { clamp } from "@/lib/utils";

export interface TooltipAnchor {
  /** coordonnées viewport (clientX/Y) du point survolé */
  x: number;
  y: number;
}

const GAP = 14;
const EDGE = 12;

/**
 * Tooltip en verre, rendu en portail et TOUJOURS contenu dans l'écran :
 * se place à droite du point, bascule à gauche si besoin, puis est borné aux bords.
 */
export function GlassTooltip({ anchor, children }: { anchor: TooltipAnchor | null; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.x + GAP;
    if (left + width > vw - EDGE) left = anchor.x - GAP - width;
    left = clamp(left, EDGE, vw - EDGE - width);
    let top = anchor.y - height - GAP;
    if (top < EDGE) top = anchor.y + GAP;
    top = clamp(top, EDGE, vh - EDGE - height);
    setPos({ left, top });
  }, [anchor, children]);

  return createPortal(
    <AnimatePresence>
      {anchor ? (
        <motion.div
          ref={ref}
          role="tooltip"
          className="glass pointer-events-none fixed z-50 min-w-[188px] max-w-[260px] rounded-[14px] px-3.5 py-3 text-[12px]"
          style={{
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            background: "rgba(16,19,24,0.72)",
          }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: pos ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.12 }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Contenu standard : date, valeur, écart moy. 30 j, séance du jour. */
export function TooltipBody({
  date,
  rows,
  footer,
}: {
  date: string;
  rows: { label: string; value: string; color?: string }[];
  footer?: string;
}) {
  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.08em] text-muted">{date}</p>
      <dl className="mt-2 space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{r.label}</dt>
            <dd className="mono tabular text-text" style={r.color ? { color: r.color } : undefined}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? <p className="mt-2 whitespace-pre-line border-t border-hairline pt-2 text-[11px] leading-4 text-muted">{footer}</p> : null}
    </div>
  );
}
