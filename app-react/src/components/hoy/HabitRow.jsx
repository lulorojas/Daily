import { FlameIcon, HabitIcon } from '../ui/Icons';
import { HabitSlots } from '../ui/HabitSlots';
import { clickable } from '../ui/clickable';
import { habitMarks, habitStreak, habitTPD } from '../../lib/habits';
import { tint } from '../../lib/theme';

/* ----------------------------- FILA DE HÁBITO (EN HOY) -----------------------------
   Port de habitRow() con menu=false, que es como la usa Hoy: el ícono, el nombre, la racha
   y los casilleros para marcarlo. Sin el menú "⋯" de Hábitos, tocar el nombre abre
   directo el editor — es lo que hacía vanilla con `data-act="habit-open"` en ese div
   cuando menu era falso.

   Multi-check: un hábito puede tener varias marcas por día (timesPerDay). Tocar el slot i
   lo llena hasta ahí; si ya estaba lleno hasta ahí, lo baja. Esa cuenta no está acá: vive
   en setHabitSlot() (store/mutations.js). Acá solo se dibuja el estado y se avisa qué slot
   se tocó (ver HabitSlots, compartida con la fila de la pantalla Hábitos).

   `editable` es false para los días futuros: se ven los hábitos, pero no se pueden marcar
   por adelantado. */
export function HabitRow({ data, habit, dISO, editable, onMark, onOpen }) {
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

      <div className="grow" {...clickable(onOpen, { label: habit.name })}>
        <div className="habname">{habit.name}</div>
        <div className="habmeta">
          {streak > 0 && <FlameIcon color={habit.color} />}
          <span>{meta}</span>
        </div>
      </div>

      <HabitSlots
        habit={habit}
        marks={marks}
        tpd={tpd}
        editable={editable}
        onMark={(slot) => onMark(habit.id, slot)}
      />
    </div>
  );
}
