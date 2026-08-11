import { useCallback, useMemo, useState } from 'react';
import { ItemFormsContext } from './ItemFormsContext';
import { TaskFormModal } from '../components/items/TaskFormModal';
import { EventFormModal } from '../components/items/EventFormModal';
import { useSelectedDay } from '../hooks/useSelectedDay';

/* ----------------------------- QUIÉN ABRE LOS FORMULARIOS -----------------------------
   Los formularios de tarea y de cita se abren desde seis lugares distintos: una fila de
   Hoy, una de la bandeja, el botón "poner fecha", una fila del Calendario, el "Agregar"
   del día y el botón + de la barra. Todos necesitan lo mismo: "abrime el formulario de
   esta tarea".

   Si cada pantalla manejara su propio `const [modalAbierto, setModalAbierto]`, esa misma
   pieza estaría escrita tres veces y el botón + de la barra —que no vive dentro de ninguna
   pantalla— no tendría cómo abrirla. Así que sube a un contexto, pero solo sube ESTO.

   Ojo con la diferencia, que es la parte importante: acá el contexto NO lleva datos, lleva
   dos funciones. Y las dos son estables (useCallback con dependencias vacías + useMemo),
   así que el valor del contexto nunca cambia y ningún componente se redibuja por estar
   suscripto. Un contexto con datos adentro es una fuente de renders de más; uno con
   acciones adentro es gratis.

   Los datos del formulario en sí (lo tipeado) siguen viviendo abajo de todo, adentro de
   cada modal. Lo único que vive acá es CUÁL está abierto. */
export function ItemFormsProvider({ children }) {
  // { kind: 'task' | 'event', item, date } — o null, que es "no hay nada abierto".
  const [open, setOpen] = useState(null);
  const [, setDay] = useSelectedDay();

  const openTask = useCallback((task, date) => setOpen({ kind: 'task', item: task, date }), []);
  const openEvent = useCallback((item, date) => setOpen({ kind: 'event', item, date }), []);
  const close = useCallback(() => setOpen(null), []);

  const value = useMemo(() => ({ openTask, openEvent }), [openTask, openEvent]);

  /* focusDate() de la app vanilla: al guardar algo con fecha, el día que se está mirando
     se muda a esa fecha. Allá era escribir tres variables globales; acá es mover el ?d de
     la URL, y Hoy y Calendario lo siguen porque los dos leen de ahí. */
  const handleSaved = useCallback((dateISO) => setDay(dateISO), [setDay]);

  return (
    <ItemFormsContext.Provider value={value}>
      {children}
      {open?.kind === 'task' && (
        <TaskFormModal
          task={open.item}
          defaultDate={open.date}
          onClose={close}
          onSaved={handleSaved}
        />
      )}
      {open?.kind === 'event' && (
        <EventFormModal
          item={open.item}
          defaultDate={open.date}
          onClose={close}
          onSaved={handleSaved}
        />
      )}
    </ItemFormsContext.Provider>
  );
}
