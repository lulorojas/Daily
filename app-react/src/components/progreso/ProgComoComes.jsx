import { useState } from 'react';
import { Check, CircleDashed, ForkKnife, Info, X } from '@phosphor-icons/react';
import { activePlan, comoComes, comoComesPorDia } from '../../lib/meals';
import { DOW_SHORT, dow, parseISO } from '../../lib/dates';
import { C, tint } from '../../lib/theme';

/* ----------------------------- CÓMO COMÉS -----------------------------
   Pedido explícito: "quiero que a nivel seguimiento daily entienda si estoy comiendo bien
   o mal", y después "el gráfico tiene que ser por día, no la cantidad de comidas sino
   cómo vengo comiendo por día, y ver cuántas comidas y qué comidas le pifié, los
   permitidos de una semana". Redibujada en Nocturne (ComoComes.dc.html):

     - arriba, tres números del período: días bien, con pifiadas, permitidos (y cuántos
       quedaron incompletos, que es la tercera clase: las tres suman el total de días);
     - un ANILLO por día, partido en un arco por comida y pintado con el estado de cada
       una; adentro el % del día y abajo una marca: ✓ bien, ✕ con pifiadas, círculo
       punteado incompleto. Tocar un día muestra su detalle comida por comida;
     - el botón (i) explica cómo se calcula todo (las reglas de lib/meals.js);
     - "dónde más le pifiás", el cumplimiento por macro y los permitidos del período.

   La ventana es la del selector de arriba. Con Año o Todo serían cientos de anillos: se
   muestran 14 días y "Ver más días" agrega de a 14. */
const DE_A = 14;
const PENDIENTE = 'rgba(233,233,237,.14)';

const LEYENDA = [
  { label: 'Cumplida', color: C.green },
  { label: 'Parcial', color: C.amber },
  { label: 'Poco', color: C.danger },
  { label: 'Permitido', color: C.coral },
  { label: 'Distinta, sana', color: C.teal },
  { label: 'Sin registrar', color: PENDIENTE },
];

const colorDe = (status) => (status.key === 'pendiente' ? PENDIENTE : status.color);
const colorPct = (p) => (p === null ? C.teal : p >= 0.9 ? C.green : p >= 0.5 ? C.amber : 'var(--color-neutral-400)');

// Un arco de la circunferencia (centro 21,21, radio 17) entre dos ángulos, en radianes.
function arco(a0, a1) {
  const P = (a) => [21 + 17 * Math.sin(a), 21 - 17 * Math.cos(a)];
  const [x0, y0] = P(a0), [x1, y1] = P(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A17 17 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function clase(d) {
  if (d.pifiadas.length || d.sueltos) return 'pifiadas';
  if (d.sinRegistrar > 0) return 'incompleto';
  return 'bien';
}

const VEREDICTO = {
  bien: { txt: 'DÍA BIEN', color: C.green },
  pifiadas: { txt: 'CON PIFIADAS', color: C.danger },
  incompleto: { txt: 'INCOMPLETO', color: 'var(--color-neutral-400)' },
};

function Anillo({ d, on, onPick }) {
  const cl = clase(d);
  const n = d.franjas.length;
  const paso = (Math.PI * 2) / n, hueco = (8 * Math.PI) / 180;
  const f = parseISO(d.dISO);
  const Marca = cl === 'bien' ? Check : cl === 'pifiadas' ? X : CircleDashed;

  return (
    <button type="button" className={`ring-day${on ? ' on' : ''}`} onClick={onPick} aria-pressed={on} aria-label={`${DOW_SHORT[dow(f)]} ${f.getDate()}`}>
      <div className="ring-wrap">
        <svg width="42" height="42" viewBox="0 0 42 42" style={{ overflow: 'visible' }} aria-hidden="true">
          {d.franjas.map((fr, k) => {
            const col = colorDe(fr.status);
            return (
              <path
                key={k} d={arco(k * paso + hueco, (k + 1) * paso - hueco)} pathLength="1" strokeDasharray="1 1" fill="none" stroke={col}
                strokeWidth="4" strokeLinecap="round" className="ring-arc"
                style={fr.status.key === 'pendiente' ? undefined : { filter: `drop-shadow(0 0 2px ${col})` }}
              />
            );
          })}
        </svg>
        <div className="ring-pct" style={{ color: colorPct(d.pct) }}>{d.pct === null ? '—' : Math.round(d.pct * 100)}</div>
      </div>
      <span className="ring-lbl">{DOW_SHORT[dow(f)]} {f.getDate()}</span>
      <Marca size={11} weight={cl === 'incompleto' ? 'regular' : 'bold'} color={cl === 'bien' ? C.green : cl === 'pifiadas' ? C.danger : 'var(--color-neutral-600)'} aria-hidden="true" />
    </button>
  );
}

function Detalle({ d }) {
  const f = parseISO(d.dISO);
  const cl = clase(d);
  const ver = VEREDICTO[cl];
  const pctTxt = (fr) => {
    const k = fr.status.key;
    if (k === 'sana') return 'no cuenta';
    if (k === 'permitido' || k === 'pendiente' || fr.pct === null) return '0%';
    return `${Math.round(Math.min(1, fr.pct) * 100)}%`;
  };

  return (
    <div className="ring-detail">
      <div className="ring-detail-head">
        <span className="ring-detail-day">{DOW_SHORT[dow(f)]} {f.getDate()}</span>
        <span className="ring-verdict" style={{ color: ver.color, borderColor: ver.color }}>{ver.txt}</span>
        <span className="grow" />
        <span className="ring-detail-pct" style={{ color: colorPct(d.pct) }}>{d.pct === null ? '—' : `${Math.round(d.pct * 100)}%`} del plan</span>
      </div>
      <div className="ring-slots">
        {d.franjas.map((fr) => (
          <div className="ring-slot" key={fr.name}>
            <span className="ring-slot-sq" style={{ background: colorDe(fr.status), boxShadow: `0 0 6px ${colorDe(fr.status)}` }} />
            <span className="ring-slot-name">{fr.name}</span>
            <span className="ring-slot-st" style={{ color: fr.status.key === 'pendiente' ? 'var(--color-neutral-600)' : fr.status.color }}>
              {fr.status.key === 'permitido' && fr.libres.length ? `Permitido · ${fr.libres[0]}` : fr.status.label}
            </span>
            <span className="ring-slot-pct">{pctTxt(fr)}</span>
          </div>
        ))}
      </div>
      {d.sueltosNombres.length > 0 && <div className="ring-suelto">Permitido suelto: {d.sueltosNombres.join(', ')}</div>}
    </div>
  );
}

export function ProgComoComes({ data, per, className = '' }) {
  const [cuantos, setCuantos] = useState(DE_A);
  const [info, setInfo] = useState(false);
  const [elegido, setElegido] = useState(null);
  const sinPlan = !activePlan(data)?.slots.length;
  const v = comoComesPorDia(data, per);
  const extra = comoComes(data, per);
  // De más viejo a más nuevo, así el anillo de hoy queda al final de la grilla.
  const visibles = v.days.slice(0, cuantos).slice().reverse();
  const sel = visibles.find((d) => d.dISO === elegido) ?? visibles[visibles.length - 1];
  const maxMiss = Math.max(1, ...v.pifiadasPorFranja.map((p) => p.n));
  const permitidos = v.permitidos;

  return (
    <section className={`card progcard sweep comes ${className}`}>
      <div className="listcard-head">
        <ForkKnife size={16} color="var(--violet)" aria-hidden="true" />
        <h2 className="listcard-title">Cómo comés</h2>
        <span className="progcard-win">{v.winLabel}</span>
        <button type="button" className={`infobtn${info ? ' on' : ''}`} title="¿Cómo se calcula?" aria-label="¿Cómo se calcula?" aria-expanded={info} onClick={() => setInfo((x) => !x)}>
          <Info size={15} aria-hidden="true" />
        </button>
      </div>

      {info && (
        <div className="comes-info">
          <div className="comes-info-t">¿CÓMO SE CALCULA?</div>
          <div><b>% de una comida:</b> lo que comiste de cada alimento sobre lo que pide la opción del plan. Comer de más no suma.</div>
          <div><b>Qué baja la nota:</b> faltar un poco de un carbohidrato (1 unidad, o el 20% si va en gramos) no baja; faltar proteína o grasa sí. Pasarte de carbohidratos o grasa baja; de proteína, no. La fruta que sobra en una comida cubre la que faltó en otra (una banana, una manzana o una ensalada de frutas son lo mismo).</div>
          <div><span style={{ color: C.green }}>Cumplida</span> 100% · <span style={{ color: C.amber }}>Parcial</span> 50–99% · <span style={{ color: C.danger }}>Poco</span> menos de 50%.</div>
          <div><span style={{ color: C.coral }}>Permitido</span> en lugar de la comida cuenta 0%. <span style={{ color: C.teal }}>Distinta, sana</span> no suma ni resta: queda afuera del promedio.</div>
          <div><b>% del día:</b> promedio de las comidas del plan (sin registrar = 0%).</div>
          <div><b>Día bien:</b> todas registradas, ninguna Poco ni Permitido y sin permitidos sueltos. Parcial no lo arruina.</div>
        </div>
      )}

      {sinPlan ? (
        <div className="empty">Armá tu plan de comidas (sección Comidas) para ver el seguimiento acá.</div>
      ) : v.days.length === 0 ? (
        <div className="empty">Todavía no hay registros en este período.</div>
      ) : (
        <>
          <div className="comes-tiles">
            <div><div className="comes-k">DÍAS BIEN</div><div className="comes-v" style={{ color: C.green }}>{v.diasBien}/{v.days.length}</div></div>
            <div><div className="comes-k">CON PIFIADAS</div><div className="comes-v" style={{ color: C.danger }}>{v.diasConPifiadas}</div></div>
            <div><div className="comes-k">PERMITIDOS</div><div className="comes-v" style={{ color: C.coral }}>{permitidos.length}</div></div>
          </div>
          {v.diasIncompletos > 0 && (
            <div className="comes-afuera">
              {v.diasIncompletos} {v.diasIncompletos === 1 ? 'día quedó incompleto' : 'días quedaron incompletos'} (comidas sin registrar, sin pifiadas).
            </div>
          )}

          <div className="ring-grid">
            {visibles.map((d) => <Anillo key={d.dISO} d={d} on={d.dISO === sel.dISO} onPick={() => setElegido(d.dISO)} />)}
          </div>
          {v.days.length > cuantos && (
            <button type="button" className="comedia-mas" onClick={() => setCuantos((n) => n + DE_A)}>
              Ver más días ({v.days.length - cuantos})
            </button>
          )}

          <Detalle d={sel} />

          <div className="comes-legend">
            {LEYENDA.map((l) => <span key={l.label}><span style={{ background: l.color }} />{l.label}</span>)}
          </div>

          <div className="comes-sep" />

          <div className="comes-cols">
            <div>
              <div className="comes-k">DÓNDE MÁS LE PIFIÁS</div>
              <div className="comes-bars">
                {v.pifiadasPorFranja.length === 0 && <span className="comes-none">Ninguna comida pifiada.</span>}
                {v.pifiadasPorFranja.map((p) => (
                  <div className="comes-bar" key={p.name}>
                    <span>{p.name}</span>
                    <span className="comes-track"><span style={{ width: `${(p.n / maxMiss) * 100}%`, background: C.danger, boxShadow: `0 0 8px ${C.danger}` }} /></span>
                    <span className="comes-n">{p.n}</span>
                  </div>
                ))}
              </div>
            </div>
            {extra.macros.length > 0 && (
              <div>
                <div className="comes-k">CUMPLIMIENTO POR MACRO</div>
                <div className="comes-bars">
                  {extra.macros.map((m) => (
                    <div className="comes-bar" key={m.tipo}>
                      <span>{m.label}</span>
                      <span className="comes-track"><span style={{ width: `${m.pct}%`, background: C.coral, boxShadow: `0 0 8px ${C.coral}` }} /></span>
                      <span className="comes-n">{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {permitidos.length > 0 && (
            <div className="comes-perms">
              {permitidos.map((p, i) => {
                const f = parseISO(p.dISO);
                return <span key={i}>{p.que} · {DOW_SHORT[dow(f)].toLowerCase()} {f.getDate()}</span>;
              })}
            </div>
          )}

          {extra.alerts.length > 0 && (
            <div className="venis-alerts comes-alerts">
              {extra.alerts.map((a, i) => (
                <div className="venis-alert" key={i}>
                  <span className="venis-alert-ic" style={{ background: tint(a.color, '26'), color: a.color }}>{a.icon}</span>
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
