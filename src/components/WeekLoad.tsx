import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { GlassTooltip, TooltipBody, type TooltipAnchor } from "./GlassTooltip";
import { loadRatio, weekOf, type LoadZone, type Model } from "@/lib/metrics";
import { formatDayMonth, formatDayShort, formatDuration, formatNumber, weekdayInitial } from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useIsFirstRender } from "@/hooks/motion";
import type { DayKey } from "@/types/whoop";

const CHART_H = 168;
const PAD = { top: 22, bottom: 28, right: 26 };
const ZONES = [10, 14, 18];

const ZONE_TEXT: Record<LoadZone, { title: string; c: string }> = {
  maintien: { title: "Tu te maintiens", c: color.muted },
  progression: { title: "Tu progresses", c: color.recHigh },
  vigilance: { title: "Vigilance : la charge monte vite", c: color.recMid },
  surcharge: { title: "Surcharge : risque de blessure", c: color.recLow },
};

/** Charge : strain de la semaine + zone de progression (7 j vs 28 j). */
export function WeekLoad() {
  const { model, selected } = useDashboard();
  const week = weekOf(selected);
  const ratio = loadRatio(model, selected);

  return (
    <Card aria-labelledby="load-title" className="flex h-full flex-col">
      <CardHeader id="load-title" title="Charge" meta={`${formatDayMonth(week[0])} → ${formatDayMonth(week[6])}`} />
      <div style={{ height: CHART_H }} className="-mx-1">
        <ParentSize debounceTime={50}>
          {({ width }) => (width > 0 ? <StrainBars width={width} week={week} model={model} /> : null)}
        </ParentSize>
      </div>
      <div className="mt-5 border-t border-hairline pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="label">Zone de progression</p>
          <p className="mono text-[11px] text-muted">
            {ratio ? `7 j ${formatNumber(ratio.acute, 1)} · 28 j ${formatNumber(ratio.chronic, 1)}` : "—"}
          </p>
        </div>
        <p className="mt-2 text-[15px]" style={{ color: ratio ? ZONE_TEXT[ratio.zone].c : color.muted }}>
          {ratio ? ZONE_TEXT[ratio.zone].title : "Pas assez d'historique"}
        </p>
        <RatioGauge ratio={ratio?.ratio ?? null} />
        <p className="mt-2 text-[12px] leading-5 text-muted">
          Ta charge des 7 derniers jours comparée à ta moyenne sur 4 semaines. Entre 0,8 et 1,3 : tu progresses sans te cramer.
        </p>
      </div>
    </Card>
  );
}

function RatioGauge({ ratio }: { ratio: number | null }) {
  const reduce = useReducedMotion();
  const MIN = 0.5, MAX = 1.8;
  const pct = (v: number) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;
  const segs = [
    { from: MIN, to: 0.8, c: "rgba(255,255,255,0.10)" },
    { from: 0.8, to: 1.3, c: color.recHigh },
    { from: 1.3, to: 1.5, c: color.recMid },
    { from: 1.5, to: MAX, c: color.recLow },
  ];
  return (
    <div className="relative mt-3 pb-5">
      <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full">
        {segs.map((s) => (
          <div key={s.from} className="h-full" style={{ width: `${pct(s.to) - pct(s.from)}%`, backgroundColor: s.c, opacity: s.c.startsWith("#") ? 0.45 : 1 }} />
        ))}
      </div>
      {ratio != null ? (
        <motion.div
          className="absolute -top-[5px] h-4 w-[3px] -translate-x-1/2 rounded-full bg-text"
          initial={false}
          animate={{ left: `${pct(ratio)}%` }}
          transition={{ duration: reduce ? 0 : duration.value, ease: ease.out }}
          aria-label={`ratio ${formatNumber(ratio, 2)}`}
        />
      ) : null}
      {[0.8, 1.3, 1.5].map((v) => (
        <span key={v} className="mono absolute top-3 -translate-x-1/2 text-[9px] text-faint" style={{ left: `${pct(v)}%` }}>
          {formatNumber(v, 1)}
        </span>
      ))}
    </div>
  );
}

function StrainBars({ width, week, model }: { width: number; week: DayKey[]; model: Model }) {
  const { selected, hover, select, setHover } = useDashboard();
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  const [tip, setTip] = useState<{ day: DayKey; anchor: TooltipAnchor } | null>(null);
  const innerW = width - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const x = scaleBand({ domain: week, range: [0, innerW], padding: 0.36 });
  const y = scaleLinear({ domain: [0, 21], range: [PAD.top + innerH, PAD.top] });
  const bw = x.bandwidth();

  return (
    <>
      <svg width={width} height={CHART_H} role="img" aria-label="Strain par jour sur la semaine">
        {ZONES.map((z) => (
          <g key={z}>
            <line x1={0} x2={innerW} y1={y(z)} y2={y(z)} stroke={color.hairline} strokeDasharray="2 4" />
            <text x={width - 2} y={y(z) + 3} textAnchor="end" className="mono" fontSize={10} fill={color.faint}>{z}</text>
          </g>
        ))}
        <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke={color.line} />
        <rect
          x={0}
          y={PAD.top - 18}
          width={bw + 14}
          height={innerH + 18 + PAD.bottom - 4}
          rx={8}
          fill="rgba(255,255,255,0.045)"
          pointerEvents="none"
          style={{
            transform: `translateX(${(x(selected) ?? 0) - 7}px)`,
            transition: reduce ? "none" : `transform ${duration.base}s cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        />
        {week.map((d, i) => {
          const v = model.byDay.get(d)?.strain ?? null;
          const bx = x(d) ?? 0;
          const isSel = d === selected;
          const out = d < model.first || d > model.today;
          const h = v != null ? y(0) - y(v) : 0;
          const op = isSel ? 1 : hover === d ? 0.78 : 0.42;
          return (
            <g key={d}>
              <rect
                x={bx - (x.step() * x.paddingInner()) / 2}
                y={0}
                width={x.step()}
                height={CHART_H}
                fill="transparent"
                style={{ cursor: out ? "default" : "pointer" }}
                onClick={() => !out && select(d)}
                onPointerEnter={(e) => {
                  if (out) return;
                  setHover(d);
                  if (e.pointerType === "mouse") setTip({ day: d, anchor: { x: e.clientX, y: e.clientY } });
                }}
                onPointerMove={(e) => e.pointerType === "mouse" && !out && setTip({ day: d, anchor: { x: e.clientX, y: e.clientY } })}
                onPointerLeave={() => {
                  setHover(null);
                  setTip(null);
                }}
              />
              {out ? (
                <line x1={bx} x2={bx + bw} y1={y(0) - 1} y2={y(0) - 1} stroke={color.line} strokeDasharray="2 3" pointerEvents="none" />
              ) : (
                <motion.rect
                  x={bx}
                  width={bw}
                  rx={Math.min(4, bw / 2)}
                  fill={color.strain}
                  pointerEvents="none"
                  initial={reduce ? false : first ? { attrY: y(0), height: 0, opacity: op } : false}
                  animate={{ attrY: y(0) - h, height: h, opacity: op }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: first ? 0.6 : duration.value, delay: first ? load.charts + i * 0.04 : 0, ease: ease.out, opacity: { duration: duration.micro } }
                  }
                />
              )}
              {v != null ? (
                <motion.text
                  x={bx + bw / 2}
                  textAnchor="middle"
                  className="mono"
                  fontSize={11}
                  pointerEvents="none"
                  initial={false}
                  animate={{ attrY: y(v) - 7, fill: isSel ? color.text : color.muted }}
                  transition={{ duration: reduce ? 0 : duration.value, ease: ease.out }}
                >
                  {formatNumber(v, 1)}
                </motion.text>
              ) : null}
              <text x={bx + bw / 2} y={CHART_H - 8} textAnchor="middle" className="mono" fontSize={11} fill={isSel ? color.text : color.muted} pointerEvents="none">
                {weekdayInitial(d)}
              </text>
            </g>
          );
        })}
      </svg>
      <GlassTooltip anchor={tip?.anchor ?? null}>{tip ? <StrainTip day={tip.day} model={model} /> : null}</GlassTooltip>
    </>
  );
}

function StrainTip({ day, model }: { day: DayKey; model: Model }) {
  const v = model.byDay.get(day)?.strain ?? null;
  const ws = model.workoutsByDay.get(day) ?? [];
  return (
    <TooltipBody
      date={formatDayShort(day)}
      rows={[{ label: "Strain du jour", value: v != null ? formatNumber(v, 1) : "—", color: color.strain }]}
      footer={
        ws.length
          ? ws.map((w) => `${w.activity} · ${formatDuration(w.durationMin)}${w.strain != null ? ` · ${formatNumber(w.strain, 1)}` : ""}`).join("\n")
          : day === model.today
            ? "Pas encore d'entraînement enregistré"
            : "Pas d'entraînement enregistré"
      }
    />
  );
}
