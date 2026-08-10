import { AuthShell } from '../components/auth/AuthShell';
import { C } from '../lib/theme';

/* Firebase no arrancó. En vanilla este caso era "el <script> del SDK no cargó"; con Vite
   el SDK viaja dentro del bundle, así que ahora significa que initializeApp() falló
   (config inválida, entorno sin soporte). La salida para el usuario es la misma. */
export function InitErrorPage() {
  return (
    <AuthShell
      title="No se pudo cargar"
      sub="Falta una pieza para poder iniciar sesión."
      accent={C.danger}
    >
      <div className="card" style={{ padding: '20px 18px' }}>
        <div className="empty">No se pudo cargar Firebase. Conectate a internet y volvé a abrir la app.</div>
      </div>
    </AuthShell>
  );
}
