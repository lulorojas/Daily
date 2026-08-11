import { ScheduleIcon } from '../ui/Icons';
import { clickable } from '../ui/clickable';

/* ----------------------------- FILA DE LA BANDEJA (SIN FECHA) -----------------------------
   Port de pendRow(). Más chica que una tarea con fecha: un punto en vez de un check, y a
   la derecha el atajo para ponerle fecha.

   Ese atajo abre EXACTAMENTE el mismo formulario que tocar la fila (en vanilla eran dos
   data-act, 'task-open' y 'task-schedule', que caían en el mismo case del switch). Se deja
   igual: son dos entradas al mismo lugar, y la de la derecha existe porque el ícono de
   calendario dice qué vas a hacer ahí. */
export function PendingRow({ task, onOpen, onToggle }) {
  const done = !!task.done;

  return (
    <div className="trayrow" {...clickable(onOpen, { label: task.title })}>
      <button
        type="button"
        className={`traydot${done ? ' on' : ''}`}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecha'}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      />
      <span className={`traytext${done ? ' done' : ''}`}>{task.title}</span>
      <button
        type="button"
        className="minibtn"
        title="Poner fecha"
        aria-label="Poner fecha"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
      >
        <ScheduleIcon />
      </button>
    </div>
  );
}
