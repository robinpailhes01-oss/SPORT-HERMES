import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { EmptyNote } from "./WeekPlan";
import { milestones } from "@/lib/metrics";
import { formatDayMonth } from "@/lib/format";
import { color } from "@/lib/tokens";

const KIND_LABEL = { streak: "Série", volume: "Volume", record: "Record", sleep: "Sommeil" } as const;

/** Jalons : uniquement des faits tirés des données (séries, volumes, records aux tests). */
export function Milestones() {
  const { model, plan, tracking, select } = useDashboard();
  const list = milestones(model, plan, tracking, plan?.targets.sessionsPerWeek ?? 5, plan?.targets.sleepMinutes ?? 450).slice(0, 6);
  return (
    <Card aria-labelledby="milestones-title" className="h-full">
      <CardHeader id="milestones-title" title="Jalons" meta="tirés de tes données" />
      {list.length === 0 ? (
        <EmptyNote title="Pas encore de jalon.">Ils apparaîtront avec les premières semaines réussies et les premiers tests.</EmptyNote>
      ) : (
        <ol className="-mx-2">
          {list.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => select(m.date <= model.today ? m.date : model.today)}
                className="grid min-h-[52px] w-full grid-cols-[64px_1fr] items-baseline gap-3 rounded-[10px] border-b border-hairline px-2 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.03]"
              >
                <span className="mono text-[10px] uppercase tracking-[0.06em]" style={{ color: m.kind === "record" ? color.recHigh : color.muted }}>
                  {KIND_LABEL[m.kind]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] leading-5 text-text">{m.title}</span>
                  <span className="mono block text-[11px] text-muted">
                    {m.detail} · {formatDayMonth(m.date)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
