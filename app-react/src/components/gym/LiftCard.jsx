import { repsLabel } from '../../lib/gym';
import { fmtNum } from '../../lib/dates';
import { C } from '../../lib/theme';

/* ----------------------------- FILA DE UN EJERCICIO -----------------------------
   Port de liftCard(), con el dibujo del rediseño Nocturne: el nombre con una barra corta
   contra el pico entre todos los ejercicios (maxCur, que calcula GymPage porque necesita
   mirar a TODOS a la vez), una mini línea con la evolución, y a la derecha el peso actual y
   lo que subió desde el primer registro.

   Tocar la fila ya no abre el detalle: la elige para mostrar su gráfico arriba (`selected`
   la marca). El detalle se abre desde el botón del gráfico. */
const SPARK_W = 72, SPARK_H = 26;

export function LiftCard({ lift, maxCur, selected, onSelect }) {
  const data = lift.history.map((p) => p.weight);
  const cur = data[data.length - 1];
  const curReps = lift.history[lift.history.length - 1].reps;
  const gain = +(cur - data[0]).toFixed(1);
  const bar = Math.round((cur / (maxCur || cur)) * 100);
  const deltaColor = gain < 0 ? C.danger : gain > 0 ? C.green : 'rgba(242,244,248,.35)';

  // La mini línea: cada peso se escala entre el mínimo y el máximo del ejercicio.
  const mn = Math.min(...data), mx = Math.max(...data);
  const spark = data
    .map((v, i) => {
      const x = data.length === 1 ? SPARK_W / 2 : (i / (data.length - 1)) * SPARK_W;
      const y = mx === mn ? SPARK_H / 2 : (SPARK_H - 2) - ((v - mn) / (mx - mn)) * (SPARK_H - 4);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <button
      type="button"
      className={`liftrow${selected ? ' sel' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
      style={selected ? { background: `${lift.color}12`, boxShadow: `inset 0 0 0 1px ${lift.color}55` } : undefined}
    >
      <div className="liftrow-main">
        <span className="nm">{lift.name}</span>
        <div className="bartrack thin"><div style={{ background: lift.color, width: `${bar}%`, boxShadow: `0 0 8px ${lift.color}` }} /></div>
      </div>
      <svg className="liftrow-spark" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H} aria-hidden="true">
        <path d={spark} fill="none" stroke={lift.color} strokeWidth="1.6" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${lift.color})` }} />
      </svg>
      <div className="liftrow-side">
        <span className="kg">{fmtNum(cur)} {lift.unit || 'kg'}{repsLabel(curReps)}</span>
        <span className="delta" style={{ color: deltaColor }}>
          {data.length > 1 ? (gain > 0 ? '+' : '') + (gain === 0 ? '=' : fmtNum(gain)) : 'nuevo'}
        </span>
      </div>
    </button>
  );
}

