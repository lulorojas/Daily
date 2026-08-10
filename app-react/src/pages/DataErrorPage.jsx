import { AuthShell } from '../components/auth/AuthShell';
import { AuthButton } from '../components/auth/AuthButton';
import { C } from '../lib/theme';

/* No se pudieron traer los datos de la nube: permisos, o red la primera vez (sin caché
   local todavía no hay nada que mostrar). Port de viewDataError() de app/js/firestore.js,
   con los mismos textos. */
export function DataErrorPage({ onRetry }) {
  return (
    <AuthShell
      title="No pudimos cargar tus datos"
      sub="Revisá la conexión y volvé a intentar."
      accent={C.danger}
    >
      <div className="card" style={{ padding: '20px 18px' }}>
        <div className="empty">
          Hubo un problema al traer tus datos de la nube. Si es la primera vez que entrás, necesitás conexión.
        </div>
      </div>
      <AuthButton onClick={onRetry}>Reintentar</AuthButton>
    </AuthShell>
  );
}
