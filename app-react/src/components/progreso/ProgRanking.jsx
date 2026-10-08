import { EmptyCard, Section } from '../ui/Section';
import { gymHistory, gymRanking, gymSessions, typeColor } from '../../lib/gym';
import { inPeriod, progLabel, progPeriodNote } from '../../lib/progress';

/* ----------------------------- ENTRENAMIENTOS POR TIPO -----------------------------
   Port de progRanking() + rankingRows(). Una barra por tipo, del más entrenado al
   menos, con cuántas veces se entrenó CADA músculo (gymHistory: un turno de 3 músculos
   suma en las 3 filas, a propósito — eso es lo que esta sección mide).

   El encabezado es otra cosa: tiene que decir cuántas veces fuiste al gimnasio, no la
   suma de las filas (que cuenta un turno de 3 músculos tres veces) — mismo criterio que
   el Resumen y Frecuencia semanal, ver gymSessions() en lib/gym.js. */
export function ProgRanking({ data, per, start }) {
  const hist = gymHistory(data).filter((x) => inPeriod(x.date, start));
  const ranked = gymRanking(hist);
  const sesiones = gymSessions(data).filter((x) => inPeriod(x.date, start)).length;

  return (
    <Section
      label="Entrenamientos por tipo"
      action={sesiones > 0 && <span className="sectcount">{sesiones} {sesiones === 1 ? 'entreno' : 'entrenos'} · {progLabel(per).toLowerCase()}</span>}
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
