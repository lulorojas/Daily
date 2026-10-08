/* ============================================================================
   MUTACIONES

   Cada función recibe un BORRADOR del documento (una copia que el store ya hizo) y lo
   modifica en el lugar. Se usan siempre desde store.update():

     update((draft) => addTask(draft, { title: 'Comprar pan', date: '2026-08-10' }));

   Por qué mutar en vez de devolver un objeto nuevo: así el port desde la app vanilla es
   línea por línea. La lógica de escritura de la app actual está escrita como mutaciones
   sobre el global `state`, y cualquier reescritura "más elegante" sería una oportunidad
   de cambiar la forma del documento sin querer. La inmutabilidad que React necesita la
   garantiza el store (clona antes, publica un objeto nuevo después), no cada mutación.

   REGLA: la forma de lo que se escribe tiene que ser idéntica a la de la app vanilla.
   Los campos y su presencia/ausencia están copiados a mano de cada modal.
   ============================================================================ */
import { uid } from '../lib/ids';
import { PALETTE } from '../lib/theme';
import { emptyWeekPlan, REST } from '../lib/gym';
import { moveInArray } from '../lib/arrays';
import { habitMarks } from '../lib/habits';
import { matchEntry } from '../lib/meals';

/* ============================ agenda (items) ============================ */

/* Tarea nueva. Nace con done:false y SIN doneAt: ese campo aparece recién cuando se
   marca. Una tarea con doneAt:null no es lo mismo que una sin el campo. */
export function addTask(draft, { title, desc = '', date = null, time = null }) {
  const item = { id: uid(), kind: 'tarea', title, desc, date, time, done: false };
  draft.items.push(item);
  return item;
}

// Editar una tarea NO toca kind, done ni doneAt: solo lo que el formulario muestra.
export function updateTask(draft, id, { title, date, time, desc }) {
  const t = draft.items.find((x) => x.id === id);
  if (!t) return false;
  Object.assign(t, { title, date, time, desc });
  return true;
}

// Cita o fecha anual. A diferencia de la tarea, NO lleva campo done: ocurre, no se completa.
export function addEvent(draft, { kind, title, desc = '', date, time = null }) {
  const item = { id: uid(), kind, title, desc, date, time };
  draft.items.push(item);
  return item;
}

/* Editar una cita borra el `done` si lo tuviera. Pasa cuando algo nació como tarea y se
   convirtió: sin este delete quedaría un campo huérfano en el documento. */
export function updateEvent(draft, id, { kind, title, date, time, desc }) {
  const o = draft.items.find((x) => x.id === id);
  if (!o) return false;
  Object.assign(o, { kind, title, date, time, desc });
  delete o.done;
  return true;
}

/* Marcar/desmarcar una tarea. doneAt guarda el día que se estaba mirando cuando se marcó
   (no la fecha de la tarea): la bandeja de "sin fecha" lo usa para mostrar una pendiente
   completada solo ese día. Al desmarcar, el campo se BORRA, no se pone en null. */
export function toggleTaskDone(draft, id, daySelISO) {
  const t = draft.items.find((x) => x.id === id);
  if (!t || t.kind !== 'tarea') return false;
  t.done = !t.done;
  if (t.done) t.doneAt = daySelISO;
  else delete t.doneAt;
  return true;
}

export function deleteItem(draft, id) {
  const before = draft.items.length;
  draft.items = draft.items.filter((x) => x.id !== id);
  return draft.items.length !== before;
}

/* ============================ hábitos ============================ */

// El color que le toca al próximo hábito: por posición en la paleta.
export function nextHabitColor(state) {
  return PALETTE[state.habits.length % PALETTE.length];
}

export function addHabit(draft, { name, detail = '', color, icon, timesPerDay = 1 }) {
  const habit = { id: uid(), name, detail, color, icon, timesPerDay };
  draft.habits.push(habit);
  return habit;
}

export function updateHabit(draft, id, { name, detail, color, icon, timesPerDay }) {
  const h = draft.habits.find((x) => x.id === id);
  if (!h) return false;
  Object.assign(h, { name, detail, color, icon, timesPerDay });
  return true;
}

// Borrar un hábito se lleva también todas sus marcas del historial.
export function deleteHabit(draft, id) {
  const before = draft.habits.length;
  draft.habits = draft.habits.filter((x) => x.id !== id);
  Object.values(draft.habitLog).forEach((day) => { delete day[id]; });
  return draft.habits.length !== before;
}

/* Tocar el slot i lo llena hasta i+1; si ya estaba lleno hasta ahí, lo baja a i.
   Así un hábito de 3 veces por día se marca y desmarca con un solo gesto por slot.

   Se replica un detalle de la app actual: la clave del día se crea ANTES de decidir, así
   que desmarcar la última marca deja el día como un objeto vacío `{}` en habitLog en vez
   de sacarlo. Está anotado en el reporte; no se corrige acá. */
export function setHabitSlot(draft, id, dISO, slot) {
  const hb = draft.habits.find((x) => x.id === id);
  if (!hb) return false;
  const tpd = hb.timesPerDay || 1;
  const cur = habitMarks(draft, id, dISO);
  const next = slot < cur ? slot : slot + 1;
  draft.habitLog[dISO] ||= {};
  if (next <= 0) delete draft.habitLog[dISO][id];
  else draft.habitLog[dISO][id] = Math.min(next, tpd);
  return true;
}

/* ============================ gimnasio: plan semanal ============================ */

/* Materializa la semana en el documento. Es la contracara de weekPlanFor(), que es una
   lectura pura: la semana se escribe recién acá, cuando de verdad se cambia algo. */
export function ensureWeekPlan(draft, weekKeyISO) {
  draft.gym.weekPlans[weekKeyISO] ||= emptyWeekPlan();
  return draft.gym.weekPlans[weekKeyISO];
}

/* slot 1 = muscles/done (siempre existe); slot 2 = muscles2/done2 (opcional, entrenamientos
   dobles). Multi-select: tocar un músculo lo agrega/saca de la lista del turno — mismo
   patrón que toggleAbsCategory(). Elegir "Descanso" (REST) es la excepción: no es un
   músculo más, es la acción de vaciar el turno entero, sin importar qué hubiera marcado. */
export function toggleWeekDayMuscle(draft, weekKeyISO, dayIndex, muscle, slot = 1) {
  const plan = ensureWeekPlan(draft, weekKeyISO);
  const day = plan[dayIndex];
  if (!day) return false;
  const key = slot === 2 ? 'muscles2' : 'muscles';
  if (!day[key]) return false;
  if (muscle === REST) { day[key] = []; return true; }
  const cur = day[key];
  day[key] = cur.includes(muscle) ? cur.filter((m) => m !== muscle) : [...cur, muscle];
  return true;
}

export function toggleWeekDayDone(draft, weekKeyISO, dayIndex, slot = 1) {
  const plan = ensureWeekPlan(draft, weekKeyISO);
  const day = plan[dayIndex];
  if (!day) return false;
  const key = slot === 2 ? 'done2' : 'done';
  day[key] = !day[key];
  return true;
}

/* Agregar/quitar el segundo turno de un día. Arranca sin músculos (muscles2: []): un
   turno nuevo sin marcar nada todavía es "Descanso", igual que ya lo es para el primero. */
export function addSecondTurno(draft, weekKeyISO, dayIndex) {
  const plan = ensureWeekPlan(draft, weekKeyISO);
  const day = plan[dayIndex];
  if (!day || day.muscles2) return false;
  day.muscles2 = [];
  day.done2 = false;
  return true;
}

// Saca el segundo turno del todo (no lo deja en blanco): un día sin muscles2 y uno al
// que se le quitó el segundo turno tienen que quedar exactamente iguales.
export function removeSecondTurno(draft, weekKeyISO, dayIndex) {
  const plan = ensureWeekPlan(draft, weekKeyISO);
  const day = plan[dayIndex];
  if (!day || !day.muscles2) return false;
  delete day.muscles2;
  delete day.done2;
  return true;
}

/* ============================ gimnasio: músculos (customTypes) ============================ */

export function addCustomType(draft, { name, color }) {
  const type = { id: uid(), name, color };
  draft.gym.customTypes.push(type);
  return type;
}

/* Al renombrar un músculo hay que renombrarlo también en cada día del plan, porque los
   planes guardan el NOMBRE y no su id. Si no, los entrenos viejos quedarían apuntando a
   un músculo que ya no existe y perderían su color en toda la app. */
export function updateCustomType(draft, id, { name, color }) {
  const t = draft.gym.customTypes.find((x) => x.id === id);
  if (!t) return false;
  const old = t.name;
  t.name = name;
  t.color = color;
  if (old !== name) {
    Object.values(draft.gym.weekPlans).forEach((plan) => {
      plan.forEach((day) => {
        day.muscles = day.muscles.map((m) => (m === old ? name : m));
        if (day.muscles2) day.muscles2 = day.muscles2.map((m) => (m === old ? name : m));
      });
    });
  }
  return true;
}

/* Dividir un músculo combinado ("Pecho y bícep") en los sueltos que lo componen.

   Es la ÚNICA mutación que reescribe el historial del plan a propósito, y por eso existe
   como operación propia en vez de "borrar el viejo y crear dos nuevos": hacer eso a mano
   dejaría todos los días que decían "Pecho y bícep" apuntando a un músculo que ya no
   está. Acá los tres pasos van juntos:

     1. se crean los músculos que todavía no existan (el primero hereda el color del
        combinado, para que el historial no cambie de color de golpe; los demás siguen la
        rotación de PALETTE, igual que un hábito nuevo);
     2. en cada día del plan, en los dos turnos, el nombre viejo se reemplaza por la lista
        nueva, sin duplicar lo que ya estuviera marcado por separado;
     3. recién entonces se borra el combinado del catálogo.

   Dividir en UN solo nombre es legítimo: equivale a renombrar, y sirve para limpiar un
   nombre mal escrito arrastrando el historial. */
export function splitCustomType(draft, id, names) {
  const t = draft.gym.customTypes.find((x) => x.id === id);
  if (!t) return false;

  const limpios = (names || []).map((n) => (n || '').trim()).filter(Boolean);
  if (!limpios.length) return false;

  // Sin duplicados adentro de la propia lista ("Pecho, Pecho" es un solo Pecho).
  const destino = [...new Set(limpios)];

  destino.forEach((name, i) => {
    if (draft.gym.customTypes.some((x) => x.name === name)) return;
    const color = i === 0 ? t.color : PALETTE[draft.gym.customTypes.length % PALETTE.length];
    draft.gym.customTypes.push({ id: uid(), name, color });
  });

  const reemplazar = (lista) => {
    if (!lista.includes(t.name)) return lista;
    const out = [];
    lista.forEach((m) => {
      if (m !== t.name) { if (!out.includes(m)) out.push(m); return; }
      destino.forEach((d) => { if (!out.includes(d)) out.push(d); });
    });
    return out;
  };

  Object.values(draft.gym.weekPlans).forEach((plan) => {
    plan.forEach((day) => {
      day.muscles = reemplazar(day.muscles);
      if (day.muscles2) day.muscles2 = reemplazar(day.muscles2);
    });
  });

  // El combinado se va del catálogo salvo que la propia división lo conserve (dividir
  // "Pecho y bícep" en "Pecho y bícep" + "Pecho" sería raro, pero no hay que romperlo).
  if (!destino.includes(t.name)) {
    draft.gym.customTypes = draft.gym.customTypes.filter((x) => x.id !== id);
  }
  return true;
}

/* Borrar un tipo NO toca los planes ya marcados, a propósito: el historial de lo que
   entrenaste no se reescribe porque hoy decidas no usar más ese tipo. */
export function deleteCustomType(draft, id) {
  const before = draft.gym.customTypes.length;
  draft.gym.customTypes = draft.gym.customTypes.filter((x) => x.id !== id);
  return draft.gym.customTypes.length !== before;
}

/* ============================ gimnasio: cargas ============================ */

export function nextLiftColor(state) {
  return PALETTE[state.gym.lifts.length % PALETTE.length];
}

/* `reps` es opcional (pedido explícito de Lulo, etapa 7): cuántas repeticiones hizo con
   ese peso. Ausente si no se cargó — no un 0 ni un null colgando, mismo criterio que
   type2/absCategories: un registro viejo sin reps y uno al que nunca se le puso reps
   tienen que quedar exactamente iguales. */
export function addLift(draft, { name, weight, date, reps }) {
  const record = reps ? { date, weight, reps } : { date, weight };
  const lift = { id: uid(), name, unit: 'kg', color: nextLiftColor(draft), history: [record] };
  draft.gym.lifts.push(lift);
  return lift;
}

/* Se AGREGA al final, sin ordenar por fecha: el historial guarda el orden en que se
   cargaron los registros, y quien lo lee (gráficos, récords) ordena por fecha. */
export function logLift(draft, liftId, { date, weight, reps }) {
  const l = draft.gym.lifts.find((x) => x.id === liftId);
  if (!l) return false;
  l.history.push(reps ? { date, weight, reps } : { date, weight });
  return true;
}

// Editar un registro lo reemplaza entero y redondea a un decimal, como el formulario.
export function updateLiftRecord(draft, liftId, index, { date, weight, reps }) {
  const l = draft.gym.lifts.find((x) => x.id === liftId);
  if (!l || !l.history[index]) return false;
  const rounded = +Number(weight).toFixed(1);
  l.history[index] = reps ? { date, weight: rounded, reps } : { date, weight: rounded };
  return true;
}

// No se borra el último registro: un ejercicio sin historial rompería los gráficos.
export function deleteLiftRecord(draft, liftId, index) {
  const l = draft.gym.lifts.find((x) => x.id === liftId);
  if (!l || !l.history[index] || l.history.length <= 1) return false;
  l.history.splice(index, 1);
  return true;
}

export function deleteLift(draft, id) {
  const before = draft.gym.lifts.length;
  draft.gym.lifts = draft.gym.lifts.filter((x) => x.id !== id);
  return draft.gym.lifts.length !== before;
}

/* ============================ peso corporal ============================ */

export function addBodyWeight(draft, { kg, date }) {
  const rec = { id: uid(), kg: +Number(kg).toFixed(1), date };
  draft.gym.bodyWeights.push(rec);
  return rec;
}

export function updateBodyWeight(draft, id, { kg, date }) {
  const r = draft.gym.bodyWeights.find((x) => x.id === id);
  if (!r) return false;
  Object.assign(r, { kg: +Number(kg).toFixed(1), date });
  return true;
}

export function deleteBodyWeight(draft, id) {
  const before = draft.gym.bodyWeights.length;
  draft.gym.bodyWeights = draft.gym.bodyWeights.filter((x) => x.id !== id);
  return draft.gym.bodyWeights.length !== before;
}

/* ============================ gimnasio: abs y movilidad ============================ */

/* Campos del MISMO día del plan semanal, al lado de type/done/type2/done2 — no una lista
   aparte, no un turno. Cada toggle prende/apaga una sola cosa, como cualquier checkbox:
   volver a tocar una categoría ya marcada la saca. Se borra el campo entero (no se deja un
   array vacío ni un `false` colgando) cuando queda en "nada marcado", mismo criterio que
   removeSecondTurno: un día que nunca tocó esto y uno al que se le sacó todo tienen que
   quedar exactamente iguales. */
export function toggleAbsCategory(draft, weekKeyISO, dayIndex, category) {
  const plan = ensureWeekPlan(draft, weekKeyISO);
  const day = plan[dayIndex];
  if (!day) return false;
  const cur = day.absCategories || [];
  const next = cur.includes(category) ? cur.filter((c) => c !== category) : [...cur, category];
  if (next.length) day.absCategories = next;
  else delete day.absCategories;
  return true;
}

export function toggleMovilidad(draft, weekKeyISO, dayIndex) {
  const plan = ensureWeekPlan(draft, weekKeyISO);
  const day = plan[dayIndex];
  if (!day) return false;
  if (day.movilidad) delete day.movilidad;
  else day.movilidad = true;
  return true;
}

/* ============================ rutinas ============================ */

export function addRoutine(draft, { name }) {
  const rut = { id: uid(), name, days: [] };
  draft.gym.routines.push(rut);
  return rut;
}

// Editar una rutina cambia SOLO el nombre: sus días no se tocan.
export function updateRoutine(draft, id, { name }) {
  const r = draft.gym.routines.find((x) => x.id === id);
  if (!r) return false;
  r.name = name;
  return true;
}

export function deleteRoutine(draft, id) {
  const before = draft.gym.routines.length;
  draft.gym.routines = draft.gym.routines.filter((x) => x.id !== id);
  return draft.gym.routines.length !== before;
}

export function moveRoutine(draft, id, dir) {
  return moveInArray(draft.gym.routines, draft.gym.routines.findIndex((x) => x.id === id), dir);
}

export function addRoutineDay(draft, routineId, { name }) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  if (!r) return null;
  const day = { id: uid(), name, exercises: [] };
  r.days.push(day);
  return day;
}

export function updateRoutineDay(draft, routineId, dayId, { name }) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  const d = r && r.days.find((x) => x.id === dayId);
  if (!d) return false;
  d.name = name;
  return true;
}

export function deleteRoutineDay(draft, routineId, dayId) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  if (!r) return false;
  const before = r.days.length;
  r.days = r.days.filter((x) => x.id !== dayId);
  return r.days.length !== before;
}

export function moveRoutineDay(draft, routineId, dayId, dir) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  if (!r) return false;
  return moveInArray(r.days, r.days.findIndex((x) => x.id === dayId), dir);
}

export function addExercise(draft, routineId, dayId, { name, detail = '' }) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  const d = r && r.days.find((x) => x.id === dayId);
  if (!d) return null;
  const ex = { id: uid(), name, detail };
  d.exercises.push(ex);
  return ex;
}

export function updateExercise(draft, routineId, dayId, exId, { name, detail }) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  const d = r && r.days.find((x) => x.id === dayId);
  const e = d && d.exercises.find((x) => x.id === exId);
  if (!e) return false;
  Object.assign(e, { name, detail });
  return true;
}

export function deleteExercise(draft, routineId, dayId, exId) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  const d = r && r.days.find((x) => x.id === dayId);
  if (!d) return false;
  const before = d.exercises.length;
  d.exercises = d.exercises.filter((x) => x.id !== exId);
  return d.exercises.length !== before;
}

export function moveExercise(draft, routineId, dayId, exId, dir) {
  const r = draft.gym.routines.find((x) => x.id === routineId);
  const d = r && r.days.find((x) => x.id === dayId);
  if (!d) return false;
  return moveInArray(d.exercises, d.exercises.findIndex((x) => x.id === exId), dir);
}

/* ============================ notificaciones (FCM) ============================ */

/* Un token por dispositivo/navegador que activó notificaciones. Se guarda en el MISMO
   documento (users/{uid}), no en una colección aparte: así el script del cron
   (notifications/send.js) lee un solo doc por cuenta y nunca puede mezclar el token de un
   dispositivo con los datos de otra cuenta (aislamiento por uid, decisión 3).

   `token` ya viene deduplicado por FCM (getToken() en el navegador devuelve el mismo
   valor mientras no cambie el permiso/la instalación), pero igual se chequea acá: sin
   esto, reabrir la pestaña y volver a pedir permiso agregaría el mismo token una y otra
   vez, y el cron le mandaría la misma notificación repetida a un solo dispositivo. */
export function registerFcmToken(draft, token) {
  draft.fcmTokens ||= [];
  if (draft.fcmTokens.includes(token)) return false;
  draft.fcmTokens.push(token);
  return true;
}

// Al desactivar notificaciones en este dispositivo, o si FCM avisa que el token ya no sirve.
// Si el documento nunca tuvo tokens, no se le crea el campo solo para dejarlo vacío.
export function removeFcmToken(draft, token) {
  if (!draft.fcmTokens || !draft.fcmTokens.includes(token)) return false;
  draft.fcmTokens = draft.fcmTokens.filter((t) => t !== token);
  return true;
}

/* ============================ onboarding ============================ */

export function setOnboardingSeen(draft, seen) {
  draft.onboarding = draft.onboarding || { seen: false };
  draft.onboarding.seen = seen;
  return true;
}

/* ============================ comidas ============================
   `meals` no tiene default en normalize() (ver lib/model.js, mismo truco que
   fcmTokens) — por eso toda mutación de acá para abajo arranca con
   `draft.meals ||= {...}`: recién se materializa en el documento la primera vez que
   de verdad se guarda algo. */
function ensureMeals(draft) {
  draft.meals ||= { plan: [], extras: [], log: {} };
  return draft.meals;
}

/* ---- plan: franjas (Desayuno/Almuerzo/...) y sus opciones ---- */
export function addMealSlot(draft, { name }) {
  const meals = ensureMeals(draft);
  const slot = { id: uid(), name, options: [] };
  meals.plan.push(slot);
  return slot;
}

export function updateMealSlot(draft, slotId, { name }) {
  const slot = ensureMeals(draft).plan.find((s) => s.id === slotId);
  if (!slot) return false;
  slot.name = name;
  return true;
}

// Borrar una franja NO toca la bitácora ya escrita: una entrada vieja que había
// matcheado una opción de esa franja se queda con el id guardado, aunque ya no exista
// en meals.plan — mismo criterio que borrar un tipo de gym no reescribe el historial.
export function deleteMealSlot(draft, slotId) {
  const meals = ensureMeals(draft);
  const before = meals.plan.length;
  meals.plan = meals.plan.filter((s) => s.id !== slotId);
  return meals.plan.length !== before;
}

export function moveMealSlot(draft, slotId, dir) {
  const meals = ensureMeals(draft);
  return moveInArray(meals.plan, meals.plan.findIndex((s) => s.id === slotId), dir);
}

export function addMealOption(draft, slotId, { text }) {
  const slot = ensureMeals(draft).plan.find((s) => s.id === slotId);
  if (!slot) return null;
  const option = { id: uid(), text };
  slot.options.push(option);
  return option;
}

export function updateMealOption(draft, slotId, optionId, { text }) {
  const slot = ensureMeals(draft).plan.find((s) => s.id === slotId);
  const option = slot && slot.options.find((o) => o.id === optionId);
  if (!option) return false;
  option.text = text;
  return true;
}

export function deleteMealOption(draft, slotId, optionId) {
  const slot = ensureMeals(draft).plan.find((s) => s.id === slotId);
  if (!slot) return false;
  const before = slot.options.length;
  slot.options = slot.options.filter((o) => o.id !== optionId);
  return slot.options.length !== before;
}

/* ---- extras: catálogo libre (café, alcohol, permitidos…), calco de habits ---- */
export function nextExtraColor(state) {
  return PALETTE[(state.meals?.extras.length ?? 0) % PALETTE.length];
}

export function addMealExtra(draft, { name, color, icon }) {
  const meals = ensureMeals(draft);
  const extra = { id: uid(), name, color, icon };
  meals.extras.push(extra);
  return extra;
}

export function updateMealExtra(draft, id, { name, color, icon }) {
  const extra = ensureMeals(draft).extras.find((e) => e.id === id);
  if (!extra) return false;
  extra.name = name;
  extra.color = color;
  extra.icon = icon;
  return true;
}

// Igual que con las franjas: borrar un extra no re-escribe las entradas de la bitácora
// que ya lo habían matcheado (quedan con un id que ya no está en meals.extras, y las
// funciones de frecuencia de lib/meals.js simplemente dejan de contarlo).
export function deleteMealExtra(draft, id) {
  const meals = ensureMeals(draft);
  const before = meals.extras.length;
  meals.extras = meals.extras.filter((e) => e.id !== id);
  return meals.extras.length !== before;
}

/* ---- bitácora diaria ---- */

// Corre el "bot" (matchEntry, lib/meals.js) UNA sola vez, contra el plan/extras vigentes
// en este momento, y guarda el resultado junto con el texto. Editar una opción o un
// extra después no re-matchea entradas viejas — mismo criterio que el resto de la app.
export function addMealLogEntry(draft, dISO, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  const meals = ensureMeals(draft);
  const entry = { id: uid(), at: Date.now(), text: trimmed, matches: matchEntry(draft, trimmed) };
  (meals.log[dISO] ||= []).push(entry);
  return entry;
}

export function deleteMealLogEntry(draft, dISO, entryId) {
  const meals = ensureMeals(draft);
  const dia = meals.log[dISO];
  if (!dia) return false;
  const before = dia.length;
  meals.log[dISO] = dia.filter((e) => e.id !== entryId);
  return meals.log[dISO].length !== before;
}
