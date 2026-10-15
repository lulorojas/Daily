import { CheckCircle, CheckSquare } from '@phosphor-icons/react';
import { progressMessage } from '../../lib/items';

/* ----------------------------- PROGRESO DEL DÍA -----------------------------
   Port del bloque .progday de viewHoy(), con el dibujo del rediseño Nocturne: un arco
   semicircular de 260×150 con marcas (21 rayitas alrededor, las que ya se cumplieron
   encendidas), un brillo difuso debajo del trazo y el porcentaje grande en el centro. La
   cuenta es la misma de siempre, dayProgress() de lib/ — lo único que cambia es cómo se
   dibuja el mismo número.

   El arco es un <path> de SVG recorrido con pathLength="100": así stroke-dasharray puede
   ser directamente "{pct} 100" sin convertir el porcentaje a la longitud real del arco. El
   Math.max evita un arco de largo 0 cuando pct es 0 — un punto de 0.5 sigue marcando el
   arranque. Las dos casillas de abajo separan la cuenta combinada en sus dos partes
   (tareas y hábitos), que HoyPage ya tenía calculadas por separado para el subtítulo. */
const TICKS = Array.from({ length: 21 }, (_, i) => {
  const a = Math.PI * (1 - i / 20);
  const r1 = 124, r2 = i % 5 === 0 ? 132 : 128;
  return { x1: 130 + r1 * Math.cos(a), y1: 140 - r1 * Math.sin(a), x2: 130 + r2 * Math.cos(a), y2: 140 - r2 * Math.sin(a), at: i / 20 };
});

export function DayProgress({ progress, tasksDone, tasksTotal, habitsDone, habitsTotal, className = '' }) {
  const pct = progress.pct;
  const dash = `${Math.max(pct, pct > 0 ? 0.5 : 0)} 100`;

  return (
    <div className={`card progday sweep ${className}`}>
      <div className="progday-top">
        <span className="progday-label">Progreso del día</span>
      </div>
      <div className="progday-arc">
        <svg width="260" height="150" viewBox="0 0 260 150" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="progdayGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--amber)" />
              <stop offset=".5" stopColor="var(--coral)" />
              <stop offset="1" stopColor="var(--violet)" />
            </linearGradient>
            <filter id="progdayBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          {TICKS.map((t, i) => (
            <line
              key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth="1.5" strokeLinecap="round"
              stroke={t.at <= pct / 100 && pct > 0 ? 'rgba(234,192,106,.6)' : 'rgba(233,233,237,.15)'}
            />
          ))}
          <path d="M 18 140 A 112 112 0 0 1 242 140" fill="none" stroke="rgba(233,233,237,.07)" strokeWidth="14" strokeLinecap="round" />
          <path
            d="M 18 140 A 112 112 0 0 1 242 140" fill="none" stroke="url(#progdayGrad)" strokeWidth="14" strokeLinecap="round"
            pathLength="100" strokeDasharray={dash} opacity=".7" className="progday-fill glow"
          />
          <path
            d="M 18 140 A 112 112 0 0 1 242 140" fill="none" stroke="url(#progdayGrad)" strokeWidth="14" strokeLinecap="round"
            pathLength="100" strokeDasharray={dash} className="progday-fill"
          />
        </svg>
        <div className="progday-center">
          <span className="progday-pct">{pct}%</span>
          <span className="progday-msg">{progressMessage(progress)}</span>
        </div>
      </div>
      <div className="progday-stats">
        <div className="progday-stat amber">
          <CheckSquare size={18} aria-hidden="true" />
          <span>Tareas</span>
          <b>{tasksDone}/{tasksTotal}</b>
        </div>
        <div className="progday-stat green">
          <CheckCircle size={18} aria-hidden="true" />
          <span>Hábitos</span>
          <b>{habitsDone}/{habitsTotal}</b>
        </div>
      </div>
    </div>
  );
}
