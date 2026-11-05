import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { Dataset, DayKey } from "@/types/whoop";
import type { Plan, Tracking } from "@/types/plan";
import { addDays } from "@/lib/format";
import { buildModel, type Model } from "@/lib/metrics";
import { useTracking, type TrackingApi } from "@/lib/plan";

/**
 * État global : LE jour sélectionné pilote tout l'écran (verdict, to-do de la semaine,
 * checklist du soir, halo…). `hover` est partagé entre graphiques.
 */
interface State {
  selected: DayKey;
  hover: DayKey | null;
}

type Action = { type: "select"; day: DayKey } | { type: "step"; by: number } | { type: "today" } | { type: "hover"; day: DayKey | null };

function reducer(model: Model) {
  const clampDay = (d: DayKey) => (d < model.first ? model.first : d > model.today ? model.today : d);
  return (s: State, a: Action): State => {
    switch (a.type) {
      case "select":
        return { ...s, selected: clampDay(a.day) };
      case "step":
        return { ...s, selected: clampDay(addDays(s.selected, a.by)) };
      case "today":
        return { ...s, selected: model.today };
      case "hover":
        return a.day === s.hover ? s : { ...s, hover: a.day };
    }
  };
}

interface Ctx extends State {
  model: Model;
  data: Dataset;
  plan: Plan | null;
  tracking: Tracking;
  actions: Omit<TrackingApi, "state">;
  isToday: boolean;
  select: (day: DayKey) => void;
  step: (by: number) => void;
  goToday: () => void;
  setHover: (day: DayKey | null) => void;
}

const DashboardContext = createContext<Ctx | null>(null);

export function DashboardProvider({
  data,
  model,
  plan,
  seed,
  children,
}: {
  data: Dataset;
  model: Model;
  plan: Plan | null;
  seed: Partial<Tracking> | null;
  children: ReactNode;
}) {
  const reduce = useMemo(() => reducer(model), [model]);
  const [state, dispatch] = useReducer(reduce, undefined, () => ({ selected: model.today, hover: null }));
  const { state: tracking, ...actions } = useTracking({ demo: data.demo || !!plan?.demo, seed });

  const select = useCallback((day: DayKey) => dispatch({ type: "select", day }), []);
  const step = useCallback((by: number) => dispatch({ type: "step", by }), []);
  const goToday = useCallback(() => dispatch({ type: "today" }), []);
  const setHover = useCallback((day: DayKey | null) => dispatch({ type: "hover", day }), []);

  const value = useMemo<Ctx>(
    () => ({ ...state, model, data, plan, tracking, actions, isToday: state.selected === model.today, select, step, goToday, setHover }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, model, data, plan, tracking, select, step, goToday, setHover],
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard doit être utilisé dans <DashboardProvider>");
  return ctx;
}

export { buildModel };
