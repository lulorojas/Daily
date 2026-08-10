import { useCallback, useEffect, useRef, useState } from 'react';
import { authErrorMessage } from '../lib/authErrors';

/* ----------------------------- HOOK: pedido a Firebase -----------------------------
   Las cuatro pantallas de sesión hacen lo mismo alrededor de su llamada a Firebase:
   bloquear el botón, limpiar el aviso anterior, y si algo falla, destrabar el botón y
   mostrar el error traducido. En vanilla eso eran authBusy() + authFlash() repetidos en
   cada acción; acá es un hook, que es simplemente una función que guarda estado propio y
   se puede reutilizar.

   `busy` no es un booleano sino el nombre de la acción en curso ('login', 'resend'…), para
   que en una pantalla con varios botones se sepa cuál poner en "Un momento…" y cuáles
   deshabilitar.

   Ojo con el caso feliz de login/registro: NO se destraba el botón. La pantalla está por
   desaparecer (Firebase avisa el cambio de sesión y el router redirige); destrabarlo haría
   un parpadeo de medio segundo. Por eso el destrabe explícito solo ocurre si se pasa
   onSuccess, que es lo que hacen las acciones que sí se quedan en la misma pantalla. */
export function useAuthAction() {
  const [busy, setBusy] = useState(null);
  const [flash, setFlash] = useState(null);

  // Una promesa puede volver después de que la pantalla ya se fue. Este ref dice si el
  // componente sigue montado, para no tocar el estado de algo que ya no existe.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const run = useCallback(async (name, fn, { onSuccess } = {}) => {
    setFlash(null);
    setBusy(name);
    try {
      const value = await fn();
      if (onSuccess && alive.current) {
        setBusy(null);
        onSuccess(value);
      }
      return true;
    } catch (error) {
      if (alive.current) {
        setBusy(null);
        setFlash({ kind: 'err', msg: authErrorMessage(error) });
      }
      return false;
    }
  }, []);

  const showOk = useCallback((msg) => setFlash({ kind: 'ok', msg }), []);
  const showError = useCallback((msg) => setFlash({ kind: 'err', msg }), []);
  const clearFlash = useCallback(() => setFlash(null), []);

  return { busy, flash, run, showOk, showError, clearFlash };
}
