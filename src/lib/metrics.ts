import type { Dataset, DayKey, DayMetrics, JournalAnswer, Workout } from "@/types/whoop";
import type { Plan, SessionType, Tracking } from "@/types/plan";
import { addDays, dayOrdinal, formatBench, weekdayIndex } from "./format";
import { color } from "./tokens";
import { allTests, allWeeks, sessionMark } from "./plan";

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

// ─── Verdict du matin ───
export interface Verdict {
  title: string;
  advice: string;
  /** fourchette de strain conseillée pour la journée */
  strain: [number, number] | null;
  /** types de séance à privilégier dans la to-do */
  prefer: SessionType[];
}

export const VERDICTS: Record<RecoveryZone, Verdict> = {
  high: {
    title: "Feu vert : tu peux pousser.",
    advice: "Bonne journée pour une séance lourde.",
    strain: [14, 18],
    prefer: ["force", "hypertrophie", "intervalles", "hyrox"],
  },
  mid: {
    title: "Séance prévue, intensité maîtrisée.",
    advice: "Fais ta séance, sans aller chercher le max.",
    strain: [10, 14],
    prefer: ["hypertrophie", "force", "zone2"],
  },
  low: {
    title: "Journée légère.",
    advice: "Zone 2 ou mobilité. On garde le lourd pour demain.",
    strain: [0, 10],
    prefer: ["zone2", "mobilite"],
  },
  none: {
    title: "Pas de score ce matin.",
    advice: "Bracelet non porté cette nuit : écoute tes sensations.",
    strain: null,
    prefer: [],
  },
};

// ─── Modèle dérivé ───
export interface Model {
  days: DayMetrics[];
  byDay: Map<DayKey, DayMetrics>;
  workoutsByDay: Map<DayKey, Workout[]>;
  workouts: Workout[];
  journal: JournalAnswer[];
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
    journal: data.journal,
    first: data.days[0].date,
    today: data.days[data.days.length - 1].date,
  };
}

const mean = (v: (number | null | undefined)[]) => {
  const x = v.filter((n): n is number => n != null);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
};

export type SignalKey = "hrv" | "rhr" | "respiratoryRate" | "asleepMin";

/** Moyenne des 30 jours qui précèdent `day`. */
export function baseline30(model: Model, day: DayKey, key: keyof DayMetrics): number | null {
  const vals: (number | null)[] = [];
  for (let i = 1; i <= 30; i++) vals.push((model.byDay.get(addDays(day, -i))?.[key] as number | null) ?? null);
  return mean(vals);
}

/** Lecture en langage simple d'un signal vs la normale 30 j. */
export function signalReading(model: Model, day: DayKey, key: SignalKey) {
  const v = model.byDay.get(day)?.[key] ?? null;
  const b = baseline30(model, day, key);
  if (v == null || b == null) return null;
  const pct = (v - b) / b;
  const higherIsGood = key === "hrv" || key === "asleepMin";
  const tol = key === "respiratoryRate" ? 0.03 : 0.05;
  const tone: "good" | "bad" | "flat" = Math.abs(pct) < tol ? "flat" : pct > 0 === higherIsGood ? "good" : "bad";
  return { value: v, baseline: b, pct, tone };
}

// ─── Semaine & charge ───
export function weekOf(day: DayKey): DayKey[] {
  const monday = addDays(day, -weekdayIndex(day));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export type LoadZone = "maintien" | "progression" | "vigilance" | "surcharge";
/**
 * Zone de progression : charge des 7 derniers jours vs moyenne des 28 derniers jours.
 * < 0,8 tu te maintiens · 0,8–1,3 tu progresses · 1,3–1,5 vigilance · > 1,5 surcharge.
 */
export function loadRatio(model: Model, day: DayKey) {
  // le jour en cours n'est pas fini : on s'arrête à la veille
  const end = day === model.today ? addDays(day, -1) : day;
  const s = (n: number) => {
    const v: (number | null)[] = [];
    for (let i = 0; i < n; i++) v.push(model.byDay.get(addDays(end, -i))?.strain ?? null);
    return mean(v);
  };
  const acute = s(7);
  const chronic = s(28);
  if (acute == null || chronic == null || chronic === 0) return null;
  const ratio = acute / chronic;
  const zone: LoadZone = ratio < 0.8 ? "maintien" : ratio <= 1.3 ? "progression" : ratio <= 1.5 ? "vigilance" : "surcharge";
  return { acute, chronic, ratio, zone };
}

// ─── Sommeil ───
export function nightsOnTarget(model: Model, days: DayKey[], targetMin: number) {
  const measured = days.map((d) => model.byDay.get(d)?.asleepMin).filter((v): v is number => v != null);
  return { ok: measured.filter((v) => v >= targetMin).length, measured: measured.length };
}

// ─── Leviers : écart de récup entre jours « oui » et « non » ───
export interface Lever {
  id: string;
  label: string;
  question: string;
  /** points de récup : moyenne oui − moyenne non */
  diff: number;
  yesN: number;
  noN: number;
  yesMean: number;
  noMean: number;
}

const LEVER_LABELS: [RegExp, string][] = [
  [/alcool|alcohol/i, "Alcool"],
  [/hydrat/i, "Bonne hydratation"],
  [/magn[ée]sium/i, "Magnésium"],
  [/prot[ée]ine|protein/i, "Assez de protéines"],
  [/caf[ée]ine|caffeine/i, "Caféine en fin de journée"],
  [/[ée]cran|screen/i, "Écran au lit"],
  [/lu |lecture|read/i, "Lecture avant de dormir"],
];
const leverLabel = (q: string) => LEVER_LABELS.find(([re]) => re.test(q))?.[1] ?? q.replace(/^avez-vous |^vous êtes-vous /i, "").replace(/ \?$/, "");

export const LEVER_MIN_DAYS = 8;

export function levers(model: Model, sleepTargetMin: number): { ranked: Lever[]; thin: Lever[] } {
  const groups = new Map<string, { yes: number[]; no: number[] }>();
  for (const j of model.journal) {
    const rec = model.byDay.get(j.date)?.recovery;
    if (rec == null) continue;
    const g = groups.get(j.question) ?? { yes: [], no: [] };
    (j.yes ? g.yes : g.no).push(rec);
    groups.set(j.question, g);
  }
  // levier calculé : nuit ≥ cible (pas besoin du journal)
  const sleep = { yes: [] as number[], no: [] as number[] };
  for (const d of model.days) {
    if (d.recovery == null || d.asleepMin == null) continue;
    (d.asleepMin >= sleepTargetMin ? sleep.yes : sleep.no).push(d.recovery);
  }
  const all: Lever[] = [];
  const push = (id: string, label: string, question: string, g: { yes: number[]; no: number[] }) => {
    const ym = mean(g.yes), nm = mean(g.no);
    if (ym == null || nm == null) return;
    all.push({ id, label, question, diff: ym - nm, yesN: g.yes.length, noN: g.no.length, yesMean: ym, noMean: nm });
  };
  const h = Math.floor(sleepTargetMin / 60), m = sleepTargetMin % 60;
  push("sleep-target", `Nuit de ${h} h ${String(m).padStart(2, "0")} ou plus`, "calculé depuis le sommeil", sleep);
  for (const [q, g] of groups) push(q, leverLabel(q), q, g);
  const ok = (l: Lever) => l.yesN >= LEVER_MIN_DAYS && l.noN >= LEVER_MIN_DAYS;
  return {
    ranked: all.filter(ok).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
    thin: all.filter((l) => !ok(l)),
  };
}

// ─── Semaines réussies & jalons (données réelles uniquement) ───

/** Séances d'une semaine : séances du plan cochées si la semaine est dans le plan, sinon entraînements WHOOP ≥ 20 min. */
export function sessionsInWeek(model: Model, week: DayKey[], plan: Plan | null, tracking: Tracking): number {
  const whoop = week.reduce(
    (n, d) => n + (model.workoutsByDay.get(d) ?? []).filter((w) => (w.durationMin ?? 0) >= 20).length,
    0,
  );
  if (!plan) return whoop;
  const pw = allWeeks(plan).find((w) => w.start <= week[6] && w.end >= week[0]);
  if (!pw) return whoop;
  const ticked = pw.sessions.filter((s) => sessionMark(s, tracking, model.today).done).length;
  return Math.max(ticked, whoop);
}

export interface WeekStat {
  monday: DayKey;
  sessions: number;
  strainSum: number;
  success: boolean;
}

export function weekStats(model: Model, plan: Plan | null, tracking: Tracking, target: number): WeekStat[] {
  const out: WeekStat[] = [];
  let monday = addDays(model.first, -weekdayIndex(model.first));
  while (monday <= model.today) {
    const wk = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const sessions = sessionsInWeek(model, wk, plan, tracking);
    const strainSum = wk.reduce((a, d) => a + (model.byDay.get(d)?.strain ?? 0), 0);
    out.push({ monday, sessions, strainSum, success: sessions >= target });
    monday = addDays(monday, 7);
  }
  return out;
}

/** Série en cours de semaines réussies (la semaine en cours ne casse pas la série tant qu'elle n'est pas finie). */
export function currentStreak(stats: WeekStat[]): number {
  let n = 0;
  for (let i = stats.length - 1; i >= 0; i--) {
    const isCurrent = i === stats.length - 1;
    if (stats[i].success) n++;
    else if (!isCurrent) break;
  }
  return n;
}

export interface Milestone {
  id: string;
  date: DayKey;
  title: string;
  detail: string;
  kind: "streak" | "volume" | "record" | "sleep";
}

export function milestones(model: Model, plan: Plan | null, tracking: Tracking, sessionsTarget: number, sleepTarget: number): Milestone[] {
  const out: Milestone[] = [];
  const stats = weekStats(model, plan, tracking, sessionsTarget);
  const closed = stats.slice(0, -1);

  // meilleure série de semaines réussies
  let best = 0, run = 0, bestEnd = "";
  for (const s of closed) {
    run = s.success ? run + 1 : 0;
    if (run > best) { best = run; bestEnd = s.monday; }
  }
  const cur = currentStreak(stats);
  if (cur >= 2)
    out.push({ id: "streak-now", date: stats.at(-1)!.monday, kind: "streak", title: `${cur} semaines réussies d'affilée`, detail: `${sessionsTarget} séances ou plus chaque semaine` });
  if (best >= 2 && best > cur)
    out.push({ id: "streak-best", date: addDays(bestEnd, 6), kind: "streak", title: `Record : ${best} semaines d'affilée`, detail: "ta plus longue série à ce jour" });

  // plus grosse semaine (strain cumulé) sur les 90 derniers jours
  const recent = closed.filter((s) => dayOrdinal(s.monday) >= dayOrdinal(model.today) - 90);
  const big = recent.reduce<WeekStat | null>((a, s) => (!a || s.strainSum > a.strainSum ? s : a), null);
  if (big)
    out.push({ id: "big-week", date: addDays(big.monday, 6), kind: "volume", title: "Plus grosse semaine des 3 derniers mois", detail: `strain cumulé ${Math.round(big.strainSum)} · ${big.sessions} séances` });

  // série de nuits ≥ cible
  let nights = 0, bestN = 0, bestNEnd = "";
  for (const d of model.days) {
    nights = d.asleepMin != null && d.asleepMin >= sleepTarget ? nights + 1 : 0;
    if (nights > bestN) { bestN = nights; bestNEnd = d.date; }
  }
  if (bestN >= 4) {
    const h = Math.floor(sleepTarget / 60), m = sleepTarget % 60;
    out.push({ id: "sleep-run", date: bestNEnd, kind: "sleep", title: `${bestN} nuits de suite à ${h} h ${String(m).padStart(2, "0")} ou plus`, detail: "ta meilleure série de sommeil" });
  }

  // records aux tests du plan
  if (plan) {
    for (const b of plan.benchmarks) {
      const done = allTests(plan).filter((t) => t.benchmarkId === b.id && t.result != null && t.date <= model.today).sort((x, y) => x.date.localeCompare(y.date));
      let bestV: number | null = null;
      for (const t of done) {
        const better = bestV == null ? false : b.better === "higher" ? t.result! > bestV : t.result! < bestV;
        if (better)
          out.push({
            id: `rec-${t.id}`,
            date: t.date,
            kind: "record",
            title: `Record au test : ${b.label}`,
            detail: `${formatBench(t.result!, b.unit)} (avant ${formatBench(bestV!, b.unit)})`,
          });
        if (bestV == null || (b.better === "higher" ? t.result! > bestV : t.result! < bestV)) bestV = t.result!;
      }
    }
  }
  // un seul record par repère (le plus récent), pour laisser la place aux autres jalons
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((m) => {
      if (m.kind !== "record") return true;
      const key = m.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
