/**
 * Schéma du plan d'entraînement (`public/data/plan.json`).
 * Écrit par le coach IA (puis servi par l'API) — l'app ne code en dur AUCUNE séance.
 * Version JSON Schema pour le coach : `public/data/plan.schema.json`.
 *
 * plan → blocs → semaines → séances + tests
 */
import type { DayKey } from "./whoop";

export type SessionType = "force" | "hypertrophie" | "zone2" | "intervalles" | "hyrox" | "mobilite" | "autre";

export interface PlanSession {
  id: string;
  title: string;
  type: SessionType;
  /** une ligne : exercices, charges, consignes */
  detail: string;
  /** cochée (état initial écrit par le coach ; l'app superpose ce que Robin coche) */
  done: boolean;
  /** date de réalisation */
  doneOn: DayKey | null;
  note?: string | null;
}

export type BenchmarkUnit = "kg" | "reps" | "s";

export interface Benchmark {
  id: string;
  label: string;
  unit: BenchmarkUnit;
  better: "higher" | "lower";
  /** repère de départ ; `estimated` = à confirmer au premier test */
  baseline: { value: number; estimated: boolean; display?: string } | null;
  /** objectif fixé par le coach (facultatif) */
  target?: number | null;
}

export interface PlanTest {
  id: string;
  date: DayKey;
  benchmarkId: string;
  exercise: string;
  /** null tant que le test n'est pas fait */
  result: number | null;
  unit: BenchmarkUnit;
}

export interface PlanWeek {
  id: string;
  /** 1…n dans le plan */
  index: number;
  start: DayKey;
  end: DayKey;
  sessions: PlanSession[];
  tests: PlanTest[];
}

export interface PlanBlock {
  id: string;
  name: string;
  goal: string;
  start: DayKey;
  end: DayKey;
  weeks: PlanWeek[];
}

export interface Plan {
  schema: "sport-hermes/plan@1";
  demo?: boolean;
  id: string;
  title: string;
  goal: string;
  start: DayKey;
  end: DayKey;
  /** échéance après le plan (ex. Hyrox solo) — date fournie par le coach */
  event?: { name: string; date: DayKey; description?: string } | null;
  targets: {
    sessionsPerWeek: number;
    sleepMinutes: number;
    /** "HH:MM" */
    bedtime: string;
    weight?: { startKg?: number | null; gainPerWeekKg: [number, number] } | null;
  };
  benchmarks: Benchmark[];
  blocks: PlanBlock[];
}

// ─── Saisies de Robin dans l'app (cases, notes, pesées, checklist du soir) ───

export interface SessionMark {
  done: boolean;
  doneOn: DayKey | null;
  note?: string | null;
}

export type EveningKey = "protein" | "recoveryDrink" | "bedtime";
export type EveningChecks = Partial<Record<EveningKey, boolean>>;

export interface Tracking {
  sessions: Record<string, SessionMark>;
  evening: Record<DayKey, EveningChecks>;
  /** kg, une pesée par jour */
  weights: Record<DayKey, number>;
}
