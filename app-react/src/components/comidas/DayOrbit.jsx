import { BowlFood, Coffee, ForkKnife, MoonStars, OrangeSlice } from '@phosphor-icons/react';
import { slotMeta } from '../../lib/meals';
import { C } from '../../lib/theme';

/* ----------------------------- LA ÓRBITA DEL DÍA -----------------------------
   El dibujo central de "Tu día" en el rediseño Nocturne: el día (de las 6 a las 24) como un
   arco de 270°, con una estación por comida puesta a su hora. Cada estación es un botón
   (abre el registro de esa comida), pintada con el color del estado de la comida; el arco
   fino de adentro avanza hasta "ahora" si se mira hoy, hasta el final si el día ya pasó, y
   no avanza si todavía no llegó. En el centro, el % del plan del día y la frase que dice
   qué falta.

   Geometría: el centro es (170,168) y el radio 128. `ang(h)` convierte una hora (6–24) en
   un ángulo entre −135° y +135°; `pt(a, r)` convierte ángulo y radio en un punto del SVG
   (el 0° apunta hacia arriba, por eso seno para x y coseno hacia arriba para y). Los arcos
   son paths con el comando "A" de SVG (arco de elipse): del punto de a0 al punto de a1. */
const CX = 170, CY = 168, R = 128;
const ang = (h) => (-135 + ((h - 6) / 18) * 270) * (Math.PI / 180);
const pt = (a, r = R) => [CX + r * Math.sin(a), CY - r * Math.cos(a)];
const arc = (a0, a1, r = R) => {
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

const ICONOS = { coffee: Coffee, bowl: BowlFood, orange: OrangeSlice, moon: MoonStars, fork: ForkKnife };
const horaDecimal = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; };
const colorEstado = (st) => (st.key === 'pendiente' ? '#75798c' : st.color);

export function DayOrbit({ franjas, pct, message, isToday, isPast, onOpen, canOpen }) {
  const ahora = new Date();
  const nowH = ahora.getHours() + ahora.getMinutes() / 60;
  const endH = isToday ? Math.min(Math.max(nowH, 6.01), 24) : isPast ? 24 : 6.01;
  const dayColor = pct === null ? 'var(--teal)' : pct >= 0.9 ? C.green : pct >= 0.5 ? C.amber : 'var(--color-text)';
  const pctN = pct === null ? null : Math.round(pct * 100);

  const ticks = [];
  for (let h = 6; h <= 24; h++) {
    const a = ang(h);
    const [x1, y1] = pt(a, R + 12), [x2, y2] = pt(a, R + (h % 6 === 0 ? 20 : 16));
    ticks.push({ x1, y1, x2, y2, c: h <= endH ? 'rgba(180,155,232,.45)' : 'rgba(233,233,237,.12)' });
  }
  const [nx, ny] = pt(ang(endH));
  const [lx, ly] = pt(ang(isToday ? nowH : 15), R - 22);

  const estaciones = franjas.map((f, i) => {
    const meta = slotMeta(f.slot, i, franjas.length);
    const h = horaDecimal(meta.time);
    const [x, y] = pt(ang(h));
    const [lx2, ly2] = pt(ang(h), R - 40);
    const registrada = f.status.key !== 'pendiente';
    return { f, meta, h, x, y, lx2, ly2, color: colorEstado(f.status), registrada, Icono: ICONOS[meta.icon] ?? ForkKnife };
  });

  return (
    <div className="orbit">
      <svg width="340" height="330" viewBox="0 0 340 330" className="orbit-svg" aria-hidden="true">
        <defs>
          <linearGradient id="orbitG" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#B49BE8" stopOpacity=".1" />
            <stop offset="1" stopColor="#D9CCF7" />
          </linearGradient>
          <filter id="orbitF" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <circle cx={CX} cy={CY} r="96" fill="none" stroke="rgba(233,233,237,.05)" strokeDasharray="2 6" />
        <path d={arc(ang(6), ang(24))} fill="none" stroke="rgba(233,233,237,.07)" strokeWidth="10" strokeLinecap="round" />
        {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.c} strokeWidth="1" />)}
        <path d={arc(ang(6), ang(endH), R - 13)} pathLength="1" strokeDasharray="1 1" fill="none" stroke="url(#orbitG)" strokeWidth="2.5" strokeLinecap="round" className="orbit-progress" />
        {estaciones.map((s) => (
          <g key={s.f.slot.id}>
            <path d={arc(ang(s.h) - 0.3, ang(s.h) + 0.3)} fill="none" stroke={s.color} strokeWidth="10" strokeLinecap="round" filter="url(#orbitF)" opacity={s.registrada ? 0.8 : 0} />
            <path d={arc(ang(s.h) - 0.3, ang(s.h) + 0.3)} fill="none" stroke={s.color} strokeWidth="10" strokeLinecap="round" opacity={s.registrada ? 1 : 0.35} />
          </g>
        ))}
        {isToday && (
          <>
            <circle cx={nx} cy={ny} r="10" fill="#D9CCF7" filter="url(#orbitF)" className="orbit-now" />
            <circle cx={nx} cy={ny} r="4" fill="#F5F4FF" />
          </>
        )}
      </svg>

      <div className="orbit-nowlbl" style={{ left: `${lx}px`, top: `${ly}px` }}>{isToday ? 'AHORA' : isPast ? 'DÍA CERRADO' : 'TODAVÍA NO'}</div>

      {estaciones.map((s) => (
        <div key={s.f.slot.id}>
          <button
            type="button"
            className={`orbit-node${s.registrada ? ' on' : ''}`}
            style={{
              left: `${s.x}px`, top: `${s.y}px`, borderColor: s.color, color: s.registrada ? s.color : 'var(--color-neutral-400)',
              background: s.registrada ? `radial-gradient(circle,${s.color}33,#1b1d2b 75%)` : '#1b1d2b',
              boxShadow: s.registrada ? `0 0 22px ${s.color}66, inset 0 0 12px ${s.color}33` : '0 6px 16px rgba(0,0,0,.4)',
            }}
            disabled={!canOpen}
            aria-label={`${s.f.slot.name}, ${s.meta.time}`}
            onClick={() => onOpen(s.f.slot)}
          >
            <s.Icono size={20} weight={s.registrada ? 'fill' : 'regular'} aria-hidden="true" />
          </button>
          <span className="orbit-time" style={{ left: `${s.lx2}px`, top: `${s.ly2}px`, color: s.registrada ? s.color : undefined }}>{s.meta.time}</span>
        </div>
      ))}

      <div className="orbit-center">
        <div className="orbit-k">DEL PLAN</div>
        <div className="orbit-pct" style={{ color: dayColor, textShadow: pctN !== null && pctN >= 50 ? `0 0 30px ${dayColor}` : 'none' }}>{pctN === null ? '—' : `${pctN}%`}</div>
        <div className="orbit-msg">{message}</div>
      </div>
    </div>
  );
}
