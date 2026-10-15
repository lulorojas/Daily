import { useId, useState } from 'react';
import { fmtNum, MONTHS, parseISO, todayD } from '../../lib/dates';
import { lightOf } from '../../lib/theme';

/* ----------------------------- GRÁFICO DE UN EJERCICIO -----------------------------
   Rediseño Nocturne ("LiftChart"): una marca por punto, con el peso escrito arriba de cada
   uno y la fecha abajo; el último punto es más grande, lleva un halo y late. Arriba, el
   nombre del ejercicio, cuántas marcas hay en el rango y el peso actual con lo que subió.

   Dos modos de elegir qué ejercicio se ve:
     - con `chips`, una fila de botones redondos (uno por ejercicio) — así lo usa Progreso;
     - sin `chips`, el ejercicio lo elige quien lo usa (en Gimnasio, tocando una fila de la
       lista de cargas) y llega por la prop `selected`.

   Cómo se dibuja: el área y la línea son un <svg> con viewBox 0..100 estirado a todo el
   ancho (`preserveAspectRatio="none"`), así los puntos se posicionan en PORCENTAJE y la
   curva cambia de tamaño con el contenedor sin recalcular nada. Los círculos y los rótulos
   NO van dentro del svg (se deformarían al estirarlo): son <span>/<div> absolutos puestos
   con left/top en %. El ancho mínimo del gráfico es 52px por punto: con muchas marcas el
   contenedor scrollea hacia los lados en vez de apretarlas todas.

   Con menos de dos marcas en el rango no hay con qué comparar: se dibuja la única que
   haya y un aviso para probar con un rango más largo. */

const RANGE = { semana: 7, mes: 31, '3m': 92, '6m': 183, ano: 366, todo: Infinity };
const RANGE_LABEL = {
  semana: 'esta semana', mes: 'último mes', '3m': 'últimos 3 meses', '6m': 'últimos 6 meses', ano: 'último año', todo: 'desde el inicio',
};

const diasAtras = (dISO) => Math.round((todayD() - parseISO(dISO)) / 86400000);
const etiquetaFecha = (dISO) => {
  const d = parseISO(dISO);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}`;
};

export function LiftChart({ lifts, selected, onSelect, period = 'todo', chips = true, compact = false, action }) {
  const gid = useId();
  const [elegido, setElegido] = useState(null);

  if (!lifts.length) return null;

  // Si lo elige quien lo usa (onSelect + selected), manda su valor; si no, el estado propio.
  const selId = onSelect ? selected : (elegido ?? selected);
  const lift = lifts.find((l) => l.id === selId) || lifts[0];

  const todas = lift.history.map((p) => ({ date: p.date, v: p.weight }));
  let h = todas.filter((p) => diasAtras(p.date) <= RANGE[period]);
  const pocas = h.length < 2;
  if (!h.length) h = [todas[todas.length - 1]];

  const vals = h.map((p) => p.v);
  const mn = Math.min(...vals), mx = Math.max(...vals), span = Math.max(5, mx - mn);
  const lo = mn - span * 0.15, hi = mx + span * 0.1;
  const n = h.length;
  const xn = (i) => (n === 1 ? 50 : 6 + (i / (n - 1)) * 88);
  const yn = (v) => (1 - (v - lo) / (hi - lo)) * 100;
  const H = compact ? 150 : 180, top = 34, plotH = H - top;

  const pts = h.map((p, i) => {
    const last = i === n - 1;
    const up = i > 0 && p.v > h[i - 1].v;
    const ypx = top + (yn(p.v) / 100) * plotH;
    return {
      xn: xn(i), yn: yn(p.v), x: `${xn(i)}%`, y: `${ypx}px`, labY: `${ypx - 9}px`, v: fmtNum(p.v), d: etiquetaFecha(p.date),
      last, up, delay: `${300 + i * 60}ms`,
    };
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.xn} ${p.yn.toFixed(2)}`).join(' ');
  const area = `${line} L${pts[n - 1].xn} 100 L${pts[0].xn} 100 Z`;
  const gain = +(h[n - 1].v - h[0].v).toFixed(1);
  const color = lift.color;
  const light = lightOf(color);
  const unit = lift.unit || 'kg';

  const elegir = (id) => { setElegido(id); onSelect?.(id); };

  return (
    <div className="liftchart">
      {chips && (
        <div className="liftchart-chips">
          {lifts.map((l) => {
            const on = l.id === lift.id;
            return (
              <button
                type="button" key={l.id} className={`liftchart-chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => elegir(l.id)}
                style={on ? { color: lightOf(l.color), borderColor: l.color, background: `${l.color}1c`, boxShadow: `0 0 14px ${l.color}44` } : undefined}
              >
                <span style={{ background: l.color }} />{l.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="liftchart-head">
        <div className="liftchart-title">
          <div className="liftchart-name">{lift.name}</div>
          <div className="liftchart-meta">{n} {n === 1 ? 'marca' : 'marcas'} · {RANGE_LABEL[period]}</div>
        </div>
        <div className="liftchart-now">
          <div className="liftchart-cur">{fmtNum(h[n - 1].v)} <span>{unit}</span></div>
          <div
            className="liftchart-gain"
            style={{ color: pocas ? undefined : gain > 0 ? 'var(--green)' : gain < 0 ? 'var(--danger)' : undefined }}
          >
            {pocas ? 'sin comparación' : `${gain > 0 ? '+' : ''}${fmtNum(gain)} ${unit} ${RANGE_LABEL[period]}`}
          </div>
        </div>
      </div>

      <div className="liftchart-scroll">
        <div className="liftchart-plot" style={{ height: `${H}px`, minWidth: `${n * 52}px` }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="liftchart-svg" style={{ top: `${top}px`, height: `calc(100% - ${top}px)` }} aria-hidden="true">
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity=".32" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {pts.map((p, i) => (
              <line key={i} x1={p.xn} x2={p.xn} y1={p.yn} y2="100" stroke="rgba(233,233,237,.07)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={light} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
          </svg>
          {pts.map((p, i) => (
            <div key={i}>
              <div className="liftchart-label" style={{ left: p.x, top: p.labY, animationDelay: p.delay }}>
                <div className="liftchart-v" style={{ color: p.last ? light : p.up ? 'var(--color-text)' : 'var(--color-neutral-400)' }}>{p.v}</div>
                <div className="liftchart-d">{p.d}</div>
              </div>
              <span
                className={`liftchart-dot${p.last ? ' last' : ''}`}
                style={{
                  left: p.x, top: p.y, color, borderColor: color, background: p.last ? light : 'var(--bg)',
                  boxShadow: p.last ? `0 0 16px ${color}` : 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {pocas && <div className="liftchart-few">Necesitás al menos dos marcas en este rango para comparar. Probá un rango más largo.</div>}
      {action}
    </div>
  );
}
