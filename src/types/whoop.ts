/**
 * Modèle PROPRE des données WHOOP, utilisé par toute l'app.
 * Les en-têtes bruts de l'export (en français, avec espaces insécables…) ne sont
 * connus que de `src/lib/data.ts`, qui normalise vers ces types.
 */

/** Clé de jour locale, format YYYY-MM-DD (jour du réveil pour un cycle). */
export type DayKey = string;

export interface DayMetrics {
  date: DayKey;
  /** "YYYY-MM-DD HH:MM:SS" — clé de jointure avec sommeil et journal */
  cycleStart: string;
  recovery: number | null;
  rhr: number | null;
  hrv: number | null;
  strain: number | null;
  respiratoryRate: number | null;
  sleepPerformance: number | null;
  asleepMin: number | null;
  sleepNeedMin: number | null;
  sleepDebtMin: number | null;
  /** « Régularité du sommeil % » */
  sleepConsistency: number | null;
  /** heure d'endormissement, minutes relatives à minuit du jour du réveil (ex. -15 = 23:45 la veille) */
  sleepOnsetMin: number | null;
  /** heure de réveil, minutes depuis minuit */
  wakeMin: number | null;
}

export interface Workout {
  id: string;
  date: DayKey;
  /** "HH:MM" */
  time: string;
  start: string;
  /** nom brut de WHOOP — souvent « Activité » sans type : on ne s'en sert pas pour classer */
  activity: string;
  durationMin: number | null;
  strain: number | null;
  avgHr: number | null;
  maxHr: number | null;
  calories: number | null;
}

export interface JournalAnswer {
  /** jour du cycle auquel la réponse est rattachée */
  date: DayKey;
  question: string;
  yes: boolean;
}

export type SourceKind = "real" | "demo" | "missing";

export interface Diagnostics {
  file: string;
  source: SourceKind;
  rows: number;
  /** champs attendus introuvables dans les en-têtes */
  missing: string[];
}

export interface Dataset {
  /** vrai dès qu'une source WHOOP vient des fichiers de démo */
  demo: boolean;
  syncedAt: string | null;
  days: DayMetrics[];
  workouts: Workout[];
  journal: JournalAnswer[];
  diagnostics: Diagnostics[];
}
