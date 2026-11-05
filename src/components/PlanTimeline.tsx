import { motion, useReducedMotion } from "motion/react";
import { scaleLinear } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { useDashboard } from "@/state/dashboard";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { allTests, nextTestDate } from "@/lib/plan";
import { dayOrdinal, formatDayMonth, formatDayShort } from "@/lib/format";
import { color, duration, ease, load } from "@/lib/tokens";
import { useIsFirstRender } from "@/hooks/motion";

/** Plan 90 jours : comptes à rebours, frise des blocs, tests tous les 15 jours. */
export function PlanTimeline() {
  const { plan, model, selected } = useDashboard();
  if (!plan) return null;

  const today = model.today;
  const t0 = dayOrdinal(plan.start);
  const tEnd = dayOrdinal(plan.end);
  const total = tEnd - t0 + 1;
  const dayN = dayOrdinal(today) - t0 + 1;
  const toEnd = tEnd - dayOrdinal(today);
  const toEvent = plan.event ? dayOrdinal(plan.event.date) - dayOrdinal(today) : null;
  const next = nextTestDate(plan, today);
  const nextTests = next ? allTests(plan).filter((t) => t.date === next) : [];

  const status =
    dayN < 1 ? `commence dans ${1 - dayN} j` : dayN > total ? "terminé" : `jour ${dayN} / ${total}`;

  return (
    <Card aria-labelledby="plan-title">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="plan-title" className="text-[13px] font-medium text-text">
              {plan.title}
            </h2>
            {plan.demo ? <Badge>Plan démo</Badge> : null}
          </div>
          <p className="mt-1.5 max-w-[560px] text-[13px] leading-5 text-muted">{plan.goal}</p>
        </div>
        <div className="flex gap-8 md:gap-12">
          <Countdown value={Math.max(0, toEnd)} label="fin du plan" sub={formatDayMonth(plan.end)} />
          {plan.event && toEvent != null ? (
            <Countdown value={Math.max(0, toEvent)} label={plan.event.name} sub={formatDayMonth(plan.event.date)} strong />
          ) : null}
        </div>
      </div>

      <div className="mt-6 h-[92px]">
        <ParentSize debounceTime={50}>{({ width }) => (width > 0 ? <Frise width={width} /> : null)}</ParentSize>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-hairline pt-4 text-[13px] md:flex-row md:items-baseline md:justify-between">
        <p className="mono text-[11px] text-muted">{status}{selected !== today ? ` · vu au ${formatDayShort(selected)}` : ""}</p>
        {next ? (
          <p className="text-muted">
            Prochain test <span className="text-text">{formatDayShort(next)}</span>
            {" · "}
            {dayOrdinal(next) === dayOrdinal(today) ? "aujourd'hui" : `dans ${dayOrdinal(next) - dayOrdinal(today)} j`}
            <span className="hidden sm:inline"> — {nextTests.map((t) => t.exercise).join(", ")}</span>
          </p>
        ) : (
          <p className="text-muted">Tous les tests du plan sont passés.</p>
        )}
      </div>
    </Card>
  );
}

function Countdown({ value, label, sub, strong }: { value: number; label: string; sub: string; strong?: boolean }) {
  return (
    <div className="text-left md:text-right">
      <p className="flex items-baseline gap-1 md:justify-end">
        <span className="mono text-[13px] text-muted">J-</span>
        <span className="display-num text-[34px] md:text-[44px]" style={{ color: strong ? color.text : "rgba(242,244,247,0.78)" }}>
          {value}
        </span>
      </p>
      <p className="mt-1 text-[12px] text-text">{label}</p>
      <p className="mono text-[10px] text-muted">{sub}</p>
    </div>
  );
}

function Frise({ width }: { width: number }) {
  const { plan, model, selected, select } = useDashboard();
  const reduce = useReducedMotion();
  const first = useIsFirstRender();
  if (!plan) return null;

  const t0 = dayOrdinal(plan.start);
  const tEnd = dayOrdinal(plan.end) + 1;
  const tEvent = plan.event ? dayOrdinal(plan.event.date) + 1 : tEnd;
  const compact = width < 560;
  const x = scaleLinear({ domain: [t0, Math.max(tEnd, tEvent)], range: [2, width - 12] });
  const today = dayOrdinal(model.today);
  const sel = dayOrdinal(selected);
  const BAR_Y = 30, BAR_H = 10;
  const tests = [...new Set(allTests(plan).map((t) => t.date))];
  const doneTest = (d: string) => allTests(plan).some((t) => t.date === d && t.result != null && d <= model.today);
  const progressX = x(Math.min(Math.max(today + 1, t0), tEnd));

  return (
    <svg width={width} height={92} role="img" aria-label="Frise du plan : blocs, tests et position du jour">
      {/* blocs */}
      {plan.blocks.map((b, i) => {
        const bx = x(dayOrdinal(b.start)) + (i ? 2 : 0);
        const bw = x(dayOrdinal(b.end) + 1) - bx - 2;
        return (
          <g key={b.id}>
            <rect x={bx} y={BAR_Y} width={Math.max(0, bw)} height={BAR_H} rx={5} fill="rgba(255,255,255,0.07)" />
            <text x={bx} y={BAR_Y - 10} fontSize={compact ? 10 : 11} fill={color.muted} className={compact ? "mono" : undefined}>
              {compact ? b.name.replace(/^.*· /, "") : b.name}
            </text>
          </g>
        );
      })}
      {/* progression jusqu'à aujourd'hui */}
      <clipPath id="plan-bar-clip">
        {plan.blocks.map((b, i) => {
          const bx = x(dayOrdinal(b.start)) + (i ? 2 : 0);
          return <rect key={b.id} x={bx} y={BAR_Y} width={Math.max(0, x(dayOrdinal(b.end) + 1) - bx - 2)} height={BAR_H} rx={5} />;
        })}
      </clipPath>
      <motion.rect
        x={x(t0)}
        y={BAR_Y}
        height={BAR_H}
        fill={color.text}
        clipPath="url(#plan-bar-clip)"
        initial={reduce || !first ? false : { width: 0 }}
        animate={{ width: Math.max(0, progressX - x(t0)) }}
        transition={{ duration: reduce ? 0 : 0.9, delay: first && !reduce ? load.charts : 0, ease: ease.out }}
      />
      {/* échéance après le plan */}
      {plan.event ? (
        <g>
          <line x1={x(tEnd) + 4} x2={x(tEvent) - 6} y1={BAR_Y + BAR_H / 2} y2={BAR_Y + BAR_H / 2} stroke={color.line} strokeDasharray="2 4" />
          <rect x={x(tEvent) - 6} y={BAR_Y - 1} width={12} height={12} rx={3} transform={`rotate(45 ${x(tEvent)} ${BAR_Y + 5})`} fill="none" stroke={color.text} strokeWidth={1.2} />
          {!compact ? (
            <text x={width - 2} y={BAR_Y - 10} textAnchor="end" fontSize={11} fill={color.text}>
              {plan.event.name}
            </text>
          ) : null}
        </g>
      ) : null}
      {/* tests tous les 15 jours */}
      {tests.map((d, i) => {
        const tx = x(dayOrdinal(d) + 0.5);
        const done = doneTest(d);
        return (
          <g key={d} style={{ cursor: "pointer" }} onClick={() => select(d)}>
            <rect x={tx - 12} y={BAR_Y + BAR_H} width={24} height={40} fill="transparent" />
            <line x1={tx} x2={tx} y1={BAR_Y + BAR_H + 3} y2={BAR_Y + BAR_H + 11} stroke={done ? color.text : color.faint} />
            <circle cx={tx} cy={BAR_Y + BAR_H + 15} r={3} fill={done ? color.text : color.bg} stroke={done ? color.text : color.faint} />
            {!compact || i % 2 === 0 || i === tests.length - 1 ? (
              <text x={tx} y={BAR_Y + BAR_H + 34} textAnchor="middle" fontSize={10} className="mono" fill={done ? color.muted : color.faint}>
                J{dayOrdinal(d) - dayOrdinal(plan.start) + 1}
              </text>
            ) : null}
          </g>
        );
      })}
      {/* aujourd'hui / jour sélectionné */}
      {today >= t0 && today <= tEvent ? (
        <line x1={x(today + 0.5)} x2={x(today + 0.5)} y1={BAR_Y - 4} y2={BAR_Y + BAR_H + 4} stroke={color.bg} strokeWidth={2} />
      ) : null}
      {sel !== today && sel >= t0 && sel <= tEvent ? (
        <motion.line
          initial={false}
          animate={{ x1: x(sel + 0.5), x2: x(sel + 0.5) }}
          transition={{ duration: reduce ? 0 : duration.base, ease: ease.out }}
          y1={BAR_Y - 6}
          y2={BAR_Y + BAR_H + 6}
          stroke={color.strain}
          strokeWidth={1.5}
        />
      ) : null}
    </svg>
  );
}
