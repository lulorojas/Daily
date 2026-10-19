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
import { llevaProteina, proteinaImplicita } from '../lib/mealRules';
import { emptyWeekPlan, REST } from '../lib/gym';
import { moveInArray } from '../lib/arrays';
import { habitMarks } from '../lib/habits';
import { activePlan, itemsLabel, matchEntry, normalizeText, optionLabel, recuperarFaltantes } from '../lib/meals';
import { todayISO } from '../lib/dates';

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
  draft.meals ||= { plans: [], extras: [], log: {} };
  return draft.meals;
}

/* La versión de plan donde escribir franjas/opciones: la activa si ya hay una, o una
   recién creada (vacía) si todavía no se tocó el plan ni una vez — así addMealSlot() de
   una cuenta nueva no necesita un caso especial "crear la primera versión". */
function ensureActivePlan(draft) {
  const meals = ensureMeals(draft);
  let plan = activePlan(draft);
  if (!plan) {
    plan = { id: uid(), startISO: todayISO(), endISO: null, slots: [] };
    meals.plans.push(plan);
  }
  return plan;
}

/* ---- plan: franjas (Desayuno/Almuerzo/...) y sus opciones, todo sobre la versión ACTIVA
   (ver activePlan() en lib/meals.js) ---- */
export function addMealSlot(draft, { name }) {
  const plan = ensureActivePlan(draft);
  const slot = { id: uid(), name, options: [] };
  plan.slots.push(slot);
  return slot;
}

export function updateMealSlot(draft, slotId, { name }) {
  const slot = ensureActivePlan(draft).slots.find((s) => s.id === slotId);
  if (!slot) return false;
  slot.name = name;
  return true;
}

// Borrar una franja NO toca la bitácora ya escrita: una entrada vieja que había
// matcheado una opción de esa franja se queda con el id guardado, aunque ya no exista en
// el plan activo — mismo criterio que borrar un tipo de gym no reescribe el historial.
export function deleteMealSlot(draft, slotId) {
  const plan = ensureActivePlan(draft);
  const before = plan.slots.length;
  plan.slots = plan.slots.filter((s) => s.id !== slotId);
  return plan.slots.length !== before;
}

export function moveMealSlot(draft, slotId, dir) {
  const plan = ensureActivePlan(draft);
  return moveInArray(plan.slots, plan.slots.findIndex((s) => s.id === slotId), dir);
}

/* Una opción siempre tiene nombre (`text`) y, si se quiere medir, la lista de lo que
   lleva (`items`, pedido explícito: "quiero que las opciones de cada comida y lo que yo
   comí importe"). Sin ítems, la clave `items` no existe — no `items: []`. La unidad
   default ('u') tampoco se guarda: un ítem sin `unit` se cuenta por unidades. */
function cleanItem({ id, name, qty, unit, tipo }) {
  return {
    id,
    name,
    qty,
    ...(unit === 'gr' ? { unit } : {}),
    ...(tipo ? { tipo } : {}),
  };
}

function normalizeOptionFields({ text, items }) {
  return {
    text: (text ?? '').trim(),
    ...(items && items.length ? { items: items.map(cleanItem) } : {}),
  };
}

// Almuerzo y cena llevan su proteína pesada (250 gr): si la opción no trae ningún alimento
// medible, se le agrega (ver lib/mealRules.js).
function conProteinaPesada(slot, option) {
  if (llevaProteina(slot.name) && option.text && !option.items?.length) option.items = [proteinaImplicita(option.text, uid())];
}

export function addMealOption(draft, slotId, fields) {
  const slot = ensureActivePlan(draft).slots.find((s) => s.id === slotId);
  if (!slot) return null;
  const option = { id: uid(), ...normalizeOptionFields(fields) };
  conProteinaPesada(slot, option);
  slot.options.push(option);
  return option;
}

export function updateMealOption(draft, slotId, optionId, fields) {
  const slot = ensureActivePlan(draft).slots.find((s) => s.id === slotId);
  const option = slot && slot.options.find((o) => o.id === optionId);
  if (!option) return false;
  delete option.text;
  delete option.items;
  Object.assign(option, normalizeOptionFields(fields));
  conProteinaPesada(slot, option);
  return true;
}

export function deleteMealOption(draft, slotId, optionId) {
  const slot = ensureActivePlan(draft).slots.find((s) => s.id === slotId);
  if (!slot) return false;
  const before = slot.options.length;
  slot.options = slot.options.filter((o) => o.id !== optionId);
  return slot.options.length !== before;
}

/* "Nuevo plan" (pedido explícito: "quiero guardar el historial de planes", y que la
   versión cambie por ACCIÓN EXPLÍCITA, no sola — editar una opción del plan de hoy no
   crea una versión nueva, esto sí). Archiva la versión activa (le pone endISO:hoy) y
   arranca una con las MISMAS franjas (nombres) pero sin opciones: la estructura —
   Desayuno/Almuerzo/Merienda/Cena — rara vez cambia de nutricionista a nutricionista, así
   que copiarla ahorra tipeo sin arrastrar comida que ya no corresponde. Si todavía no
   había ningún plan, esto se comporta igual que ensureActivePlan: crea el primero. */
export function startNewMealPlan(draft) {
  const meals = ensureMeals(draft);
  const actual = activePlan(draft);
  if (actual) actual.endISO = todayISO();
  const nuevo = {
    id: uid(),
    startISO: todayISO(),
    endISO: null,
    slots: (actual?.slots ?? []).map((s) => ({ id: uid(), name: s.name, options: [] })),
  };
  meals.plans.push(nuevo);
  return nuevo;
}

/* ---- extras: catálogo libre (café, alcohol, permitidos…), calco de habits ---- */
export function nextExtraColor(state) {
  return PALETTE[(state.meals?.extras.length ?? 0) % PALETTE.length];
}

// `quality` ('bueno'|'malo', opcional) es lo que deja que "Cómo comés" (lib/meals.js,
// comoComes()) sepa que un extra como Alcohol hay que evitarlo o que uno como "Comida
// libre" está bien aunque esté fuera del plan — sin valor, un extra sigue siendo neutro
// como hasta ahora (café, permitidos). Se guarda SOLO si viene con algo: un extra neutro
// no tiene la clave `quality` en absoluto, no `quality: undefined`.
export function addMealExtra(draft, { name, color, icon, quality }) {
  const meals = ensureMeals(draft);
  const extra = { id: uid(), name, color, icon };
  if (quality) extra.quality = quality;
  meals.extras.push(extra);
  return extra;
}

export function updateMealExtra(draft, id, { name, color, icon, quality }) {
  const extra = ensureMeals(draft).extras.find((e) => e.id === id);
  if (!extra) return false;
  extra.name = name;
  extra.color = color;
  extra.icon = icon;
  if (quality) extra.quality = quality; else delete extra.quality;
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
  const matches = matchEntry(draft, trimmed);
  const delDia = meals.log[dISO] ?? [];
  matches.options = unaFranjaPorPlato(draft, delDia, matches.options);
  const entry = { id: uid(), at: Date.now(), text: trimmed, matches };

  /* "Al final comí la verdura" (rediseño Nocturne): si el texto nombra un alimento que le
     faltó a una comida ya registrada ese día, ese alimento se suma a ESA comida y la
     burbuja lo cuenta ("→ sumó a Almuerzo: verdura ✓"). Como el texto no es una comida
     nueva sino el complemento de una vieja, no se registra además como otra opción del
     plan (la verdura de una ensalada de la cena no cuenta como cena). */
  const recuperados = recuperarFaltantes(draft, delDia, trimmed);
  if (recuperados.length) {
    recuperados.forEach((r) => {
      const m = delDia.find((x) => x.id === r.entryId).matches.options.find((o) => o.slotId === r.slotId && o.optionId === r.optionId);
      const it = m.items.find((x) => x.itemId === r.itemId);
      if (it) it.qty += r.add; else m.items.push({ itemId: r.itemId, qty: r.add });
    });
    entry.matches.options = [];
    entry.recupera = recuperados.map(({ slotName, name }) => ({ slotName, name }));
  }
  (meals.log[dISO] ||= []).push(entry);
  return entry;
}

/* El mismo plato está en dos franjas (almuerzo y cena comparten opciones, pedido
   explícito), así que escribir "comí arroz con pollo" lo reconoce en las dos — y
   contaría como almuerzo Y cena. Se queda con UNA: la primera (en el orden del plan) que
   todavía no tiene nada registrado ese día — al mediodía es el almuerzo, a la noche, ya
   registrado el almuerzo, es la cena. Si ya están todas, la última. */
function unaFranjaPorPlato(draft, entradasDelDia, options) {
  const slots = activePlan(draft)?.slots ?? [];
  const plato = (m) => normalizeText(slots.find((s) => s.id === m.slotId)?.options.find((o) => o.id === m.optionId)?.text ?? m.optionId);
  const registrada = (slotId) => entradasDelDia.some((e) => e.libre?.slotId === slotId || e.matches.options.some((m) => m.slotId === slotId));

  const porPlato = new Map();
  options.forEach((m) => {
    const k = plato(m);
    if (!porPlato.has(k)) porPlato.set(k, []);
    porPlato.get(k).push(m);
  });
  return [...porPlato.values()].map((grupo) => grupo.find((m) => !registrada(m.slotId)) ?? grupo[grupo.length - 1]);
}

/* Registrar una comida TOCANDO en vez de escribiendo (pedido explícito: "que yo pueda
   llevar de una manera fácil, clara y didáctica el registro de mis comidas"): se eligió
   una opción del plan y, si es medible, cuánto de cada ítem. No pasa por el bot — ya se
   sabe exactamente qué es — pero queda guardada con la MISMA forma que una entrada
   escrita (texto + matches), así la bitácora, "Tu día" y "Cómo comés" no distinguen de
   dónde vino. `qtys` es { itemId: cantidad }; un ítem que no viene cuenta lo del plan.
   `pesado` (si lo pesó en la balanza) solo se guarda cuando es true. */
/* El match y el texto de una entrada registrada tocando. Lo que se sacó (cantidad 0) no
   se lista como "0 fruta" sino aparte, "sin fruta" — así se lee qué faltó. */
/* `suma`: alimentos de OTRAS opciones de la misma comida que se agregaron a esta (pedido
   explícito: "a una comida del plan se le pueden agregar cosas de otras comidas del
   plan, por ejemplo arroz con pollo con un wok de verduras"). Se guardan con su nombre y
   cantidad tal cual — no por id, porque no son ítems de ESTA opción —, y no tocan el
   cumplimiento de la opción elegida: son comida del plan, así que no la vuelven pifiada,
   pero tampoco "completan" lo que faltó de ella. */
function cleanSuma(suma) {
  return (suma ?? [])
    .map((s) => ({
      optionId: s.optionId,
      name: (s.name ?? '').trim(),
      qty: Math.max(0, Number(s.qty) || 0),
      ...(s.unit === 'gr' ? { unit: 'gr' } : {}),
      ...(s.tipo ? { tipo: s.tipo } : {}),
    }))
    .filter((s) => s.name && s.qty > 0);
}

function buildStructured(draft, { slotId, optionId, qtys = {}, suma = [] }) {
  const slot = activePlan(draft)?.slots.find((s) => s.id === slotId);
  const option = slot?.options.find((o) => o.id === optionId);
  if (!option) return null;

  const match = { slotId, optionId };
  let text = `${slot.name}: ${optionLabel(option)}`;
  const partes = [];
  if (option.items?.length) {
    match.items = option.items.map((it) => ({ itemId: it.id, qty: Math.max(0, Number(qtys[it.id] ?? it.qty) || 0) }));
    const conQty = option.items.map((it, i) => ({ ...it, qty: match.items[i].qty }));
    const comidos = conQty.filter((it) => it.qty > 0);
    const sacados = conQty.filter((it) => it.qty === 0);
    if (comidos.length) partes.push(itemsLabel(comidos));
    if (sacados.length) partes.push(`sin ${sacados.map((it) => it.name).join(', ')}`);
  }
  const sumados = cleanSuma(suma);
  if (sumados.length) {
    match.suma = sumados;
    partes.push(`+ ${itemsLabel(sumados)}`);
  }
  if (partes.length) text += ` (${partes.join(' — ')})`;
  return { match, text };
}

export function addMealLogStructured(draft, dISO, { slotId, optionId, qtys = {}, pesado = false, suma = [] }) {
  const built = buildStructured(draft, { slotId, optionId, qtys, suma });
  if (!built) return null;
  const meals = ensureMeals(draft);

  const entry = { id: uid(), at: Date.now(), text: built.text, matches: { options: [built.match], extras: [] } };
  if (pesado) entry.pesado = true;
  (meals.log[dISO] ||= []).push(entry);
  return entry;
}

/* Corregir algo ya registrado (pedido explícito: "elegir una opción y sacarle algo por si
   lo quiero agregar después"): se reemplaza SOLO el match de esa franja/opción dentro de
   la entrada, sin tocar la hora ni otros matches que pudiera tener. El texto se rearma
   solo si la entrada no tiene nada más (una registrada tocando); si vino de la bitácora
   escrita, el texto es lo que escribió Lulo y se respeta. */
export function updateMealLogStructured(draft, dISO, entryId, { slotId, optionId, prevOptionId = optionId, qtys = {}, pesado = false, suma = [] }) {
  const entry = draft.meals?.log?.[dISO]?.find((e) => e.id === entryId);
  if (!entry) return false;
  const built = buildStructured(draft, { slotId, optionId, qtys, suma });
  if (!built) return false;

  const i = entry.matches.options.findIndex((m) => m.slotId === slotId && m.optionId === prevOptionId);
  if (i === -1) return false;
  entry.matches.options[i] = built.match;
  if (entry.matches.options.length === 1 && !entry.matches.extras.length) entry.text = built.text;
  if (pesado) entry.pesado = true; else delete entry.pesado;
  return true;
}

/* Algo fuera del plan (pedido explícito, dos vueltas: "la comida libre la debo poder
   poner en algún lado y decir qué, por ejemplo unas galletas en el desayuno", y después
   "las que pueden estar bien son las comidas distintas del plan pero que no son
   insalubres... un permitido... está mal y es como una comida pifiada").

   `tipo`: 'sana' (distinta del plan, pero bien) o 'permitido' (cuenta como pifiada).
   Con `slotId` reemplaza esa comida — la franja deja de estar pendiente; con slotId null
   es suelto ("un alfajor a la tarde") y no ocupa ninguna franja. Ver dayMealSummary y
   mealScoreByPeriod en lib/meals.js para cómo cuenta cada caso. El bot igual mira el
   texto por si menciona un extra ("galletas con café"). */
export function addMealLogLibre(draft, dISO, slotId, desc, tipo = 'sana', { time } = {}) {
  const que = (desc || '').trim();
  if (!que) return null;
  const slot = slotId ? activePlan(draft)?.slots.find((s) => s.id === slotId) : null;
  if (slotId && !slot) return null;
  const t = tipo === 'permitido' ? 'permitido' : 'sana';
  const meals = ensureMeals(draft);

  let text;
  if (!slot) text = `${t === 'permitido' ? 'Permitido' : 'Fuera del plan'}: ${que}`;
  else text = `${slot.name}: ${que} (${t === 'permitido' ? 'permitido' : 'distinto del plan, sano'})`;

  const entry = {
    id: uid(),
    at: Date.now(),
    text,
    libre: { ...(slot ? { slotId: slot.id } : {}), que, tipo: t },
    matches: { options: [], extras: matchEntry(draft, que).extras },
    ...(time ? { time } : {}),
  };
  (meals.log[dISO] ||= []).push(entry);
  return entry;
}

/* "No comí": se registra que una comida NO se hizo. No es lo mismo que no haber anotado nada
   (pendiente: no se sabe): esto es algo negativo para el día, cuenta 0% y como pifiada (ver
   franjaStatus en lib/meals.js). Una sola por comida y día; si después se registra lo que
   sí se comió en esa comida, eso manda. */
export function addMealLogSalteada(draft, dISO, slotId) {
  const slot = activePlan(draft)?.slots.find((s) => s.id === slotId);
  if (!slot) return null;
  const meals = ensureMeals(draft);
  const dia = meals.log[dISO] ||= [];
  const ya = dia.find((e) => e.saltea?.slotId === slotId);
  if (ya) return ya;
  const entry = { id: uid(), at: Date.now(), text: `${slot.name}: no comí`, saltea: { slotId }, matches: { options: [], extras: [] } };
  dia.push(entry);
  return entry;
}

// Un toque en un extra (café, alcohol…) lo anota en la bitácora de ese día, sin escribir.
// `time` ("HH:MM") y `qty` (cuántos, p. ej. vasos de alcohol) son opcionales: sin ellos la
// entrada es la de siempre, un toque sin más datos.
export function addMealExtraEntry(draft, dISO, extraId, { time, qty } = {}) {
  const meals = ensureMeals(draft);
  const extra = meals.extras.find((e) => e.id === extraId);
  if (!extra) return null;
  const entry = {
    id: uid(), at: Date.now(), text: extra.name, matches: { options: [], extras: [extra.id] },
    ...(time ? { time } : {}),
    ...(qty && qty !== 1 ? { qty } : {}),
  };
  (meals.log[dISO] ||= []).push(entry);
  return entry;
}

/* Cargar un plan armado de antemano (ver lib/mealPlanTemplates.js — pedido explícito: el
   plan del nutricionista que Lulo mandó en PDF). Pasa a ser la versión VIGENTE: si ya
   había una con franjas se archiva (mismo criterio que startNewMealPlan); si la vigente
   estaba vacía, se reemplaza — no tiene sentido archivar un plan sin nada. Los extras de
   la plantilla se suman solo si no hay ya uno con el mismo nombre.

   Los ids salen de un solo uid() + un contador: con ~60 ids creados en el mismo
   milisegundo, cuatro caracteres al azar por id ya no alcanzan para descartar choques. */
export function loadMealPlanTemplate(draft, template) {
  const meals = ensureMeals(draft);
  const base = uid();
  let n = 0;
  const nid = () => base + (n++).toString(36);

  const actual = activePlan(draft);
  if (actual && actual.slots.length) actual.endISO = todayISO();
  else if (actual) meals.plans = meals.plans.filter((p) => p !== actual);

  const plan = {
    id: nid(),
    startISO: todayISO(),
    endISO: null,
    ...(template.guide?.length ? { guide: [...template.guide] } : {}),
    slots: template.slots.map((s) => ({
      id: nid(),
      name: s.name,
      options: s.options.map((o) => ({
        id: nid(),
        ...normalizeOptionFields({ text: o.text, items: (o.items ?? []).map((it) => ({ ...it, id: nid() })) }),
      })),
    })),
  };
  meals.plans.push(plan);

  (template.extras ?? []).forEach((ex) => {
    if (meals.extras.some((e) => normalizeText(e.name) === normalizeText(ex.name))) return;
    meals.extras.push({ id: nid(), name: ex.name, color: ex.color, icon: ex.icon, ...(ex.quality ? { quality: ex.quality } : {}) });
  });
  return plan;
}

/* Recuperar lo borrado sin querer (pedido explícito: "restablecé lo del queso que borré
   sin querer"): vuelve a poner en el plan vigente las opciones y alimentos de la
   plantilla que ya no están (ver missingFromTemplate en lib/meals.js), en la MISMA
   posición que tenían en la plantilla — no al final. No borra ni cambia nada de lo que
   ya hay: lo que Lulo agregó o ajustó (cantidades, macros) queda como está. */
export function restoreFromMealTemplate(draft, template) {
  const plan = ensureActivePlan(draft);
  const base = uid();
  let n = 0;
  const nid = () => base + (n++).toString(36);
  const mismo = (a, b) => normalizeText(a) === normalizeText(b);
  let restaurados = 0;

  template.slots.forEach((ts) => {
    let slot = plan.slots.find((s) => mismo(s.name, ts.name));
    if (!slot) {
      slot = { id: nid(), name: ts.name, options: [] };
      plan.slots.push(slot);
    }
    ts.options.forEach((to, oi) => {
      const opt = slot.options.find((o) => mismo(o.text, to.text));
      if (!opt) {
        const nueva = { id: nid(), ...normalizeOptionFields({ text: to.text, items: (to.items ?? []).map((it) => ({ ...it, id: nid() })) }) };
        slot.options.splice(Math.min(oi, slot.options.length), 0, nueva);
        restaurados++;
        return;
      }
      (to.items ?? []).forEach((ti, ii) => {
        if ((opt.items ?? []).some((i) => mismo(i.name, ti.name))) return;
        opt.items ||= [];
        opt.items.splice(Math.min(ii, opt.items.length), 0, cleanItem({ ...ti, id: nid() }));
        restaurados++;
      });
    });
  });
  if (!plan.guide?.length && template.guide?.length) plan.guide = [...template.guide];
  return restaurados;
}

/* Corregir una entrada de Alcohol o de Permitido desde su calendario: hora, cantidad, qué
   fue y en lugar de qué comida. `toDISO` la mueve a otro día (en el calendario se puede
   cambiar la fecha). Un permitido deja de ser "en lugar de una comida" con slotId null. */
export function updateMealEntryDetails(draft, dISO, entryId, { time, qty, que, slotId, toDISO } = {}) {
  const meals = ensureMeals(draft);
  const dia = meals.log[dISO];
  const entry = dia?.find((e) => e.id === entryId);
  if (!entry) return false;

  if (time !== undefined) { if (time) entry.time = time; else delete entry.time; }
  if (qty !== undefined) { if (qty && qty !== 1) entry.qty = qty; else delete entry.qty; }
  if (entry.libre) {
    if (que !== undefined && que.trim()) entry.libre.que = que.trim();
    if (slotId !== undefined) {
      const nuevo = slotId ? activePlan(draft)?.slots.find((s) => s.id === slotId) : null;
      if (nuevo) entry.libre.slotId = nuevo.id; else delete entry.libre.slotId;
    }
    const slot = entry.libre.slotId ? activePlan(draft)?.slots.find((s) => s.id === entry.libre.slotId) : null;
    entry.text = slot ? `${slot.name}: ${entry.libre.que} (permitido)` : `Permitido: ${entry.libre.que}`;
  }

  if (toDISO && toDISO !== dISO) {
    meals.log[dISO] = dia.filter((e) => e.id !== entryId);
    (meals.log[toDISO] ||= []).push(entry);
  }
  return true;
}

export function deleteMealLogEntry(draft, dISO, entryId) {
  const meals = ensureMeals(draft);
  const dia = meals.log[dISO];
  if (!dia) return false;
  const before = dia.length;
  meals.log[dISO] = dia.filter((e) => e.id !== entryId);
  return meals.log[dISO].length !== before;
}
