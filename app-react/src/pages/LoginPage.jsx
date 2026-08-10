import { Link } from 'react-router-dom';
import { AuthShell } from '../components/auth/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { AuthButton } from '../components/auth/AuthButton';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthAction } from '../hooks/useAuthAction';
import { validateLogin } from '../lib/validation';
import { login } from '../services/auth';

export function LoginPage() {
  const { register, validateAll } = useAuthForm({ email: '', password: '' }, validateLogin);
  const { busy, flash, run } = useAuthAction();

  function handleSubmit(e) {
    e.preventDefault();
    const values = validateAll();
    if (!values) return; // hay campos marcados: no se molesta a Firebase
    // El caso feliz no necesita nada acá: el AuthProvider se entera del cambio de sesión
    // y el router manda a la app. Por eso el botón queda trabado hasta que la pantalla se va.
    run('login', () => login(values.email, values.password));
  }

  return (
    <AuthShell
      title="Hola de nuevo"
      sub="Entrá a tu Daily para seguir donde lo dejaste."
      flash={flash}
      onSubmit={handleSubmit}
    >
      <AuthField label="Email" type="email" placeholder="vos@ejemplo.com" autoComplete="email" {...register('email')} />
      <AuthField label="Contraseña" type="password" placeholder="Tu contraseña" autoComplete="current-password" {...register('password')} />

      <Link className="auth-forgot" to="/recuperar">¿Olvidaste tu contraseña?</Link>

      <AuthButton type="submit" busy={busy === 'login'}>Entrar</AuthButton>

      <Link className="alink" to="/registro">¿Todavía no tenés cuenta? <b>Creá una</b></Link>
    </AuthShell>
  );
}
