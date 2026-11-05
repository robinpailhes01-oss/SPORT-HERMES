import { scaleLinear } from "@visx/scale";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { EmptyNote } from "./WeekPlan";
import { allTests } from "@/lib/plan";
import { formatBench, formatChrono, formatDDMM, formatDayMonth, formatNumber } from "@/lib/format";
import { color } from "@/lib/tokens";
import type { Benchmark, PlanTest } from "@/types/plan";

/** Performances : départ (estimé → confirmé au 1er test), dernier test, progression, objectif. */
export function Performances() {
  const { plan, model } = useDashboard();
  if (!plan) {
    return (
      <Card className="h-full">
        <CardHeader title="Performances" />
        <EmptyNote title="Aucun repère.">Les repères et les tests viennent du plan.</EmptyNote>
      </Card>
    );
  }
  const tests = allTests(plan);
  const anyDone = tests.some((t) => t.result != null && t.date <= model.today);

  return (
    <Card aria-labelledby="perf-title" className="h-full">
      <CardHeader id="perf-title" title="Performances" meta={anyDone ? "tests du plan" : "repères de départ"} />
      <div className="mono hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_96px_minmax(0,0.8fr)] gap-4 border-b border-hairline pb-2 text-[10px] uppercase tracking-[0.08em] text-muted md:grid">
        <span>Repère</span>
        <span>Départ</span>
        <span>Dernier test</span>
        <span>Courbe</span>
        <span className="text-right">Progrès</span>
      </div>
      <ul>
        {plan.benchmarks.map((b) => (
          <Row key={b.id} b={b} tests={tests.filter((t) => t.benchmarkId === b.id && t.result != null && t.date <= model.today)} />
        ))}
      </ul>
      <p className="mono mt-3 text-[10px] text-faint">
        « à confirmer » = estimation de départ, remplacée par le résultat du premier test.
      </p>
    </Card>
  );
}

function Row({ b, tests }: { b: Benchmark; tests: PlanTest[] }) {
  const { plan, model, select } = useDashboard();
  const sorted = [...tests].sort((x, y) => x.date.localeCompare(y.date));
  const firstT = sorted[0];
  const last = sorted.at(-1);
  // départ : 1er test s'il existe, sinon l'estimation
  const start = firstT ? firstT.result! : b.baseline?.value ?? null;
  const delta = last && start != null && sorted.length > 1 ? last.result! - start : null;
  const good = delta != null && (b.better === "higher" ? delta > 0 : delta < 0);
  const fmtDelta = (d: number) =>
    b.unit === "s" ? `${d < 0 ? "−" : "+"}${formatChrono(Math.abs(d))}` : `${d > 0 ? "+" : "−"}${formatNumber(Math.abs(d), Math.abs(d) % 1 ? 1 : 0)}${b.unit === "kg" ? " kg" : " reps"}`;
  const nextForB = plan
    ? allTests(plan)
        .filter((t) => t.benchmarkId === b.id && t.date > model.today)
        .sort((x, y) => x.date.localeCompare(y.date))[0]
    : undefined;

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-hairline py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_96px_minmax(0,0.8fr)] md:py-3.5">
      <div className="min-w-0">
        <p className="text-[14px] leading-5 text-text">{b.label}</p>
        {b.target != null ? (
          <p className="mono text-[10px] text-muted">objectif {formatBench(b.target, b.unit)}</p>
        ) : null}
      </div>

      {/* Départ */}
      <div className="col-start-1 row-start-2 min-w-0 md:col-start-auto md:row-start-auto">
        {firstT ? (
          <p className="mono text-[12px] text-muted">
            <span className="md:hidden">départ </span>
            {formatBench(firstT.result!, b.unit)}
            <span className="text-faint"> · {formatDDMM(firstT.date)}</span>
          </p>
        ) : b.baseline ? (
          <p className="mono text-[12px] text-muted">
            {b.baseline.display ?? formatBench(b.baseline.value, b.unit)}
            {b.baseline.estimated ? (
              <span className="ml-1.5 rounded-[4px] border border-dashed border-white/20 px-1 py-px text-[9px] uppercase tracking-[0.06em] text-muted">
                à confirmer
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mono text-[12px] text-muted">
            {nextForB ? `test le ${formatDayMonth(nextForB.date)}` : plan?.event && /hyrox/i.test(b.label) ? `test le ${formatDayMonth(plan.event.date)}` : "pas encore testé"}
          </p>
        )}
      </div>

      {/* Dernier test */}
      <div className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto md:text-left">
        {last ? (
          <button type="button" onClick={() => select(last.date)} className="min-h-11 min-w-11 text-left">
            <span className="display-num text-[18px]">{formatBench(last.result!, b.unit).replace(/ (kg|reps)$/, "")}</span>
            <span className="mono ml-1 text-[11px] text-muted">{b.unit === "s" ? "" : b.unit}</span>
            <span className="mono block text-[10px] text-faint md:inline md:pl-2">{formatDDMM(last.date)}</span>
          </button>
        ) : (
          <span className="mono text-[12px] text-faint">—</span>
        )}
      </div>

      <div className="hidden md:block">
        <Spark tests={sorted} better={b.better} />
      </div>

      <p className="col-start-2 row-start-2 mono text-right text-[12px] md:col-start-auto md:row-start-auto" style={{ color: delta == null ? color.faint : good ? color.recHigh : color.recLow }}>
        {delta == null ? (sorted.length === 1 ? "1er test" : "—") : fmtDelta(delta)}
      </p>
    </li>
  );
}

function Spark({ tests, better }: { tests: PlanTest[]; better: "higher" | "lower" }) {
  const W = 96, H = 26;
  if (tests.length < 2) return <div className="h-[26px] border-b border-dashed border-white/10" />;
  const vals = tests.map((t) => t.result!);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x = scaleLinear({ domain: [0, tests.length - 1], range: [3, W - 3] });
  // « mieux » toujours vers le haut, y compris pour un chrono
  const y = scaleLinear({ domain: better === "higher" ? [lo, hi] : [hi, lo], range: [H - 4, 4] });
  const pts = vals.map((v, i) => `${x(i)},${hi === lo ? H / 2 : y(v)}`);
  return (
    <svg width={W} height={H} aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={color.text} strokeOpacity={0.7} strokeWidth={1.5} strokeLinejoin="round" />
      {pts.map((p, i) => {
        const [cx, cy] = p.split(",").map(Number);
        return <circle key={i} cx={cx} cy={cy} r={i === pts.length - 1 ? 3 : 2} fill={i === pts.length - 1 ? color.text : color.muted} />;
      })}
    </svg>
  );
}
