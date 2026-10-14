import { useState } from 'react';
import { EmptyCard, Section } from '../ui/Section';
import { activePlan, comoComes, comoComesPorDia } from '../../lib/meals';
import { DOW_SHORT, dow, parseISO, shortDate } from '../../lib/dates';
import { C, tint } from '../../lib/theme';

/* ----------------------------- CÓMO COMÉS -----------------------------
   Pedido explícito: "quiero que a nivel seguimiento daily entienda si estoy comiendo bien
   o mal", y después "el gráfico tiene que ser por día, no la cantidad de comidas sino
   cómo vengo comiendo por día, y ver cuántas comidas y qué comidas le pifié, los
   permitidos de una semana". Por eso, en vez de una matriz de cantidades:

     - arriba, tres números del período: días bien, días con pifiadas, permitidos;
     - un día por fila (el más nuevo arriba): cada comida como una píldora del color de
       su estado, el % del plan del día, y abajo qué le pifiaste y qué permitidos hubo;
     - "Dónde más le pifiás" (por comida) y la lista de permitidos del período;
     - lo que ya estaba: cumplimiento por macro y los avisos de extras (comoComes()).

   La ventana es la del selector de arriba, igual que el resto de Progreso. Con Año o
   Todo serían cientos de filas: se muestran 14 días y "Ver más días" agrega de a 14. */
const DE_A = 14;

const LEYENDA = [
  { label: 'Cumplida', color: C.green },
  { label: 'Parcial', color: C.amber },
  { label: 'Poco', color: C.danger },
  { label: 'Permitido', color: C.coral },
  { label: 'Distinta, sana', color: C.teal },
  { label: 'Sin registrar', color: 'rgba(242,244,248,.45)' },
];

function diaLabel(dISO) {
  return `${DOW_SHORT[dow(parseISO(dISO))]} ${shortDate(dISO)}`;
}

// Las píldoras de color sólido necesitan su color de fondo con alfa — "Sin registrar" ya
// viene con alfa (rgba), así que va con un gris fijo.
function pildoraStyle(status) {
  if (status.key === 'pendiente') return { background: 'rgba(255,255,255,.05)', color: status.color };
  return { background: tint(status.color, '2E'), color: status.color };
}

export function ProgComoComes({ data, per }) {
  const [cuantos, setCuantos] = useState(DE_A);
  const sinPlan = !activePlan(data)?.slots.length;
  const v = comoComesPorDia(data, per);
  const extra = comoComes(data, per);
  const visibles = v.days.slice(0, cuantos);

  return (
    <Section label="Cómo comés" wide action={<span className="mono comovenis-win">{v.winLabel.toUpperCase()}</span>}>
      <div className="bigcard">
        {sinPlan ? (
          <EmptyCard size="tight">Armá tu plan de comidas (sección Comidas) para ver el seguimiento acá.</EmptyCard>
        ) : v.days.length === 0 ? (
          <EmptyCard size="tight">Todavía no hay registros en este período.</EmptyCard>
        ) : (
          <>
            <div className="tiles">
              <div className="tile">
                <div className="mono tile-k">DÍAS BIEN</div>
                <div className="v comovenis-statv" style={{ color: C.green }}>{v.diasBien}/{v.days.length}</div>
              </div>
              <div className="tile">
                <div className="mono tile-k">CON PIFIADAS</div>
                <div className="v comovenis-statv" style={{ color: C.danger }}>{v.diasConPifiadas}</div>
              </div>
              <div className="tile">
                <div className="mono tile-k">PERMITIDOS</div>
                <div className="v comovenis-statv" style={{ color: C.coral }}>{v.permitidos.length}</div>
              </div>
            </div>

            <div className="comedias">
              {visibles.map((d) => (
                <div className="comedia" key={d.dISO}>
                  <div className="comedia-top">
                    <span className="mono comedia-fecha">{diaLabel(d.dISO)}</span>
                    <span className="comedia-franjas">
                      {d.franjas.map((f) => (
                        <span
                          key={f.name}
                          className="comedia-pill"
                          style={pildoraStyle(f.status)}
                          title={`${f.name}: ${f.status.label}`}
                          aria-label={`${f.name}: ${f.status.label}`}
                        >
                          {f.name.slice(0, 3)}
                        </span>
                      ))}
                    </span>
                    <span className="mono comedia-pct">{d.pct === null ? '—' : `${Math.round(d.pct * 100)}%`}</span>
                  </div>
                  {(d.pifiadas.length > 0 || d.permitidos.length > 0) && (
                    <div className="comedia-det">
                      {d.pifiadas.length > 0 && (
                        <span style={{ color: C.danger }}>Le pifiaste: {d.pifiadas.join(', ')}</span>
                      )}
                      {d.permitidos.length > 0 && (
                        <span style={{ color: C.coral }}>Permitido: {d.permitidos.join(', ')}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {v.days.length > cuantos && (
              <button type="button" className="comedia-mas" onClick={() => setCuantos((n) => n + DE_A)}>
                Ver más días ({v.days.length - cuantos})
              </button>
            )}

            <div className="comedia-leyenda">
              {LEYENDA.map((l) => (
                <span key={l.label}><span className="cargas-dot" style={{ background: l.color }} />{l.label}</span>
              ))}
            </div>

            {(v.pifiadasPorFranja.length > 0 || v.permitidos.length > 0) && (
              <div className="comovenis-alerts">
                {v.pifiadasPorFranja.length > 0 && (
                  <div className="comovenis-alert">
                    <span className="comovenis-alert-ic" style={{ background: tint(C.danger, '26'), color: C.danger }}>!</span>
                    <span>Dónde más le pifiás: {v.pifiadasPorFranja.map((p) => `${p.name} (${p.n})`).join(', ')}</span>
                  </div>
                )}
                {v.permitidos.length > 0 && (
                  <div className="comovenis-alert">
                    <span className="comovenis-alert-ic" style={{ background: tint(C.coral, '26'), color: C.coral }}>●</span>
                    <span>
                      Permitidos: {v.permitidos.map((p) => `${p.que} (${diaLabel(p.dISO)})`).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {extra.macros.length > 0 && (
              <div className="card cargas-resto">
                {extra.macros.map((m) => (
                  <div className="cargas-restrow" key={m.tipo}>
                    <span className="cargas-restname">{m.label}</span>
                    <span className="mono cargas-restgain">{m.pct}%</span>
                  </div>
                ))}
              </div>
            )}

            {extra.alerts.length > 0 && (
              <div className="comovenis-alerts">
                {extra.alerts.map((a, i) => (
                  <div className="comovenis-alert" key={i}>
                    <span className="comovenis-alert-ic" style={{ background: tint(a.color, '26'), color: a.color }}>{a.icon}</span>
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
