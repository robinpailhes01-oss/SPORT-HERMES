import { useDashboard } from "@/state/dashboard";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import type { Range } from "@/lib/metrics";

const RANGES: Range[] = [7, 30, 90];

export function RangeToggle() {
  const { range, setRange } = useDashboard();
  return (
    <ToggleGroup
      type="single"
      value={String(range)}
      onValueChange={(v) => v && setRange(Number(v) as Range)}
      aria-label="Période des tendances"
    >
      {RANGES.map((r) => (
        <ToggleGroupItem key={r} value={String(r)} aria-label={`${r} jours`}>
          {range === r ? (
            <span aria-hidden className="absolute inset-0 -z-10 rounded-[7px] bg-white/[0.09]" />
          ) : null}
          {r} j
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
