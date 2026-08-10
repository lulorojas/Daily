import { AuthShell } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { AuthButton } from '../components/auth/AuthButton';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthAction } from '../hooks/useAuthAction';
import { validateReset } from '../lib/validation';
import { sendReset } from '../services/auth';

export function ResetPasswordPage() {
  const { register, validateAll } = useAuthForm({ email: '' }, validateReset);
  const { busy, flash, run, showOk } = useAuthAction();

  function handleSubmit(e) {
    e.preventDefault();
    const values = validateAll();
    if (!values) return;
    // Acá sí hay onSuccess: la pantalla no cambia, así que hay que destrabar el botón y
    // contar qué pasó. El mensaje no confirma si la cuenta existe (no se filtra si un
    // email está registrado o no), igual que en la app actual.
    run('reset', () => sendReset(values.email), {
      onSuccess: () => showOk('Si hay una cuenta con ese email, ya salió el link para cambiar la contraseña. Revisá también el correo no deseado.'),
    });
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      sub="Poné tu email y te mandamos un link para cambiarla."
      back={{ to: '/login', label: 'Entrar' }}
      flash={flash}
      onSubmit={handleSubmit}
    >
      <AuthField label="Email" type="email" placeholder="vos@ejemplo.com" autoComplete="email" {...register('email')} />
      <AuthButton type="submit" busy={busy === 'reset'}>Enviar email de recuperación</AuthButton>
    </AuthShell>
  );
}
