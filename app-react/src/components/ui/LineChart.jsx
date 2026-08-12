import { useEffect, useId, useState } from 'react';
import { areaPath, chartPoints, smoothPath } from '../../lib/charts';
import { fmtNum, shortDate } from '../../lib/dates';
import { C } from '../../lib/theme';

/* ----------------------------- GRÁFICO DE LÍNEA INTERACTIVO -----------------------------
   Port de lineChart(). Curva suave con relleno degradé, un punto tocable por registro y un
   globito con la fecha y el valor al tocarlo.

   Lo que cambia respecto de vanilla: allá el tooltip lo manejaba el listener global
   (`data-act="chart-pt"`), que buscaba el nodo `.charttip` del gráfico y le escribía el
   texto y la posición a mano. Acá cuál punto está abierto es estado de este componente y
   el globito se dibuja solo. Cada gráfico tiene el suyo, así que dos en la misma pantalla
   no se pisan — algo que en vanilla había que cuidar a mano con el `data-for`.

   Un detalle heredado a propósito: los círculos tocables tienen r=11 aunque el punto que
   se ve sea mucho más chico. Es área de dedo, no diseño: con r=4 no se podría tocar. */
export function LineChart({
  points, color, W = 320, H = 96, unit = '', padX = 8, padY = 14, sw = 2.6, style,
}) {
  const gid = useId();
  const [abierto, setAbierto] = useState(null);

  /* Tocar fuera de cualquier gráfico cierra el globito. Va en fase de captura, igual que
     en la app vanilla, para que se cierre aunque el click caiga en algo que no responde. */
  useEffect(() => {
    if (abierto === null) return undefined;
    const fuera = (e) => { if (!e.target.closest('.chartwrap')) setAbierto(null); };
    document.addEventListener('click', fuera, true);
    return () => document.removeEventListener('click', fuera, true);
  }, [abierto]);

  if (!points.length) {
    return (
      <div className="chartwrap">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} />
      </div>
    );
  }

  const co = chartPoints(points.map((p) => p.v), { W, H, padX, padY });
  const line = smoothPath(co.map((c) => [c.x, c.y]));
  const area = areaPath(line, co, { H, padX, padY });
  const last = co[co.length - 1];

  const etiqueta = (i) => `${shortDate(points[i].date)}  ${fmtNum(points[i].v)}${unit ? ` ${unit}` : ''}`;

  return (
    <div className="chartwrap">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={style}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${gid})`} className="sparkArea" />
        <path d={line} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className="spark" />

        {/* El halo y el punto del último registro, que es el que se destaca. */}
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="9" fill={color} opacity=".2" className="sparkArea" />
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="4" fill={color} stroke={C.surf2} strokeWidth="2.2" className="sparkArea" />

        {co.map((c) => (
          <circle
            key={c.i}
            cx={c.x.toFixed(1)}
            cy={c.y.toFixed(1)}
            r="11"
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setAbierto((prev) => (prev === c.i ? null : c.i));
            }}
          />
        ))}
      </svg>

      {abierto !== null && (
        <div
          className="charttip show"
          style={{
            left: `${(co[abierto].x / W * 100).toFixed(2)}%`,
            top: `${(co[abierto].y / H * 100).toFixed(2)}%`,
          }}
        >
          {etiqueta(abierto)}
        </div>
      )}
    </div>
  );
}
