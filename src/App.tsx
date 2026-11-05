import { useCallback, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import { getData, getDemoTracking, SyncError, type AppData } from "@/lib/data";
import { buildModel, recoveryZone, zoneColor } from "@/lib/metrics";
import type { Tracking } from "@/types/plan";
import { DashboardProvider, useDashboard } from "@/state/dashboard";
import { Header } from "@/components/Header";
import { Halo } from "@/components/Halo";
import { Hero } from "@/components/Hero";
import { WeekPlan } from "@/components/WeekPlan";
import { Evening } from "@/components/Evening";
import { WeekGoals } from "@/components/WeekGoals";
import { PlanTimeline } from "@/components/PlanTimeline";
import { Performances } from "@/components/Performances";
import { WeightCard } from "@/components/WeightCard";
import { SleepCard } from "@/components/SleepCard";
import { WeekLoad } from "@/components/WeekLoad";
import { Levers } from "@/components/Levers";
import { Milestones } from "@/components/Milestones";
import { DashboardSkeleton, EmptyState, SyncErrorState } from "@/components/States";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { startIntro } from "@/hooks/motion";
import { color } from "@/lib/tokens";

type Status =
  | { kind: "loading" }
  | { kind: "error"; message: string; detail?: string }
  | { kind: "ready"; data: AppData; seed: Partial<Tracking> | null };

export default function App() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus({ kind: "loading" });
    (async () => {
      const data = await getData(ctrl.signal);
      // graines de démo (pesées, checklist du soir) seulement si les données sont de démo
      const seed = data.whoop.demo || data.plan?.demo ? await getDemoTracking(ctrl.signal) : null;
      setStatus({ kind: "ready", data, seed: seed as Partial<Tracking> | null });
    })().catch((e: unknown) => {
      if ((e as Error).name === "AbortError") return;
      const err = e instanceof SyncError ? e : new SyncError("Synchronisation impossible", String(e));
      setStatus({ kind: "error", message: err.message, detail: err.detail });
    });
    return () => ctrl.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const model = useMemo(() => (status.kind === "ready" ? buildModel(status.data.whoop) : null), [status]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate min-h-dvh">
        <main className="pb-safe mx-auto w-full max-w-[1320px] px-4 md:px-8">
          {status.kind === "loading" ? (
            <>
              <Halo color={color.muted} intensity={0.35} />
              <Header selected={null} demo={false} sync={{ kind: "loading" }} />
              <DashboardSkeleton />
            </>
          ) : status.kind === "error" ? (
            <>
              <Halo color={color.recLow} intensity={0.3} />
              <Header selected={null} demo={false} sync={{ kind: "error" }} />
              <SyncErrorState message={status.message} detail={status.detail} onRetry={retry} />
            </>
          ) : !model ? (
            <>
              <Halo color={color.muted} intensity={0.35} />
              <Header selected={null} demo={status.data.whoop.demo} sync={{ kind: "ok", at: status.data.whoop.syncedAt }} />
              <EmptyState />
            </>
          ) : (
            <DashboardProvider data={status.data.whoop} model={model} plan={status.data.plan} seed={status.seed}>
              <Dashboard />
            </DashboardProvider>
          )}
        </main>
      </div>
    </MotionConfig>
  );
}

function Dashboard() {
  const { model, selected, data, plan, step, goToday } = useDashboard();
  startIntro();
  useKeyboardNav(step, goToday);
  const zone = recoveryZone(model.byDay.get(selected)?.recovery);
  const missing = data.diagnostics.filter((d) => d.source === "real" && d.missing.length);

  return (
    <>
      <Halo color={zoneColor[zone]} intensity={zone === "none" ? 0.4 : 1} />
      <Header selected={selected} demo={data.demo} sync={{ kind: "ok", at: data.syncedAt }} />
      <div className="space-y-3 md:space-y-6">
        {/* 1. Le matin : verdict */}
        <Hero />

        {/* 2. La semaine : to-do du plan + soir + objectifs */}
        <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <WeekPlan />
          </div>
          <div className="flex flex-col gap-3 md:gap-6 lg:col-span-5">
            <Evening />
            <WeekGoals />
          </div>
        </div>

        {/* 3. La progression */}
        <PlanTimeline />
        <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Performances />
          </div>
          <div className="lg:col-span-5">
            <WeightCard />
          </div>
        </div>

        {/* 4. Ce qui fait bouger la récup */}
        <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SleepCard />
          </div>
          <div className="lg:col-span-5">
            <WeekLoad />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Levers />
          </div>
          <div className="lg:col-span-5">
            <Milestones />
          </div>
        </div>

        <footer className="mono flex flex-col gap-1 pt-2 text-[10px] text-faint md:flex-row md:justify-between md:pt-4">
          <span className="hidden md:inline">← → changer de jour · Échap aujourd'hui</span>
          <span className="md:hidden">glisser l'anneau pour changer de jour</span>
          <span>
            {data.demo ? "WHOOP : données de démonstration" : "WHOOP : ton export"}
            {plan?.demo ? " · plan : exemple de démo" : ""}
          </span>
          {missing.length ? (
            <span style={{ color: color.recMid }}>
              colonnes non reconnues : {missing.map((d) => `${d.file} (${d.missing.join(", ")})`).join(" · ")}
            </span>
          ) : null}
        </footer>
      </div>
    </>
  );
}
