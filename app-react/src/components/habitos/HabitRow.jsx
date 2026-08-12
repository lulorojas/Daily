import { useEffect, useRef } from 'react';
import { FlameIcon, HabitIcon } from '../ui/Icons';
import { HabitSlots } from '../ui/HabitSlots';
import { habitMarks, habitStreak, habitTPD } from '../../lib/habits';
import { C, tint } from '../../lib/theme';

/* ----------------------------- FILA DE HÁBITO (EN HÁBITOS) -----------------------------
   Port de habitRow() con menu=true. A diferencia de la de Hoy, acá el nombre NO abre nada
   directo: la fila tiene su propio "⋯" que despliega Editar/Eliminar, así que hay dos
   pasos en vez de uno. Es la misma decisión que la app vanilla, no una elección nueva —
   en la pantalla dedicada a los hábitos, borrar por accidente es más caro que en Hoy.

   Qué menú está abierto vive en la PANTALLA (`open`, `onToggleMenu`), no acá adentro: dos
   motivos. Uno, en vanilla solo un menú podía estar abierto a la vez (`ui.habMenu` era una
   sola variable) — si cada fila tuviera su propio estado, no habría forma simple de cerrar
   las demás al abrir una. Dos, cerrar el menú al tocar afuera necesita saber cuál está
   abierto desde un solo lugar. */
export function HabitRow({ data, habit, dISO, editable, onMark, onEdit, onDelete, open, onToggleMenu }) {
  const marks = habitMarks(data, habit.id, dISO);
  const tpd = habitTPD(habit);
  const streak = habitStreak(data, habit.id, dISO);
  const meta = streak > 0
    ? `Racha de ${streak}${streak === 1 ? ' día' : ' días'}`
    : (habit.detail || 'Sin racha activa');

  const menuRef = useRef(null);

  // Cerrar al tocar afuera del menú (y que no sea el propio botón "⋯", que ya lo maneja él).
  useEffect(() => {
    if (!open) return undefined;
    const fuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onToggleMenu();
    };
    document.addEventListener('click', fuera, true);
    return () => document.removeEventListener('click', fuera, true);
  }, [open, onToggleMenu]);

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
        <HabitSlots habit={habit} marks={marks} tpd={tpd} editable={editable} onMark={(slot) => onMark(habit.id, slot)} />
        <button type="button" className="hmenubtn" aria-label={`Opciones de ${habit.name}`} aria-expanded={open} onClick={onToggleMenu}>
          &#8943;
        </button>
      </div>

      {open && (
        <div className="hmenu" ref={menuRef}>
          <button type="button" onClick={onEdit}>Editar hábito</button>
          <button type="button" style={{ color: C.danger }} onClick={onDelete}>Eliminar</button>
        </div>
      )}
    </div>
  );
}
