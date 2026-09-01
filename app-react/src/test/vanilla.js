import fs from 'node:fs';
import path from 'node:path';

/* ============================================================================
   PUENTE A LA APP VANILLA

   Carga los js/*.js REALES de app/ dentro del jsdom de los tests y devuelve sus funciones.
   Sirve para lo más valioso de esta etapa: correr la implementación vieja y la nueva sobre
   los mismos datos y comprobar que dan exactamente lo mismo. No es una copia de la lógica
   vanilla — es la lógica vanilla, leída del archivo que está en producción.

   Cómo se carga: se concatenan los archivos y se meten adentro de un `new Function`. Eso
   les da un scope propio (sus `const C`, `let state`, etc. no ensucian nada de afuera) y
   a la vez ven los globals del jsdom (document, localStorage), que es lo que necesitan.
   Es la misma idea del harness.js de app/tests, sin depender de node:vm.

   Si esto se rompe alguna vez, casi siempre es porque se agregó un archivo nuevo a
   app/js/: hay que sumarlo a FILES, igual que en el harness de la app vanilla.
   ============================================================================ */

// app/js está siempre dos niveles arriba de app-react/src, sin importar dónde esté el repo.
const APP_JS = path.resolve(process.cwd(), '..', 'app', 'js');

// El mismo orden que index.html, sin app.js (que dibuja y arranca la app al cargarse).
// auth.js entra sin authInit() ni authGate() en juego (nunca se llaman): solo hace falta
// para que viewAjustes() encuentre la sección "Cuenta" con authUser(), que sin este
// archivo cargado no existiría y esa sección quedaría afuera aunque la cuenta SÍ tenga
// sesión — justo lo que compara src/compat/pixel.test.jsx (Ajustes).
const FILES = ['utils.js', 'hoy.js', 'agenda.js', 'calendario.js', 'gimnasio.js', 'rutinas.js', 'habitos.js', 'progreso.js', 'ajustes.js', 'onboarding.js', 'auth.js'];

/* onboarding.js usa NAV_ICONS (los mismos paths que SectionIcon en React), pero esa
   constante vive en app.js — el único archivo que a propósito NO se carga acá, porque al
   importarse dibuja y arranca la app entera. Se repite la constante en vez de cargar
   app.js: son cinco strings SVG que no cambian, y así este puente sigue sin ejecutar
   ningún side-effect de arranque. */
const NAV_ICONS_SHIM = `
  var NAV_ICONS = {
    hoy:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2.6v2M12 19.4v2M4.6 4.6 6 6M18 18l1.4 1.4M2.6 12h2M19.4 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
    calendario:'M7.5 3v4M16.5 3v4M3.4 10.5h17.2M6.5 5h11a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 17.5 21h-11A3.5 3.5 0 0 1 3 17.5v-9A3.5 3.5 0 0 1 6.5 5Z',
    gym:'M6.5 8.5v7M3.8 10.5v3M17.5 8.5v7M20.2 10.5v3M6.5 12h11',
    habitos:'M13 2.8c.4 3-1.2 4.4-2.6 5.8C8.8 10.2 7 11.7 7 14.4a5 5 0 0 0 10 0c0-2.3-1.2-3.7-2-4.7-.3 1.2-1.1 1.9-1.8 2.1.6-3-1.5-5.3-.2-9Z',
    progreso:'M4 20h16M7 20v-5.5M12 20V8.5M17 20v-9'
  };
`;

// Lo que el puente expone. setState() es la llave: la app vanilla lee de un `state`
// global, así que para preguntarle algo primero hay que ponerle el documento adelante.
const EXPOSED = [
  'setState', 'getState',
  // modelo
  'normalize', 'seed', 'migrateV1', 'uid',
  // fechas
  'iso', 'parseISO', 'addDays', 'todayD', 'todayISO', 'tomorrowISO', 'dow', 'mondayOf',
  'shortDate', 'fmtDateLong', 'fmtNum', 'sameMonthDay',
  // agenda
  'itemById', 'byTime', 'pendientes', 'pendVisible', 'tareasDe', 'agendaDe', 'itemsDe', 'entrenoDe',
  // textos de la cabecera de Hoy (etapa 3a: salieron de adentro de viewHoy a lib/items.js)
  'saludo', 'dayTitle',
  // hábitos
  'habitMarks', 'habitTPD', 'habitDone', 'habitDayMarks', 'habitDayPossible', 'habitDoneCount',
  'habitFirstISO', 'habitStreak', 'habitBestStreak',
  // gimnasio
  'weekKey', 'weekOf', 'gymHistory', 'gymWeekCounts', 'gymTypeStreaks', 'gymRanking',
  'liftGains', 'bodyList', 'allTypes', 'typeColor', 'getWeekPlan', 'moveInArray',
  // progreso
  'progStart', 'progLabel', 'inPeriod', 'progPeriodNote', 'progWeekWindow', 'progHabitBuckets', 'bucketPct',
  // backup
  'backupPayload', 'validateBackup', 'bkHasData', 'bkMeta', 'bkSet', 'bkShouldWarn', 'bkWarnText', 'bkBanner',
  // onboarding (etapa 4: no hay lógica nueva que comparar, son las mismas vistas)
  'TOUR', 'onbAskDue', 'onbAskView', 'tourActive', 'tourStep', 'tourView', 'startTour', 'endTour', 'tourGo', 'onbAction',
  // sesión (solo para que viewAjustes() vea una cuenta logueada; nunca se llama a Firebase)
  'AUTH', 'authUser',
  /* Formularios reales. Con esto los tests pueden llenar el modal de "Nueva tarea" de la
     app vanilla, guardarlo, y comparar el ítem que quedó en `state` contra el que escribe
     la mutación de React. Es la comparación de escritura más honesta posible: sale del
     mismo código que usan los usuarios hoy. */
  /* Las vistas enteras, para comparar lo que dibuja cada versión (src/compat/
     screens.test.jsx). Devuelven el HTML como string; no tocan la pantalla. */
  'viewHoy', 'viewCalendario', 'viewGym', 'viewRutinas', 'viewHabitos', 'viewProgreso', 'viewAjustes',
  'ui', 'openModal', 'closeModal', 'mq', 'saveModal', 'calAddMenu',
  'taskModal', 'eventModal', 'habitModal', 'bodyModal', 'liftModal',
  'typeCreateModal', 'manageTypesModal', 'rutModal', 'rutDayModal', 'rutExModal',
];

let cached = null;

export function loadVanilla() {
  if (cached) return cached;

  // utils.js toma #overlay al cargarse, y varias vistas escriben en #app.
  for (const id of ['app', 'overlay']) {
    if (!document.getElementById(id)) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  }

  const src = NAV_ICONS_SHIM + FILES.map((f) => fs.readFileSync(path.join(APP_JS, f), 'utf8')).join('\n');

  /* render() vive en app.js, que no se carga porque al importarse dibuja y arranca la app
     entera. commit() lo llama después de cada guardado, así que se le pone uno vacío:
     lo que interesa acá es el `state` que queda, no lo que se pinta en pantalla. */
  const exports = `
    function render(){}
    function setState(s){ state = s; }
    function getState(){ return state; }
    function saveModal(){ if(modalSave) modalSave(); }
    return { ${EXPOSED.join(', ')} };
  `;

  // eslint-disable-next-line no-new-func
  cached = new Function(src + exports)();
  return cached;
}

/* Copia profunda para no pasarle a vanilla el mismo objeto que a la versión React: si una
   de las dos mutara su entrada (normalize() en vanilla lo hace), la comparación mentiría. */
export function clone(value) {
  return structuredClone(value);
}
