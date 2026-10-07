import { EmptyCard, Section } from '../ui/Section';
import { comoVenis } from '../../lib/progress';
import { tint } from '../../lib/theme';

/* ----------------------------- CÓMO VENÍS -----------------------------
   Nueva en el rediseño "Glass + aurora" (handoff Glass Progreso v2.dc.html): el propio
   handoff la marca como "lo más importante" de Progreso, así que va primera. Sin boceto
   de vanilla que portar — toda la cuenta vive en comoVenis() (lib/progress.js), acá solo
   se dibuja la matriz tipo × columna y la lista de avisos.

   La intensidad de cada celda (0/1/2/3+) es un tinte del color del tipo, no una escala
   fija: así "3 veces" se ve igual de sólido sea cual sea el acento de ese tipo. */
function cellStyle(cell, color) {
  if (cell.futuro) return { background: 'transparent' };
  if (cell.v === 0) return { background: 'rgba(255,255,255,.04)' };
  const bg = cell.v >= 3 ? color : cell.v === 2 ? tint(color, 'B3') : tint(color, '55');
  return { background: bg, color: cell.v >= 2 ? '#0A0C11' : '#F2F4F8' };
}

export function ProgComoVenis({ data, per }) {
  const v = comoVenis(data, per);
  const hayDatos = v.rows.some((r) => r.total > 0);
  const cols = `70px repeat(${v.cols.length}, minmax(0, 1fr)) 44px`;

  return (
    <Section label="Cómo venís" action={<span className="mono comovenis-win">{v.winLabel.toUpperCase()}</span>}>
      <div className="bigcard">
        <div className="tiles">
          {v.stats.map((s) => (
            <div className="tile" key={s.k}>
              <div className="mono tile-k">{s.k}</div>
              <div className="v comovenis-statv">{s.v}</div>
            </div>
          ))}
        </div>

        {hayDatos ? (
          <>
            <div className="comovenis-grid" style={{ gridTemplateColumns: cols }}>
              <span />
              {v.cols.map((c, i) => (
                <span key={i} className={`mono comovenis-headcell${i === v.current ? ' on' : ''}`}>{c.label}</span>
              ))}
              <span className="mono comovenis-headcell total">TOTAL</span>
            </div>

            {v.rows.map((r) => (
              <div className="comovenis-grid" style={{ gridTemplateColumns: cols }} key={r.name}>
                <div className="comovenis-name">
                  <span><span className="comovenis-dot" style={{ background: r.color }} />{r.name}</span>
                  <span className="mono comovenis-status" style={{ color: r.status.color }}>{r.status.label}</span>
                </div>
                {r.cells.map((c, i) => (
                  <div
                    key={i}
                    className={`mono comovenis-cell${c.current ? ' current' : ''}`}
                    style={cellStyle(c, r.color)}
                  >
                    {c.futuro ? '' : c.v || '·'}
                  </div>
                ))}
                <div className="comovenis-total">
                  <span className="fr">{r.total}</span>
                  {v.unit !== 'día' && <span className="mono comovenis-avg">{r.avg.toFixed(1).replace('.', ',')}/{v.unitAbbr}</span>}
                </div>
              </div>
            ))}

            <div className="comovenis-alerts">
              {v.alerts.map((a, i) => (
                <div className="comovenis-alert" key={i}>
                  <span className="comovenis-alert-ic" style={{ background: tint(a.color, '26'), color: a.color }}>{a.icon}</span>
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyCard size="tight">Todavía no hay entrenos en este período.</EmptyCard>
        )}
      </div>
    </Section>
  );
}
