import { motion, useReducedMotion } from "motion/react";
import { Badge } from "./ui/badge";
import { RangeToggle } from "./RangeToggle";
import { formatDayLong, formatSync } from "@/lib/format";
import { color } from "@/lib/tokens";

type SyncStatus = { kind: "ok"; at: string | null } | { kind: "loading" } | { kind: "error" };

/** Header discret : identité + date sélectionnée à gauche, état de sync + période à droite. */
export function Header({
  selected,
  demo,
  sync,
  showRange = true,
}: {
  selected: string | null;
  demo: boolean;
  sync: SyncStatus;
  showRange?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 md:py-5"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-text">Robin</p>
        <span aria-hidden className="h-3.5 w-px bg-line" />
        <p className="truncate text-[14px] text-muted">{selected ? formatDayLong(selected) : "—"}</p>
        {demo ? <Badge className="hidden sm:inline-flex">Données démo</Badge> : null}
      </div>

      <div className="flex items-center gap-4">
        <SyncLabel sync={sync} />
        {demo ? <Badge className="sm:hidden">Démo</Badge> : null}
        {showRange ? (
          <div className="hidden md:block">
            <RangeToggle />
          </div>
        ) : null}
      </div>
    </motion.header>
  );
}

function SyncLabel({ sync }: { sync: SyncStatus }) {
  if (sync.kind === "loading") return <span className="mono text-[11px] text-muted">sync…</span>;
  if (sync.kind === "error")
    return (
      <span className="mono inline-flex items-center gap-1.5 text-[11px]" style={{ color: color.recLow }}>
        <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: color.recLow }} />
        sync échouée
      </span>
    );
  return <span className="mono text-[11px] text-muted">sync {formatSync(sync.at)}</span>;
}
