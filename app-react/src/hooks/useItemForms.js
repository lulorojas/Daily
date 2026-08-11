import { useContext } from 'react';
import { ItemFormsContext } from '../context/ItemFormsContext';

/* Atajo para abrir los formularios de agenda desde cualquier pantalla:

     const { openTask, openEvent } = useItemForms();
     openTask(tarea);              // editar una que existe
     openTask(null, '2026-08-10'); // una nueva, con esa fecha puesta

   El chequeo del null es el mismo de useAuth(): sin él, usar esto fuera del proveedor
   daría un error tres archivos más adelante y sin pistas. */
export function useItemForms() {
  const ctx = useContext(ItemFormsContext);
  if (!ctx) throw new Error('useItemForms() se usó fuera de <ItemFormsProvider>');
  return ctx;
}
