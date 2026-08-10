import { AppRoutes } from './routes/AppRoutes';
import { LoadingPage } from './pages/LoadingPage';
import { InitErrorPage } from './pages/InitErrorPage';
import { useAuth } from './hooks/useAuth';
import { AUTH_STATUS } from './lib/authStatus';
import { C, tint } from './lib/theme';

/* La app entera. Dos cortes antes de mirar la URL, porque en esos dos estados no hay
   ninguna pantalla que tenga sentido mostrar:
     - Firebase no arrancó → cartel de error
     - Firebase todavía no contestó → "Abriendo tu Daily…"
   Recién cuando sabemos en qué situación está la sesión entra el router.

   El <div id="app"> existe para que el CSS copiado de la app actual (#app { max-width…})
   funcione sin cambiarle una línea. Las variables --accent y --glow se setean acá igual
   que las seteaba app.js en vanilla. */
export function App() {
  const { status } = useAuth();

  let content;
  if (status === AUTH_STATUS.ERROR) content = <InitErrorPage />;
  else if (status === AUTH_STATUS.LOADING) content = <LoadingPage />;
  else content = <AppRoutes />;

  return (
    <div id="app" style={{ '--accent': C.amber, '--glow': tint(C.amber, '1F') }}>
      {content}
    </div>
  );
}
