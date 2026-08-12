import { EmptyCard, Section } from '../ui/Section';
import { gymHistory, gymRanking, typeColor } from '../../lib/gym';
import { inPeriod, progLabel, progPeriodNote } from '../../lib/progress';

/* ----------------------------- ENTRENAMIENTOS POR TIPO -----------------------------
   Port de progRanking() + rankingRows(). Una barra por tipo, del más entrenado al
   menos, con la cuenta de sesiones sobre el más alto. */
export function ProgRanking({ data, per, start }) {
  const hist = gymHistory(data).filter((x) => inPeriod(x.date, start));
  const ranked = gymRanking(hist);
  const total = hist.length;

  return (
    <Section
      label="Entrenamientos por tipo"
      action={total > 0 && <span className="sectcount">{total} {total === 1 ? 'sesión' : 'sesiones'} · {progLabel(per).toLowerCase()}</span>}
    >
      {ranked.length === 0 ? (
        <EmptyCard size="tight">No marcaste entrenamientos {progPeriodNote(per)}.</EmptyCard>
      ) : (
        <div className="card rankcard">
          {ranked.map((r) => {
            const col = typeColor(data, r.type);
            const max = ranked[0].count;
            return (
              <div className="rankrow" key={r.type}>
                <div className="rankrow-head">
                  <span className="rankrow-type" style={{ color: col }}>{r.type}</span>
                  <span className="rankrow-count">{r.count} {r.count === 1 ? 'sesión' : 'sesiones'}</span>
                </div>
                <div className="bartrack"><div style={{ background: col, width: `${Math.round((r.count / max) * 100)}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
