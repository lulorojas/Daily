import { todayISO, tomorrowISO } from './dates';

/* ----------------------------- FORMULARIOS DE TAREA Y CITA -----------------------------
   Los valores con los que arranca cada formulario y las reglas de validación, como
   funciones puras: sin React, sin DOM, sin modal. Los componentes las usan; los tests las
   corren directo.

   Es el mismo reparto que en las pantallas de sesión (lib/validation.js): la regla vive
   en lib/, el formulario solo la aplica y muestra lo que devuelve. */

/* Los cuatro botones del "Cuándo" de una tarea. La fecha manda: el chip que se ve
   encendido se DEDUCE de la fecha elegida, no se guarda aparte. Si hubiera un `chipActivo`
   además de la fecha, podrían contradecirse — y ese es justo el bug que este cálculo hace
   imposible. */
export function whenKey(dateISO) {
  if (dateISO === null) return 'sin';
  if (dateISO === todayISO()) return 'hoy';
  if (dateISO === tomorrowISO()) return 'manana';
  return 'otra';
}

// La fecha que le corresponde a cada chip. 'otra' no aparece: ese chip abre el calendario
// en vez de elegir una fecha, así que no tiene un valor propio.
export function dateForWhen(key) {
  if (key === 'hoy') return todayISO();
  if (key === 'manana') return tomorrowISO();
  return null;
}

/* Con qué valores abre el formulario de tarea.
   `defaultDate` es la fecha del día que se está mirando. Que sea `undefined` (nadie la
   pasó) NO es lo mismo que `null` (el día "sin fecha"): sin nada se cae a hoy, con null
   se abre como pendiente sin fecha. Mismo matiz que `defDate===undefined?todayISO():defDate`
   en la app vanilla. */
export function taskFormValues(task, defaultDate) {
  if (task) {
    return {
      title: task.title || '',
      desc: task.desc || '',
      date: task.date || null,
      time: task.time || null,
    };
  }
  return {
    title: '',
    desc: '',
    date: defaultDate === undefined ? todayISO() : defaultDate,
    time: null,
  };
}

export function eventFormValues(item, defaultDate) {
  if (item) {
    return {
      kind: item.kind,
      title: item.title || '',
      desc: item.desc || '',
      date: item.date,
      time: item.time || null,
    };
  }
  return {
    kind: 'cita',
    title: '',
    desc: '',
    date: defaultDate || todayISO(),
    time: null,
  };
}

// La hora que muestra el selector cuando está apagado. Distinta en cada formulario, como
// en vanilla: una tarea propone las 8, una cita las 9.
export const DEFAULT_TASK_TIME = '08:00';
export const DEFAULT_EVENT_TIME = '09:00';

/* Las validaciones. Devuelven un objeto { campo: mensaje }; vacío = está todo bien.
   Misma forma que las de sesión, así que hasErrors() sirve para las dos. */
export function validateTask({ title }) {
  const errors = {};
  if (!title.trim()) errors.title = 'Poné un título para la tarea.';
  return errors;
}

export function validateEvent({ title, date, kind }) {
  const errors = {};
  if (!title.trim()) {
    errors.title = kind === 'anual'
      ? 'Poné un título para la fecha anual.'
      : 'Poné un título para la cita.';
  }
  if (!date) errors.date = 'Elegí una fecha.';
  return errors;
}

// La aclaración que cambia al elegir el tipo de una cita.
export function eventKindNote(kind) {
  return kind === 'anual'
    ? 'Se repite cada año en esta fecha (cumpleaños, feriados).'
    : 'Ocurre una sola vez en la fecha elegida.';
}

/* Qué dice la confirmación al borrar, según el tipo. En vanilla era un objeto literal
   dentro del case 'item-delete' del switch gigante de app.js. */
const DELETE_COPY = {
  tarea: ['¿Eliminar esta tarea?', 'La tarea se quita de la app.'],
  cita: ['¿Eliminar esta cita?', 'Se quita del calendario.'],
  anual: ['¿Eliminar esta fecha anual?', 'Se quita del calendario y deja de repetirse cada año.'],
};

export function deleteCopy(kind) {
  const [title, description] = DELETE_COPY[kind] || DELETE_COPY.tarea;
  return { title, description };
}
