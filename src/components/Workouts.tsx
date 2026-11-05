import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { recentWorkouts } from "@/lib/metrics";
import { formatDDMM, formatDayShort, formatDuration, formatNumber, formatWeekdayShort } from "@/lib/format";
import { color, duration, ease } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export function Workouts() {
  const { model, selected, select, isToday } = useDashboard();
  const reduce = useReducedMotion();
  const list = recentWorkouts(model, selected, 8);
  const hasToday = (model.workoutsByDay.get(selected) ?? []).length > 0;
  const t = reduce ? { duration: 0 } : { duration: duration.base, ease: ease.out };

  return (
    <Card aria-labelledby="workouts-title" className="h-full">
      <CardHeader id="workouts-title" title="Séances récentes" meta={`8 dernières au ${formatDDMM(selected)}`} />

      {/* en-têtes de colonnes (desktop) */}
      <div className="mono hidden grid-cols-[92px_1fr_76px_64px_92px] gap-3 border-b border-hairline pb-2 text-[10px] uppercase tracking-[0.08em] text-muted md:grid">
        <span>Date</span>
        <span>Type</span>
        <span className="text-right">Durée</span>
        <span className="text-right">Strain</span>
        <span className="text-right">FC moy / max</span>
      </div>

      <ul className="-mx-2 md:mx-[-8px]">
        <AnimatePresence initial={false}>
          {!hasToday ? (
            <motion.li
              key={`empty-${selected}`}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={t}
              className="flex min-h-11 items-center gap-3 border-b border-hairline px-2 py-2.5 text-[13px]"
            >
              <span className="mono w-[92px] shrink-0 text-[11px] text-text">{formatDayShort(selected)}</span>
              <span className="text-muted">
                {isToday ? "Aucune séance pour l'instant" : "Jour sans séance — repos ou non enregistré"}
              </span>
            </motion.li>
          ) : null}
          {list.map((w) => {
            const active = w.date === selected;
            return (
              <motion.li
                key={w.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={t}
                className="border-b border-hairline last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => select(w.date)}
                  aria-current={active ? "date" : undefined}
                  className={cn(
                    "relative grid min-h-[52px] w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 rounded-[10px] px-2 py-2.5 text-left transition-colors duration-[120ms] hover:bg-white/[0.03] md:min-h-11 md:grid-cols-[92px_1fr_76px_64px_92px] md:py-2",
                    active && "bg-white/[0.045] hover:bg-white/[0.05]",
                  )}
                >
                  {active ? (
                    <span aria-hidden className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full" style={{ backgroundColor: color.strain }} />
                  ) : null}
                  {/* Desktop : colonnes. Mobile : 2 lignes compactes. */}
                  <span className="mono col-start-2 row-start-1 text-right text-[11px] text-muted md:col-start-auto md:text-left">
                    <span className="md:hidden">{formatWeekdayShort(w.date)} </span>
                    <span className={active ? "text-text" : undefined}>{formatDDMM(w.date)}</span>
                    <span className="hidden text-muted md:inline"> · {w.time}</span>
                  </span>
                  <span className="col-start-1 row-start-1 truncate text-[14px] text-text md:col-start-auto md:text-[13px]">
                    {w.category}
                    {w.activity !== w.category ? <span className="ml-2 text-[12px] text-muted">{w.activity}</span> : null}
                  </span>
                  <span className="mono col-span-2 row-start-2 text-[11px] text-muted md:col-span-1 md:row-start-auto md:text-right md:text-[12px] md:text-text">
                    {formatDuration(w.durationMin)}
                    <span className="md:hidden">
                      {"  ·  "}
                      <span style={{ color: color.strain }}>strain {w.strain != null ? formatNumber(w.strain, 1) : "—"}</span>
                      {"  ·  "}FC {w.avgHr ?? "—"}/{w.maxHr ?? "—"}
                    </span>
                  </span>
                  <span className="mono hidden text-right text-[12px] md:block" style={{ color: color.strain }}>
                    {w.strain != null ? formatNumber(w.strain, 1) : "—"}
                  </span>
                  <span className="mono hidden text-right text-[12px] text-text md:block">
                    {w.avgHr ?? "—"} <span className="text-muted">/ {w.maxHr ?? "—"}</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </Card>
  );
}
