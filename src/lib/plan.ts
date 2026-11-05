import { useCallback, useEffect, useMemo, useState } from "react";
import type { DayKey } from "@/types/whoop";
import type { EveningKey, Plan, PlanSession, PlanTest, PlanWeek, SessionMark, Tracking } from "@/types/plan";

/**
 * Saisies de Robin : séances cochées (+ notes), checklist du soir, pesées.
 *
 * TOUTE lecture/écriture passe par `persistence` ci-dessous. Aujourd'hui : localStorage.
 * Plus tard : remplacer `load` / `save` par des appels à l'API (le reste de l'app ne change pas).
 */
export interface Persistence {
  load(): Tracking | null;
  save(state: Tracking): void;
}

function localStoragePersistence(key: string): Persistence {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Tracking) : null;
      } catch {
        return null;
      }
    },
    save(state) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* stockage indisponible (navigation privée) : l'état reste en mémoire */
      }
    },
  };
}

const EMPTY: Tracking = { sessions: {}, evening: {}, weights: {} };

/**
 * Hook unique d'état des saisies. `seed` = valeurs de départ (démo ou API) ;
 * ce que Robin saisit dans l'app est superposé par-dessus.
 */
export function useTracking(opts: { demo: boolean; seed?: Partial<Tracking> | null }) {
  const persistence = useMemo(
    () => localStoragePersistence(`sport-hermes:tracking:v1${opts.demo ? ":demo" : ""}`),
    [opts.demo],
  );
  const [local, setLocal] = useState<Tracking>(() => persistence.load() ?? EMPTY);
  useEffect(() => persistence.save(local), [local, persistence]);

  const state: Tracking = useMemo(
    () => ({
      sessions: { ...(opts.seed?.sessions ?? {}), ...local.sessions },
      evening: mergeEvening(opts.seed?.evening ?? {}, local.evening),
      weights: { ...(opts.seed?.weights ?? {}), ...local.weights },
    }),
    [local, opts.seed],
  );

  const toggleSession = useCallback((s: PlanSession, current: boolean, day: DayKey) => {
    setLocal((t) => ({
      ...t,
      sessions: { ...t.sessions, [s.id]: { ...t.sessions[s.id], done: !current, doneOn: current ? null : day } },
    }));
  }, []);

  const setNote = useCallback((s: PlanSession, mark: SessionMark, note: string) => {
    setLocal((t) => ({ ...t, sessions: { ...t.sessions, [s.id]: { ...mark, note: note.trim() || null } } }));
  }, []);

  const toggleEvening = useCallback((day: DayKey, key: EveningKey, current: boolean) => {
    setLocal((t) => ({ ...t, evening: { ...t.evening, [day]: { ...t.evening[day], [key]: !current } } }));
  }, []);

  const setWeight = useCallback((day: DayKey, kg: number | null) => {
    setLocal((t) => {
      const weights = { ...t.weights };
      if (kg == null) delete weights[day];
      else weights[day] = Math.round(kg * 10) / 10;
      return { ...t, weights };
    });
  }, []);

  return { state, toggleSession, setNote, toggleEvening, setWeight };
}

function mergeEvening(a: Tracking["evening"], b: Tracking["evening"]): Tracking["evening"] {
  const out: Tracking["evening"] = { ...a };
  for (const [d, v] of Object.entries(b)) out[d] = { ...a[d], ...v };
  return out;
}

export type TrackingApi = ReturnType<typeof useTracking>;

// ─────────────────────────────────────────────────────────────
// Lecture du plan (fonctions pures)
// ─────────────────────────────────────────────────────────────

export const allWeeks = (plan: Plan): PlanWeek[] => plan.blocks.flatMap((b) => b.weeks);
export const allTests = (plan: Plan): PlanTest[] => allWeeks(plan).flatMap((w) => w.tests);

export function weekFor(plan: Plan, day: DayKey): PlanWeek | null {
  return allWeeks(plan).find((w) => day >= w.start && day <= w.end) ?? null;
}
export function blockFor(plan: Plan, day: DayKey) {
  return plan.blocks.find((b) => day >= b.start && day <= b.end) ?? null;
}

/** État effectif d'une séance : saisie locale > état écrit dans le plan. Une date future ne compte pas. */
export function sessionMark(s: PlanSession, tracking: Tracking, today: DayKey): SessionMark {
  const m = tracking.sessions[s.id] ?? { done: s.done, doneOn: s.doneOn, note: s.note ?? null };
  if (m.done && m.doneOn && m.doneOn > today) return { ...m, done: false, doneOn: null };
  return { note: s.note ?? null, ...m };
}

export function weekProgress(week: PlanWeek, tracking: Tracking, today: DayKey) {
  const done = week.sessions.filter((s) => sessionMark(s, tracking, today).done).length;
  return { done, total: week.sessions.length };
}

/** Test le plus proche à venir (ou aujourd'hui). */
export function nextTestDate(plan: Plan, today: DayKey): DayKey | null {
  const dates = [...new Set(allTests(plan).map((t) => t.date))].sort();
  return dates.find((d) => d >= today) ?? null;
}

export function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}
