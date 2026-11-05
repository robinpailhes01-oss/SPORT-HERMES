import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { color, ease } from "@/lib/tokens";

const LONG_PRESS_MS = 450;

/**
 * Ligne cochable : un tap n'importe où sur la ligne = coché/décoché.
 * Appui long (450 ms) = `onLongPress` (note facultative). Clavier : Espace/Entrée coche, « N » ouvre la note.
 */
export function TickRow({
  checked,
  onToggle,
  onLongPress,
  disabled,
  title,
  meta,
  children,
  aside,
  size = "md",
}: {
  checked: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  size?: "md" | "sm";
}) {
  const reduce = useReducedMotion();
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onPointerDown={(e) => {
        if (!onLongPress || e.button !== 0) return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          fired.current = true;
          navigator.vibrate?.(8);
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) clear();
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => onLongPress && e.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        onToggle();
      }}
      onKeyDown={(e) => {
        if ((e.key === "n" || e.key === "N") && onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
      className={cn(
        "group flex w-full select-none items-start gap-3.5 rounded-[12px] px-2 text-left transition-colors duration-[120ms] [-webkit-touch-callout:none] hover:bg-white/[0.03] disabled:cursor-default disabled:hover:bg-transparent",
        size === "md" ? "min-h-[56px] py-3" : "min-h-11 py-2.5",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative mt-[1px] flex shrink-0 items-center justify-center rounded-full border transition-colors duration-[160ms]",
          size === "md" ? "size-[26px]" : "size-[22px]",
          checked ? "border-transparent" : "border-white/25 group-hover:border-white/45",
          disabled && "border-dashed border-white/15",
        )}
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color.text }}
          initial={false}
          animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 28 }}
        />
        <svg viewBox="0 0 16 16" className={cn("relative", size === "md" ? "size-[14px]" : "size-[12px]")}>
          <motion.path
            d="M3.5 8.4 6.6 11.4 12.6 4.8"
            fill="none"
            stroke={color.bg}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: ease.out, delay: checked ? 0.05 : 0 }}
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn("text-[15px] leading-6 transition-colors md:text-[14px]", checked ? "text-text/60" : "text-text")}>{title}</span>
          {meta ? <span className="mono shrink-0 text-[11px] text-muted">{meta}</span> : null}
        </span>
        {children}
      </span>
      {aside}
    </button>
  );
}
