import type { Dataset, DayKey, DayMetrics, Workout, WorkoutCategory } from "@/types/whoop";
import { WORKOUT_CATEGORIES } from "@/types/whoop";
import { addDays, dayOrdinal, weekdayIndex } from "./format";
import { color } from "./tokens";

// ─── Zones de récupération (seuils WHOOP : 67 / 34) ───
export type RecoveryZone = "high" | "mid" | "low" | "none";

export function recoveryZone(v: number | null | undefined): RecoveryZone {
  if (v == null) return "none";
  if (v >= 67) return "high";
  if (v >= 34) return "mid";
  return "low";
}

export const zoneColor: Record<RecoveryZone, string> = {
  high: color.recHigh,
  mid: color.recMid,
  low: color.recLow,
  none: color.muted,
};

export const zoneLabel: Record<RecoveryZone, string> = {
  high: "Récup haute",
  mid: "Récup modérée",
  low: "Récup basse",
  none: "Non mesurée",
};

// ─── Métriques suivies ───
export type MetricKey = "hrv" | "rhr" | "sleepHours" | "strain" | "recovery";

export function metricValue(d: DayMetrics | undefined, key: MetricKey): number | null {
  if (!d) return null;
  if (key === "sleepHours") return d.asleepMin == null ? null : d.asleepMin / 60;
  return d[key];
}

/** Sens « favorable » d'une métrique, pour colorer les écarts. */
export const metricPolarity: Record<MetricKey, "higher" | "lower" | "neutral"> = {
  hrv: "higher",
  rhr: "lower",
  sleepHours: "higher",
  recovery: "higher",
  strain: "neutral",
};

// ─── Modèle dérivé ───
export interface Model {
  days: DayMetrics[];
  byDay: Map<DayKey, DayMetrics>;
  workoutsByDay: Map<DayKey, Workout[]>;
  workouts: Workout[];
  first: DayKey;
  today: DayKey;
}

export function buildModel(data: Dataset): Model | null {
  if (!data.days.length) return null;
  const byDay = new Map(data.days.map((d) => [d.date, d]));
  const workoutsByDay = new Map<DayKey, Workout[]>();
  for (const w of data.workouts) {
    const list = workoutsByDay.get(w.date) ?? [];
    list.push(w);
    workoutsByDay.set(w.date, list);
  }
  return {
    days: data.days,
    byDay,
    workoutsByDay,
    workouts: data.workouts,
    first: data.days[0].date,
    today: data.days[data.days.length - 1].date,
  };
}

function mean(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Moyenne des 30 jours qui PRÉCÈDENT `day` (le jour lui-même exclu). */
export function baseline30(model: Model, day: DayKey, key: MetricKey): number | null {
  const vals: (number | null)[] = [];
  for (let i = 1; i <= 30; i++) vals.push(metricValue(model.byDay.get(addDays(day, -i)), key));
  return mean(vals);
}

/** Moyenne glissante 7 jours (jour inclus), sur jours calendaires. */
export function rolling7(model: Model, day: DayKey, key: MetricKey): number | null {
  const vals: (number | null)[] = [];
  for (let i = 0; i < 7; i++) vals.push(metricValue(model.byDay.get(addDays(day, -i)), key));
  // au moins 4 mesures sur 7 pour que la moyenne ait un sens
  return vals.filter((v) => v != null).length >= 4 ? mean(vals) : null;
}

export interface Delta {
  value: number;
  baseline: number;
  /** favorable / défavorable / dans la norme */
  tone: "good" | "bad" | "flat";
}

export function deltaVsBaseline(model: Model, day: DayKey, key: MetricKey): Delta | null {
  const v = metricValue(model.byDay.get(day), key);
  const b = baseline30(model, day, key);
  if (v == null || b == null) return null;
  const diff = v - b;
  const pol = metricPolarity[key];
  let tone: Delta["tone"] = "flat";
  if (pol !== "neutral" && Math.abs(diff) / Math.abs(b) >= 0.03) {
    tone = (diff > 0) === (pol === "higher") ? "good" : "bad";
  }
  return { value: diff, baseline: b, tone };
}

// ─── Semaine ───
export function weekOf(day: DayKey): DayKey[] {
  const monday = addDays(day, -weekdayIndex(day));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export interface CategoryShare {
  category: WorkoutCategory;
  count: number;
  minutes: number;
}

export function weekBreakdown(model: Model, week: DayKey[]): CategoryShare[] {
  const cats: WorkoutCategory[] = [...WORKOUT_CATEGORIES, "Autre"];
  const out = cats.map((category) => ({ category, count: 0, minutes: 0 }));
  for (const d of week) {
    for (const w of model.workoutsByDay.get(d) ?? []) {
      const s = out.find((c) => c.category === w.category)!;
      s.count++;
      s.minutes += w.durationMin ?? 0;
    }
  }
  return out.filter((c) => c.category !== "Autre" || c.count > 0);
}

/** Les n dernières séances à la date `day` incluse (plus récente d'abord). */
export function recentWorkouts(model: Model, day: DayKey, n = 8): Workout[] {
  const out: Workout[] = [];
  for (let i = model.workouts.length - 1; i >= 0 && out.length < n; i--) {
    if (model.workouts[i].date <= day) out.push(model.workouts[i]);
  }
  return out;
}

// ─── Fenêtre des courbes (7 / 30 / 90 j) ───
export type Range = 7 | 30 | 90;

/**
 * Fin de la fenêtre visible. La fenêtre ne bouge que si le jour sélectionné en sort
 * (comme un « scroll into view »), avec une petite marge pour garder du contexte.
 */
export function nextWindowEnd(prevEnd: DayKey | null, selected: DayKey, range: Range, model: Model): DayKey {
  const today = dayOrdinal(model.today);
  const first = dayOrdinal(model.first);
  const sel = dayOrdinal(selected);
  const margin = range === 7 ? 1 : range === 30 ? 3 : 7;
  let end = prevEnd ? Math.min(dayOrdinal(prevEnd), today) : today;
  if (sel > end) end = Math.min(today, sel + margin);
  if (sel < end - range + 1 + margin) end = sel + range - 1 - margin;
  end = Math.min(today, Math.max(end, first + range - 1));
  return addDays(model.today, end - today);
}
