import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { GlassTooltip, TooltipBody, type TooltipAnchor } from "./GlassTooltip";
import { addDays, formatClock, formatDayShort, formatDuration, formatSleep } from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useIsFirstRender } from "@/hooks/motion";
import type { DayKey } from "@/types/whoop";

const NIGHTS = 30;

/** Sommeil : 30 nuits face à la cible, régularité, dette, et ce que ça coûte en récup. */
export function SleepCard() {
  const { model, plan, selected } = useDashboard();
  const target = plan?.targets.sleepMinutes ?? 450;
  const end = selected;
  const nights = Array.from({ length: NIGHTS }, (_, i) => addDays(end, i - NIGHTS + 1));
  const measured = nights.map((d) => model.byDay.get(d)).filter((d) => d?.asleepMin != null);
  const ok = measured.filter((d) => d!.asleepMin! >= target).length;
  const reg = mean(measured.map((d) => d!.sleepConsistency));
  const day = model.byDay.get(selected);

  // impact mesuré sur tes données : récup après une nuit sous 7 h vs le reste
  const short = model.days.filter((d) => d.asleepMin != null && d.asleepMin < 420 && d.recovery != null);
  const long = model.days.filter((d) => d.asleepMin != null && d.asleepMin >= 420 && d.recovery != null);
  const shortRec = mean(short.map((d) => d.recovery));
  const longRec = mean(long.map((d) => d.recovery));

  return (
    <Card aria-labelledby="sleep-title" className="flex h-full flex-col">
      <CardHeader id="sleep-title" title="Sommeil" meta={`30 nuits · cible ${formatSleep(target).replace(" h ", "h")}`} />
      <dl className="grid grid-cols-3 gap-3">
        <K label="À la cible" value={`${ok}/${measured.length}`} />
        <K label="Régularité" value={reg != null ? `${Math.round(reg)} %` : "—"} />
        <K label="Dette" value={formatDuration(day?.sleepDebtMin ?? null)} />
      </dl>
      <div className="mt-5 h-[150px]">
        <ParentSize debounceTime={50}>{({ width }) => (width > 0 ? <Bars width={width} nights={nights} target={target} /> : null)}</ParentSize>
      </div>
      {shortRec != null && longRec != null && short.length >= 8 ? (
        <p className="mt-4 border-t border-hairline pt-3.5 text-[13px] leading-5 text-muted">
          Sur tes données, après une nuit <span className="text-text">sous 7 h</span>, ta récup moyenne tombe à{" "}
          <span style={{ color: color.recLow }}>{Math.round(shortRec)} %</span> contre{" "}
          <span className="text-text">{Math.round(longRec)} %</span> sinon.
          <span className="mono ml-1.5 text-[10px] text-faint">{short.length} nuits courtes</span>
        </p>
      ) : null}
    </Card>
  );
}

const mean = (v: (number | null | undefined)[]) => {
  const x = v.filter((n): n is number => n != null);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
};

function K({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label truncate">{label}</dt>
      <dd className="display-num mt-1.5 text-[20px]">{value}</dd>
    </div>
  );
}

function Bars({ width, nights, target }: { width: number; nights: DayKey[]; target: number }) {
  const { model, selected, select, hover, setHover } = useDashboard();
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  const [tip, setTip] = useState<{ day: DayKey; anchor: TooltipAnchor } | null>(null);
  const H = 150, PB = 18, PR = 30;
  const x = scaleBand({ domain: nights, range: [0, width - PR], padding: 0.28 });
  const y = scaleLinear({ domain: [240, 600], range: [H - PB, 6], clamp: true });
  const bw = x.bandwidth();

  return (
    <>
      <svg width={width} height={H} role="img" aria-label="Durée de sommeil des 30 dernières nuits face à la cible">
        <line x1={0} x2={width - PR} y1={y(target)} y2={y(target)} stroke={color.text} strokeOpacity={0.5} strokeDasharray="3 3" />
        <text x={width} y={y(target) + 3} textAnchor="end" fontSize={10} className="mono" fill={color.text}>
          {formatSleep(target).replace(" h ", "h")}
        </text>
        <text x={width} y={y(360) + 3} textAnchor="end" fontSize={10} className="mono" fill={color.faint}>6h</text>
        {nights.map((d, i) => {
          const v = model.byDay.get(d)?.asleepMin ?? null;
          const bx = x(d) ?? 0;
          const isSel = d === selected;
          const okN = v != null && v >= target;
          return (
            <g key={d}>
              <rect
                x={bx - (x.step() - bw) / 2}
                y={0}
                width={x.step()}
                height={H}
                fill="transparent"
                style={{ cursor: v != null ? "pointer" : "default" }}
                onClick={() => v != null && select(d)}
                onPointerEnter={(e) => {
                  setHover(d);
                  if (e.pointerType === "mouse" && v != null) setTip({ day: d, anchor: { x: e.clientX, y: e.clientY } });
                }}
                onPointerMove={(e) => e.pointerType === "mouse" && v != null && setTip({ day: d, anchor: { x: e.clientX, y: e.clientY } })}
                onPointerLeave={() => {
                  setHover(null);
                  setTip(null);
                }}
              />
              {v != null ? (
                <motion.rect
                  x={bx}
                  width={bw}
                  rx={Math.min(2.5, bw / 2)}
                  fill={color.sleep}
                  pointerEvents="none"
                  initial={reduce || !first ? false : { height: 0, attrY: H - PB }}
                  animate={{ height: H - PB - y(v), attrY: y(v), opacity: isSel ? 1 : hover === d ? 0.85 : okN ? 0.62 : 0.24 }}
                  transition={reduce ? { duration: 0 } : { duration: first ? 0.5 : duration.base, delay: first ? load.charts + i * 0.012 : 0, ease: ease.out }}
                />
              ) : (
                <line x1={bx} x2={bx + bw} y1={H - PB - 1} y2={H - PB - 1} stroke={color.line} />
              )}
              {isSel ? <circle cx={bx + bw / 2} cy={H - 6} r={2} fill={color.text} /> : null}
            </g>
          );
        })}
      </svg>
      <GlassTooltip anchor={tip?.anchor ?? null}>
        {tip ? <SleepTip day={tip.day} target={target} /> : null}
      </GlassTooltip>
    </>
  );
}

function SleepTip({ day, target }: { day: DayKey; target: number }) {
  const { model } = useDashboard();
  const d = model.byDay.get(day);
  const v = d?.asleepMin ?? null;
  return (
    <TooltipBody
      date={`nuit → ${formatDayShort(day)}`}
      rows={[
        { label: "Sommeil", value: formatSleep(v), color: v != null && v >= target ? color.recHigh : color.recLow },
        { label: "Endormi", value: formatClock(d?.sleepOnsetMin ?? null) },
        { label: "Régularité", value: d?.sleepConsistency != null ? `${d.sleepConsistency} %` : "—" },
        { label: "Récup", value: d?.recovery != null ? `${d.recovery} %` : "—" },
      ]}
    />
  );
}
