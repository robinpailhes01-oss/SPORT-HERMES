import { useDashboard } from "@/state/dashboard";
import { Card, CardHeader } from "./ui/card";
import { BENCHMARKS, type Performance } from "@/types/whoop";
import { formatChrono, formatDDMM, formatNumber } from "@/lib/format";
import { color } from "@/lib/tokens";

function fmt(p: Performance, v: number) {
  return p.benchmark.unit === "kg" ? `${formatNumber(v, v % 1 ? 1 : 0)} kg` : formatChrono(v);
}

export function Performances() {
  const { data } = useDashboard();
  const byId = new Map(data.performances.map((p) => [p.benchmark.id, p]));
  const empty = data.performances.length === 0;

  return (
    <Card aria-labelledby="perf-title" className="h-full flex flex-col">
      <CardHeader id="perf-title" title="Performances" meta={empty ? "aucun repère" : `${data.performances.length} repères`} />

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="mono text-[10px] uppercase tracking-[0.08em] text-muted">
            <th scope="col" className="border-b border-hairline pb-2 font-normal">Repère</th>
            <th scope="col" className="border-b border-hairline pb-2 text-right font-normal">Valeur</th>
            <th scope="col" className="hidden border-b border-hairline pb-2 text-right font-normal sm:table-cell">Date</th>
            <th scope="col" className="border-b border-hairline pb-2 text-right font-normal">Évol.</th>
          </tr>
        </thead>
        <tbody>
          {BENCHMARKS.map((b) => {
            const p = byId.get(b.id);
            let evo: { text: string; good: boolean } | null = null;
            if (p && p.previous != null) {
              const diff = p.value - p.previous;
              const good = b.better === "higher" ? diff > 0 : diff < 0;
              evo = {
                text: `${diff > 0 ? "+" : "−"}${b.unit === "kg" ? formatNumber(Math.abs(diff), 1) : formatChrono(Math.abs(diff))}`,
                good,
              };
            }
            return (
              <tr key={b.id} className="h-11 border-b border-hairline last:border-b-0">
                <th scope="row" className="py-2 text-[13px] font-normal text-text">{b.label}</th>
                <td className="mono py-2 text-right text-[13px]">
                  {p ? <span className="text-text">{fmt(p, p.value)}</span> : <Placeholder />}
                </td>
                <td className="mono hidden py-2 text-right text-[11px] text-muted sm:table-cell">{p ? formatDDMM(p.date) : <Placeholder />}</td>
                <td className="mono py-2 text-right text-[11px]">
                  {evo ? (
                    <span style={{ color: evo.good ? color.recHigh : color.recLow }}>{evo.text}</span>
                  ) : (
                    <Placeholder />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {empty ? (
        <div className="mt-5 rounded-[12px] border border-dashed border-white/[0.1] px-4 py-4">
          <p className="text-[13px] text-text">Aucun repère enregistré pour l'instant.</p>
          <p className="mt-1 text-[12px] leading-5 text-muted">
            Les tests (3RM, clean, 5 km, Hyrox) ne viennent pas de l'export WHOOP. Ils s'afficheront ici dès
            qu'ils seront saisis, avec leur date et l'écart avec le test précédent.
          </p>
        </div>
      ) : null}
    </Card>
  );
}

function Placeholder() {
  return (
    <span aria-label="non renseigné" className="inline-block h-[3px] w-6 rounded-full bg-white/[0.08] align-middle" />
  );
}
