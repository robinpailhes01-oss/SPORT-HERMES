import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { scaleLinear } from "@visx/scale";
import { LinePath, AreaClosed } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { ParentSize } from "@visx/responsive";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { dayOrdinal, formatDayMonth, formatDayShort, formatNumber, ordinalToDay } from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useIsFirstRender } from "@/hooks/motion";
import { clamp } from "@/lib/utils";

interface Pt { day: string; o: number; kg: number }

function useWeightModel() {
  const { tracking, plan, model } = useDashboard();
  return useMemo(() => {
    const pts: Pt[] = Object.entries(tracking.weights)
      .filter(([d]) => d <= model.today)
      .map(([day, kg]) => ({ day, o: dayOrdinal(day), kg }))
      .sort((a, b) => a.o - b.o);
    const start = plan ? dayOrdinal(plan.start) : pts[0]?.o ?? dayOrdinal(model.today);
    const startKg = plan?.targets.weight?.startKg ?? pts.find((p) => p.o >= start)?.kg ?? pts[0]?.kg ?? null;
    const band = plan?.targets.weight?.gainPerWeekKg ?? null;
    // moyenne glissante 7 j des pesées (au moins 2 pesées)
    const avg = pts.map((p) => {
      const win = pts.filter((q) => q.o <= p.o && q.o > p.o - 7);
      return { ...p, kg: win.length >= 2 ? win.reduce((a, q) => a + q.kg, 0) / win.length : p.kg };
    });
    // rythme : régression linéaire sur les 21 derniers jours
    const recent = pts.filter((p) => p.o > dayOrdinal(model.today) - 21);
    let rate: number | null = null;
    if (recent.length >= 4) {
      const mx = recent.reduce((a, p) => a + p.o, 0) / recent.length;
      const my = recent.reduce((a, p) => a + p.kg, 0) / recent.length;
      const num = recent.reduce((a, p) => a + (p.o - mx) * (p.kg - my), 0);
      const den = recent.reduce((a, p) => a + (p.o - mx) ** 2, 0);
      rate = den ? (num / den) * 7 : null;
    }
    return { pts, avg, start, startKg, band, rate, end: plan ? dayOrdinal(plan.end) : dayOrdinal(model.today) };
  }, [tracking.weights, plan, model.today]);
}

export function WeightCard() {
  const { tracking, selected, actions, isToday } = useDashboard();
  const wm = useWeightModel();
  const [entry, setEntry] = useState(false);
  const last = wm.avg.at(-1);
  const current = last?.kg ?? null;
  const gained = current != null && wm.startKg != null ? current - wm.startKg : null;
  const status =
    wm.rate == null || !wm.band
      ? null
      : wm.rate < wm.band[0]
        ? { text: "trop lent", c: color.recMid }
        : wm.rate > wm.band[1]
          ? { text: "trop rapide", c: color.recMid }
          : { text: "dans la cible", c: color.recHigh };
  const todays = tracking.weights[selected];

  return (
    <Card aria-labelledby="weight-title" className="flex h-full flex-col">
      <CardHeader id="weight-title" title="Poids" meta={wm.band ? `cible +${formatNumber(wm.band[0], 1)} à +${formatNumber(wm.band[1], 1)} kg / sem.` : undefined}>
        {!entry ? (
          <Button size="sm" onClick={() => setEntry(true)}>
            {todays != null ? `${formatNumber(todays, 1)} kg` : isToday ? "Me peser" : "Ajouter"}
          </Button>
        ) : null}
      </CardHeader>

      <AnimatePresence initial={false}>
        {entry ? (
          <WeightEntry
            initial={todays ?? wm.pts.at(-1)?.kg ?? wm.startKg ?? 75}
            label={isToday ? "Pesée du jour" : `Pesée du ${formatDayShort(selected)}`}
            onCancel={() => setEntry(false)}
            onSave={(kg) => {
              actions.setWeight(selected, kg);
              setEntry(false);
            }}
            onClear={todays != null ? () => { actions.setWeight(selected, null); setEntry(false); } : undefined}
          />
        ) : null}
      </AnimatePresence>

      {wm.pts.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center rounded-[12px] border border-dashed border-white/10 px-4 py-6">
          <p className="text-[13px] text-text">Pas encore de pesée.</p>
          <p className="mt-1 text-[12px] leading-5 text-muted">Une pesée le matin, à jeun, 3 à 4 fois par semaine suffit pour voir la tendance.</p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Moy. 7 j" value={current != null ? `${formatNumber(current, 1)}` : "—"} unit="kg" />
            <Stat label="Gagné" value={gained != null ? `${gained >= 0 ? "+" : "−"}${formatNumber(Math.abs(gained), 1)}` : "—"} unit="kg" />
            <Stat
              label="Rythme"
              value={wm.rate != null ? `${wm.rate >= 0 ? "+" : "−"}${formatNumber(Math.abs(wm.rate), 2)}` : "—"}
              unit="kg/sem"
              note={status ? <span style={{ color: status.c }}>{status.text}</span> : null}
            />
          </dl>
          <div className="mt-5 h-[170px]">
            <ParentSize debounceTime={50}>{({ width }) => (width > 0 ? <WeightChart width={width} height={170} /> : null)}</ParentSize>
          </div>
        </>
      )}
    </Card>
  );
}

function Stat({ label, value, unit, note }: { label: string; value: string; unit: string; note?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label truncate">{label}</dt>
      <dd className="mt-1.5">
        <span className="display-num text-[20px]">{value}</span>
        <span className="mono ml-1 text-[10px] text-muted">{unit}</span>
        {note ? <span className="mono block text-[10px]">{note}</span> : null}
      </dd>
    </div>
  );
}

function WeightEntry({
  initial,
  label,
  onSave,
  onCancel,
  onClear,
}: {
  initial: number;
  label: string;
  onSave: (kg: number) => void;
  onCancel: () => void;
  onClear?: () => void;
}) {
  const [v, setV] = useState(formatNumber(initial, 1));
  const ref = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const kg = Number(v.replace(",", "."));
  const valid = Number.isFinite(kg) && kg > 30 && kg < 200;
  return (
    <motion.form
      initial={reduce ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: reduce ? 0 : duration.base, ease: ease.out }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(kg);
      }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border border-line bg-black/20 p-2.5">
        <label className="sr-only" htmlFor="weight-input">{label}</label>
        <span className="pl-1.5 text-[12px] text-muted">{label}</span>
        <div className="ml-auto flex items-center gap-2">
          <input
            id="weight-input"
            ref={ref}
            inputMode="decimal"
            autoComplete="off"
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                onCancel();
              }
            }}
            className="display-num h-11 w-24 rounded-[10px] border border-line bg-transparent px-3 text-right text-[20px] text-text focus:border-white/30 focus:outline-none"
          />
          <span className="mono text-[12px] text-muted">kg</span>
          <Button type="submit" disabled={!valid}>OK</Button>
          {onClear ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>Effacer</Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
          )}
        </div>
      </div>
    </motion.form>
  );
}

function WeightChart({ width, height }: { width: number; height: number }) {
  const { model, selected } = useDashboard();
  const wm = useWeightModel();
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  const PAD = { l: 4, r: 36, t: 8, b: 20 };
  const x0 = Math.min(wm.start, wm.pts[0]?.o ?? wm.start) - 2;
  // fenêtre lisible : du début du plan à ~4 semaines devant aujourd'hui (pas tout le plan d'un coup)
  const x1 = Math.max(Math.min(wm.end, dayOrdinal(model.today) + 28), (wm.pts.at(-1)?.o ?? 0) + 7) + 1;
  const x = scaleLinear({ domain: [x0, x1], range: [PAD.l, width - PAD.r] });

  const bandAt = (o: number, k: 0 | 1) => (wm.startKg != null && wm.band ? wm.startKg + (wm.band[k] * (o - wm.start)) / 7 : null);
  const vals = wm.pts.map((p) => p.kg);
  const hiBand = bandAt(x1, 1);
  const lo = Math.min(...vals, wm.startKg ?? Infinity) - 0.6;
  const hi = Math.max(...vals, hiBand ?? -Infinity) + 0.4;
  const y = scaleLinear({ domain: [lo, hi], range: [height - PAD.b, PAD.t], nice: false });
  const bandPts = wm.band ? Array.from({ length: x1 - wm.start + 1 }, (_, i) => wm.start + i) : [];
  const today = dayOrdinal(model.today);
  const sel = dayOrdinal(selected);
  const ticks = y.ticks(3);
  const months = Array.from({ length: x1 - x0 }, (_, i) => x0 + i).filter((o) => ordinalToDay(o).endsWith("-01"));

  return (
    <svg width={width} height={height} role="img" aria-label="Courbe de poids et couloir de prise de masse visé">
      {ticks.map((t) => (
        <text key={t} x={width - 2} y={y(t) + 3} textAnchor="end" fontSize={10} className="mono" fill={color.faint}>
          {formatNumber(t)}
        </text>
      ))}
      <line x1={PAD.l} x2={width - PAD.r} y1={height - PAD.b} y2={height - PAD.b} stroke={color.hairline} />
      {months.map((o) => (
        <text key={o} x={x(o)} y={height - 4} fontSize={10} className="mono" fill={color.muted} textAnchor="middle">
          {formatDayMonth(ordinalToDay(o)).replace(/^1 /, "")}
        </text>
      ))}
      {/* couloir visé */}
      {wm.band && wm.startKg != null ? (
        <AreaClosed
          data={bandPts}
          x={(o) => x(o)}
          y0={(o) => y(bandAt(o, 0)!)}
          y1={(o) => y(bandAt(o, 1)!)}
          yScale={y}
          fill="rgba(255,255,255,0.06)"
        />
      ) : null}
      {/* futur : zone grisée après aujourd'hui */}
      <rect x={x(today + 0.5)} y={PAD.t} width={Math.max(0, width - PAD.r - x(today + 0.5))} height={height - PAD.b - PAD.t} fill="rgba(7,9,12,0.35)" />
      {wm.pts.map((p) => (
        <circle key={p.day} cx={x(p.o)} cy={y(p.kg)} r={2.2} fill={color.text} fillOpacity={0.35} />
      ))}
      <LinePath data={wm.avg} x={(p) => x(p.o)} y={(p) => y(p.kg)} curve={curveMonotoneX}>
        {({ path }) => (
          <motion.path
            d={path(wm.avg) ?? ""}
            fill="none"
            stroke={color.text}
            strokeWidth={1.75}
            strokeLinecap="round"
            initial={reduce || !first ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.9, delay: first && !reduce ? load.charts : 0, ease: ease.out }}
          />
        )}
      </LinePath>
      {sel >= x0 && sel <= x1 ? (
        <line x1={x(clamp(sel, x0, x1))} x2={x(clamp(sel, x0, x1))} y1={PAD.t} y2={height - PAD.b} stroke="rgba(255,255,255,0.18)" />
      ) : null}
      {wm.avg.length ? (
        <circle cx={x(wm.avg.at(-1)!.o)} cy={y(wm.avg.at(-1)!.kg)} r={4} fill={color.text} stroke={color.bg} strokeWidth={2} />
      ) : null}
    </svg>
  );
}

