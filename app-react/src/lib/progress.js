/* ----------------------------- PROGRESO -----------------------------
   Port de la parte de cálculo de app/js/progreso.js, más el progreso del día que vivía
   dentro de viewHoy(). Todo esto es solo lectura: Progreso no guarda nada. */
import { addDays, iso, mondayOf, parseISO, todayD, todayISO, MONTHS } from './dates';
import { habitDayMarks, habitDayPossible, habitFirstISO } from './habits';
import { tareasDe } from './agenda';

// [clave, etiqueta, días de la ventana]. null = todo el historial.
export const PROG_PERIODS = [['semana', 'Semana', 7], ['mes', 'Mes', 30], ['ano', 'Año', 365], ['todo', 'Todo', null]];

function periodOf(key) { return PROG_PERIODS.find((x) => x[0] === key) || PROG_PERIODS[1]; }

// Primer día de la ventana, o null para "todo". Ojo el -(n-1): la ventana INCLUYE hoy.
export function progStart(key) {
  const p = periodOf(key);
  return p[2] == null ? null : iso(addDays(todayD(), -(p[2] - 1)));
}

export function progLabel(key) { return periodOf(key)[1]; }

export function inPeriod(dISO, startISO) { return !startISO || dISO >= startISO; }

export function progPeriodNote(key) {
  return { semana: 'en los últimos 7 días', mes: 'en los últimos 30 días', ano: 'en el último año', todo: 'todavía' }[key] || '';
}

/* Ventana en semanas para los gráficos de barras y el heatmap: nunca menos de 8 ni más
   de 26 columnas, para que el gráfico se vea siempre parecido. */
export const PROG_WMIN = 8, PROG_WMAX = 26;

export function progWeekWindow(per, dates) {
  const curMon = mondayOf(todayD());
  const wks = (from) => Math.round((curMon - mondayOf(parseISO(from))) / (7 * 86400000)) + 1;
  let n;
  const start = progStart(per);
  if (start) n = wks(start);
  else {
    const first = (dates || []).filter(Boolean).sort()[0];
    n = first ? wks(first) : PROG_WMIN;
  }
  n = Math.max(PROG_WMIN, Math.min(PROG_WMAX, n || PROG_WMIN));
  return { from: addDays(curMon, -(n - 1) * 7), weeks: n };
}

/* Los "baldes" del gráfico de cumplimiento: un día por barra en semana/mes, una semana
   por barra en año, un mes por barra en todo. Nunca incluye días futuros. */
export function progHabitBuckets(state, per) {
  const t = todayD(), tISO = todayISO();
  const dayList = (from, n) => {
    const out = [];
    for (let i = 0; i < n; i++) { const d = iso(addDays(from, i)); if (d <= tISO) out.push(d); }
    return out;
  };

  if (per === 'semana' || per === 'mes') {
    const n = per === 'semana' ? 7 : 30;
    return Array.from({ length: n }, (_, i) => {
      const d = addDays(t, -(n - 1 - i));
      return { label: String(d.getDate()), days: [iso(d)] };
    });
  }

  if (per === 'ano') {
    const curMon = mondayOf(t);
    return Array.from({ length: 52 }, (_, i) => {
      const m = addDays(curMon, -(51 - i) * 7);
      return { label: m.getDate() + '/' + (m.getMonth() + 1), days: dayList(m, 7) };
    });
  }

  const first = habitFirstISO(state);
  if (!first) return [];
  const f = parseISO(first);
  const out = [];
  let y = f.getFullYear(), m = f.getMonth();
  while (y < t.getFullYear() || (y === t.getFullYear() && m <= t.getMonth())) {
    const days = new Date(y, m + 1, 0).getDate();
    out.push({ label: MONTHS[m].slice(0, 3), days: dayList(new Date(y, m, 1), days) });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

// % de cumplimiento de un balde: marcas hechas / marcas posibles. null = no hay con qué.
export function bucketPct(state, days) {
  const poss = habitDayPossible(state);
  if (!poss || !days.length) return null;
  const marks = days.reduce((a, d) => a + habitDayMarks(state, d), 0);
  return marks / (poss * days.length);
}

/* Progreso del día que muestra la pantalla Hoy. Mezcla dos cosas en la misma barra:
   tareas del día completadas y marcas de hábitos. Estaba dentro de viewHoy(); acá sale
   como función pura para poder testearla. */
export function dayProgress(state, dISO) {
  const tareas = tareasDe(state, dISO);
  const done = tareas.filter((x) => x.done).length + habitDayMarks(state, dISO);
  const total = tareas.length + habitDayPossible(state);
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}
