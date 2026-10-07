import { progressMessage } from '../../lib/items';

/* ----------------------------- BARRA DE PROGRESO DEL DÍA -----------------------------
   Port del bloque .progday de viewHoy(), con el dibujo del rediseño "Glass + aurora": un
   arco semicircular en vez de la barra lineal que tenía la v3. La cuenta sigue siendo la
   misma, dayProgress() de lib/ (etapa 2) — lo único que cambia es cómo se dibuja el
   mismo número.

   El arco es un <path> de SVG recorrido con pathLength="100": así stroke-dasharray puede
   ser directamente "{pct} 100" sin tener que convertir el porcentaje a la longitud real
   del arco (una cuenta con el radio que no vale la pena repetir en cada caller). El Math.max
   evita un arco de largo 0 cuando pct es 0 — un punto de 0.5 sigue marcando el arranque.

   Las dos chips de abajo (Tareas / Hábitos) son nuevas: separan la cuenta combinada del
   arco en sus dos partes, que HoyPage ya tenía calculadas por separado para el subtítulo. */
export function DayProgress({ progress, tasksDone, tasksTotal, habitsDone, habitsTotal }) {
  const pct = progress.pct;
  const dash = `${Math.max(pct, pct > 0 ? 0.5 : 0)} 100`;

  return (
    <div className="progday">
      <span className="progday-label">Progreso del día</span>
      <div className="progday-arc">
        <svg width="240" height="128" viewBox="0 0 240 128" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="progdayGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--amber)" />
              <stop offset=".5" stopColor="var(--coral)" />
              <stop offset="1" stopColor="var(--violet)" />
            </linearGradient>
          </defs>
          <path d="M 16 120 A 104 104 0 0 1 224 120" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="14" strokeLinecap="round" />
          <path
            d="M 16 120 A 104 104 0 0 1 224 120" fill="none" stroke="url(#progdayGrad)" strokeWidth="14" strokeLinecap="round"
            pathLength="100" strokeDasharray={dash} className="progday-fill"
          />
          <path d="M 34 120 A 86 86 0 0 1 206 120" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" strokeDasharray="1 6" />
        </svg>
        <div className="progday-center">
          <span className="progday-pct">{pct}%</span>
          <span className="progday-msg">{progressMessage(progress)}</span>
        </div>
      </div>
      <div className="progday-stats">
        <div className="progday-stat amber">
          <span>Tareas</span>
          <b>{tasksDone}/{tasksTotal}</b>
        </div>
        <div className="progday-stat green">
          <span>Hábitos</span>
          <b>{habitsDone}/{habitsTotal}</b>
        </div>
      </div>
    </div>
  );
}
