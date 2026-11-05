import type { Model } from "@/lib/metrics";
import type { DayKey } from "@/types/whoop";
import { formatDuration, formatNumber } from "@/lib/format";

/** "CrossFit · 1 h 02 · strain 14,8" — ou l'état « jour sans séance ». */
export function workoutSummary(model: Model, day: DayKey): string {
  const ws = model.workoutsByDay.get(day) ?? [];
  if (!ws.length) return day === model.today ? "Aucune séance pour l'instant" : "Jour sans séance";
  return ws
    .map((w) => `${w.category} · ${formatDuration(w.durationMin)}${w.strain != null ? ` · strain ${formatNumber(w.strain, 1)}` : ""}`)
    .join("\n");
}
