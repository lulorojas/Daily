import { useEffect, useState } from 'react';
import { DataContext } from './DataContext';
import { useAuth } from '../hooks/useAuth';
import { AUTH_STATUS } from '../lib/authStatus';
import { createDataStore, readLocalV2 } from '../store/dataStore';
import { subscribeToUserDoc, saveUserDoc } from '../services/firestore';

/* ----------------------------- PROVEEDOR DE DATOS -----------------------------
   Conecta la sesión con sus datos: con usuario verificado arranca el sync de Firestore
   para su uid; sin sesión o sin verificar, lo corta. Es el equivalente de authSyncData()
   en la app vanilla, pero atado al ciclo de vida del componente.

   El store se crea UNA vez. `useState` con una función adentro es el modo de decir
   "calculá esto solo en el primer render": si se escribiera useState(createDataStore(...)),
   se crearía un store nuevo en cada render y se tiraría a la basura enseguida.

   `store` entra por props para que los tests le pasen uno con un Firestore de mentira. */
export function DataProvider({ children, store: injected }) {
  const { user, status } = useAuth();
  const [store] = useState(() => injected || createDataStore({
    subscribe: subscribeToUserDoc,
    save: saveUserDoc,
    readLocalSeed: readLocalV2,
  }));

  /* Se depende del uid (un string), no del objeto `user`. El objeto se recrea en cada
     aviso de Firebase —por ejemplo al re-chequear la verificación del email— y eso haría
     re-suscribirse a Firestore sin que haya cambiado nada. El string, no. */
  const uid = status === AUTH_STATUS.READY && user ? user.uid : null;

  useEffect(() => {
    if (!uid) { store.stop(); return undefined; }
    store.start(uid);
    return () => store.stop();
  }, [store, uid]);

  return <DataContext.Provider value={store}>{children}</DataContext.Provider>;
}
