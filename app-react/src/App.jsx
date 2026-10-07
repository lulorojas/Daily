import { useLocation } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { LoadingPage } from './pages/LoadingPage';
import { InitErrorPage } from './pages/InitErrorPage';
import { useAuth } from './hooks/useAuth';
import { AUTH_STATUS } from './lib/authStatus';
import { accentForPath } from './lib/sections';
import { lightOf, tint } from './lib/theme';
import { Aurora } from './components/ui/Aurora';

/* La app entera. Dos cortes antes de mirar la URL, porque en esos dos estados no hay
   ninguna pantalla que tenga sentido mostrar:
     - Firebase no arrancó → cartel de error
     - Firebase todavía no contestó → "Abriendo tu Daily…"
   Recién cuando sabemos en qué situación está la sesión entra el router.

   El <div id="app"> existe para que el CSS copiado de la app actual (#app { max-width…})
   funcione sin cambiarle una línea. Las variables --accent y --glow se setean acá igual
   que las seteaba app.js en vanilla, pero el color ya no sale de una variable global
   (`SECT[ui.tab]`) sino de la URL: cada sección tiñe la barra, el botón + y el glow de
   arriba con lo suyo. Fuera de las secciones (sesión, Ajustes) manda el ámbar.

   --accent-47 es nueva en esta etapa: la tira semanal pinta los días pasados con una
   versión translúcida del acento (mismo truco que --glow, otro alfa). Antes solo la usaba
   Hoy y quedaba bien con el ámbar escrito a mano en app.css; con Hábitos reutilizando la
   misma tira en verde, ese hardcode hubiera pintado los días pasados de Hábitos en ámbar
   también. Con la variable calculada acá, cualquier página que use <WeekStrip> se tiñe
   sola con SU acento, sin que app.css tenga que saber cuáles existen.

   --accent-light (rediseño "Glass + aurora") es la misma idea aplicada a los degradés
   "brillo" (pildora activa de la nav, botón +, avatar del día elegido): en vez de un tinte
   con alfa, es el mismo acento en una variante clara, para que el degradé vaya de un brillo
   arriba-izquierda hacia el color real. <Aurora/> usa el acento tal cual (sin variante):
   es el fondo animado detrás de TODA la pantalla, montado una sola vez acá para que ninguna
   página tenga que acordarse de incluirlo. */
export function App() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  const accent = accentForPath(pathname);

  let content;
  if (status === AUTH_STATUS.ERROR) content = <InitErrorPage />;
  else if (status === AUTH_STATUS.LOADING) content = <LoadingPage />;
  else content = <AppRoutes />;

  return (
    <div id="app" style={{ '--accent': accent, '--glow': tint(accent, '1F'), '--accent-47': tint(accent, '47'), '--accent-light': lightOf(accent) }}>
      <Aurora accent={accent} />
      {content}
    </div>
  );
}
