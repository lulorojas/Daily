import { CheckMarkIcon } from '../ui/Icons';
import { clickable } from '../ui/clickable';
import { C } from '../../lib/theme';
import { shortDate } from '../../lib/dates';

/* ----------------------------- FILA DE TAREA -----------------------------
   Port de taskRow(). La usan Hoy (las tareas del día) y el Calendario (las del día
   elegido), que es justo por qué en vanilla vivía en utils.js y no en ninguna de las dos
   pantallas.

   Tocar la fila abre el formulario; tocar el check la marca. Son dos acciones distintas en
   el mismo lugar, y por eso el check corta la propagación del click: sin eso, marcar una
   tarea abriría también su formulario. En vanilla el mismo problema se resolvía con un
   `data-stop="1"` que leía el manejador global. */
export function TaskRow({ task, color = C.amber, showDate = false, onOpen, onToggle }) {
  const done = !!task.done;
  // La píldora de la derecha: en el Calendario y en Hoy alcanza con la hora, porque la
  // fecha ya la da el contexto. showDate existe para listas donde eso no se sabe.
  const pill = showDate && task.date
    ? shortDate(task.date) + (task.time ? ` ${task.time}` : '')
    : (task.time || '');

  return (
    <div className="trow" {...clickable(onOpen, { label: task.title })}>
      <button
        type="button"
        className={`chk${done ? ' on' : ''}`}
        style={done ? { background: color, borderColor: color } : undefined}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecha'}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        <CheckMarkIcon />
      </button>

      <div className="grow">
        <span className={`ttext${done ? ' done' : ''}`}>{task.title}</span>
        {task.desc && <div className="tdesc">{task.desc}</div>}
      </div>

      {pill && <span className="tpill">{pill}</span>}
    </div>
  );
}
