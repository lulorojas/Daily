import { useContext } from 'react';
import { HabitFormsContext } from '../context/HabitFormsContext';

/* Atajo para abrir el editor de un hábito desde cualquier pantalla:
     const { openHabit } = useHabitForms();
     openHabit(hb);    // editar uno que existe
     openHabit(null);  // uno nuevo */
export function useHabitForms() {
  const ctx = useContext(HabitFormsContext);
  if (!ctx) throw new Error('useHabitForms() se usó fuera de <HabitFormsProvider>');
  return ctx;
}
