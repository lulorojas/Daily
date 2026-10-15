import { ChartDonut } from '@phosphor-icons/react';
import { gymHistory, gymRanking, gymSessions, typeColor } from '../../lib/gym';
import { inPeriod, progLabel, progPeriodNote } from '../../lib/progress';
import { Donut } from '../ui/Donut';

/* ----------------------------- ENTRENAMIENTOS POR TIPO + BALANCE -----------------------------
   Rediseño Nocturne: "Entrenamientos por tipo" y "Balance muscular" eran dos tarjetas con
   los mismos datos (gymRanking sobre el historial del período); ahora son una: la dona con
   el total en el centro y, al lado, el ranking con barra, % y cantidad.

   Cuenta MÚSCULOS (gymHistory: un turno de 3 músculos suma en las 3 filas, a propósito —
   eso es lo que esta sección mide). El número del encabezado, en cambio, dice cuántas
   veces fuiste al gimnasio (gymSessions), igual que el tile ENTRENOS de "Cómo venís". */
export function ProgTipos({ data, per, start, className = '' }) {
  const hist = gymHistory(data).filter((x) => inPeriod(x.date, start));
  const ranked = gymRanking(hist);
  const sesiones = gymSessions(data).filter((x) => inPeriod(x.date, start)).length;
  const total = hist.length;
  const max = ranked[0]?.count || 1;
  const slices = ranked.map((r) => ({ value: r.count, color: typeColor(data, r.type) }));

  return (
    <section className={`card progcard tipos ${className}`}>
      <div className="listcard-head">
        <ChartDonut size={16} color="var(--teal)" aria-hidden="true" />
        <h2 className="listcard-title">Entrenamientos por tipo</h2>
        {sesiones > 0 && <span className="progcard-win">{sesiones} {sesiones === 1 ? 'entreno' : 'entrenos'} · {progLabel(per).toLowerCase()}</span>}
      </div>

      {ranked.length === 0 ? (
        <div className="empty">No marcaste entrenamientos {progPeriodNote(per)}.</div>
      ) : (
        <div className="tipos-body">
          <div className="tipos-donut">
            <Donut slices={slices} size={150} thick={14} />
            <div className="tipos-donut-center">
              <span className="tipos-total">{total}</span>
              <span className="tipos-lbl">{total === 1 ? 'SESIÓN' : 'SESIONES'}</span>
            </div>
          </div>
          <div className="tipos-rank">
            {ranked.map((r) => {
              const col = typeColor(data, r.type);
              return (
                <div className="tipos-row" key={r.type}>
                  <span style={{ color: col }}>{r.type}</span>
                  <div className="tipos-track"><div style={{ width: `${(r.count / max) * 100}%`, background: col, boxShadow: `0 0 10px ${col}` }} /></div>
                  <span className="tipos-pct">{Math.round((r.count / total) * 100)}%</span>
                  <span className="tipos-n">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
