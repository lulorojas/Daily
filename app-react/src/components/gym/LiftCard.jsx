import { fmtNum } from '../../lib/dates';
import { C } from '../../lib/theme';

/* ----------------------------- FILA DE UN EJERCICIO -----------------------------
   Port de liftCard(). Barra de progreso corta contra el pico entre todos los ejercicios
   (maxCur, que calcula GymPage porque necesita mirar a TODOS los ejercicios a la vez), el
   peso actual y la variación desde el primer registro. */
export function LiftCard({ lift, maxCur, onOpen }) {
  const data = lift.history.map((p) => p.weight);
  const cur = data[data.length - 1];
  const gain = +(cur - data[0]).toFixed(1);
  const bar = Math.round((cur / (maxCur || cur)) * 100);
  const deltaColor = gain < 0 ? C.danger : gain > 0 ? C.green : 'rgba(242,244,248,.35)';

  return (
    <button type="button" className="liftrow" onClick={onOpen}>
      <div className="liftrow-main">
        <span className="nm">{lift.name}</span>
        <div className="bartrack thin"><div style={{ background: lift.color, width: `${bar}%` }} /></div>
      </div>
      <div className="liftrow-side">
        <span className="kg">{fmtNum(cur)} {lift.unit || 'kg'}</span>
        <span className="delta" style={{ color: deltaColor }}>
          {data.length > 1 ? (gain > 0 ? '+' : '') + (gain === 0 ? '=' : fmtNum(gain)) : 'nuevo'}
        </span>
      </div>
    </button>
  );
}
