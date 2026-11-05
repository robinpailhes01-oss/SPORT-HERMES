/**
 * Types de l'export WHOOP + couche de mapping.
 *
 * Règle : les noms de colonnes bruts ("Recovery score %", …) n'existent QUE dans ce
 * fichier. Le reste de l'app manipule exclusivement `DayMetrics`, `Workout`,
 * `Performance` et `Dataset`.
 */

// ─────────────────────────────────────────────────────────────
// 1. Format brut (colonnes exactes de l'export WHOOP)
// ─────────────────────────────────────────────────────────────

/** Une valeur d'export : nombre en JSON, chaîne si elle vient d'un CSV, vide si non mesurée. */
type RawValue = number | string | null | undefined;

export interface WhoopCycleRow {
  "Cycle start time": string;
  "Recovery score %": RawValue;
  "Resting heart rate (bpm)": RawValue;
  "Heart rate variability (ms)": RawValue;
  "Day Strain": RawValue;
  "Sleep performance %": RawValue;
  "Asleep duration (min)": RawValue;
  "Respiratory rate (rpm)": RawValue;
}

export interface WhoopWorkoutRow {
  "Workout start time": string;
  "Duration (min)": RawValue;
  "Activity name": string;
  "Activity Strain": RawValue;
  "Average HR (bpm)": RawValue;
  "Max HR (bpm)": RawValue;
  "Energy burned (cal)": RawValue;
}

/** Repère de performance tel que stocké (pas d'équivalent WHOOP : saisi à la main / par l'agent). */
export interface PerformanceRow {
  id: string;
  date: string; // YYYY-MM-DD
  value: number;
}

export interface WhoopExport {
  demo?: boolean;
  exported_at?: string;
  timezone?: string;
  physiological_cycles: WhoopCycleRow[];
  workouts: WhoopWorkoutRow[];
  performances: PerformanceRow[];
}

// ─────────────────────────────────────────────────────────────
// 2. Modèle propre utilisé par l'app
// ─────────────────────────────────────────────────────────────

/** Clé de jour locale, format YYYY-MM-DD. */
export type DayKey = string;

export interface DayMetrics {
  date: DayKey;
  /** Début du cycle (coucher de la veille, heure locale) — "YYYY-MM-DD HH:MM:SS". */
  cycleStart: string;
  recovery: number | null;
  rhr: number | null;
  hrv: number | null;
  strain: number | null;
  sleepPerformance: number | null;
  asleepMin: number | null;
  respiratoryRate: number | null;
}

export const WORKOUT_CATEGORIES = ["CrossFit", "Hyrox", "Course", "Force", "Mobilité"] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number] | "Autre";

export interface Workout {
  id: string;
  /** Jour local de la séance. */
  date: DayKey;
  /** "HH:MM" */
  time: string;
  start: string;
  activity: string;
  category: WorkoutCategory;
  durationMin: number | null;
  strain: number | null;
  avgHr: number | null;
  maxHr: number | null;
  calories: number | null;
}

export type BenchmarkId = "squat-3rm" | "clean" | "bench" | "run-5k" | "hyrox";

export interface Benchmark {
  id: BenchmarkId;
  label: string;
  unit: "kg" | "time";
  /** Plus haut = mieux (charges) ou plus bas = mieux (chronos). */
  better: "higher" | "lower";
}

export const BENCHMARKS: Benchmark[] = [
  { id: "squat-3rm", label: "Back squat 3RM", unit: "kg", better: "higher" },
  { id: "clean", label: "Clean", unit: "kg", better: "higher" },
  { id: "bench", label: "Développé couché", unit: "kg", better: "higher" },
  { id: "run-5k", label: "5 km", unit: "time", better: "lower" },
  { id: "hyrox", label: "Hyrox", unit: "time", better: "lower" },
];

export interface Performance {
  benchmark: Benchmark;
  date: DayKey;
  /** kg, ou secondes pour un chrono */
  value: number;
  /** valeur précédente pour l'évolution */
  previous: number | null;
}

export interface Dataset {
  demo: boolean;
  /** "YYYY-MM-DD HH:MM:SS" local, ou null si inconnu */
  syncedAt: string | null;
  /** Cycles triés du plus ancien au plus récent, un par jour. */
  days: DayMetrics[];
  /** Séances triées du plus ancien au plus récent. */
  workouts: Workout[];
  performances: Performance[];
}

// ─────────────────────────────────────────────────────────────
// 3. Mapping
// ─────────────────────────────────────────────────────────────

function num(v: RawValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Parse "YYYY-MM-DD HH:MM(:SS)" (ou ISO avec T) sans passer par un fuseau. */
function parseLocal(ts: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(ts.trim());
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

function shiftDay(y: number, mo: number, d: number, by: number): DayKey {
  const t = new Date(Date.UTC(y, mo - 1, d + by));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Un cycle WHOOP commence à l'endormissement. On le rattache au jour du réveil :
 * coucher après midi → lendemain ; coucher après minuit → même date.
 */
export function cycleDay(cycleStart: string): DayKey | null {
  const p = parseLocal(cycleStart);
  if (!p) return null;
  return shiftDay(p.y, p.mo, p.d, p.h >= 12 ? 1 : 0);
}

const CATEGORY_RULES: [RegExp, WorkoutCategory][] = [
  [/hyrox|athx/i, "Hyrox"],
  [/crossfit|functional fitness|hiit|metcon/i, "CrossFit"],
  [/run|course|track|jog/i, "Course"],
  [/weight|power|strength|force|lifting/i, "Force"],
  [/yoga|mobil|stretch|pilates|recovery/i, "Mobilité"],
];

export function categorize(activityName: string): WorkoutCategory {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(activityName)) return cat;
  return "Autre";
}

export function mapCycle(row: WhoopCycleRow): DayMetrics | null {
  const date = cycleDay(row["Cycle start time"]);
  if (!date) return null;
  return {
    date,
    cycleStart: row["Cycle start time"],
    recovery: num(row["Recovery score %"]),
    rhr: num(row["Resting heart rate (bpm)"]),
    hrv: num(row["Heart rate variability (ms)"]),
    strain: num(row["Day Strain"]),
    sleepPerformance: num(row["Sleep performance %"]),
    asleepMin: num(row["Asleep duration (min)"]),
    respiratoryRate: num(row["Respiratory rate (rpm)"]),
  };
}

export function mapWorkout(row: WhoopWorkoutRow, index: number): Workout | null {
  const p = parseLocal(row["Workout start time"]);
  if (!p) return null;
  return {
    id: `${row["Workout start time"]}#${index}`,
    date: `${p.y}-${pad(p.mo)}-${pad(p.d)}`,
    time: `${pad(p.h)}:${pad(p.mi)}`,
    start: row["Workout start time"],
    activity: row["Activity name"],
    category: categorize(row["Activity name"]),
    durationMin: num(row["Duration (min)"]),
    strain: num(row["Activity Strain"]),
    avgHr: num(row["Average HR (bpm)"]),
    maxHr: num(row["Max HR (bpm)"]),
    calories: num(row["Energy burned (cal)"]),
  };
}

export function mapPerformances(rows: PerformanceRow[]): Performance[] {
  const out: Performance[] = [];
  for (const b of BENCHMARKS) {
    const entries = rows.filter((r) => r.id === b.id).sort((a, z) => a.date.localeCompare(z.date));
    const last = entries.at(-1);
    if (!last) continue;
    out.push({ benchmark: b, date: last.date, value: last.value, previous: entries.at(-2)?.value ?? null });
  }
  return out;
}

export function mapExport(raw: WhoopExport): Dataset {
  const byDay = new Map<DayKey, DayMetrics>();
  for (const row of raw.physiological_cycles ?? []) {
    const d = mapCycle(row);
    if (d) byDay.set(d.date, d); // un cycle par jour ; le dernier lu gagne
  }
  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  const workouts = (raw.workouts ?? [])
    .map(mapWorkout)
    .filter((w): w is Workout => w !== null)
    .sort((a, b) => a.start.localeCompare(b.start));

  return {
    demo: raw.demo === true,
    syncedAt: raw.exported_at ?? null,
    days,
    workouts,
    performances: mapPerformances(raw.performances ?? []),
  };
}
