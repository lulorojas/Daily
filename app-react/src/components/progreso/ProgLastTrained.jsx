import { ClockCounterClockwise } from '@phosphor-icons/react';
import { lastTrained } from '../../lib/progress';
import { tint } from '../../lib/theme';

/* ----------------------------- ÚLTIMO ENTRENO -----------------------------
   Reemplaza a "Frecuencia semanal" y al "Mapa de entrenamientos" (rediseño Nocturne): en
   vez de promedios, cuándo fue la última vez de cada tipo. Un renglón por tipo con tres
   semanas de casilleros (las dos anteriores y la actual, siete días cada una) y a la
   derecha hace cuántos días. Lo que más tiempo hace que no entrenás, primero.

   No depende del período elegido arriba: es "cómo estoy ahora", siempre las mismas tres
   semanas (ver lastTrained() en lib/progress.js). */
function hace(ago) {
  if (ago === null) return { txt: '3 sem+', color: 'var(--danger)' };
  if (ago === 0) return { txt: 'hoy', color: 'var(--green)' };
  return { txt: `${ago} ${ago === 1 ? 'día' : 'días'}`, color: ago >= 8 ? 'var(--danger)' : ago >= 5 ? 'var(--amber)' : 'var(--color-neutral-300)' };
}

export function ProgLastTrained({ data, className = '' }) {
  const v = lastTrained(data);

  return (
    <section className={`card progcard lasttrained ${className}`}>
      <div className="listcard-head">
        <ClockCounterClockwise size={16} color="var(--teal)" aria-hidden="true" />
        <h2 className="listcard-title">Último entreno</h2>
        <span className="progcard-win">{v.winLabel}</span>
      </div>
      <p className="progcard-hint">Las dos semanas anteriores y lo que va de esta. Lo que hace más tiempo que no entrenás, primero.</p>

      <div className="last-grid last-heads">
        <span />
        <div className="last-weeks">
          {v.weekHeads.map((w) => <span key={w.label} className={w.current ? 'on' : ''}>{w.label}</span>)}
        </div>
        <span />
      </div>
      <div className="last-list">
        {v.rows.map((r) => {
          const h = hace(r.ago);
          return (
            <div className="last-grid" key={r.name}>
              <span className="last-name"><span className="last-dot" style={{ background: r.color }} />{r.name}</span>
              <div className="last-weeks">
                {r.weeks.map((wk, i) => (
                  <div className="last-days" key={i}>
                    {wk.map((d) => (
                      <span
                        key={d.dISO}
                        style={d.done
                          ? { background: r.color, border: `1px solid ${r.color}`, boxShadow: `0 0 6px ${tint(r.color, '88')}` }
                          : { background: d.future ? 'transparent' : 'rgba(233,233,237,.05)', border: `1px ${d.future ? 'dashed' : 'solid'} ${d.today ? r.color : 'rgba(233,233,237,.08)'}` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <span className="last-ago" style={{ color: h.color }}>{h.txt}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
