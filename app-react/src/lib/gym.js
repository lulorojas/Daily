/* ----------------------------- GIMNASIO -----------------------------
   Port de la parte de cálculo de app/js/gimnasio.js, con el agregado de seguimiento por
   músculo (ver más abajo).

   El plan semanal se guarda en gym.weekPlans, indexado por el LUNES de cada semana
   ('YYYY-MM-DD'), con un arreglo de 7 días { muscles, done }. El "historial" de entrenos
   no se guarda aparte: se deriva de los días marcados como hechos.

   Seguimiento por músculo (sin equivalente en vanilla ni en etapas anteriores, pedido
   explícito de Lulo): un turno ya no tiene UN tipo, tiene una LISTA de músculos —
   `day.muscles` (array de nombres, del mismo catálogo `gym.customTypes` que antes se
   llamaba "tipos"). Un día de "espalda, tríceps y hombro" es un solo turno con
   `muscles:['Espalda','Tríceps','Hombro']`, y cada uno de los tres suma frecuencia por su
   cuenta — ver gymHistory() más abajo, que es donde se desarma la lista en entradas
   separadas. `muscles:[]` es "Descanso": ya no se guarda el string REST adentro del
   array, la ausencia de músculos ES el descanso.

   Entrenamientos dobles (campo nuevo del modelo, pedido explícito de Lulo):
   un día puede tener un segundo turno con `muscles2`/`done2`, mismo significado que
   `muscles`/`done` pero para el turno de la tarde. Los dos son OPCIONALES: un día sin
   segundo turno no los tiene — y eso es exactamente "un solo turno", no un error.
   Ninguna función de acá abajo asume que existen; dayTurnos() es el único lugar que los
   lee, y lo hace con `day.muscles2` como el chequeo de "¿hay un segundo turno?" (OJO:
   gymWeekDoubleDays() también lo lee directo, es la excepción a esa regla — ver ahí).

   Abs y movilidad (etapa 6, campos nuevos, pedido explícito de Lulo — reescrito dos veces
   hasta llegar acá: primero se probó como lista aparte (gym.coreLog), después como bloque
   propio dentro del plan semanal, y en las dos Lulo pidió más integración. Esta versión es
   la literal: `absCategories`/`movilidad` son dos campos MÁS del mismo día del plan
   semanal, al lado de `muscles`/`done`/`muscles2`/`done2` — no una lista, no un turno, un
   campo del día. Se hace UNA vez por día (no varias entradas como se probó antes): elegir de
   nuevo una categoría ya marcada la saca, exactamente como un checkbox.
   `absCategories` ausente o `movilidad` ausente = nada marcado ese día; dayAbs() es el
   único lugar que lee estos dos campos directamente.

   Abs cuenta como un músculo más para Progreso, movilidad no (pedido explícito de Lulo,
   cuarta vuelta sobre el mismo tema): un día con alguna categoría marcada aporta UNA
   entrada al historial (gymHistory), con type ABS_TYPE — así entra solo en el ranking, el
   balance, las rachas y la frecuencia por músculo, exactamente "como cualquier tipo que
   creo", sin que Abs sea un tipo elegible de verdad en Administrar tipos (no compite por
   turno, sigue siendo su propio renglón). Movilidad, aunque esté marcada, NUNCA aporta una
   entrada: es la distinción explícita que pidió Lulo.

   Quinta vuelta, pedido explícito ("los abdominales no cuentan como entrenamientos"): abs
   dejó de sumar a gymSessions() — no cuenta para "cuántas veces entrené" (el número de
   ENTRENOS de Progreso, el mapa de calor, "N entrenos" de Gimnasio), aunque siga sumando a
   gymHistory() para todo lo demás. Ver gymSessions() más abajo. */
import { addDays, iso, mondayOf, parseISO, todayD, DOW_SHORT } from './dates';
import { C } from './theme';

// Los tipos de entrenamiento los crea el usuario; solo "Descanso" es fijo.
// Es un string que vive DENTRO de los datos: cambiarlo rompería todos los planes guardados.
export const REST = 'Descanso';

// El "tipo" con el que Abs entra al historial de Progreso. No es un tipo elegible en
// Administrar tipos (allTypes() no lo incluye): es solo la etiqueta que ve gymHistory().
export const ABS_TYPE = 'Abs';

// La clave de weekPlans para una semana, contada desde la actual (0 = esta, -1 = la pasada).
export function weekKey(offset) { return iso(addDays(mondayOf(todayD()), offset * 7)); }

// La semana (su lunes) a la que pertenece una fecha.
export function weekOf(dISO) { return iso(mondayOf(parseISO(dISO))); }

// Una semana recién creada: 7 días de descanso (sin músculos), sin marcar.
export function emptyWeekPlan() { return DOW_SHORT.map(() => ({ muscles: [], done: false })); }

/* Diferencia deliberada con la app vanilla: allá getWeekPlan() CREABA la semana dentro de
   `state` con solo mirar Gimnasio, y esa semana vacía quedaba escrita en el próximo
   guardado. Acá la lectura es pura: devuelve la semana guardada, o una vacía sin tocar
   nada. La semana se materializa recién cuando se cambia algo de verdad (ver
   ensureWeekPlan en store/mutations.js).

   No hay riesgo de compatibilidad: al volver a la app vanilla, getWeekPlan() recrea al
   vuelo las semanas que no estén en el documento. Solo se dejan de escribir entradas
   vacías que no aportaban ningún dato. */
export function weekPlanFor(state, offset) {
  return state.gym.weekPlans[weekKey(offset)] || emptyWeekPlan();
}

export function weekPlanAt(state, weekKeyISO) {
  return state.gym.weekPlans[weekKeyISO] || emptyWeekPlan();
}

/* Los músculos disponibles para elegir (el catálogo sigue llamándose `customTypes` por
   compatibilidad con el resto del código — administrarlos no cambió de forma) + Descanso
   al final, que en el multi-select de WeekPlan es la opción que vacía el turno entero.
   El color de Descanso es un literal rgba y no un hex de la paleta, así que typeColor()
   devuelve algo que tint() no sabe teñir. Está así en la app actual; se replica igual. */
export function allTypes(state) {
  return state.gym.customTypes
    .map((t) => ({ name: t.name, color: t.color, id: t.id, custom: true }))
    .concat([{ name: REST, color: 'rgba(244,244,251,0.4)', rest: true }]);
}

export function typeColor(state, name) {
  if (name === ABS_TYPE) return C.violet; // mismo color que el renglón de abs en el plan.
  const t = allTypes(state).find((x) => x.name === name);
  return t ? t.color : C.rose;
}

// Desarma un día del plan en 1 o 2 turnos, según tenga `muscles2` o no. Es el único lugar
// que lee muscles2/done2 directamente (salvo gymWeekDoubleDays(), ver más abajo) — WeekPlan
// (Gimnasio) y TrainingRow (Hoy) dibujan sobre esto, no sobre el día crudo.
export function dayTurnos(day) {
  const turnos = [{ slot: 1, muscles: day.muscles, done: !!day.done }];
  if (day.muscles2) turnos.push({ slot: 2, muscles: day.muscles2, done: !!day.done2 });
  return turnos;
}

/* El historial de entrenos, derivado del plan: cada TURNO marcado como hecho aporta UNA
   entrada POR CADA MÚSCULO de su lista — un turno de "espalda, tríceps y hombro" hecho
   suma tres entradas, una por músculo, porque cada uno entrena por su cuenta (cuentan
   aparte para el ranking, las rachas y "Cómo venís" de cada uno). Un turno en Descanso
   tiene `muscles:[]`, así que no aporta nada — no hace falta filtrarlo aparte. MÁS una
   entrada de tipo ABS_TYPE por cada día con alguna categoría de abs marcada (una sola, sin
   importar cuántas categorías ni si también hay movilidad: es un solo evento de entreno
   ese día, no uno por categoría). Movilidad sola, sin categorías, no aporta nada.
   Ordenado del más nuevo al más viejo. */
export function gymHistory(state) {
  const out = [];
  Object.keys(state.gym.weekPlans).forEach((k) => {
    const mon = parseISO(k);
    state.gym.weekPlans[k].forEach((day, i) => {
      const date = iso(addDays(mon, i));
      dayTurnos(day).forEach((t) => { if (t.done) t.muscles.forEach((m) => out.push({ date, type: m })); });
      if (dayAbs(day).categories.length) out.push({ date, type: ABS_TYPE });
    });
  });
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out;
}

/* Las SESIONES de entreno: una por cada turno hecho (sin importar cuántos músculos tenga).
   Es lo que la app llama "un entreno".

   La diferencia con gymHistory() es justo el pedido de Lulo: un turno de bícep + tríceps +
   hombro es UN entreno, no tres — los músculos de un mismo turno no multiplican. Dos
   turnos el mismo día SÍ son dos (pedido explícito de la etapa 6, que sigue en pie).

   Abs NO aporta una sesión (pedido explícito, segunda vuelta sobre el tema: "los
   abdominales no cuentan como entrenamientos") — a diferencia de gymHistory(), donde abs
   sigue siendo su propio renglón para el ranking/Cómo venís/frecuencia por músculo.

   Las dos listas se usan para preguntas distintas y no son intercambiables:
     gymHistory()  → "¿cuánto entrené CADA MÚSCULO?" (ranking, rachas, Cómo venís)
     gymSessions() → "¿cuántas veces entrené?" (el número de entrenos, el mapa de calor)

   Las dos devuelven objetos con `date`, así que gymWeekCounts()/gymDayCounts() sirven
   para cualquiera de las dos — lo que cambia es QUÉ se está contando. */
export function gymSessions(state) {
  const out = [];
  Object.keys(state.gym.weekPlans).forEach((k) => {
    const mon = parseISO(k);
    state.gym.weekPlans[k].forEach((day, i) => {
      const date = iso(addDays(mon, i));
      dayTurnos(day).forEach((t) => { if (t.done && t.muscles.length) out.push({ date, slot: t.slot }); });
    });
  });
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out;
}

// Por semana: { lunesISO: cantidad }. Recibe una lista de {date} ya filtrada —
// gymHistory() para contar por músculo, gymSessions() para contar entrenos.
export function gymWeekCounts(lista) {
  const out = {};
  lista.forEach((x) => { const k = weekOf(x.date); out[k] = (out[k] || 0) + 1; });
  return out;
}

// Por día exacto: { fechaISO: cantidad }. Mismo criterio que gymWeekCounts: lo que cuenta
// depende de la lista que se le pase. El mapa de calor (ProgGymHeatmap) le pasa las
// SESIONES, para que un turno de tres músculos no pinte el día como si fueran tres.
export function gymDayCounts(lista) {
  const out = {};
  lista.forEach((x) => { out[x.date] = (out[x.date] || 0) + 1; });
  return out;
}

// Qué tipos se entrenaron cada día exacto: { fechaISO: [tipo, ...] }. Recibe el
// historial ya filtrado. La usa ProgGymHeatmap para el globito de "qué hice ese día".
export function gymDayTypes(hist) {
  const out = {};
  hist.forEach((x) => { (out[x.date] ||= []).push(x.type); });
  return out;
}

/* Racha POR TIPO de entrenamiento (no por semana): cuántas semanas seguidas, contando
   hacia atrás, se hizo ese tipo al menos una vez. Un tipo "está en racha" a partir de 2.
   La semana en curso no corta la racha: si todavía no entrenaste esta semana, se empieza
   a contar desde la anterior. */
export function gymTypeStreaks(state) {
  const weeks = {};
  gymHistory(state).forEach((x) => { (weeks[x.type] ||= new Set()).add(weekOf(x.date)); });
  const curW = iso(mondayOf(todayD()));
  const prevW = (w) => iso(addDays(parseISO(w), -7));
  return Object.keys(weeks).map((type) => {
    const set = weeks[type];
    let w = set.has(curW) ? curW : prevW(curW), n = 0;
    while (set.has(w)) { n++; w = prevW(w); }
    return { type, weeks: n };
  }).filter((x) => x.weeks > 0).sort((a, b) => b.weeks - a.weeks || (a.type < b.type ? -1 : 1));
}

// Cuántas veces se hizo cada tipo, de más a menos.
export function gymRanking(hist) {
  const counts = {};
  hist.forEach((x) => { counts[x.type] = (counts[x.type] || 0) + 1; });
  return Object.keys(counts).map((t) => ({ type: t, count: counts[t] })).sort((a, b) => b.count - a.count);
}

/* Mayor avance de carga dentro de una ventana. startISO null = todo el historial.
   Solo entran los ejercicios con al menos dos registros en la ventana: con uno no hay
   con qué comparar. */
export function liftGains(state, startISO) {
  return state.gym.lifts.map((l) => {
    const h = l.history.filter((p) => !startISO || p.date >= startISO).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    if (h.length < 2) return null;
    const from = h[0].weight, to = h[h.length - 1].weight;
    return {
      id: l.id, name: l.name, color: l.color, unit: l.unit || 'kg',
      gain: +(to - from).toFixed(1), from, to, n: h.length,
    };
  }).filter(Boolean).sort((a, b) => b.gain - a.gain);
}

// " × 5" si el registro tiene reps cargadas, "" si no (registro viejo o sin cargar).
export function repsLabel(reps) {
  return reps ? ` × ${reps}` : '';
}

// Registros de peso corporal, del más viejo al más nuevo. Copia: no toca el estado.
export function bodyList(state) {
  return state.gym.bodyWeights.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* ------------------------------ ABS Y MOVILIDAD ------------------------------ */

export const CORE_CATS = ['core', 'bajos', 'oblicuos', 'altos'];
export const CORE_CAT_LABELS = { core: 'Core', bajos: 'Bajos', oblicuos: 'Oblicuos', altos: 'Altos' };

// Lee absCategories/movilidad de un día del plan, con los defaults de "nada marcado".
// Es el único lugar que los lee directamente — WeekPlan dibuja sobre esto, no sobre el día crudo.
export function dayAbs(day) {
  return { categories: day.absCategories || [], movilidad: !!day.movilidad };
}

// "Core, Oblicuos, Movilidad" / "Movilidad" / null si no hay nada marcado ese día.
export function describeAbs({ categories, movilidad }) {
  const partes = categories.map((c) => CORE_CAT_LABELS[c]);
  if (movilidad) partes.push('Movilidad');
  return partes.length ? partes.join(', ') : null;
}

/* ------------------------------ FRECUENCIA SEMANAL (rediseño "Glass + aurora") ------------------------------
   Sin equivalente en vanilla ni en etapas anteriores: barras apiladas por tipo, una por
   semana, con un círculo arriba por cada día de doble turno real (el 2do turno existe Y no
   es Descanso — un 2do turno recién agregado, todavía en Descanso, no cuenta todavía). */

// Entrenos por semana, desglosados por tipo: { lunesISO: { tipo: cantidad } }. Recibe el
// historial ya filtrado (gymHistory), igual que gymWeekCounts.
export function gymWeekTypeCounts(hist) {
  const out = {};
  hist.forEach((x) => {
    const k = weekOf(x.date);
    (out[k] ||= {})[x.type] = (out[k][x.type] || 0) + 1;
  });
  return out;
}

// Días con doble turno real por semana: { lunesISO: cantidad }. A diferencia de
// gymHistory() (que cuenta TURNOS), esto cuenta DÍAS — el círculo del gráfico es por día.
export function gymWeekDoubleDays(state) {
  const out = {};
  Object.keys(state.gym.weekPlans).forEach((k) => {
    const n = state.gym.weekPlans[k].filter((day) => day.muscles2 && day.muscles2.length > 0).length;
    if (n) out[k] = n;
  });
  return out;
}
