/* ----------------------------- GIMNASIO -----------------------------
   Port de la parte de cálculo de app/js/gimnasio.js.

   El plan semanal se guarda en gym.weekPlans, indexado por el LUNES de cada semana
   ('YYYY-MM-DD'), con un arreglo de 7 días { type, done }. El "historial" de entrenos no
   se guarda aparte: se deriva de los días marcados como hechos. */
import { addDays, iso, mondayOf, parseISO, todayD, DOW_SHORT } from './dates';
import { C } from './theme';

// Los tipos de entrenamiento los crea el usuario; solo "Descanso" es fijo.
// Es un string que vive DENTRO de los datos: cambiarlo rompería todos los planes guardados.
export const REST = 'Descanso';

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
  const t = allTypes(state).find((x) => x.name === name);
  return t ? t.color : C.rose;
}

/* El historial de entrenos, derivado del plan: cada día marcado como hecho que no sea
   descanso. Ordenado del más nuevo al más viejo. */
export function gymHistory(state) {
  const out = [];
  Object.keys(state.gym.weekPlans).forEach((k) => {
    const mon = parseISO(k);
    state.gym.weekPlans[k].forEach((day, i) => {
      if (day.done && day.type !== REST) out.push({ date: iso(addDays(mon, i)), type: day.type });
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
