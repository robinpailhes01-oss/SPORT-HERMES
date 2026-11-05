import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { GlassTooltip, TooltipBody, type TooltipAnchor } from "./GlassTooltip";
import { weekBreakdown, weekOf, deltaVsBaseline, type Model } from "@/lib/metrics";
import { formatDayMonth, formatDayShort, formatDuration, formatNumber, weekdayInitial } from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useIsFirstRender } from "@/hooks/motion";
import { workoutSummary } from "./workoutSummary";
import type { DayKey, WorkoutCategory } from "@/types/whoop";

const CHART_H = 188;
const PAD = { top: 22, bottom: 30, left: 0, right: 28 };
const ZONES = [10, 14, 18]; // modéré / élevé / maximal

/** Opacités d'une seule teinte (strain) pour distinguer les types — pas de nouvelle couleur. */
const CATEGORY_OPACITY: Record<WorkoutCategory, number> = {
  CrossFit: 1,
  Hyrox: 0.74,
  Course: 0.52,
  Force: 0.34,
  Mobilité: 0.2,
  Autre: 0.12,
};

export function WeekLoad() {
  const { model, selected } = useDashboard();
  const week = useMemo(() => weekOf(selected), [selected]);
  const breakdown = useMemo(() => weekBreakdown(model, week), [model, week]);
  const strains = week.map((d) => model.byDay.get(d)?.strain ?? null);
  const measured = strains.filter((s): s is number => s != null);
  const avg = measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : null;
  const totalMin = breakdown.reduce((a, c) => a + c.minutes, 0);
  const totalCount = breakdown.reduce((a, c) => a + c.count, 0);

  return (
    <Card aria-labelledby="week-title" className="h-full flex flex-col">
      <CardHeader
        id="week-title"
        title="Charge de la semaine"
        meta={`${formatDayMonth(week[0])} → ${formatDayMonth(week[6])}`}
      />

      <div style={{ height: CHART_H }} className="-mx-1">
        <ParentSize debounceTime={50}>
          {({ width }) => (width > 0 ? <StrainBars width={width} week={week} model={model} /> : null)}
        </ParentSize>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
        <Kpi label="Séances" value={String(totalCount)} />
        <Kpi label="Volume" value={totalMin ? formatDuration(totalMin) : "—"} />
        <Kpi label="Strain moy." value={avg != null ? formatNumber(avg, 1) : "—"} accent />
      </dl>

      <div className="mt-5">
        <p className="label mb-2.5">Répartition · temps</p>
        <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-white/[0.04]">
          {breakdown.map((c) => (
            <motion.div
              key={c.category}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: color.strain, opacity: CATEGORY_OPACITY[c.category] }}
              initial={false}
              animate={{ flexGrow: totalMin ? c.minutes / totalMin : 0, flexBasis: 0 }}
              transition={{ duration: duration.value, ease: ease.out }}
              title={`${c.category} : ${formatDuration(c.minutes)}`}
            />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {breakdown.map((c) => (
            <li key={c.category} className="flex h-6 items-center gap-2 text-[12px]">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: color.strain, opacity: c.count ? CATEGORY_OPACITY[c.category] : 0.08 }}
              />
              <span className={c.count ? "text-text" : "text-muted"}>{c.category}</span>
              <span className="mono ml-auto text-[11px] text-muted">
                {c.count ? `${c.count} · ${formatDuration(c.minutes)}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="display-num mt-1.5 text-[20px]" style={accent ? { color: color.strain } : undefined}>
        {value}
      </dd>
    </div>
  );
}

function StrainBars({ width, week, model }: { width: number; week: DayKey[]; model: Model }) {
  const { selected, hover, select, setHover } = useDashboard();
  const today = model.today;
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  const [tip, setTip] = useState<{ day: DayKey; anchor: TooltipAnchor } | null>(null);

  const innerW = width - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const x = scaleBand({ domain: week, range: [PAD.left, PAD.left + innerW], padding: 0.36 });
  const y = scaleLinear({ domain: [0, 21], range: [PAD.top + innerH, PAD.top] });
  const bw = x.bandwidth();

  return (
    <>
      <svg width={width} height={CHART_H} role="img" aria-label="Strain par jour sur la semaine">
        {ZONES.map((z) => (
          <g key={z}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(z)} y2={y(z)} stroke={color.hairline} strokeDasharray="2 4" />
            <text x={width - 2} y={y(z) + 3} textAnchor="end" className="mono" fontSize={10} fill={color.faint}>
              {z}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={y(0)} y2={y(0)} stroke={color.line} />
        {/* surlignage du jour sélectionné : glisse d'une colonne à l'autre */}
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
          const isHover = d === hover;
          const future = d > today;
          const outOfData = d < model.first || future;
          const h = v != null ? y(0) - y(v) : 0;
          const op = isSel ? 1 : isHover ? 0.78 : 0.42;
          return (
            <g key={d}>
              {/* zone cliquable pleine hauteur, ≥ 44px de large sur mobile */}
              <rect
                x={bx - (x.step() * x.paddingInner()) / 2}
                y={0}
                width={x.step()}
                height={CHART_H}
                fill="transparent"
                style={{ cursor: outOfData ? "default" : "pointer" }}
                onClick={() => !outOfData && select(d)}
                onPointerEnter={(e) => {
                  if (outOfData) return;
                  setHover(d);
                  if (e.pointerType === "mouse") setTip({ day: d, anchor: { x: e.clientX, y: e.clientY } });
                }}
                onPointerMove={(e) => e.pointerType === "mouse" && !outOfData && setTip({ day: d, anchor: { x: e.clientX, y: e.clientY } })}
                onPointerLeave={() => {
                  setHover(null);
                  setTip(null);
                }}
              />
              {outOfData ? (
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
                      : {
                          duration: first ? 0.6 : duration.value,
                          delay: first ? load.charts + i * 0.04 : 0,
                          ease: ease.out,
                          opacity: { duration: duration.micro },
                        }
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
              <text
                x={bx + bw / 2}
                y={CHART_H - 8}
                textAnchor="middle"
                className="mono"
                fontSize={11}
                fill={isSel ? color.text : color.muted}
                pointerEvents="none"
              >
                {weekdayInitial(d)}
              </text>
            </g>
          );
        })}
      </svg>
      <GlassTooltip anchor={tip?.anchor ?? null}>
        {tip ? <StrainTip day={tip.day} model={model} /> : null}
      </GlassTooltip>
    </>
  );
}

function StrainTip({ day, model }: { day: DayKey; model: Model }) {
  const v = model.byDay.get(day)?.strain ?? null;
  const delta = deltaVsBaseline(model, day, "strain");
  return (
    <TooltipBody
      date={formatDayShort(day)}
      rows={[
        { label: "Strain", value: v != null ? formatNumber(v, 1) : "—", color: color.strain },
        {
          label: "vs moy. 30 j",
          value: delta ? `${delta.value >= 0 ? "+" : "−"}${formatNumber(Math.abs(delta.value), 1)}` : "—",
        },
      ]}
      footer={workoutSummary(model, day)}
    />
  );
}
