import { useCallback, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import { getData, SyncError } from "@/lib/data";
import { buildModel } from "@/lib/metrics";
import type { Dataset } from "@/types/whoop";
import { DashboardProvider, useDashboard } from "@/state/dashboard";
import { Header } from "@/components/Header";
import { Halo } from "@/components/Halo";
import { Hero } from "@/components/Hero";
import { WeekLoad } from "@/components/WeekLoad";
import { Trends } from "@/components/Trends";
import { Workouts } from "@/components/Workouts";
import { Performances } from "@/components/Performances";
import { DashboardSkeleton, EmptyState, SyncErrorState } from "@/components/States";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { startIntro } from "@/hooks/motion";
import { recoveryZone, zoneColor } from "@/lib/metrics";
import { color } from "@/lib/tokens";

type Status =
  | { kind: "loading" }
  | { kind: "error"; message: string; detail?: string }
  | { kind: "ready"; data: Dataset };

export default function App() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus({ kind: "loading" });
    getData(ctrl.signal)
      .then((data) => setStatus({ kind: "ready", data }))
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        const err = e instanceof SyncError ? e : new SyncError("Synchronisation impossible", String(e));
        setStatus({ kind: "error", message: err.message, detail: err.detail });
      });
    return () => ctrl.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const model = useMemo(() => (status.kind === "ready" ? buildModel(status.data) : null), [status]);

  return (
    <MotionConfig reducedMotion="user">
      <Shell>
        {status.kind === "loading" ? (
          <>
            <Halo color={color.muted} intensity={0.35} />
            <Header selected={null} demo={false} sync={{ kind: "loading" }} showRange={false} />
            <DashboardSkeleton />
          </>
        ) : status.kind === "error" ? (
          <>
            <Halo color={color.recLow} intensity={0.3} />
            <Header selected={null} demo={false} sync={{ kind: "error" }} showRange={false} />
            <SyncErrorState message={status.message} detail={status.detail} onRetry={retry} />
          </>
        ) : !model ? (
          <>
            <Halo color={color.muted} intensity={0.35} />
            <Header selected={null} demo={status.data.demo} sync={{ kind: "ok", at: status.data.syncedAt }} showRange={false} />
            <EmptyState />
          </>
        ) : (
          <DashboardProvider data={status.data} model={model}>
            <Dashboard />
          </DashboardProvider>
        )}
      </Shell>
    </MotionConfig>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh">
      <main className="pb-safe mx-auto w-full max-w-[1320px] px-4 md:px-8">{children}</main>
    </div>
  );
}

function Dashboard() {
  const { model, selected, data, step, goToday } = useDashboard();
  startIntro();
  useKeyboardNav(step, goToday);
  const day = model.byDay.get(selected);
  const zone = recoveryZone(day?.recovery);

  return (
    <>
      <Halo color={zoneColor[zone]} intensity={zone === "none" ? 0.4 : 1} />
      <Header selected={selected} demo={data.demo} sync={{ kind: "ok", at: data.syncedAt }} />
      <div className="space-y-3 md:space-y-6">
        <Hero />
        <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <WeekLoad />
          </div>
          <div className="lg:col-span-7">
            <Trends />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Workouts />
          </div>
          <div className="lg:col-span-5">
            <Performances />
          </div>
        </div>
        <footer className="mono flex flex-wrap justify-between gap-2 pt-2 text-[10px] text-faint md:pt-4">
          <span className="hidden md:inline">← → changer de jour · Échap aujourd'hui</span>
          <span className="md:hidden">glisser l'anneau pour changer de jour</span>
          <span>{data.demo ? "données de démonstration — pas tes vraies mesures" : "source : export WHOOP"}</span>
        </footer>
      </div>
    </>
  );
}
