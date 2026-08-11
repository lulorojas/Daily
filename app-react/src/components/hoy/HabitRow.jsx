import { FlameIcon, HabitIcon, HabitCheckIcon } from '../ui/Icons';
import { habitMarks, habitStreak, habitTPD } from '../../lib/habits';
import { tint } from '../../lib/theme';

/* ----------------------------- FILA DE HÁBITO (EN HOY) -----------------------------
   Port de habitRow() con menu=false, que es como la usa Hoy: el ícono, el nombre, la racha
   y los casilleros para marcarlo.

   Multi-check: un hábito puede tener varias marcas por día (timesPerDay). Tocar el slot i
   lo llena hasta ahí; si ya estaba lleno hasta ahí, lo baja. Esa cuenta no está acá: vive
   en setHabitSlot() (store/mutations.js), portada en la etapa 2. Acá solo se dibuja el
   estado y se avisa qué slot se tocó.

   `editable` es false para los días futuros: se ven los hábitos, pero no se pueden marcar
   por adelantado.

   Lo que NO hace todavía: en la app actual, tocar el nombre abre el editor del hábito.
   Ese formulario es de la pantalla Hábitos, que llega en la etapa 3b, así que acá el
   nombre no es tocable. */
export function HabitRow({ data, habit, dISO, editable, onMark }) {
  const marks = habitMarks(data, habit.id, dISO);
  const tpd = habitTPD(habit);
  const streak = habitStreak(data, habit.id, dISO);
  const meta = streak > 0
    ? `Racha de ${streak}${streak === 1 ? ' día' : ' días'}`
    : (habit.detail || 'Sin racha activa');

  return (
    <div className="habrow">
      <div className="iconwrap habicon" style={{ background: tint(habit.color, '24') }}>
        <HabitIcon icon={habit.icon} color={habit.color} />
      </div>

      <div className="grow">
        <div className="habname">{habit.name}</div>
        <div className="habmeta">
          {streak > 0 && <FlameIcon color={habit.color} />}
          <span>{meta}</span>
        </div>
      </div>

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
              onClick={() => onMark(habit.id, i)}
            >
              <div className="ring" />
              {on && <HabitCheckIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
