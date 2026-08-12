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
const FILES = ['utils.js', 'hoy.js', 'agenda.js', 'calendario.js', 'gimnasio.js', 'rutinas.js', 'habitos.js', 'progreso.js', 'ajustes.js'];

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
  'backupPayload', 'validateBackup', 'bkHasData',
  /* Formularios reales. Con esto los tests pueden llenar el modal de "Nueva tarea" de la
     app vanilla, guardarlo, y comparar el ítem que quedó en `state` contra el que escribe
     la mutación de React. Es la comparación de escritura más honesta posible: sale del
     mismo código que usan los usuarios hoy. */
  /* Las vistas enteras, para comparar lo que dibuja cada versión (src/compat/
     screens.test.jsx). Devuelven el HTML como string; no tocan la pantalla. */
  'viewHoy', 'viewCalendario', 'viewGym', 'viewRutinas', 'viewHabitos', 'viewProgreso',
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

  const src = FILES.map((f) => fs.readFileSync(path.join(APP_JS, f), 'utf8')).join('\n');

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
