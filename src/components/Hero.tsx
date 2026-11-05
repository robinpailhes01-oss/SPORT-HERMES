import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useDashboard } from "@/state/dashboard";
import { RecoveryRing } from "./RecoveryRing";
import { AnimatedNumber } from "./AnimatedNumber";
import { Button } from "./ui/button";
import { recoveryZone, signalReading, VERDICTS, zoneColor, type SignalKey } from "@/lib/metrics";
import { allTests, sessionMark, weekFor } from "@/lib/plan";
import { formatDayLong, formatDuration, formatNumber, formatSleep, relativeDay } from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export function Hero() {
  const { model, plan, tracking, selected, isToday, step, goToday } = useDashboard();
  const reduce = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const day = model.byDay.get(selected);
  const zone = recoveryZone(day?.recovery);
  const verdict = VERDICTS[zone];
  const canPrev = selected > model.first;
  const canNext = selected < model.today;
  const sleepTarget = plan?.targets.sleepMinutes ?? 450;

  // séance conseillée : première séance non cochée de la semaine, dans l'ordre de préférence du verdict
  const week = plan ? weekFor(plan, selected) : null;
  const open = week?.sessions.filter((s) => !sessionMark(s, tracking, model.today).done) ?? [];
  const suggestion =
    verdict.prefer.map((t) => open.find((s) => s.type === t)).find(Boolean) ?? (zone === "low" ? null : open[0]);
  const testsToday = plan ? allTests(plan).filter((t) => t.date === selected) : [];

  function onDragEnd(_: unknown, info: PanInfo) {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -60 && canNext) step(1);
    else if (swipe > 60 && canPrev) step(-1);
  }

  const fade = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay, ease: ease.out } };

  return (
    <section aria-label="Verdict du jour" className="relative">
      <p className="sr-only" aria-live="polite">
        {formatDayLong(selected)} : {verdict.title}
        {day?.recovery != null ? ` Récupération ${day.recovery} %.` : ""}
      </p>

      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12 md:gap-6">
        {/* Anneau + navigation — zone de swipe sur mobile */}
        <motion.div
          className="flex touch-pan-y flex-col items-center md:col-span-4"
          drag={isDesktop || reduce ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          dragSnapToOrigin
          onDragEnd={onDragEnd}
        >
          <RecoveryRing
            value={day?.recovery ?? null}
            color={zoneColor[zone]}
            size={isDesktop ? 256 : 208}
            stroke={isDesktop ? 13 : 11}
            caption="Récupération"
          />
          <div className="mt-3 flex w-full max-w-[320px] items-center justify-between gap-2">
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
          {!isToday ? (
            <Button size="sm" variant="ghost" onClick={goToday} className="mt-1">
              Revenir à aujourd'hui
              <kbd className="mono hidden rounded border border-line px-1.5 text-[10px] text-muted md:inline">Échap</kbd>
            </Button>
          ) : null}
        </motion.div>

        {/* Verdict en langage simple */}
        <motion.div className="text-center md:col-span-5 md:text-left" {...fade(load.stats)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={verdict.title}
              className="display-num text-balance text-[27px] leading-[1.08] tracking-[-0.02em] md:text-[38px]"
              style={{ fontStretch: "112%" }}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : duration.base, ease: ease.out }}
            >
              {verdict.title}
            </motion.h1>
          </AnimatePresence>
          <p className="mt-3 text-[15px] leading-6 text-muted">{verdict.advice}</p>

          <dl className="mx-auto mt-5 max-w-[420px] space-y-2.5 text-left md:mx-0">
            {verdict.strain ? (
              <Line label={isToday ? "Charge conseillée" : "Charge conseillée ce jour-là"}>
                <span style={{ color: color.strain }}>
                  strain {verdict.strain[0] === 0 ? `< ${verdict.strain[1]}` : `${verdict.strain[0]} à ${verdict.strain[1]}`}
                </span>
                {day?.strain != null && !isToday ? <span className="text-muted"> · fait {formatNumber(day.strain, 1)}</span> : null}
              </Line>
            ) : null}
            {testsToday.length ? (
              <Line label="Jour de test">
                <span className="text-text">{testsToday.map((t) => t.exercise).join(", ")}</span>
              </Line>
            ) : suggestion ? (
              <Line label="Séance conseillée">
                <span className="text-text">{suggestion.title}</span>
              </Line>
            ) : week && open.length === 0 ? (
              <Line label="Semaine">
                <span style={{ color: color.recHigh }}>toutes les séances sont faites</span>
              </Line>
            ) : null}
          </dl>
        </motion.div>

        {/* Sommeil de la nuit vs cible */}
        <motion.div className="grid grid-cols-2 gap-3 md:col-span-3 md:grid-cols-1" {...fade(load.stats + 0.08)}>
          <div className="glass p-4 md:p-5">
            <p className="label">Sommeil</p>
            <p className="mt-2.5 flex items-baseline gap-1.5">
              <AnimatedNumber
                value={day?.asleepMin ?? null}
                format={(v) => formatSleep(v).replace(" h ", "h")}
                className="display-num text-[28px] md:text-[32px]"
                initialDelay={load.stats}
              />
            </p>
            <SleepGauge value={day?.asleepMin ?? null} target={sleepTarget} />
          </div>
          <div className="glass p-4 md:p-5">
            <p className="label">Régularité</p>
            <p className="mt-2.5 flex items-baseline gap-1">
              <AnimatedNumber
                value={day?.sleepConsistency ?? null}
                className="display-num text-[28px] md:text-[32px]"
                initialDelay={load.stats}
              />
              {day?.sleepConsistency != null ? <span className="mono text-xs text-muted">%</span> : null}
            </p>
            <p className="mono mt-3 text-[11px] text-muted">
              dette de sommeil {formatDuration(day?.sleepDebtMin ?? null)}
            </p>
          </div>
        </motion.div>
      </div>

      <Why />
    </section>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2.5 text-[14px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="mono text-right text-[12px]">{children}</dd>
    </div>
  );
}

function SleepGauge({ value, target }: { value: number | null; target: number }) {
  const reduce = useReducedMotion();
  const max = target * 1.25;
  const ok = value != null && value >= target;
  const diff = value != null ? value - target : null;
  return (
    <div className="mt-3">
      <div className="relative h-[3px] rounded-full bg-white/[0.06]">
        <motion.div
          className="absolute inset-y-0 left-0 origin-left rounded-full"
          style={{ width: "100%", backgroundColor: color.sleep }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: value != null ? Math.min(1, value / max) : 0, opacity: ok ? 1 : 0.45 }}
          transition={{ duration: reduce ? 0 : duration.value, ease: ease.out }}
        />
        <span aria-hidden className="absolute -top-1 h-[11px] w-px bg-text/70" style={{ left: `${(target / max) * 100}%` }} />
      </div>
      <p className="mono mt-2 text-[11px]" style={{ color: diff == null ? color.muted : ok ? color.recHigh : color.recLow }}>
        {diff == null ? "—" : ok ? `cible ${formatSleep(target).replace(" h ", "h")} atteinte` : `${Math.round(-diff)} min sous la cible`}
      </p>
    </div>
  );
}

const SIGNALS: { key: SignalKey; label: string; explain: string; unit: (v: number) => string }[] = [
  { key: "hrv", label: "Variabilité cardiaque", explain: "plus haut = corps reposé", unit: (v) => `${Math.round(v)} ms` },
  { key: "rhr", label: "Pouls au repos", explain: "plus bas = mieux récupéré", unit: (v) => `${Math.round(v)} bpm` },
  { key: "respiratoryRate", label: "Respiration nocturne", explain: "en hausse = fatigue ou maladie", unit: (v) => `${formatNumber(v, 1)} /min` },
  { key: "asleepMin", label: "Durée de sommeil", explain: "le premier levier de ta récup", unit: (v) => formatSleep(v) },
];

/** « Pourquoi ? » — les signaux techniques, traduits, repliés par défaut. */
function Why() {
  const { model, selected } = useDashboard();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const words = { good: "mieux que ta normale", bad: "moins bien que ta normale", flat: "dans ta normale" };
  const tone = { good: color.recHigh, bad: color.recLow, flat: color.muted };

  return (
    <div className="mx-auto mt-5 max-w-[900px] md:mt-6">
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Masquer le détail" : "Pourquoi ce score ?"}
          <span aria-hidden className={cn("mono transition-transform duration-200", open && "rotate-180")}>↓</span>
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : duration.base, ease: ease.out }}
            className="overflow-hidden"
          >
            <div className="glass mt-3 p-4 md:p-5">
              <p className="text-[13px] text-muted">
                Ton score combine ces signaux, comparés à tes 30 derniers jours.
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-x-8 md:grid-cols-2">
                {SIGNALS.map((s) => {
                  const r = signalReading(model, selected, s.key);
                  return (
                    <li key={s.key} className="flex items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0">
                      <div className="min-w-0">
                        <p className="text-[14px] text-text">{s.label}</p>
                        <p className="text-[12px] text-muted">{s.explain}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px]" style={{ color: r ? tone[r.tone] : color.muted }}>
                          {r ? words[r.tone] : "non mesuré"}
                        </p>
                        <p className="mono text-[11px] text-muted">
                          {r ? `${s.unit(r.value)} · normale ${s.unit(r.baseline)}` : "—"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
