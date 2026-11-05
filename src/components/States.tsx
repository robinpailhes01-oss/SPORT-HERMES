import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

/** Squelette de verre : reprend exactement la grille réelle pour éviter tout saut de layout. */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des données" className="space-y-3 md:space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-6">
        <div className="col-span-2 flex flex-col items-center py-2 md:col-span-6 md:col-start-4 md:row-span-2 md:row-start-1 md:justify-center">
          <div className="skeleton-pulse size-[224px] rounded-full border-[12px] border-white/[0.05] md:size-[288px] md:border-[14px]" />
          <Skeleton className="mt-6 h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
        {[
          "md:col-span-3 md:col-start-1 md:row-start-1",
          "md:col-span-3 md:col-start-10 md:row-start-1",
          "md:col-span-3 md:col-start-1 md:row-start-2",
          "md:col-span-3 md:col-start-10 md:row-start-2",
        ].map((c) => (
          <div key={c} className={`glass min-h-[132px] p-4 md:min-h-[148px] md:p-5 ${c}`}>
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-5 h-8 w-20" />
            <Skeleton className="mt-5 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <Skeleton className="h-3.5 w-40" />
          <div className="mt-8 flex h-[150px] items-end justify-between gap-4 px-2">
            {[46, 70, 38, 84, 62, 90, 24].map((h, i) => (
              <Skeleton key={i} className="w-full rounded-[4px]" style={{ height: `${h}%` }} />
            ))}
          </div>
          <Skeleton className="mt-8 h-2.5 w-full rounded-full" />
        </Card>
        <Card className="lg:col-span-7">
          <Skeleton className="h-3.5 w-28" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="mt-6 h-[88px] w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}

export function SyncErrorState({ message, detail, onRetry }: { message: string; detail?: string; onRetry: () => void }) {
  return (
    <Card role="alert" className="mx-auto mt-[8vh] max-w-[520px] p-6 md:p-8">
      <p className="label" style={{ color: "var(--color-rec-low)" }}>
        Erreur de synchronisation
      </p>
      <h1 className="display-num mt-4 text-[26px] leading-tight md:text-[30px]">{message}</h1>
      <p className="mt-3 text-[14px] leading-6 text-muted">
        Les dernières données n'ont pas pu être récupérées. Rien n'est perdu : l'export WHOOP sera relu à la
        prochaine synchronisation.
      </p>
      {detail ? (
        <pre className="mono mt-5 overflow-x-auto rounded-[10px] border border-hairline bg-black/30 px-3 py-2.5 text-[11px] text-muted">
          {detail}
        </pre>
      ) : null}
      <div className="mt-6 flex gap-3">
        <Button onClick={onRetry}>Réessayer</Button>
      </div>
    </Card>
  );
}

export function EmptyState() {
  return (
    <div className="mx-auto mt-[4vh] flex max-w-[520px] flex-col items-center text-center">
      <div className="relative flex size-[200px] items-center justify-center rounded-full border-[12px] border-white/[0.05] md:size-[240px]">
        <span className="display-num text-[44px] text-muted">—</span>
      </div>
      <h1 className="mt-8 text-[18px] font-medium text-text">Aucune donnée pour l'instant</h1>
      <p className="mt-2 max-w-[400px] text-[14px] leading-6 text-muted">
        Dès que le premier export WHOOP sera importé, la récup, la charge et les tendances apparaîtront ici. Il
        faut au moins un cycle complet (une nuit) pour afficher un score.
      </p>
      <p className="mono mt-5 text-[11px] text-muted">
        attendu : physiological_cycles · workouts
      </p>
    </div>
  );
}
