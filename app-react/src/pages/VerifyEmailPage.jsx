import { AuthShell } from '../components/auth/AuthShell';
import { AuthButton } from '../components/auth/AuthButton';
import { LogoutButton } from '../components/auth/LogoutButton';
import { MailIcon } from '../components/ui/Icons';
import { useAuth } from '../hooks/useAuth';
import { useAuthAction } from '../hooks/useAuthAction';
import { resendVerification } from '../services/auth';
import { authSender } from '../services/firebase';
import { C } from '../lib/theme';

/* Pantalla bloqueante: hay sesión, pero hasta que el email no esté verificado no se entra
   a la app. Quien decide eso es el guardián de ruta, no esta pantalla; acá solo se ofrecen
   las tres salidas posibles: ya lo verifiqué, reenviame el mail, o me voy. */
export function VerifyEmailPage() {
  const { user, reloadUser } = useAuth();
  const { busy, flash, run, showOk, showError } = useAuthAction();

  function handleRecheck() {
    // emailVerified viene del token cacheado: recién después de releer al usuario refleja
    // que se abrió el link. Si ahora está verificado, el guardián de ruta manda a la app.
    run('recheck', reloadUser, {
      onSuccess: (fresh) => {
        if (!fresh || !fresh.emailVerified) {
          showError('Todavía figura sin verificar. Abrí el link del email y volvé a probar.');
        }
      },
    });
  }

  function handleResend() {
    run('resend', resendVerification, {
      onSuccess: () => showOk('Listo, te reenviamos el email a ' + user.email + '.'),
    });
  }

  return (
    <AuthShell
      title="Verificá tu email"
      sub="Te mandamos un link para confirmar que la casilla es tuya."
      accent={C.coral}
      flash={flash}
    >
      <div className="card verify-card">
        <div className="verify-icon"><MailIcon /></div>
        <div className="verify-text">
          Revisá tu casilla en<br /><b>{user?.email}</b><br />y abrí el link para continuar.
        </div>
        <div className="verify-note">
          El mail viene de <b>{authSender()}</b>. Puede tardar un par de minutos o caer en{' '}
          <b>Spam / No deseado</b> — es un correo nuestro, es seguro abrir el link.
        </div>
      </div>

      <AuthButton busy={busy === 'recheck'} disabled={!!busy} onClick={handleRecheck}>Ya lo verifiqué</AuthButton>
      <AuthButton kind="ghost" busy={busy === 'resend'} disabled={!!busy} onClick={handleResend}>Reenviar email</AuthButton>
      <LogoutButton disabled={!!busy} onError={showError} />
    </AuthShell>
  );
}
