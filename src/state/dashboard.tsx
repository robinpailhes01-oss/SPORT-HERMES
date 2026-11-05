import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { Dataset, DayKey } from "@/types/whoop";
import { addDays } from "@/lib/format";
import { buildModel, nextWindowEnd, type Model, type Range } from "@/lib/metrics";

/**
 * État global : LE jour sélectionné pilote tout l'écran (anneau, stats, halo,
 * semaine, séances, curseur des courbes). Le jour survolé (`hover`) est partagé
 * entre graphiques pour les liens de survol.
 */
interface State {
  selected: DayKey;
  range: Range;
  hover: DayKey | null;
  windowEnd: DayKey;
}

type Action =
  | { type: "select"; day: DayKey }
  | { type: "step"; by: number }
  | { type: "today" }
  | { type: "range"; range: Range }
  | { type: "hover"; day: DayKey | null };

function reducer(model: Model) {
  const clampDay = (d: DayKey) => (d < model.first ? model.first : d > model.today ? model.today : d);
  const withSelection = (s: State, day: DayKey): State => {
    const selected = clampDay(day);
    if (selected === s.selected) return s;
    return { ...s, selected, windowEnd: nextWindowEnd(s.windowEnd, selected, s.range, model) };
  };
  return (s: State, a: Action): State => {
    switch (a.type) {
      case "select":
        return withSelection(s, a.day);
      case "step":
        return withSelection(s, addDays(s.selected, a.by));
      case "today":
        return withSelection(s, model.today);
      case "range":
        return a.range === s.range
          ? s
          : { ...s, range: a.range, windowEnd: nextWindowEnd(s.windowEnd, s.selected, a.range, model) };
      case "hover":
        return a.day === s.hover ? s : { ...s, hover: a.day };
    }
  };
}

interface Ctx extends State {
  model: Model;
  data: Dataset;
  isToday: boolean;
  select: (day: DayKey) => void;
  step: (by: number) => void;
  goToday: () => void;
  setRange: (r: Range) => void;
  setHover: (day: DayKey | null) => void;
}

const DashboardContext = createContext<Ctx | null>(null);

export function DashboardProvider({ data, model, children }: { data: Dataset; model: Model; children: ReactNode }) {
  const reduce = useMemo(() => reducer(model), [model]);
  const [state, dispatch] = useReducer(reduce, undefined, () => ({
    selected: model.today,
    range: 30 as Range,
    hover: null,
    windowEnd: model.today,
  }));

  const select = useCallback((day: DayKey) => dispatch({ type: "select", day }), []);
  const step = useCallback((by: number) => dispatch({ type: "step", by }), []);
  const goToday = useCallback(() => dispatch({ type: "today" }), []);
  const setRange = useCallback((range: Range) => dispatch({ type: "range", range }), []);
  const setHover = useCallback((day: DayKey | null) => dispatch({ type: "hover", day }), []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      model,
      data,
      isToday: state.selected === model.today,
      select,
      step,
      goToday,
      setRange,
      setHover,
    }),
    [state, model, data, select, step, goToday, setRange, setHover],
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard doit être utilisé dans <DashboardProvider>");
  return ctx;
}

export { buildModel };
