import { AlertIcon, CheckIcon } from '../ui/Icons';

/* Aviso arriba del formulario: verde cuando algo salió bien, rojo cuando falló.
   role="alert" hace que un lector de pantalla lo anuncie al aparecer (en vanilla el aviso
   se escribía en el DOM sin avisarle a nadie). */
export function AuthFlash({ kind, msg }) {
  return (
    <div className={`auth-flash ${kind}`} role="alert">
      {kind === 'ok' ? <CheckIcon /> : <AlertIcon />}
      <span>{msg}</span>
    </div>
  );
}
