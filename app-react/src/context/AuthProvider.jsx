import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { authStatus } from '../lib/authStatus';
import { subscribeToAuth, refreshUser, initError } from '../services/auth';

/* ----------------------------- PROVEEDOR DE SESIÓN -----------------------------
   Es el equivalente del objeto global AUTH de la app vanilla, pero como estado de React:
   cuando cambia, todo lo que lo lee se redibuja solo. No hay que acordarse de llamar a
   render() en cada lugar donde cambia la sesión — ese era el trabajo manual de vanilla.

   Hay UNA sola suscripción a Firebase en toda la app, y vive acá. */
export function AuthProvider({ children, subscribe = subscribeToAuth, refresh = refreshUser }) {
  // `ready` responde "¿Firebase ya nos dijo si hay sesión?". Arranca en false: mientras
  // tanto no se puede ni mostrar el login (parpadearía) ni la app (se filtraría).
  const [session, setSession] = useState({ ready: false, user: null });

  // useEffect = "corré esto DESPUÉS de dibujar, y limpiá lo que dejaste cuando corresponda".
  // El array vacío significa "una sola vez, al montar". Lo que devuelve la función se
  // ejecuta al desmontar: acá, cortar la suscripción a Firebase.
  useEffect(() => {
    return subscribe((user) => setSession({ ready: true, user }));
  }, [subscribe]);

  // Vuelve a preguntarle a Firebase por el usuario (después de abrir el link del mail).
  const reloadUser = useCallback(async () => {
    const user = await refresh();
    // Objeto nuevo, no el mismo mutado: así React se entera de que algo cambió.
    setSession((prev) => ({ ready: prev.ready, user }));
    return user;
  }, [refresh]);

  /* Al volver a la app después de abrir el mail, se re-chequea la verificación en silencio.
     Es lo mismo que hacía el listener de 'visibilitychange' en vanilla, pero atado al ciclo
     de vida del componente: si el proveedor se desmonta, el listener se va con él. */
  useEffect(() => {
    const { user } = session;
    if (!user || user.emailVerified) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') reloadUser().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [session, reloadUser]);

  /* useMemo evita crear un objeto nuevo en cada render. Sin esto, el valor del contexto
     sería distinto cada vez y todos los componentes suscriptos se redibujarían al pedo. */
  const value = useMemo(() => {
    const error = initError();
    return {
      user: session.user,
      ready: session.ready,
      error,
      status: authStatus({ ready: session.ready, user: session.user, error }),
      reloadUser,
    };
  }, [session, reloadUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
