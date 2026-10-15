import { Barbell } from '@phosphor-icons/react';
import { comoVenis } from '../../lib/progress';
import { tint } from '../../lib/theme';

/* ----------------------------- CÓMO VENÍS -----------------------------
   Nueva en el rediseño "Glass + aurora" y redibujada en Nocturne. El propio handoff la
   marca como "lo más importante" de Progreso, así que va primera. Toda la cuenta vive en
   comoVenis() (lib/progress.js): acá solo se dibuja.

   Arriba, las tres cifras del período y los avisos (en dos columnas en escritorio). Abajo,
   un renglón por tipo: el nombre con su regularidad, una casilla por columna del período
   (día, semana, mes o trimestre) y el total. En escritorio la lista se parte en dos mitades
   lado a lado para que no quede una torre larga y angosta.

   La intensidad de cada casilla (0/1/2/3+) es un tinte del color del músculo, no una escala
   fija: así "3 veces" se ve igual de sólido sea cual sea el acento de ese músculo. */
function cellStyle(cell, color) {
  if (cell.futuro) return { background: 'transparent', border: '1px solid transparent' };
  if (cell.v === 0) return { background: 'rgba(233,233,237,.04)', border: '1px solid rgba(233,233,237,.05)' };
  const fuerte = cell.v >= 3;
  return {
    background: fuerte ? color : cell.v === 2 ? tint(color, 'B3') : tint(color, '55'),
    color: cell.v >= 2 ? '#161826' : 'var(--color-text)',
    border: `1px solid ${tint(color, '66')}`,
    boxShadow: fuerte ? `0 0 10px ${tint(color, '66')}` : 'none',
  };
}

function Filas({ rows, v }) {
  const cols = `minmax(0, 1.5fr) repeat(${v.cols.length}, minmax(0, 1fr)) 34px`;
  return (
    <div className="venis-list">
      <div className="venis-row venis-head" style={{ gridTemplateColumns: cols }}>
        <span>TIPO</span>
        {v.cols.map((c, i) => <span key={i} className={i === v.current ? 'on' : ''}>{c.label}</span>)}
        <span className="r">TOTAL</span>
      </div>
      {rows.map((r) => (
        <div className="venis-row" style={{ gridTemplateColumns: cols }} key={r.name}>
          <div className="venis-name">
            <span className="venis-bar" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
            <div>
              <span className="venis-nm">{r.name}</span>
              <span className="venis-st" style={{ color: r.status.color }}>{r.status.label}</span>
            </div>
          </div>
          {r.cells.map((c, i) => (
            <div key={i} className={`venis-cell${c.current ? ' current' : ''}`} style={cellStyle(c, r.color)}>
              {c.futuro ? '' : c.v || '·'}
            </div>
          ))}
          <span className="venis-total" style={{ color: r.color }}>{r.total}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgComoVenis({ data, per, className = '' }) {
  const v = comoVenis(data, per);
  const hayDatos = v.rows.some((r) => r.total > 0);
  const mitad = Math.ceil(v.rows.length / 2);

  return (
    <section className={`card progcard sweep venis ${className}`}>
      <div className="listcard-head">
        <Barbell size={16} color="var(--teal)" aria-hidden="true" />
        <h2 className="listcard-title">Cómo venís</h2>
        <span className="progcard-win">{v.winLabel}</span>
      </div>

      {hayDatos ? (
        <>
          <div className="venis-top">
            <div className="venis-stats">
              {v.stats.map((s, i) => (
                <div className={`venis-stat${i === 0 ? ' first' : ''}`} key={s.k}>
                  <div className="venis-stat-k">{s.k}</div>
                  <div className="venis-stat-v">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="venis-alerts">
              {v.alerts.map((a, i) => (
                <div className="venis-alert" key={i}>
                  <span className="venis-alert-ic" style={{ background: tint(a.color, '26'), color: a.color }}>{a.icon}</span>
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="venis-lists">
            <Filas rows={v.rows.slice(0, mitad)} v={v} />
            {v.rows.length > mitad && <Filas rows={v.rows.slice(mitad)} v={v} />}
          </div>
        </>
      ) : (
        <div className="empty">Todavía no hay entrenos en este período.</div>
      )}
    </section>
  );
}
