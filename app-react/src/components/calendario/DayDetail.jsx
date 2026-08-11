import { TaskRow } from '../items/TaskRow';
import { EventRow } from '../items/EventRow';
import { clickable } from '../ui/clickable';
import { DOW_FULL, MONTHS, dow, parseISO } from '../../lib/dates';
import { agendaDe, tareasDe } from '../../lib/agenda';

/* ----------------------------- DETALLE DEL DÍA -----------------------------
   Port del segundo tramo de viewCalendario(). Lo que hay en el día elegido, con el mismo
   aspecto que en Hoy: las tareas con su check, las citas y las anuales como filas de color.

   Es el mismo <TaskRow> y el mismo <EventRow> que usa Hoy, sin una línea de diferencia.
   En vanilla eso ya pasaba (las dos vistas llamaban a taskRow() de utils.js) y era una de
   las cosas más sanas del código original: la tarea se ve igual esté donde esté. */
export function DayDetail({ data, day, onOpenTask, onOpenEvent, onToggleTask, onAdd }) {
  const tareas = tareasDe(data, day);
  const eventos = agendaDe(data, day);
  const total = tareas.length + eventos.length;
  const sel = parseISO(day);

  return (
    <div className="softcard daydetail">
      <div className="dd-head">
        <div>
          <div className="fr dd-title">{DOW_FULL[dow(sel)]} {sel.getDate()}</div>
          <div className="dd-sub">
            {total
              ? `${total} ${total === 1 ? 'entrada' : 'entradas'} · ${MONTHS[sel.getMonth()].toLowerCase()}`
              : 'Sin entradas este día'}
          </div>
        </div>
        <button type="button" className="dd-add" onClick={onAdd}>Agregar</button>
      </div>

      {total ? (
        <div className="dd-list">
          {tareas.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={() => onOpenTask(t)} onToggle={() => onToggleTask(t.id)} />
          ))}
          {eventos.map((e) => (
            <EventRow key={e.id} item={e} onOpen={() => onOpenEvent(e)} />
          ))}
        </div>
      ) : (
        <div className="dashed" {...clickable(onAdd)}>+ Agregar a este día</div>
      )}
    </div>
  );
}
