import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { TickRow } from "./TickRow";
import { addDays, formatClock, formatDayShort } from "@/lib/format";
import { parseHHMM } from "@/lib/plan";
import { color } from "@/lib/tokens";
import type { EveningKey } from "@/types/plan";

/** Checklist du soir : 3 cases par jour, même geste que les séances. */
export function Evening() {
  const { plan, tracking, actions, selected, isToday, model } = useDashboard();
  const bedtime = plan?.targets.bedtime ?? "23:45";
  const checks = tracking.evening[selected] ?? {};
  // heure d'endormissement réelle (WHOOP) : elle appartient au cycle du lendemain
  const nextDay = model.byDay.get(addDays(selected, 1));
  const onset = nextDay?.sleepOnsetMin != null ? nextDay.sleepOnsetMin + 1440 : null;
  const target = parseHHMM(bedtime) + (parseHHMM(bedtime) < 12 * 60 ? 1440 : 0);

  const items: { key: EveningKey; label: string; meta?: React.ReactNode }[] = [
    { key: "protein", label: "Protéines OK" },
    { key: "recoveryDrink", label: "Boisson de récup, pas d'alcool" },
    {
      key: "bedtime",
      label: `Couché avant ${bedtime}`,
      meta:
        onset != null ? (
          <span style={{ color: onset <= target ? color.recHigh : color.recLow }}>endormi {formatClock(onset)}</span>
        ) : undefined,
    },
  ];
  const done = items.filter((i) => checks[i.key]).length;

  return (
    <Card aria-labelledby="evening-title">
      <CardHeader id="evening-title" title={isToday ? "Ce soir" : "Ce soir-là"} meta={formatDayShort(selected)}>
        <span className="mono text-[12px]" style={{ color: done === 3 ? color.recHigh : color.muted }}>
          {done}/3
        </span>
      </CardHeader>
      <ul className="-mx-2 -mt-1">
        {items.map((i) => (
          <li key={i.key} className="border-b border-hairline last:border-b-0">
            <TickRow
              size="sm"
              checked={!!checks[i.key]}
              onToggle={() => actions.toggleEvening(selected, i.key, !!checks[i.key])}
              title={i.label}
              meta={i.meta}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
