import { EmptyCard, Section } from '../ui/Section';
import { comoVenis } from '../../lib/progress';
import { tint } from '../../lib/theme';

/* ----------------------------- CÓMO VENÍS -----------------------------
   Nueva en el rediseño "Glass + aurora" (handoff Glass Progreso v2.dc.html): el propio
   handoff la marca como "lo más importante" de Progreso, así que va primera. Sin boceto
   de vanilla que portar — toda la cuenta vive en comoVenis() (lib/progress.js), acá solo
   se dibuja la matriz músculo × columna y la lista de avisos.

   Tabla INVERTIDA (pedido explícito, segunda vuelta: "lo de como venis debe ser una tabla
   horizontal porq es muy grande"): el músculo es la COLUMNA y el período (día/semana/mes/
   trimestre) es la FILA — al revés de la primera versión, que tenía un músculo por fila y
   se volvía angosta e ilegible con 'año' (12 columnas) o muchos músculos a la vez. Con
   pocos músculos pero hasta 12 períodos, apilar los períodos verticalmente entra mejor en
   una pantalla angosta que estirar 12 columnas horizontales.

   La intensidad de cada celda (0/1/2/3+) es un tinte del color del músculo, no una escala
   fija: así "3 veces" se ve igual de sólido sea cual sea el acento de ese músculo. */
function cellStyle(cell, color) {
  if (cell.futuro) return { background: 'transparent' };
  if (cell.v === 0) return { background: 'rgba(255,255,255,.04)' };
  const bg = cell.v >= 3 ? color : cell.v === 2 ? tint(color, 'B3') : tint(color, '55');
  return { background: bg, color: cell.v >= 2 ? '#0A0C11' : '#F2F4F8' };
}

export function ProgComoVenis({ data, per }) {
  const v = comoVenis(data, per);
  const hayDatos = v.rows.some((r) => r.total > 0);
  const cols = `52px repeat(${v.rows.length}, minmax(0, 1fr))`;

  return (
    <Section label="Cómo venís" wide action={<span className="mono comovenis-win">{v.winLabel.toUpperCase()}</span>}>
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
            <div className="comovenis-grid comovenis-headrow" style={{ gridTemplateColumns: cols }}>
              <span />
              {v.rows.map((r) => (
                <div className="comovenis-colhead" key={r.name}>
                  <span className="comovenis-colhead-name"><span className="comovenis-dot" style={{ background: r.color }} />{r.name}</span>
                  <span className="mono comovenis-status" style={{ color: r.status.color }}>{r.status.label}</span>
                </div>
              ))}
            </div>

            {v.cols.map((c, i) => (
              <div className="comovenis-grid" style={{ gridTemplateColumns: cols }} key={i}>
                <span className={`mono comovenis-rowlabel${i === v.current ? ' on' : ''}`}>{c.label}</span>
                {v.rows.map((r) => (
                  <div
                    key={r.name}
                    className={`mono comovenis-cell${r.cells[i].current ? ' current' : ''}`}
                    style={cellStyle(r.cells[i], r.color)}
                  >
                    {r.cells[i].futuro ? '' : r.cells[i].v || '·'}
                  </div>
                ))}
              </div>
            ))}

            <div className="comovenis-grid comovenis-totalrow" style={{ gridTemplateColumns: cols }}>
              <span className="mono comovenis-rowlabel">TOTAL</span>
              {v.rows.map((r) => (
                <span key={r.name} className="fr comovenis-totalcell">{r.total}</span>
              ))}
            </div>

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
