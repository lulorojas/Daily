import { useContext, useMemo, useSyncExternalStore } from 'react';
import { DataContext } from '../context/DataContext';

/* ----------------------------- HOOK: los datos -----------------------------
   useSyncExternalStore es el hook oficial de React para leer de una fuente que vive
   AFUERA de React. Le das dos cosas: cómo suscribirse a los cambios y cómo leer el valor
   actual. React se encarga del resto — incluido no mostrar datos de dos versiones
   distintas mezclados cuando renderiza de forma concurrente.

   Es exactamente el caso de Firestore: los datos cambian por su cuenta (otro dispositivo,
   una escritura que se sincroniza), no porque un componente llamó a un setState.

   Lo que devuelve:
     status  'idle' | 'loading' | 'ready' | 'error'
     data    el documento del usuario, ya normalizado (null si no está listo)
     error   el código de Firestore si falló
     update / replaceAll / retry   las escrituras */
export function useDataStore() {
  const store = useContext(DataContext);
  if (!store) throw new Error('useData() se usó fuera de <DataProvider>');
  return store;
}

export function useData() {
  const store = useDataStore();

  // El tercer argumento es para renderizado en el servidor; acá es el mismo lector.
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return useMemo(() => ({
    ...snapshot,
    update: store.update,
    replaceAll: store.replaceAll,
    retry: store.retry,
  }), [snapshot, store]);
}
