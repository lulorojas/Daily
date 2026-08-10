import { Link } from 'react-router-dom';
import { AuthShell } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { AuthButton } from '../components/auth/AuthButton';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthAction } from '../hooks/useAuthAction';
import { validateRegister, PASS_MIN } from '../lib/validation';
import { register as createAccount } from '../services/auth';
import { authSender } from '../services/firebase';

export function RegisterPage() {
  const { register, validateAll } = useAuthForm(
    { email: '', password: '', password2: '' },
    validateRegister,
  );
  const { busy, flash, run } = useAuthAction();

  function handleSubmit(e) {
    e.preventDefault();
    const values = validateAll();
    if (!values) return;
    // Creada la cuenta sale el mail de verificación (lo hace el servicio) y el router
    // lleva solo a la pantalla de verificación, porque el usuario nuevo no está verificado.
    run('registro', () => createAccount(values.email, values.password));
  }

  return (
    <AuthShell
      title="Creá tu cuenta"
      sub="Con tu email y una contraseña alcanza."
      flash={flash}
      onSubmit={handleSubmit}
    >
      <AuthField label="Email" type="email" placeholder="vos@ejemplo.com" autoComplete="email" {...register('email')} />
      <AuthField
        label="Contraseña"
        type="password"
        placeholder={`Mínimo ${PASS_MIN} caracteres`}
        hint={`mínimo ${PASS_MIN}`}
        autoComplete="new-password"
        {...register('password')}
      />
      <AuthField
        label="Repetir contraseña"
        type="password"
        placeholder="La misma de arriba"
        autoComplete="new-password"
        {...register('password2')}
      />

      <AuthButton type="submit" busy={busy === 'registro'}>Crear cuenta</AuthButton>

      <div className="auth-note">
        Te va a llegar un mail de <b>{authSender()}</b> para confirmar tu casilla.
        Puede caer en <b>Spam</b> o Correo no deseado: es nuestro, podés abrirlo tranquilo.
      </div>

      <Link className="alink" to="/login">¿Ya tenés cuenta? <b>Entrá</b></Link>
    </AuthShell>
  );
}
