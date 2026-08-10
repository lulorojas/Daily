/* ----------------------------- HÁBITOS -----------------------------
   Port de app/js/habitos.js (solo la parte de cálculo; el dibujo llega en la etapa 3).

   Multi-check: cada hábito tiene timesPerDay y habitLog guarda cuántas marcas se hicieron
   ese día. Un día "cuenta" para la racha solo si está COMPLETO (marcas >= timesPerDay). */
import { addDays, iso, parseISO, todayD } from './dates';

// Marcas de un hábito ese día (entero; legacy true → 1).
export function habitMarks(state, id, dISO) {
  const day = state.habitLog[dISO];
  if (!day) return 0;
  const v = day[id];
  return v === true ? 1 : (Number(v) || 0);
}

export function habitTPD(hb) { return hb.timesPerDay || 1; }

// "Completo": llegó a todas las marcas del día.
export function habitDone(state, id, dISO) {
  const hb = state.habits.find((x) => x.id === id);
  if (!hb) return false;
  return habitMarks(state, id, dISO) >= habitTPD(hb);
}

/* Marcas hechas ese día, sobre los hábitos que existen HOY. El Math.min importa: si un
   hábito bajó de 3 veces por día a 1, los días viejos con 3 marcas cuentan como 1. */
export function habitDayMarks(state, dISO) {
  return state.habits.reduce((a, h) => a + Math.min(habitMarks(state, h.id, dISO), habitTPD(h)), 0);
}

export function habitDayPossible(state) {
  return state.habits.reduce((a, h) => a + habitTPD(h), 0);
}

export function habitDoneCount(state, dISO) {
  return state.habits.filter((h) => habitDone(state, h.id, dISO)).length;
}

// Primer día con alguna marca, o null.
export function habitFirstISO(state) {
  const ds = Object.keys(state.habitLog).filter((d) => {
    const day = state.habitLog[d];
    return day && Object.keys(day).length;
  }).sort();
  return ds.length ? ds[0] : null;
}

/* Racha actual: días completos consecutivos contando hacia atrás.
   El detalle clave es la primera línea: si HOY todavía no está completo, la racha se
   mide desde ayer. Así, a las 9 de la mañana no te dice que perdiste una racha de 40
   días solo porque todavía no tomaste agua. */
export function habitStreak(state, id, refISO) {
  let cur = refISO ? parseISO(refISO) : todayD();
  if (!habitDone(state, id, iso(cur))) cur = addDays(cur, -1);
  let n = 0;
  while (habitDone(state, id, iso(cur))) { n++; cur = addDays(cur, -1); }
  return n;
}

// La racha más larga que llegó a tener el hábito.
export function habitBestStreak(state, id) {
  const hb = state.habits.find((x) => x.id === id);
  if (!hb) return 0;
  const days = Object.keys(state.habitLog).filter((d) => habitDone(state, id, d)).sort();
  let best = 0, run = 0, prev = null;
  days.forEach((d) => {
    run = (prev && iso(addDays(parseISO(prev), 1)) === d) ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  });
  return best;
}
