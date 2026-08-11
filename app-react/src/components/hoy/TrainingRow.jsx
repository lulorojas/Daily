import { DumbbellIcon } from '../ui/Icons';
import { tint } from '../../lib/theme';

/* ----------------------------- ENTRENO DEL DÍA -----------------------------
   Port del bloque "Entreno" de viewHoy(). Muestra qué entrenamiento hay planificado para
   el día que se está mirando, con el color del tipo y si ya se hizo.

   Es solo lectura: el plan semanal se edita en Gimnasio. En la app actual, tocar esta fila
   lleva a esa pantalla, parada en la semana del día que estabas viendo. Gimnasio llega en
   la etapa 3b, así que por ahora la fila se ve igual pero no navega a ningún lado; cuando
   exista la pantalla, se le engancha el link acá y nada más cambia. */
export function TrainingRow({ training, color }) {
  return (
    <div className="evrow" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="evic" style={{ background: tint(color, '24'), color }}>
        <DumbbellIcon />
      </div>
      <div className="grow">
        <div className="evname">{training.type}</div>
        <div className="evsub">{training.done ? 'Entrenado' : 'Planificado'}</div>
      </div>
      <span className="evtime" style={{ color }}>Gym</span>
      <span className="evchev" style={{ color: tint(color, 'B3') }}>&#8250;</span>
    </div>
  );
}
