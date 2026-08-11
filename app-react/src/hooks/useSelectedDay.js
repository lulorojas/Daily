import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { iso, parseISO, todayISO } from '../lib/dates';

/* ----------------------------- EL DÍA QUE SE ESTÁ MIRANDO -----------------------------
   En la app vanilla esto eran dos variables globales: `ui.daySel` (el día de la tira
   semanal en Hoy) y `ui.calSel` (el día elegido en el Calendario). Vivían en un objeto
   `ui` que sobrevivía a los cambios de pantalla, y por eso "guardar una tarea con fecha"
   podía dejar parado al Calendario en esa fecha aunque estuvieras en Hoy (focusDate()).

   Acá ese dato vive en la URL, como ?d=2026-08-10, y no en ninguna variable:

     - se comparte solo entre Hoy y Calendario (los dos leen el mismo parámetro), sin que
       exista un estado global que cualquiera pueda pisar;
     - sobrevive a recargar la página y se puede compartir el link de un día;
     - lo maneja el router, que ya está, en vez de un contexto nuevo.

   Se navega con `replace`, no agregando al historial: mover la tira siete días no tiene
   por qué llenar el botón Atrás de pasos intermedios. Es la traducción de que en vanilla
   esto no era navegación en absoluto.

   El valor se valida antes de usarse: ?d=chau tiene que caer en hoy y no romper la app
   con un Date inválido que después se propaga a todos los cálculos. */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISO(value) {
  if (typeof value !== 'string' || !ISO_RE.test(value)) return false;
  const d = parseISO(value);
  // Descarta lo que "parece" fecha pero no existe: 2026-02-31 cae en marzo al parsearlo.
  return !Number.isNaN(d.getTime()) && iso(d) === value;
}

export function useSelectedDay() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('d');
  const day = isValidISO(raw) ? raw : todayISO();

  const setDay = useCallback((next) => {
    setParams((prev) => {
      const search = new URLSearchParams(prev);
      search.set('d', next);
      return search;
    }, { replace: true });
  }, [setParams]);

  return [day, setDay];
}
