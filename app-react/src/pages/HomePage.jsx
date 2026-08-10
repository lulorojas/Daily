import { useState } from 'react';
import { LogoutButton } from '../components/auth/LogoutButton';
import { useAuth } from '../hooks/useAuth';
import { C } from '../lib/theme';

/* Placeholder de la app. Acá van, en las etapas que siguen, las cinco secciones
   (Hoy, Calendario, Gimnasio, Hábitos, Progreso) con su barra de navegación.
   Por ahora sirve para comprobar que la puerta de sesión hace su trabajo. */
export function HomePage() {
  const { user } = useAuth();
  const [error, setError] = useState(null);

  return (
    <div className="view auth" style={{ '--accent': C.amber }}>
      <div className="head">
        <div className="kicker">Daily · v4</div>
        <h1>Entraste</h1>
        <div className="sub">Sesión iniciada como {user?.email}</div>
      </div>
      <div className="body">
        <div className="card" style={{ padding: '20px 18px' }}>
          <div className="empty">
            Las cinco secciones llegan en las próximas etapas.<br />
            Esta pantalla solo confirma que la puerta de sesión funciona.
          </div>
        </div>
        {error && <div className="auth-flash err" role="alert"><span>{error}</span></div>}
        <LogoutButton onError={setError} />
      </div>
    </div>
  );
}
