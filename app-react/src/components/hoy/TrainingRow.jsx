import { Link } from 'react-router-dom';
import { DumbbellIcon } from '../ui/Icons';
import { tint } from '../../lib/theme';

/* ----------------------------- ENTRENO DEL DÍA -----------------------------
   Port del bloque "Entreno" de viewHoy(). Muestra qué entrenamiento hay planificado para
   el día que se está mirando, con el color del tipo y si ya se hizo.

   Es solo lectura acá: el plan semanal se edita en Gimnasio, y tocar la fila lleva ahí,
   parado en la semana del día que se estaba mirando. En vanilla eso era `ui.gymOffset =
   …; ui.tab='gym'`; acá es un link a `/gym?d=<el día>`, y GymPage arranca su semana
   calculándola de ese parámetro (ver el comentario en GymPage.jsx). */
export function TrainingRow({ training, color, day }) {
  return (
    <Link className="evrow" style={{ borderLeft: `3px solid ${color}` }} to={{ pathname: '/gym', search: `?d=${day}` }}>
      <div className="evic" style={{ background: tint(color, '24'), color }}>
        <DumbbellIcon />
      </div>
      <div className="grow">
        <div className="evname">{training.type}</div>
        <div className="evsub">{training.done ? 'Entrenado' : 'Planificado'}</div>
      </div>
      <span className="evtime" style={{ color }}>Gym</span>
      <span className="evchev" style={{ color: tint(color, 'B3') }}>&#8250;</span>
    </Link>
  );
}
