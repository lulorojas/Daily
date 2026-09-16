/* ----------------------------- GIMNASIO -----------------------------
   Port de la parte de cálculo de app/js/gimnasio.js.

   El plan semanal se guarda en gym.weekPlans, indexado por el LUNES de cada semana
   ('YYYY-MM-DD'), con un arreglo de 7 días { type, done }. El "historial" de entrenos no
   se guarda aparte: se deriva de los días marcados como hechos.

   Entrenamientos dobles (etapa 6, campo nuevo del modelo, pedido explícito de Lulo):
   un día puede tener un segundo turno con `type2`/`done2`, mismo significado que
   `type`/`done` pero para el turno de la tarde. Los dos son OPCIONALES: un día viejo, de
   antes de este campo, no los tiene — y eso es exactamente "un solo turno", no un error.
   Ninguna función de acá abajo asume que existen; dayTurnos() es el único lugar que los
   lee, y lo hace con `day.type2` como el chequeo de "¿hay un segundo turno?".

   Abs y movilidad (etapa 6, campos nuevos, pedido explícito de Lulo — reescrito dos veces
   hasta llegar acá: primero se probó como lista aparte (gym.coreLog), después como bloque
   propio dentro del plan semanal, y en las dos Lulo pidió más integración. Esta versión es
   la literal: `absCategories`/`movilidad` son dos campos MÁS del mismo día del plan
   semanal, al lado de `type`/`done`/`type2`/`done2` — no una lista, no un turno, un campo
   del día. Se hace UNA vez por día (no varias entradas como se probó antes): elegir de
   nuevo una categoría ya marcada la saca, exactamente como un checkbox.
   `absCategories` ausente o `movilidad` ausente = nada marcado ese día; dayAbs() es el
   único lugar que lee estos dos campos directamente.

   Abs cuenta como entreno para Progreso, movilidad no (pedido explícito de Lulo, cuarta
   vuelta sobre el mismo tema): un día con alguna categoría marcada aporta UNA entrada al
   historial (gymHistory), con type ABS_TYPE — así entra solo en el ranking, el balance,
   las rachas y la frecuencia de Progreso, exactamente "como cualquier tipo que creo",
   sin que Abs sea un tipo elegible de verdad en Administrar tipos (no compite por turno,
   sigue siendo su propio renglón). Movilidad, aunque esté marcada, NUNCA aporta una
   entrada: es la distinción explícita que pidió Lulo. */
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

// Una semana recién creada: 7 días de descanso, sin marcar.
export function emptyWeekPlan() { return DOW_SHORT.map(() => ({ type: REST, done: false })); }

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

/* Los tipos disponibles para elegir: los del usuario + Descanso al final.
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

// Desarma un día del plan en 1 o 2 turnos, según tenga `type2` o no. Es el único lugar
// que lee type2/done2 directamente — WeekPlan (Gimnasio) y TrainingRow (Hoy) dibujan
// sobre esto, no sobre el día crudo.
export function dayTurnos(day) {
  const turnos = [{ slot: 1, type: day.type, done: !!day.done }];
  if (day.type2) turnos.push({ slot: 2, type: day.type2, done: !!day.done2 });
  return turnos;
}

/* El historial de entrenos, derivado del plan: cada TURNO marcado como hecho que no sea
   descanso — un día con los dos turnos hechos aporta dos entradas, una por tipo, porque
   son dos entrenamientos distintos (cuentan aparte para el ranking y las rachas por
   tipo) — MÁS una entrada de tipo ABS_TYPE por cada día con alguna categoría de abs
   marcada (una sola, sin importar cuántas categorías ni si también hay movilidad: es un
   solo evento de entreno ese día, no uno por categoría). Movilidad sola, sin categorías,
   no aporta nada. Ordenado del más nuevo al más viejo. */
export function gymHistory(state) {
  const out = [];
  Object.keys(state.gym.weekPlans).forEach((k) => {
    const mon = parseISO(k);
    state.gym.weekPlans[k].forEach((day, i) => {
      const date = iso(addDays(mon, i));
      dayTurnos(day).forEach((t) => { if (t.done && t.type !== REST) out.push({ date, type: t.type }); });
      if (dayAbs(day).categories.length) out.push({ date, type: ABS_TYPE });
    });
  });
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out;
}

// Entrenos por semana: { lunesISO: cantidad }. Recibe el historial ya filtrado.
export function gymWeekCounts(hist) {
  const out = {};
  hist.forEach((x) => { const k = weekOf(x.date); out[k] = (out[k] || 0) + 1; });
  return out;
}

// Entrenos por día exacto: { fechaISO: cantidad }. Recibe el historial ya filtrado. Un
// día con los dos turnos hechos más abs marcado suma 3 — mismo `hist` de gymHistory(),
// nada nuevo que calcular. La usa ProgGymHeatmap (etapa 7) para el mapa de calor.
export function gymDayCounts(hist) {
  const out = {};
  hist.forEach((x) => { out[x.date] = (out[x.date] || 0) + 1; });
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
