import { motion, useReducedMotion } from "motion/react";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { currentStreak, sessionsInWeek, weekOf, weekStats } from "@/lib/metrics";
import { weekdayInitial } from "@/lib/format";
import { color, duration, ease } from "@/lib/tokens";

type Seg = "ok" | "miss" | "empty";

/** Objectifs de la semaine : des jauges qu'on remplit + la série de semaines réussies. */
export function WeekGoals() {
  const { model, plan, tracking, selected } = useDashboard();
  const week = weekOf(selected);
  const sessionsTarget = plan?.targets.sessionsPerWeek ?? 5;
  const sleepTarget = plan?.targets.sleepMinutes ?? 450;
  const sessions = sessionsInWeek(model, week, plan, tracking);

  const nights: Seg[] = week.map((d) => {
    const v = model.byDay.get(d)?.asleepMin;
    if (d > model.today || v == null) return "empty";
    return v >= sleepTarget ? "ok" : "miss";
  });
  const evenings: Seg[] = week.map((d) => {
    if (d >= model.today) return "empty";
    const e = tracking.evening[d];
    if (!e) return "empty";
    return e.protein && e.recoveryDrink && e.bedtime ? "ok" : "miss";
  });
  const stats = weekStats(model, plan, tracking, sessionsTarget);
  const streak = currentStreak(stats);
  const h = Math.floor(sleepTarget / 60);
  const m = String(sleepTarget % 60).padStart(2, "0");

  return (
    <Card aria-labelledby="goals-title">
      <CardHeader id="goals-title" title="Objectifs de la semaine" />
      <div className="space-y-5">
        <Goal
          label="Séances"
          value={`${sessions}/${sessionsTarget}`}
          reached={sessions >= sessionsTarget}
          segs={Array.from({ length: sessionsTarget }, (_, i) => (i < sessions ? "ok" : "empty"))}
        />
        <Goal
          label={`Nuits ≥ ${h} h ${m}`}
          value={`${nights.filter((s) => s === "ok").length}/7`}
          reached={nights.filter((s) => s === "ok").length >= 5}
          segs={nights}
          days={week}
          tint={color.sleep}
        />
        <Goal
          label="Soirées 3/3"
          value={`${evenings.filter((s) => s === "ok").length}/7`}
          reached={evenings.filter((s) => s === "ok").length >= 5}
          segs={evenings}
          days={week}
        />
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-hairline pt-4">
        <div>
          <p className="label">Série</p>
          <p className="mt-1 text-[13px] text-muted">semaines à {sessionsTarget} séances ou plus</p>
        </div>
        <p>
          <span className="display-num text-[30px]" style={{ color: streak >= 2 ? color.text : color.muted }}>
            {streak}
          </span>
          <span className="mono ml-1.5 text-[11px] text-muted">sem.</span>
        </p>
      </div>
    </Card>
  );
}

function Goal({
  label,
  value,
  reached,
  segs,
  days,
  tint = color.text,
}: {
  label: string;
  value: string;
  reached: boolean;
  segs: Seg[];
  days?: string[];
  tint?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-text">{label}</span>
        <span className="mono text-[12px]" style={{ color: reached ? color.recHigh : color.muted }}>
          {value}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {segs.map((s, i) => (
          <div key={i} className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: s === "miss" ? color.recLow : tint }}
                initial={false}
                animate={{ opacity: s === "empty" ? 0 : s === "miss" ? 0.55 : 1 }}
                transition={reduce ? { duration: 0 } : { duration: duration.base, ease: ease.out, delay: i * 0.02 }}
              />
            </div>
            {days ? <p className="mono mt-1 text-center text-[9px] text-faint">{weekdayInitial(days[i])}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
