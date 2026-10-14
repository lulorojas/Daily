import { EmptyCard, Section } from '../ui/Section';
import { comoComes } from '../../lib/meals';
import { tint } from '../../lib/theme';

/* ----------------------------- CÓMO COMÉS -----------------------------
   Pedido explícito: "quiero que a nivel seguimiento daily entienda si estoy comiendo bien
   o mal" + "¿dónde lo mostrás? — en Progreso, junto a Cómo venís". Calco casi literal de
   ProgComoVenis.jsx (misma tabla invertida, franja = columna, período = fila, mismas
   clases `comovenis-*`) pero alimentado por comoComes() (lib/meals.js) — reusa la misma
   ventana de tiempo y los mismos 4 baldes de regularidad que "Cómo venís" ("todos los
   gráficos deben tomar la misma medida de tiempo"), así que las dos tablas se leen con la
   misma vara aunque midan cosas distintas.

   Segunda vuelta, pedido explícito ("las mediciones podrian hacerse en carbohidratos y
   proteinas para tambien tener un registro de con que soy mas regular"): si el plan tiene
   ítems con cantidad clasificados por macro, se suma una lista chica de % de cumplimiento
   por macro — mismo patrón visual que ProgWeeklyFreq (reusa `.cargas-resto`). */
function cellStyle(cell, color) {
  if (cell.futuro) return { background: 'transparent' };
  if (cell.v === 0) return { background: 'rgba(255,255,255,.04)' };
  const bg = cell.v >= 3 ? color : cell.v === 2 ? tint(color, 'B3') : tint(color, '55');
  return { background: bg, color: cell.v >= 2 ? '#0A0C11' : '#F2F4F8' };
}

export function ProgComoComes({ data, per }) {
  const v = comoComes(data, per);
  const sinPlan = v.rows.length === 0;
  const hayDatos = v.rows.some((r) => r.total > 0);
  const cols = `52px repeat(${Math.max(v.rows.length, 1)}, minmax(0, 1fr))`;

  return (
    <Section label="Cómo comés" wide action={<span className="mono comovenis-win">{v.winLabel.toUpperCase()}</span>}>
      <div className="bigcard">
        {sinPlan ? (
          <EmptyCard size="tight">Armá tu plan de comidas (sección Comidas) para ver el seguimiento acá.</EmptyCard>
        ) : (
          <>
            <div className="tiles">
              {v.stats.map((s) => (
                <div className="tile" key={s.k}>
                  <div className="mono tile-k">{s.k}</div>
                  <div className="v comovenis-statv">{s.v}</div>
                </div>
              ))}
            </div>

            {v.macros.length > 0 && (
              <div className="card cargas-resto">
                {v.macros.map((m) => (
                  <div className="cargas-restrow" key={m.tipo}>
                    <span className="cargas-restname">{m.label}</span>
                    <span className="mono cargas-restgain">{m.pct}%</span>
                  </div>
                ))}
              </div>
            )}

            {hayDatos ? (
              <>
                <div className="comovenis-grid comovenis-headrow" style={{ gridTemplateColumns: cols }}>
                  <span />
                  {v.rows.map((r) => (
                    <div className="comovenis-colhead" key={r.id}>
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
                        key={r.id}
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
                    <span key={r.id} className="fr comovenis-totalcell">{r.total}</span>
                  ))}
                </div>

                {v.alerts.length > 0 && (
                  <div className="comovenis-alerts">
                    {v.alerts.map((a, i) => (
                      <div className="comovenis-alert" key={i}>
                        <span className="comovenis-alert-ic" style={{ background: tint(a.color, '26'), color: a.color }}>{a.icon}</span>
                        <span>{a.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyCard size="tight">Todavía no hay registros en este período.</EmptyCard>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
