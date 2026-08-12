import { useCallback, useMemo, useState } from 'react';
import { HabitFormsContext } from './HabitFormsContext';
import { HabitFormModal } from '../components/habitos/HabitFormModal';

/* ----------------------------- QUIÉN ABRE EL FORMULARIO DE HÁBITO -----------------------------
   Mismo patrón que ItemFormsProvider, por el mismo motivo: el editor de un hábito se abre
   desde dos pantallas que no se conocen entre sí — tocar el nombre de un hábito en Hoy
   (menu=false en la app vanilla) y el botón "Nuevo"/el "⋯ → Editar" de la pantalla
   Hábitos (menu=true). En vez de que Hoy le pida el favor a Hábitos, la decisión de CUÁL
   formulario está abierto sube al nivel que ven las dos: el layout de la app.

   Como con los formularios de agenda: el contexto lleva una función (`openHabit`), no un
   dato, así que nunca cambia y nadie se redibuja por estar suscripto. */
export function HabitFormsProvider({ children }) {
  const [open, setOpen] = useState(null); // el hábito a editar, `{}` para uno nuevo, o null
  const openHabit = useCallback((habit) => setOpen(habit || {}), []);
  const close = useCallback(() => setOpen(null), []);
  const value = useMemo(() => ({ openHabit }), [openHabit]);

  return (
    <HabitFormsContext.Provider value={value}>
      {children}
      {open && <HabitFormModal habit={open.id ? open : null} onClose={close} />}
    </HabitFormsContext.Provider>
  );
}
