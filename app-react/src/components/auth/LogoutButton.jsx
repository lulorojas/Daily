import { useState } from 'react';
import { AuthButton } from './AuthButton';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { logout } from '../../services/auth';
import { authErrorMessage } from '../../lib/authErrors';

/* Cerrar sesión, con su confirmación. Está como componente propio porque aparece en dos
   lugares (la pantalla de verificación y Ajustes) y en los dos hace exactamente lo mismo:
   preguntar, y recién ahí llamar a Firebase — lo único que cambia es el aspecto del
   botón, porque en vanilla también es distinto en cada pantalla: la de verificación usa
   el mismo botón de sesión que el resto de esa pantalla (`.abtn.ghost`), Ajustes usa la
   fila roja de "acción peligrosa" (`.delbtn`) que comparte con "Eliminar cuenta" en el
   resto de la app. `variant` elige cuál de las dos dibujar.

   Guarda su propio `confirming`: nadie más necesita saber si el cartel está abierto, así
   que ese estado no tiene por qué vivir más arriba. Regla general en React: el estado va
   en el componente más bajo que lo necesita. */
export function LogoutButton({ variant = 'auth', kind = 'ghost', label = 'Cerrar sesión', disabled = false, onError }) {
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
      {variant === 'delbtn' ? (
        <button type="button" className="delbtn" disabled={disabled} onClick={() => setConfirming(true)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17.5V20a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 20V4a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 15 4v2.5M10 12h11M17.5 8.5 21 12l-3.5 3.5" />
          </svg>
          {label}
        </button>
      ) : (
        <AuthButton kind={kind} disabled={disabled} onClick={() => setConfirming(true)}>{label}</AuthButton>
      )}
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
