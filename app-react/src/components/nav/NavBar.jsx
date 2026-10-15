import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CalendarBlank, Barbell, ChartLineUp, CheckCircle, ForkKnife, Plus, Sun } from '@phosphor-icons/react';
import { QuickAddMenu } from './QuickAddMenu';
import { SECTIONS, sectionForPath } from '../../lib/sections';
import { isValidISO } from '../../hooks/useSelectedDay';
import { todayISO } from '../../lib/dates';
import { useItemForms } from '../../hooks/useItemForms';

// Un ícono Phosphor por sección (rediseño Nocturne): el de la activa va "fill" y con un
// halo del color de la sección; los demás, en línea fina.
const ICONOS = { hoy: Sun, calendario: CalendarBlank, gym: Barbell, comidas: ForkKnife, habitos: CheckCircle, progreso: ChartLineUp };

/* ----------------------------- BARRA DE ABAJO -----------------------------
   Port de navbar(). La píldora con las cinco secciones y, pegado a la derecha, el botón +
   del color de la sección. En pantallas anchas el CSS la convierte solo en una barra
   lateral: eso ya estaba resuelto y no hubo que tocar nada.

   Lo que en vanilla era `ui.tab` acá es la URL, y cada ítem es un <Link> de verdad: se
   puede abrir en otra pestaña, el navegador lo entiende y el botón Atrás funciona.

   Los links se llevan puesto el ?d=… de donde estabas. Es la forma de que el día que
   estabas mirando viaje entre Hoy y Calendario sin que exista ninguna variable global —
   la memoria la lleva la URL. */
export function NavBar() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { openTask, openEvent } = useItemForms();
  const [adding, setAdding] = useState(false);

  const current = sectionForPath(pathname);

  const raw = params.get('d');
  const day = isValidISO(raw) ? raw : todayISO();
  const search = `?d=${day}`;

  /* Gimnasio es la única sección con sub-navegación (Rutinas, sus tres niveles). En la app
     vanilla, "dónde estabas" era ui.gymSub/ui.rutId/ui.rutDayId: variables globales que no
     se movían aunque cambiaras de pestaña, así que volver a Gimnasio te dejaba donde
     habías dejado. Acá esa posición ES la URL, y la URL no la lleva nadie por su cuenta —
     por eso la barra, que es lo único que sigue montado siempre, se acuerda de la última
     ruta de Gimnasio que se visitó y apunta ahí en vez de a la fija '/gym'. */
  const lastGymPath = useRef('/gym');
  useEffect(() => {
    if (pathname.startsWith('/gym')) lastGymPath.current = pathname;
  }, [pathname]);

  /* Rediseño Nocturne: la sección activa se pinta con var(--accent) (App.jsx lo calcula
     para toda la pantalla) — un tinte translúcido de fondo, el ícono "fill" con halo y una
     rayita que respira abajo (a la izquierda en escritorio). El botón + lleva un anillo
     que gira. Todo eso es CSS en nocturne.css; acá solo se elige el ícono. */
  return (
    <>
      <div className="nav">
        <div className="navbrand" aria-hidden="true">D</div>
        <div className="navpill">
          {SECTIONS.map((s) => {
            const on = current?.key === s.key;
            const target = s.key === 'gym' ? lastGymPath.current : s.path;
            const Icono = ICONOS[s.key];
            return (
              <Link
                key={s.key}
                className={`navitem${on ? ' on' : ''}`}
                to={{ pathname: target, search }}
                aria-current={on ? 'page' : undefined}
                aria-label={s.title || s.label}
              >
                <Icono size={21} weight={on ? 'fill' : 'regular'} className="navico" aria-hidden="true" />
                <span className="nlb">{s.label}</span>
                <span className="navbar-mark" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          className="navadd"
          aria-label="Agregar"
          onClick={() => setAdding(true)}
        >
          <Plus size={22} weight="regular" aria-hidden="true" />
        </button>
      </div>

      {adding && (
        <QuickAddMenu
          onClose={() => setAdding(false)}
          /* Mismo criterio que la app vanilla: una tarea nueva desde el + nace con el día
             que estás mirando SOLO si estás en Hoy; desde cualquier otra pantalla, con la
             fecha de hoy. Una cita siempre toma el día elegido. */
          onTask={() => { setAdding(false); openTask(null, current?.key === 'hoy' ? day : todayISO()); }}
          onEvent={() => { setAdding(false); openEvent(null, day); }}
        />
      )}
    </>
  );
}
