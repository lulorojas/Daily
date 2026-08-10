import { createContext } from 'react';

/* Por acá NO viajan los datos: viaja el STORE.

   La diferencia importa. Si el contexto llevara el documento del usuario, cada vez que
   marcás una tarea cambiaría el valor del contexto y React redibujaría TODOS los
   componentes que lo consumen, tengan que ver con esa tarea o no.

   Llevando el store, el valor del contexto es siempre el mismo objeto de principio a fin
   de la sesión: el contexto nunca provoca un redibujado. Quien decide quién se entera de
   qué es useSyncExternalStore, adentro de useData(). */
export const DataContext = createContext(null);
