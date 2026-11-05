import { useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { ParentSize } from "@visx/responsive";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { RangeToggle } from "./RangeToggle";
import { AnimatedNumber } from "./AnimatedNumber";
import { GlassTooltip, TooltipBody, type TooltipAnchor } from "./GlassTooltip";
import {
  baseline30,
  deltaVsBaseline,
  metricValue,
  recoveryZone,
  rolling7,
  zoneColor,
  type MetricKey,
  type Model,
  type Range,
} from "@/lib/metrics";
import {
  dayOrdinal,
  formatDayMonth,
  formatDayShort,
  formatMonth,
  formatNumber,
  formatSleep,
  ordinalToDay,
  weekdayIndex,
  weekdayInitial,
} from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useIsFirstRender, useTween } from "@/hooks/motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { workoutSummary } from "./workoutSummary";
import type { DayKey, DayMetrics } from "@/types/whoop";
import { clamp } from "@/lib/utils";

interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  /** couleur de la moyenne 7 j */
  line: string;
  /** couleur d'un point brut */
  point: (d: DayMetrics) => string;
  fmt: (v: number) => string;
  fmtDelta: (abs: number) => string;
}

const METRICS: MetricDef[] = [
  {
    key: "hrv",
    label: "HRV",
    unit: "ms",
    line: color.text,
    // points bruts teintés par la zone de récup du jour : la couleur porte une info
    point: (d) => zoneColor[recoveryZone(d.recovery)],
    fmt: (v) => formatNumber(v),
    fmtDelta: (v) => `${formatNumber(v)} ms`,
  },
  {
    key: "rhr",
    label: "FC repos",
    unit: "bpm",
    line: color.text,
    point: (d) => zoneColor[recoveryZone(d.recovery)],
    fmt: (v) => formatNumber(v),
    fmtDelta: (v) => `${formatNumber(v)} bpm`,
  },
  {
    key: "sleepHours",
    label: "Sommeil",
    unit: "",
    line: color.sleep,
    point: () => color.sleep,
    fmt: (v) => formatSleep(v * 60).replace(" h ", "h"),
    fmtDelta: (v) => formatSleep(v * 60).replace(" h ", "h"),
  },
];

export function Trends() {
  const { range, windowEnd, model } = useDashboard();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const end = dayOrdinal(windowEnd);
  // domaine X partagé et animé : toutes les courbes glissent ensemble
  const [x0, x1] = useTween([end - range + 1 - 0.5, end + 0.5]);

  return (
    <Card aria-labelledby="trends-title" className="h-full flex flex-col">
      <CardHeader
        id="trends-title"
        title="Tendances"
        meta={
          <span className="hidden sm:inline">
            <span className="text-text">—</span> moy. 7 j <span className="ml-2">·</span> valeurs brutes
            <span className="ml-2">·</span> <span className="tracking-[-0.1em]">- -</span> moy. 30 j
          </span>
        }
      >
        <div className="md:hidden">
          <RangeToggle />
        </div>
      </CardHeader>

      <div className="flex flex-1 flex-col justify-between gap-4 md:gap-3">
        {METRICS.map((m, i) => (
          <MetricRow
            key={m.key}
            metric={m}
            domain={[x0, x1]}
            targetEnd={end}
            range={range}
            model={model}
            showAxis={i === METRICS.length - 1}
            height={isDesktop ? 116 : 92}
            index={i}
          />
        ))}
      </div>
    </Card>
  );
}

function MetricRow(props: {
  metric: MetricDef;
  domain: [number, number];
  targetEnd: number;
  range: Range;
  model: Model;
  showAxis: boolean;
  height: number;
  index: number;
}) {
  const { selected } = useDashboard();
  const { metric, model } = props;
  const value = metricValue(model.byDay.get(selected), metric.key);
  const avg7 = rolling7(model, selected, metric.key);

  return (
    <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[132px_1fr] md:gap-4">
      <div className="flex items-baseline justify-between md:block md:pt-3">
        <div className="flex items-baseline gap-2 md:block">
          <p className="label">{metric.label}</p>
          <p className="md:mt-1.5">
            <AnimatedNumber
              value={value}
              format={metric.fmt}
              className="display-num text-[17px] md:text-[22px]"
              initialDelay={load.charts}
            />
            {metric.unit && value != null ? <span className="mono ml-1 text-[11px] text-muted">{metric.unit}</span> : null}
          </p>
        </div>
        <p className="mono text-[11px] text-muted md:mt-1">
          moy. 7 j <span className="text-text/80">{avg7 != null ? metric.fmt(avg7) : "—"}</span>
        </p>
      </div>
      <div style={{ height: props.height + (props.showAxis ? 22 : 0) }}>
        <ParentSize debounceTime={50}>
          {({ width }) => (width > 0 ? <TrendChart {...props} width={width} /> : null)}
        </ParentSize>
      </div>
    </div>
  );
}

const PAD_X = 10;
const PAD_RIGHT = 34;

function TrendChart({
  metric,
  domain,
  targetEnd,
  range,
  model,
  showAxis,
  height,
  index,
  width,
}: {
  metric: MetricDef;
  domain: [number, number];
  targetEnd: number;
  range: Range;
  model: Model;
  showAxis: boolean;
  height: number;
  index: number;
  width: number;
}) {
  const { selected, hover, select, setHover } = useDashboard();
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<{ day: DayKey; anchor: TooltipAnchor } | null>(null);

  const totalH = height + (showAxis ? 22 : 0);
  const plotLeft = PAD_X;
  const plotRight = width - PAD_RIGHT;

  // séries complètes (90 j) — la fenêtre visible n'est qu'un domaine X
  const series = useMemo(
    () =>
      model.days.map((d) => ({
        day: d.date,
        ord: dayOrdinal(d.date),
        raw: metricValue(d, metric.key),
        avg: rolling7(model, d.date, metric.key),
        color: metric.point(d),
      })),
    [model, metric],
  );

  // domaine Y cible : valeurs de la fenêtre cible, puis animé
  const targetStart = targetEnd - range + 1;
  const visible = series.filter((p) => p.ord >= targetStart && p.ord <= targetEnd);
  const vals = visible.flatMap((p) => [p.raw, p.avg]).filter((v): v is number => v != null);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 1;
  const padY = Math.max((hi - lo) * 0.14, metric.key === "sleepHours" ? 0.25 : 2);
  const [y0, y1] = useTween([lo - padY, hi + padY]);

  const x = scaleLinear({ domain, range: [plotLeft, plotRight] });
  const y = scaleLinear({ domain: [y0, y1], range: [height - 6, 6] });
  const pxPerDay = (plotRight - plotLeft) / Math.max(1, domain[1] - domain[0]);
  const r = clamp(pxPerDay * 0.11, 1.7, 3.6);

  // jour sélectionné : abscisse animée (pas de saut sec)
  const [selOrd] = useTween([dayOrdinal(selected)], duration.base);
  const selDay = model.byDay.get(selected);
  const selRaw = metricValue(selDay, metric.key);
  const base = baseline30(model, selected, metric.key);

  const inView = (ord: number) => ord >= domain[0] - 1 && ord <= domain[1] + 1;
  const ticks = xTicks(targetStart, targetEnd, range, width);

  function dayAt(clientX: number): DayKey | null {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const ord = Math.round(x.invert(clientX - rect.left));
    const lo = Math.max(dayOrdinal(model.first), Math.ceil(domain[0]));
    const hi = Math.min(dayOrdinal(model.today), Math.floor(domain[1]));
    return ordinalToDay(clamp(ord, lo, hi));
  }

  function anchorFor(day: DayKey): TooltipAnchor | null {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const v = metricValue(model.byDay.get(day), metric.key) ?? rolling7(model, day, metric.key);
    return { x: rect.left + x(dayOrdinal(day)), y: rect.top + (v != null ? y(v) : height / 2) };
  }

  const hoverOrd = hover ? dayOrdinal(hover) : null;
  const hoverRaw = hover ? metricValue(model.byDay.get(hover), metric.key) : null;

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={totalH}
        className="block touch-pan-y overflow-visible"
        role="img"
        aria-label={`${metric.label} : moyenne glissante 7 jours et valeurs brutes`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={plotLeft - 6} y={-4} width={plotRight - plotLeft + 12} height={height + 8} />
          </clipPath>
        </defs>

        {/* ligne de base discrète + repère moy. 30 j */}
        <line x1={plotLeft} x2={plotRight} y1={height} y2={height} stroke={color.hairline} />
        {base != null ? (
          <line
            x1={plotLeft}
            x2={plotRight}
            y1={y(base)}
            y2={y(base)}
            stroke="rgba(255,255,255,0.16)"
            strokeDasharray="3 4"
          />
        ) : null}

        {/* graduations Y : 2 valeurs, mono, à droite */}
        {y.ticks(3).slice(0, 3).map((t) => (
          <text
            key={t}
            x={width - 2}
            y={y(t) + 3}
            textAnchor="end"
            className="mono"
            fontSize={10}
            fill={color.faint}
          >
            {metric.key === "sleepHours" ? `${formatNumber(t)}h` : formatNumber(t)}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {/* curseur du jour sélectionné */}
          <line
            x1={x(selOrd)}
            x2={x(selOrd)}
            y1={0}
            y2={height}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1}
          />
          {/* curseur de survol partagé (liens entre graphiques) */}
          {hoverOrd != null && hover !== selected ? (
            <line x1={x(hoverOrd)} x2={x(hoverOrd)} y1={0} y2={height} stroke="rgba(255,255,255,0.1)" />
          ) : null}

          {/* valeurs brutes : points discrets */}
          <motion.g
            initial={reduce ? false : first ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : load.charts + 0.35 + index * 0.08 }}
          >
            {series.map((p) =>
              p.raw != null && inView(p.ord) ? (
                <circle key={p.day} cx={x(p.ord)} cy={y(p.raw)} r={r} fill={p.color} fillOpacity={0.5} />
              ) : null,
            )}
          </motion.g>

          {/* moyenne glissante 7 j : trait plein */}
          <LinePath
            data={series}
            x={(p) => x(p.ord)}
            y={(p) => y(p.avg ?? 0)}
            defined={(p) => p.avg != null}
            curve={curveMonotoneX}
          >
            {({ path }) => (
              <motion.path
                d={path(series) ?? ""}
                fill="none"
                stroke={metric.line}
                strokeOpacity={0.9}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? false : first ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: reduce ? 0 : load.charts + index * 0.08, ease: ease.out }}
              />
            )}
          </LinePath>

          {/* point du jour survolé */}
          {hoverOrd != null && hoverRaw != null && hover !== selected ? (
            <circle cx={x(hoverOrd)} cy={y(hoverRaw)} r={3.5} fill={color.text} fillOpacity={0.7} />
          ) : null}

          {/* point du jour sélectionné */}
          {selRaw != null ? (
            <circle
              cx={x(selOrd)}
              cy={y(selRaw)}
              r={4.5}
              fill={selDay ? metric.point(selDay) : color.text}
              stroke={color.bg}
              strokeWidth={2}
            />
          ) : null}
        </g>

        {showAxis ? (
          <g>
            {ticks.map((t) => {
              const tx = x(t.ord);
              if (tx < plotLeft - 4 || tx > plotRight + 4) return null;
              return (
                <text
                  key={t.ord}
                  x={tx}
                  y={height + 17}
                  textAnchor="middle"
                  className="mono"
                  fontSize={10}
                  fill={ordinalToDay(t.ord) === selected ? color.text : color.muted}
                >
                  {t.label}
                </text>
              );
            })}
          </g>
        ) : null}

        {/* zone d'interaction : survol = tooltip, clic/tap = sélection du jour */}
        <rect
          x={plotLeft - 6}
          y={0}
          width={plotRight - plotLeft + 12}
          height={height}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            const d = dayAt(e.clientX);
            if (!d) return;
            setHover(d);
            const a = anchorFor(d);
            if (a) setTip({ day: d, anchor: a });
          }}
          onPointerLeave={() => {
            setHover(null);
            setTip(null);
          }}
          onClick={(e) => {
            const d = dayAt(e.clientX);
            if (d) select(d);
          }}
        />
      </svg>

      <GlassTooltip anchor={tip?.anchor ?? null}>
        {tip ? <TrendTip day={tip.day} metric={metric} model={model} /> : null}
      </GlassTooltip>
    </>
  );
}

function TrendTip({ day, metric, model }: { day: DayKey; metric: MetricDef; model: Model }) {
  const d = model.byDay.get(day);
  const v = metricValue(d, metric.key);
  const avg = rolling7(model, day, metric.key);
  const delta = deltaVsBaseline(model, day, metric.key);
  const tone = delta ? { good: color.recHigh, bad: color.recLow, flat: color.text }[delta.tone] : undefined;
  const unit = metric.unit ? ` ${metric.unit}` : "";
  const rows = [
    { label: metric.label, value: v != null ? metric.fmt(v) + unit : "non mesuré" },
    { label: "moy. 7 j", value: avg != null ? metric.fmt(avg) + unit : "—" },
    {
      label: "vs moy. 30 j",
      value: !delta
        ? "—"
        : metric.fmtDelta(Math.abs(delta.value)) === metric.fmtDelta(0)
          ? "≈"
          : `${delta.value >= 0 ? "+" : "−"}${metric.fmtDelta(Math.abs(delta.value))}`,
      color: tone,
    },
  ];
  if (metric.key === "sleepHours" && d?.sleepPerformance != null)
    rows.splice(1, 0, { label: "performance", value: `${d.sleepPerformance} %` });
  return <TooltipBody date={formatDayShort(day)} rows={rows} footer={workoutSummary(model, day)} />;
}

/** Graduations X adaptées à la fenêtre : jours (7), lundis (30), débuts de mois (90). */
function xTicks(start: number, end: number, range: Range, width: number) {
  const out: { ord: number; label: string }[] = [];
  for (let o = start; o <= end; o++) {
    const d = ordinalToDay(o);
    if (range === 7) out.push({ ord: o, label: width < 420 ? weekdayInitial(d) : `${weekdayInitial(d)} ${d.slice(8)}` });
    else if (range === 30 && weekdayIndex(d) === 0) out.push({ ord: o, label: formatDayMonth(d) });
    else if (range === 90 && d.endsWith("-01")) out.push({ ord: o, label: formatMonth(d) });
  }
  if (range === 90 && width > 520) {
    // mi-mois en complément quand il y a la place
    for (let o = start; o <= end; o++) {
      const d = ordinalToDay(o);
      if (d.endsWith("-15")) out.push({ ord: o, label: "15" });
    }
  }
  return out;
}

