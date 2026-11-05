import type { DayKey } from "@/types/whoop";

const LOCALE = "fr-FR";

/** "2026-11-05" → Date à midi UTC (évite tout décalage de fuseau). */
export function dayToDate(day: DayKey): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Nombre de jours depuis l'epoch — abscisse continue des graphiques. */
export function dayOrdinal(day: DayKey): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function ordinalToDay(ord: number): DayKey {
  const t = new Date(ord * 86_400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export function addDays(day: DayKey, n: number): DayKey {
  return ordinalToDay(dayOrdinal(day) + n);
}

/** 0 = lundi … 6 = dimanche */
export function weekdayIndex(day: DayKey): number {
  return (dayToDate(day).getUTCDay() + 6) % 7;
}

const fmtLong = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fmtShort = new Intl.DateTimeFormat(LOCALE, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const fmtDayMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const fmtMonth = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });
const fmtWeekdayShort = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Jeudi 5 novembre" */
export const formatDayLong = (d: DayKey) => cap(fmtLong.format(dayToDate(d)));
/** "jeu. 5 nov." */
export const formatDayShort = (d: DayKey) => fmtShort.format(dayToDate(d));
/** "5 nov." */
export const formatDayMonth = (d: DayKey) => fmtDayMonth.format(dayToDate(d));
/** "nov." */
export const formatMonth = (d: DayKey) => fmtMonth.format(dayToDate(d));
/** "jeu." */
export const formatWeekdayShort = (d: DayKey) => fmtWeekdayShort.format(dayToDate(d));
/** "L", "M", … */
export const weekdayInitial = (d: DayKey) => "LMMJVSD"[weekdayIndex(d)];
/** "05/11" */
export const formatDDMM = (d: DayKey) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function relativeDay(day: DayKey, today: DayKey): string {
  const diff = dayOrdinal(today) - dayOrdinal(day);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff > 1) return `Il y a ${diff} jours`;
  return formatDayShort(day);
}

const numFmt = new Map<number, Intl.NumberFormat>();
export function formatNumber(v: number, decimals = 0): string {
  let f = numFmt.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    numFmt.set(decimals, f);
  }
  return f.format(v);
}

/** 62 → "62 min", 95 → "1 h 35" */
export function formatDuration(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** 432 → "7 h 12" */
export function formatSleep(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** "2026-11-05 07:12:04" → "05/11 · 07:12" */
export function formatSync(ts: string | null): string {
  if (!ts) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(ts);
  if (!m) return ts;
  return `${m[3]}/${m[2]} · ${m[4]}:${m[5]}`;
}

/** secondes → "21:34" ou "1:12:05" */
export function formatChrono(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return h ? `${h}:${mm}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
}

/** Valeur d'un repère selon son unité : "87,5 kg", "11 reps", "21:41" */
export function formatBench(v: number, unit: "kg" | "reps" | "s"): string {
  if (unit === "kg") return `${formatNumber(v, v % 1 ? 1 : 0)} kg`;
  if (unit === "reps") return `${formatNumber(v)} reps`;
  return formatChrono(v);
}

/** minutes depuis minuit (peut être négatif / > 1440) → "23:45" */
export function formatClock(min: number | null): string {
  if (min == null) return "—";
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
