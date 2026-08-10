import { useState } from 'react';
import { AuthButton } from './AuthButton';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { logout } from '../../services/auth';
import { authErrorMessage } from '../../lib/authErrors';

/* Cerrar sesión, con su confirmación. Está como componente propio porque aparece en dos
   lugares (la pantalla de verificación y, más adelante, Ajustes) y en los dos hace
   exactamente lo mismo: preguntar, y recién ahí llamar a Firebase.

   Guarda su propio `confirming`: nadie más necesita saber si el cartel está abierto, así
   que ese estado no tiene por qué vivir más arriba. Regla general en React: el estado va
   en el componente más bajo que lo necesita. */
export function LogoutButton({ kind = 'ghost', label = 'Cerrar sesión', disabled = false, onError }) {
  const [confirming, setConfirming] = useState(false);

  async function confirm() {
    setConfirming(false);
    try {
      await logout();
      // No hace falta redirigir a mano: al cerrarse la sesión, el AuthProvider recibe el
      // aviso de Firebase y los guardianes de ruta mandan al login solos.
    } catch (e) {
      if (onError) onError(authErrorMessage(e));
    }
  }

  return (
    <>
      <AuthButton kind={kind} disabled={disabled} onClick={() => setConfirming(true)}>{label}</AuthButton>
      {confirming && (
        <ConfirmDialog
          title="¿Cerrar sesión?"
          description="Vas a volver a la pantalla de ingreso. Tus datos siguen guardados en tu cuenta."
          okLabel="Cerrar sesión"
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
