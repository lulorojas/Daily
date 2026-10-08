/* ----------------------------- AGENDA -----------------------------
   Port de los selectores de items de app/js/utils.js. Los tres tipos viven en la misma
   lista `state.items` y se distinguen por `kind`:

     tarea → title, desc?, date (null = sin fecha), time?, done, doneAt?
     cita  → title, desc?, date, time?          (no tiene estado: ocurre, no se completa)
     anual → title, desc?, date, time?          (se repite por mes+día cada año)

   En vanilla estas funciones leían el global `state`. Acá lo reciben como primer
   argumento: siguen siendo funciones puras y se pueden testear con un objeto inventado. */
import { parseISO, iso, dow, mondayOf, sameMonthDay } from './dates';

export function itemById(state, id) {
  return state.items.find((x) => x.id === id);
}

/* Orden por hora, con los "sin hora" al final ('99' es mayor que cualquier 'HH:MM').
   Nunca devuelve 0, ni siquiera para dos horas iguales: así estaba escrito y así se
   replica, porque de eso depende en qué orden terminan dos ítems a la misma hora. */
export function byTime(a, b) {
  return (a.time || '99') < (b.time || '99') ? -1 : 1;
}

// La bandeja: tareas sin fecha.
export function pendientes(state) {
  return state.items.filter((x) => x.kind === 'tarea' && !x.date);
}

/* Una pendiente completada solo se muestra en el día en que se marcó (doneAt). Si mirás
   otro día, o pasa el tiempo, desaparece. Las no completadas se ven siempre. */
export function pendVisible(t, dISO) {
  return !t.done || t.doneAt === dISO;
}

/* Una tarea con fecha se muestra SOLO en su fecha, aunque haya vencido: no se arrastra
   ni se mueve nunca. */
export function tareasDe(state, dISO) {
  return state.items.filter((x) => x.kind === 'tarea' && x.date === dISO).sort(byTime);
}

// Todo lo que "ocurre" ese día: citas de la fecha + anuales que caen en ese mes+día.
export function agendaDe(state, dISO) {
  return state.items
    .filter((x) => (x.kind === 'cita' && x.date === dISO) || (x.kind === 'anual' && sameMonthDay(dISO, x.date)))
    .sort(byTime);
}

// Todo lo que el calendario muestra en un día.
export function itemsDe(state, dISO) {
  return tareasDe(state, dISO).concat(agendaDe(state, dISO)).sort(byTime);
}

// Entreno planificado para una fecha (solo lectura; el plan lo maneja Gimnasio).
// Entrenamientos dobles (etapa 6): un día "tiene entreno" si CUALQUIERA de sus dos
// turnos tiene algún músculo marcado. Devuelve el día completo (con muscles2/done2 si
// los tiene); dayTurnos() en lib/gym.js lo desarma en 1 o 2 turnos para dibujar.
export function entrenoDe(state, dISO) {
  const d = parseISO(dISO);
  const plan = state.gym.weekPlans[iso(mondayOf(d))];
  const day = plan && plan[dow(d)];
  if (!day) return null;
  const hayEntreno = day.muscles.length > 0 || (day.muscles2 && day.muscles2.length > 0);
  return hayEntreno ? day : null;
}
