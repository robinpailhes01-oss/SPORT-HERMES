import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TickRow } from "./TickRow";
import { allWeeks, blockFor, sessionMark, weekFor, weekProgress } from "@/lib/plan";
import { dayOrdinal, formatBench, formatDayMonth, formatDayShort, formatWeekdayShort } from "@/lib/format";
import { color, duration, ease } from "@/lib/tokens";
import type { PlanSession, PlanWeek, SessionType } from "@/types/plan";
import { cn } from "@/lib/utils";

export const TYPE_LABEL: Record<SessionType, string> = {
  force: "Force",
  hypertrophie: "Hypertrophie",
  zone2: "Zone 2",
  intervalles: "Intervalles",
  hyrox: "Hyrox",
  mobilite: "Mobilité",
  autre: "Autre",
};

/** La to-do de la semaine du plan : un tap = coché, appui long = note. */
export function WeekPlan() {
  const { plan, selected, model } = useDashboard();

  if (!plan) {
    return (
      <Card aria-labelledby="week-plan-title" className="h-full">
        <CardHeader id="week-plan-title" title="Séances de la semaine" />
        <EmptyNote title="Aucun plan chargé.">
          Le plan (blocs, semaines, séances, tests) est lu depuis <span className="mono">data/plan.json</span>, écrit par
          le coach IA.
        </EmptyNote>
      </Card>
    );
  }

  const weeks = allWeeks(plan);
  let week = weekFor(plan, selected);
  let state: "active" | "before" | "after" = "active";
  if (!week && selected < plan.start) {
    week = weeks[0];
    state = "before";
  } else if (!week) {
    week = weeks.at(-1)!;
    state = "after";
  }
  const block = blockFor(plan, week.start);
  const daysToStart = dayOrdinal(plan.start) - dayOrdinal(selected);

  return (
    <Card aria-labelledby="week-plan-title" className="h-full">
      <WeekHeader week={week} total={weeks.length} blockName={block?.name} demo={!!plan.demo} />

      {state === "before" ? (
        <p className="mb-3 rounded-[12px] border border-dashed border-white/10 px-3 py-2.5 text-[13px] text-muted">
          Le plan commence <span className="text-text">{formatDayShort(plan.start)}</span> — dans {daysToStart} jour
          {daysToStart > 1 ? "s" : ""}. Aperçu de la semaine 1 :
        </p>
      ) : state === "after" ? (
        <p className="mb-3 text-[13px] text-muted">Plan terminé le {formatDayShort(plan.end)}. Dernière semaine :</p>
      ) : null}

      <ul className="-mx-2">
        {week.sessions.map((s) => (
          <SessionItem key={s.id} session={s} disabled={state === "before" || selected < model.first} />
        ))}
      </ul>

      {week.tests.length ? <WeekTests week={week} /> : null}

      <p className="mono mt-4 hidden text-[10px] text-faint md:block">
        clic = fait · appui long ou « N » = note · la date de réalisation est le jour sélectionné
      </p>
    </Card>
  );
}

function WeekHeader({ week, total, blockName, demo }: { week: PlanWeek; total: number; blockName?: string; demo: boolean }) {
  const { tracking, model, plan } = useDashboard();
  const reduce = useReducedMotion();
  const { done } = weekProgress(week, tracking, model.today);
  const target = plan?.targets.sessionsPerWeek ?? week.sessions.length;
  const reached = done >= target;
  return (
    <header className="mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="week-plan-title" className="text-[13px] font-medium text-text">
              Semaine {week.index}
              <span className="text-muted"> / {total}</span>
            </h2>
            {demo ? <Badge>Plan démo</Badge> : null}
          </div>
          <p className="mono mt-1 truncate text-[11px] text-muted">
            {blockName ? `${blockName} · ` : ""}
            {formatDayMonth(week.start)} → {formatDayMonth(week.end)}
          </p>
        </div>
        <p className="shrink-0 text-right" aria-label={`${done} séances faites sur ${target}`}>
          <span className="display-num text-[30px]" style={{ color: reached ? color.recHigh : color.text }}>
            {done}
          </span>
          <span className="display-num text-[18px] text-muted">/{target}</span>
        </p>
      </div>
      {/* jauge segmentée : un segment par séance visée */}
      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: Math.max(target, week.sessions.length) }, (_, i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ backgroundColor: reached ? color.recHigh : color.text }}
              initial={false}
              animate={{ scaleX: i < done ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { duration: duration.base, ease: ease.out, delay: i * 0.03 }}
            />
          </div>
        ))}
      </div>
    </header>
  );
}

function SessionItem({ session, disabled }: { session: PlanSession; disabled: boolean }) {
  const { tracking, actions, selected, model } = useDashboard();
  const mark = sessionMark(session, tracking, model.today);
  const [editing, setEditing] = useState(false);
  const reduce = useReducedMotion();

  return (
    <li className="border-b border-hairline last:border-b-0">
      <TickRow
        checked={mark.done}
        disabled={disabled}
        onToggle={() => actions.toggleSession(session, mark.done, selected)}
        onLongPress={disabled ? undefined : () => setEditing(true)}
        title={session.title}
        meta={
          mark.done && mark.doneOn ? (
            <span>fait {formatWeekdayShort(mark.doneOn)} {mark.doneOn.slice(8)}</span>
          ) : (
            <span className="text-faint">{TYPE_LABEL[session.type]}</span>
          )
        }
      >
        <span className={cn("mt-0.5 block text-[13px] leading-5", mark.done ? "text-muted/70" : "text-muted")}>
          {session.detail}
        </span>
        {mark.note && !editing ? (
          <span className="mt-1.5 block border-l border-white/15 pl-2.5 text-[13px] italic leading-5 text-text/75">
            {mark.note}
          </span>
        ) : null}
      </TickRow>
      <AnimatePresence initial={false}>
        {editing ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : duration.base, ease: ease.out }}
            className="overflow-hidden"
          >
            <NoteEditor
              initial={mark.note ?? ""}
              onCancel={() => setEditing(false)}
              onSave={(text) => {
                actions.setNote(session, mark, text);
                setEditing(false);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

function NoteEditor({ initial, onSave, onCancel }: { initial: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="px-2 pb-3 pl-[50px]">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(text);
        }}
        rows={2}
        placeholder="Sensations, charges réelles, douleur…"
        className="w-full resize-none rounded-[10px] border border-line bg-black/25 px-3 py-2 text-[14px] text-text placeholder:text-faint focus:border-white/25 focus:outline-none"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" onClick={() => onSave(text)}>
          Enregistrer la note
        </Button>
      </div>
    </div>
  );
}

function WeekTests({ week }: { week: PlanWeek }) {
  const { plan, model } = useDashboard();
  const byDate = new Map<string, typeof week.tests>();
  for (const t of week.tests) byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
  return (
    <div className="mt-4 rounded-[14px] border border-line bg-white/[0.02] p-3.5">
      {[...byDate].map(([date, tests]) => {
        const past = date <= model.today;
        return (
          <div key={date}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] text-text">
                Test <span className="text-muted">· {formatDayShort(date)}</span>
              </p>
              <span className="mono text-[11px] text-muted">
                {past ? "fait" : `dans ${dayOrdinal(date) - dayOrdinal(model.today)} j`}
              </span>
            </div>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {tests.map((t) => {
                const b = plan?.benchmarks.find((x) => x.id === t.benchmarkId);
                return (
                  <li key={t.id} className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span className="text-muted">{t.exercise}</span>
                    <span className="mono text-text">{past && t.result != null && b ? formatBench(t.result, b.unit) : "—"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-dashed border-white/[0.1] px-4 py-4">
      <p className="text-[13px] text-text">{title}</p>
      <p className="mt-1 text-[12px] leading-5 text-muted">{children}</p>
    </div>
  );
}
