import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { SectionIcon } from '../ui/Icons';
import { QuickAddMenu } from './QuickAddMenu';
import { SECTIONS, sectionForPath } from '../../lib/sections';
import { C, tint } from '../../lib/theme';
import { isValidISO } from '../../hooks/useSelectedDay';
import { todayISO } from '../../lib/dates';
import { useItemForms } from '../../hooks/useItemForms';

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
  const accent = current ? current.accent : C.amber;

  const raw = params.get('d');
  const day = isValidISO(raw) ? raw : todayISO();
  const search = `?d=${day}`;

  return (
    <>
      <div className="nav">
        <div className="navpill">
          {SECTIONS.map((s) => {
            const on = current?.key === s.key;
            return (
              <Link
                key={s.key}
                className={`navitem${on ? ' on' : ''}`}
                style={on ? { background: tint(accent, '2B'), color: accent } : undefined}
                to={{ pathname: s.path, search }}
                aria-current={on ? 'page' : undefined}
                aria-label={s.title || s.label}
              >
                <SectionIcon section={s.key} />
                <span className="nlb">{s.label}</span>
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          className="navadd"
          style={{ background: accent }}
          aria-label="Agregar"
          onClick={() => setAdding(true)}
        >
          +
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
