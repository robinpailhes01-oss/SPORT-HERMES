import { motion, useReducedMotion } from "motion/react";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { EmptyNote } from "./WeekPlan";
import { levers, LEVER_MIN_DAYS } from "@/lib/metrics";
import { formatNumber } from "@/lib/format";
import { color, ease, load } from "@/lib/tokens";
import { useIsFirstRender } from "@/hooks/motion";

/** Leviers : écart de récup entre les jours « oui » et « non », trié par impact. */
export function Levers() {
  const { model, plan } = useDashboard();
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  const target = plan?.targets.sleepMinutes ?? 450;
  const { ranked, thin } = levers(model, target);
  const top = ranked[0];
  const maxAbs = Math.max(10, ...ranked.map((l) => Math.abs(l.diff)));
  const months = Math.max(1, Math.round(model.days.length / 30.4));

  return (
    <Card aria-labelledby="levers-title" className="h-full">
      <CardHeader id="levers-title" title="Leviers" meta={`journal WHOOP · ${months} mois`} />
      {!top ? (
        <EmptyNote title="Pas encore assez de réponses au journal.">
          Il faut au moins {LEVER_MIN_DAYS} jours « oui » et {LEVER_MIN_DAYS} jours « non » pour comparer.
        </EmptyNote>
      ) : (
        <>
          <p className="text-balance text-[17px] leading-6 text-text md:text-[19px]">
            Levier n°1 : <span className="font-semibold">{top.label.toLowerCase()}</span>,{" "}
            <span style={{ color: top.diff < 0 ? color.recLow : color.recHigh }}>
              {top.diff > 0 ? "+" : "−"}
              {formatNumber(Math.abs(top.diff))} points
            </span>{" "}
            de récup.
          </p>
          <div className="mono mt-4 grid grid-cols-[1fr_auto] gap-2 text-[10px] uppercase tracking-[0.08em] text-muted md:grid-cols-[minmax(0,180px)_1fr_64px]">
            <span>Quand c'est « oui »</span>
            <span className="hidden md:block" />
            <span className="text-right">Récup</span>
          </div>
          <ul className="mt-1">
            {ranked.map((l, i) => {
              const pct = (Math.abs(l.diff) / maxAbs) * 50;
              const c = l.diff < 0 ? color.recLow : color.recHigh;
              return (
                <li key={l.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 border-b border-hairline py-2.5 last:border-b-0 md:grid-cols-[minmax(0,180px)_1fr_64px]">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-text">{l.label}</p>
                    <p className="mono text-[10px] text-faint">
                      oui {l.yesN} j · non {l.noN} j
                    </p>
                  </div>
                  {/* barre divergente centrée sur 0 */}
                  <div className="relative col-span-2 row-start-2 h-2 md:col-span-1 md:row-start-auto" aria-hidden>
                    <div className="absolute inset-y-[-3px] left-1/2 w-px bg-white/15" />
                    <motion.div
                      className="absolute inset-y-0 rounded-full"
                      style={{ backgroundColor: c, [l.diff < 0 ? "right" : "left"]: "50%" }}
                      initial={reduce || !first ? false : { width: "0%" }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: reduce ? 0 : 0.6, delay: first && !reduce ? load.charts + i * 0.05 : 0, ease: ease.out }}
                    />
                  </div>
                  <p className="mono text-right text-[13px]" style={{ color: Math.abs(l.diff) < 2 ? color.muted : c }}>
                    {l.diff > 0 ? "+" : "−"}
                    {formatNumber(Math.abs(l.diff))}
                    <span className="text-[10px] text-muted"> pts</span>
                  </p>
                </li>
              );
            })}
          </ul>
          {thin.length ? (
            <p className="mono mt-3 text-[10px] leading-4 text-faint">
              pas assez de jours pour conclure : {thin.map((l) => l.label.toLowerCase()).join(", ")}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
