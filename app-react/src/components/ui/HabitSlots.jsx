import { HabitCheckIcon } from './Icons';

/* ----------------------------- CASILLEROS DE UN HÁBITO -----------------------------
   La fila de checks de habitRow(), sacada aparte porque la usan dos filas distintas: la
   de Hoy (components/hoy/HabitRow.jsx) y la de Hábitos (components/habitos/HabitRow.jsx),
   que se diferencian en todo lo de ALREDEDOR (si hay menú "⋯", si el nombre abre el
   editor) pero dibujan los casilleros exactamente igual.

   Multi-check: un hábito puede tener varias marcas por día (timesPerDay). Tocar el slot i
   lo llena hasta ahí; si ya estaba lleno hasta ahí, lo baja. Esa cuenta no está acá: vive
   en setHabitSlot() (store/mutations.js). Acá solo se dibuja el estado. */
export function HabitSlots({ habit, marks, tpd, editable, onMark }) {
  return (
    <div className="slots">
      {Array.from({ length: tpd }, (_, i) => {
        const on = i < marks;
        return (
          <button
            type="button"
            key={i}
            className={`slot${on ? ' on' : ''}${editable ? '' : ' off'}`}
            /* El color del hábito lo elige el usuario y se guarda en el documento: es un
               dato, así que va inline. `color` además alimenta el anillo de la animación,
               que está pintado con currentColor. */
            style={on ? { color: habit.color, background: habit.color, borderColor: habit.color } : { color: habit.color }}
            disabled={!editable}
            aria-label={`${habit.name}, marca ${i + 1} de ${tpd}`}
            aria-pressed={on}
            onClick={() => onMark(i)}
          >
            <div className="ring" />
            {on && <HabitCheckIcon />}
          </button>
        );
      })}
    </div>
  );
}
