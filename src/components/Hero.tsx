import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { useDashboard } from "@/state/dashboard";
import { RecoveryRing } from "./RecoveryRing";
import { StatTile } from "./StatTile";
import { Button } from "./ui/button";
import { baseline30, deltaVsBaseline, recoveryZone, zoneColor, zoneLabel, type Model } from "@/lib/metrics";
import { formatDayLong, formatDuration, formatNumber, formatSleep, relativeDay } from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function Hero() {
  const { model, selected, isToday, step, goToday } = useDashboard();
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const day = model.byDay.get(selected);
  const zone = recoveryZone(day?.recovery);
  const workouts = model.workoutsByDay.get(selected) ?? [];
  const canPrev = selected > model.first;
  const canNext = selected < model.today;

  function onDragEnd(_: unknown, info: PanInfo) {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -60 && canNext) step(1);
    else if (swipe > 60 && canPrev) step(-1);
  }

  const tile = (i: number) => load.stats + i * load.statsStagger;

  return (
    <section aria-label="État du jour" className="relative">
      <p className="sr-only" aria-live="polite">
        {formatDayLong(selected)} : {zoneLabel[zone]}
        {day?.recovery != null ? `, ${day.recovery} %` : ""}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-6">
        {/* Anneau + navigation jour — zone de swipe sur mobile */}
        <motion.div
          className="col-span-2 flex touch-pan-y flex-col items-center pb-2 pt-2 md:col-span-6 md:col-start-4 md:row-span-2 md:row-start-1 md:justify-center md:pt-0"
          drag={isDesktop || reduce ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          dragSnapToOrigin
          onDragEnd={onDragEnd}
        >
          <RecoveryRing
            value={day?.recovery ?? null}
            color={zoneColor[zone]}
            size={isDesktop ? 288 : 224}
            stroke={isDesktop ? 14 : 12}
            caption="Récupération"
          />

          <div className="mt-5 flex w-full max-w-[360px] items-center justify-between gap-2 md:mt-6">
            <Button size="icon" variant="ghost" onClick={() => step(-1)} disabled={!canPrev} aria-label="Jour précédent">
              <span aria-hidden className="mono text-base">←</span>
            </Button>
            <div className="min-w-0 text-center">
              <p className="text-[15px] font-medium leading-5 text-text">{relativeDay(selected, model.today)}</p>
              <p className="mono mt-0.5 text-[11px] text-muted">{formatDayLong(selected)}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => step(1)} disabled={!canNext} aria-label="Jour suivant">
              <span aria-hidden className="mono text-base">→</span>
            </Button>
          </div>

          <div className="mt-3 flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <span className="inline-flex items-center gap-2 text-[13px]">
              <motion.span
                aria-hidden
                className="size-2 rounded-full"
                animate={{ backgroundColor: zoneColor[zone] }}
                transition={{ duration: reduce ? 0 : duration.value, ease: ease.out }}
              />
              <span className="text-text">{zoneLabel[zone]}</span>
            </span>
            <span className="mono text-[11px] text-muted">
              {workouts.length
                ? workouts
                    .map((w) => `${w.category} · ${formatDuration(w.durationMin)}`)
                    .join("  +  ")
                : isToday
                  ? "aucune séance pour l'instant"
                  : "jour sans séance"}
            </span>
          </div>

          <div className="mt-1 h-11 empty:h-0 md:empty:h-11">
            {!isToday ? (
              <Button size="sm" variant="ghost" onClick={goToday}>
                Revenir à aujourd'hui
                <kbd className="mono hidden rounded border border-line px-1.5 text-[10px] text-muted md:inline">Échap</kbd>
              </Button>
            ) : null}
          </div>
        </motion.div>

        <StatTile
          className="md:col-span-3 md:col-start-1 md:row-start-1 md:self-end"
          label="HRV"
          unit="ms"
          value={day?.hrv ?? null}
          delta={deltaVsBaseline(model, selected, "hrv")}
          formatDelta={(v) => `${formatNumber(v)} ms`}
          index={0}
          initialDelay={tile(0)}
        />
        <StatTile
          className="md:col-span-3 md:col-start-10 md:row-start-1 md:self-end"
          label="Sommeil"
          value={day?.asleepMin ?? null}
          format={(v) => formatSleep(v).replace(" h ", "h")}
          delta={deltaVsBaseline(model, selected, "sleepHours")}
          formatDelta={(v) => formatSleep(v * 60).replace(" h ", "h")}
          gauge={{
            value: day?.sleepPerformance != null ? day.sleepPerformance / 100 : null,
            color: color.sleep,
            label: "Performance de sommeil",
          }}
          note={day?.sleepPerformance != null ? `perf. ${day.sleepPerformance} %` : undefined}
          index={1}
          initialDelay={tile(1)}
        />
        <StatTile
          className="md:col-span-3 md:col-start-1 md:row-start-2 md:self-start"
          label="FC repos"
          unit="bpm"
          value={day?.rhr ?? null}
          delta={deltaVsBaseline(model, selected, "rhr")}
          formatDelta={(v) => `${formatNumber(v)} bpm`}
          index={2}
          initialDelay={tile(2)}
        />
        <StatTile
          className="md:col-span-3 md:col-start-10 md:row-start-2 md:self-start"
          label="Strain"
          value={day?.strain ?? null}
          decimals={1}
          delta={isToday ? null : deltaVsBaseline(model, selected, "strain")}
          formatDelta={(v) => formatNumber(v, 1)}
          emptyDelta={isToday ? strainBaselineText(model, selected) : undefined}
          gauge={{ value: day?.strain != null ? day.strain / 21 : null, color: color.strain, label: "Strain sur 21" }}
          note={isToday ? "en cours" : "/ 21"}
          index={3}
          initialDelay={tile(3)}
        />
      </div>
    </section>
  );
}

/** Cycle en cours : comparer un strain partiel à une moyenne n'a pas de sens — on affiche la référence. */
function strainBaselineText(model: Model, day: string) {
  const b = baseline30(model, day, "strain");
  return b != null ? `moy. 30 j ${formatNumber(b, 1)}` : "cycle en cours";
}
