/* ----------------------------- PROGRESO -----------------------------
   Port de la parte de cálculo de app/js/progreso.js, más el progreso del día que vivía
   dentro de viewHoy(). Todo esto es solo lectura: Progreso no guarda nada. */
import { addDays, dow, iso, mondayOf, parseISO, todayD, todayISO, MONTHS } from './dates';
import { habitDayMarks, habitDayPossible, habitFirstISO } from './habits';
import { tareasDe } from './agenda';
import { ABS_TYPE, allTypes, gymHistory, gymSessions, typeColor } from './gym';
import { C } from './theme';

// [clave, etiqueta]. El inicio de cada ventana lo calcula progStart(), más abajo.
export const PROG_PERIODS = [['semana', 'Semana'], ['mes', 'Mes'], ['ano', 'Año'], ['todo', 'Todo']];

function periodOf(key) { return PROG_PERIODS.find((x) => x[0] === key) || PROG_PERIODS[1]; }

/* Primer día de la ventana, o null para "todo".

   Las ventanas están ALINEADAS AL CALENDARIO, no son móviles (pedido explícito de Lulo):
   "Semana" es ESTA semana —de lunes a domingo, no los últimos 7 días corridos—, "Mes" son
   las últimas 4 semanas completas contando la actual, y "Año" son los últimos 12 meses
   desde el 1º del mes. Antes eran ventanas móviles (7/30/365 días hacia atrás), que daban
   números distintos a los de "Cómo venís" —que siempre fue por semanas de lunes— para el
   mismo período elegido. Ahora las dos cosas miden lo mismo.

   Las semanas arrancan el lunes en toda la app: es la misma mondayOf() que indexa
   gym.weekPlans, así que "la semana del 5" es exactamente la del plan semanal. */
export function progStart(key) {
  const t = todayD();
  switch (periodOf(key)[0]) {
    case 'semana': return iso(mondayOf(t));
    case 'mes': return iso(addDays(mondayOf(t), -21));           // esta semana + las 3 anteriores
    case 'ano': return iso(new Date(t.getFullYear(), t.getMonth() - 11, 1));
    default: return null;                                         // 'todo'
  }
}

export function progLabel(key) { return periodOf(key)[1]; }

export function inPeriod(dISO, startISO) { return !startISO || dISO >= startISO; }

export function progPeriodNote(key) {
  return { semana: 'esta semana', mes: 'en las últimas 4 semanas', ano: 'en los últimos 12 meses', todo: 'todavía' }[key] || '';
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

/* ============================================================================
   "CÓMO VENÍS" (rediseño "Glass + aurora", sin equivalente en vanilla ni en etapas
   anteriores — handoff Glass Progreso v2.dc.html, sección que el propio handoff marca
   como "lo más importante" de la pantalla). Matriz tipo × columna (semana/mes/año/
   trimestre, la MISMA ventana que ya elige PeriodSelector) con intensidad por cantidad y
   un estado por tipo que mira todas las columnas MENOS la actual (está en curso, todavía
   no terminó de contarse).
   ============================================================================ */

// Las columnas de la matriz para un período: cada una es un rango [from, to] de fechas
// ISO (inclusive) más una etiqueta corta. La última columna es siempre "la actual" —
// salvo en 'semana', donde el día en curso es HOY y los días después quedan en blanco
// (todavía no pasaron, no es que no se entrenó).
function comoVenisColumns(per) {
  const t = todayD();
  if (per === 'semana') {
    const mon = mondayOf(t);
    const cols = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mon, i);
      return { from: iso(d), to: iso(d), label: DOW_1[i] };
    });
    return { cols, current: dow(t), unit: 'día', unitPl: 'días', winLabel: 'Esta semana' };
  }
  if (per === 'mes') {
    const curMon = mondayOf(t);
    const cols = Array.from({ length: 4 }, (_, i) => {
      const mon = addDays(curMon, (i - 3) * 7);
      const sun = addDays(mon, 6);
      return { from: iso(mon), to: iso(sun), label: `${sun.getDate()}/${sun.getMonth() + 1}` };
    });
    return { cols, current: 3, unit: 'semana', unitPl: 'semanas', winLabel: 'Últimas 4 semanas' };
  }
  if (per === 'ano') {
    const cols = Array.from({ length: 12 }, (_, i) => {
      const m = new Date(t.getFullYear(), t.getMonth() - (11 - i), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return { from: iso(m), to: iso(end), label: MONTHS[m.getMonth()][0] };
    });
    return { cols, current: 11, unit: 'mes', unitPl: 'meses', winLabel: 'Últimos 12 meses' };
  }
  // 'todo': últimos 6 trimestres de calendario.
  const curQ = Math.floor(t.getMonth() / 3);
  const cols = Array.from({ length: 6 }, (_, i) => {
    const qIndex = t.getFullYear() * 4 + curQ - (5 - i);
    const y = Math.floor(qIndex / 4), q = qIndex % 4;
    const start = new Date(y, q * 3, 1);
    const end = new Date(y, q * 3 + 3, 0);
    return { from: iso(start), to: iso(end), label: `T${q + 1}·${String(y).slice(2)}` };
  });
  return { cols, current: 5, unit: 'trimestre', unitPl: 'trimestres', winLabel: 'Últimos 6 trimestres' };
}
const DOW_1 = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Unidad abreviada para los números apretados (tiles, promedio por fila): "semana" no
// entra en una tile de 20px, "sem" sí. La prosa de los avisos usa la palabra completa.
const UNIT_ABBR = { día: 'día', semana: 'sem', mes: 'mes', trimestre: 'trim' };

export function comoVenis(state, per) {
  const { cols, current, unit, unitPl, winLabel } = comoVenisColumns(per);
  const unitAbbr = UNIT_ABBR[unit] || unit;
  const hist = gymHistory(state);
  const tipos = allTypes(state).filter((x) => !x.rest).map((x) => ({ name: x.name, color: x.color }))
    .concat([{ name: ABS_TYPE, color: typeColor(state, ABS_TYPE) }]);
  const tISO = todayISO();

  const rows = tipos.map((t) => {
    const counts = hist.filter((x) => x.type === t.name).reduce((acc, x) => { acc[x.date] = (acc[x.date] || 0) + 1; return acc; }, {});
    const cells = cols.map((c, i) => {
      const futuro = per === 'semana' && c.from > tISO;
      if (futuro) return { v: 0, futuro: true, current: i === current };
      const v = Object.keys(counts).filter((d) => d >= c.from && d <= c.to).reduce((a, d) => a + counts[d], 0);
      return { v, futuro: false, current: i === current };
    });
    const total = cells.reduce((a, c) => a + (c.futuro ? 0 : c.v), 0);
    const previas = cells.filter((c) => !c.current && !c.futuro);
    let trail = 0;
    for (let i = previas.length - 1; i >= 0 && previas[i].v === 0; i--) trail++;
    const allOn = previas.length > 0 && previas.every((c) => c.v > 0);

    let status;
    if (previas.length === 0) status = { label: 'SIN DATOS', color: 'rgba(242,244,248,.4)' };
    else if (!total) status = { label: 'SIN ENTRENAR', color: C.danger };
    else if (trail >= 2) status = { label: `SIN HACER ${trail} ${unitAbbr.toUpperCase()}${trail > 1 ? 'S' : ''}`, color: C.amber };
    else if (allOn) status = { label: 'CONSTANTE', color: C.green };
    else status = { label: 'IRREGULAR', color: 'rgba(242,244,248,.5)' };

    return { ...t, cells, total, trail, allOn, previas: previas.length, avg: previas.length ? (previas.reduce((a, c) => a + c.v, 0) / previas.length) : 0, status };
  });

  /* OJO: `totalGeneral` NO es la suma de las filas. Las filas cuentan MÚSCULOS (un turno
     de bícep + tríceps + hombro suma 1 en cada una de las tres), y "ENTRENOS" tiene que
     decir cuántas veces entrenaste — ese mismo turno es UN entreno. Por eso sale de
     gymSessions(), no de sumar la matriz. */
  const desde = cols[0].from, hasta = cols[cols.length - 1].to;
  const totalGeneral = gymSessions(state).filter((s) => s.date >= desde && s.date <= hasta).length;
  const nC = cols.length;
  const activeCols = cols.filter((c, i) => !c.futuro && tipos.some((t) => rows.find((r) => r.name === t.name).cells[i].v > 0)).length;
  const absRow = rows.find((r) => r.name === ABS_TYPE);
  const stats = per === 'semana'
    ? [
      { k: 'ENTRENOS', v: String(totalGeneral) },
      { k: 'DÍAS ACTIVOS', v: `${activeCols}/${current + 1}` },
      { k: 'ABS', v: absRow.cells[current]?.v || absRow.total ? 'Hecho' : 'Falta' },
    ]
    : [
      { k: 'ENTRENOS', v: String(totalGeneral) },
      { k: 'PROMEDIO', v: `${(totalGeneral / nC).toFixed(1).replace('.', ',')}/${unitAbbr}` },
      { k: 'ABS', v: `${absRow.cells.filter((c) => !c.futuro && c.v > 0).length}/${nC} ${unitAbbr}` },
    ];

  const alerts = [];
  if (per === 'semana') {
    const pend = rows.filter((r) => r.name !== ABS_TYPE && r.total === 0).map((r) => r.name);
    if (pend.length) alerts.push({ icon: '!', text: `Pendiente esta semana: ${pend.join(', ')}`, color: C.amber });
    alerts.push(absRow.total
      ? { icon: '✓', text: 'Abs ya marcado esta semana', color: C.green }
      : { icon: '!', text: 'Todavía no hiciste abs esta semana', color: C.amber });
  } else {
    rows.forEach((r) => {
      if (!r.total) alerts.push({ icon: '×', text: `No entrenaste ${r.name} en este período`, color: C.danger });
      else if (r.trail >= 2) alerts.push({ icon: '!', text: `${r.name}: ${r.trail} ${unitPl} seguidas sin entrenar`, color: C.amber });
    });
    alerts.push(absRow.allOn
      ? { icon: '✓', text: `Abs: todas las ${unitPl} sin cortar`, color: C.green }
      : { icon: '!', text: `Abs: ${absRow.previas ? absRow.cells.filter((c) => !c.current && !c.futuro && c.v > 0).length : 0} de ${absRow.previas} ${unitPl}`, color: C.amber });
    const top = rows.slice().sort((a, b) => b.total - a.total)[0];
    if (top && top.total) alerts.push({ icon: '↑', text: `Lo que más entrenaste: ${top.name} (${top.total})`, color: C.teal });
  }

  return { winLabel, unit, unitAbbr, unitPl, cols, current, rows, stats, alerts };
}
