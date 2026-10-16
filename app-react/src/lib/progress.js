/* ----------------------------- PROGRESO -----------------------------
   Port de la parte de cálculo de app/js/progreso.js, más el progreso del día que vivía
   dentro de viewHoy(). Todo esto es solo lectura: Progreso no guarda nada. */
import { addDays, dow, iso, mondayOf, parseISO, todayD, todayISO, MONTHS } from './dates';
import { habitDayMarks, habitDayPossible, habitFirstISO } from './habits';
import { tareasDe } from './agenda';
import { ABS_TYPE, allTypes, gymGimnasio, gymHistory, gymSessions, typeColor } from './gym';
import { C } from './theme';

// [clave, etiqueta]. El inicio de cada ventana lo calcula progStart(), más abajo.
export const PROG_PERIODS = [['semana', 'Semana'], ['mes', 'Mes'], ['3m', '3 meses'], ['6m', '6 meses'], ['ano', 'Año'], ['todo', 'Todo']];

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
    // 3 y 6 meses (rediseño Nocturne): 3 meses son 13 semanas completas (como "Mes", más largo);
    case '3m': return iso(addDays(mondayOf(t), -12 * 7));                // 13 semanas completas, contando la actual
    case '6m': return iso(new Date(t.getFullYear(), t.getMonth() - 5, 1));
    case 'ano': return iso(new Date(t.getFullYear(), t.getMonth() - 11, 1));
    default: return null;                                         // 'todo'
  }
}

export function progLabel(key) { return periodOf(key)[1]; }

export function inPeriod(dISO, startISO) { return !startISO || dISO >= startISO; }

export function progPeriodNote(key) {
  return { semana: 'esta semana', mes: 'en las últimas 4 semanas', '3m': 'en los últimos 3 meses', '6m': 'en los últimos 6 meses', ano: 'en los últimos 12 meses', todo: 'todavía' }[key] || '';
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

/* Ventana del mapa de entrenamientos, pedido explícito: tiene que medir lo MISMO que
   "Cómo venís" para el período elegido (antes usaba progWeekWindow(), con su propio
   recorte de 8-26 semanas — "semana" quedaba estirada a 8 y "año" recortada a 26, ninguna
   de las dos coincidía). Arranca en el lunes de la primera columna de comoVenisColumns()
   y llega hasta hoy: para 'semana'/'mes' es exactamente la misma ventana (ya empiezan en
   lunes); para 'año'/'todo', cuyas columnas son meses/trimestres, se redondea al lunes de
   esa semana para no partir una semana del heatmap por la mitad — unos días de más antes
   del inicio real, nunca de menos. progWeekWindow() queda igual (otros usos, comparación
   con vanilla). */
export function progHeatmapWindow(per) {
  const { cols } = comoVenisColumns(per);
  const curMon = mondayOf(todayD());
  const from = mondayOf(parseISO(cols[0].from));
  const weeks = Math.round((curMon - from) / (7 * 86400000)) + 1;
  return { from, weeks };
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
//
// Exportada (ya no es privada de comoVenis()): progHeatmapWindow() la reusa para que el
// mapa de entrenamientos mida exactamente la misma ventana que "Cómo venís" en vez de su
// propio recorte de 8-26 semanas — pedido explícito: "todos los gráficos deben tomar la
// misma medida de tiempo que como venís".
export function comoVenisColumns(per) {
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
  if (per === '3m') {
    // 13 semanas, una columna por semana (rótulo: el domingo con que cierra, como "Mes").
    const curMon = mondayOf(t);
    const cols = Array.from({ length: 13 }, (_, i) => {
      const mon = addDays(curMon, (i - 12) * 7);
      const sun = addDays(mon, 6);
      return { from: iso(mon), to: iso(sun), label: `${sun.getDate()}/${sun.getMonth() + 1}` };
    });
    return { cols, current: 12, unit: 'semana', unitPl: 'semanas', winLabel: 'Últimos 3 meses' };
  }
  if (per === '6m') {
    // Una columna por mes de calendario, con el nombre abreviado.
    const cols = Array.from({ length: 6 }, (_, i) => {
      const m = new Date(t.getFullYear(), t.getMonth() - (5 - i), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return { from: iso(m), to: iso(end), label: MONTHS[m.getMonth()].slice(0, 3) };
    });
    return { cols, current: 5, unit: 'mes', unitPl: 'meses', winLabel: 'Últimos 6 meses' };
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
// Exportada: "Cómo comés" (lib/meals.js) la reusa para que sus tiles hablen el mismo
// idioma que "Cómo venís" en vez de inventar sus propias abreviaturas.
export const UNIT_ABBR = { día: 'día', semana: 'sem', mes: 'mes', trimestre: 'trim' };

/* Regularidad por músculo (pedido explícito, segunda vuelta: "buscale otro termino a cada
   regularidad" — 4 de 4 columnas activas = Regular, 3 de 4 = Aceptable, 2 de 4 =
   Irregular, 1 de 4 = Insuficiente). Para ventanas con más de 4 columnas (semana: hasta 7,
   año: 12, todo: 6) se generaliza por proporción: activas/vigentes se multiplica por 4 y
   se redondea, así "9 de 11" sigue cayendo en el mismo balde que "4 de 4" en vez de
   necesitar que sean TODAS para contar como Regular.

   Tercera vuelta, pedido explícito ("el seguimiento en como vas tambien debe tomar esta
   semana"): la columna ACTUAL entra en la cuenta, ya no se excluye. Antes se dejaba
   afuera porque "está en curso, todavía no terminó de contarse" — pero eso hacía que un
   2/4 real (contando esta semana) no se viera como Irregular hasta que la semana
   terminara. "Vigentes" (antes "previas") son todas las columnas no futuras, INCLUIDA la
   actual — la única excepción sigue siendo 'semana', donde los días después de hoy son
   futuro de verdad (todavía no pasaron) y ahí sí se excluyen. */
const REGULARIDAD = {
  4: { label: 'REGULAR', color: C.green },
  3: { label: 'ACEPTABLE', color: C.teal },
  2: { label: 'IRREGULAR', color: C.amber },
  1: { label: 'INSUFICIENTE', color: C.danger },
};

// Exportada: "Cómo comés" (lib/meals.js, seguimiento de adherencia al plan de comidas) la
// reusa tal cual para que las dos pantallas midan la regularidad con la misma vara —
// mismos 4 baldes, mismo redondeo proporcional. `activas`/`vigentes` tienen el mismo
// significado que acá arriba (columnas con algo adentro / columnas no futuras).
export function regularidadPorRatio(activas, vigentes) {
  return REGULARIDAD[Math.min(4, Math.max(1, Math.round((activas / vigentes) * 4)))];
}

export function comoVenis(state, per) {
  const { cols, current, unit, unitPl, winLabel } = comoVenisColumns(per);
  const unitAbbr = UNIT_ABBR[unit] || unit;
  const hist = gymHistory(state);
  const tipos = allTypes(state).filter((x) => !x.rest).map((x) => ({ name: x.name, color: x.color }))
    .concat([{ name: ABS_TYPE, color: typeColor(state, ABS_TYPE) }]);
  const tISO = todayISO();

  // Semanas que abarca la ventana completa (incluida la columna actual): la base de
  // "veces por semana" de ProgWeeklyFreq — pedido explícito, tabla NUEVA y separada de
  // "Cómo venís" ("quiero una tabla de frecuencia semanal de cada cosa, es decir, la
  // cantidad de veces por semana"). No es lo mismo que `avg` de cada fila (que promedia
  // por COLUMNA de la matriz — un día en 'semana', un mes en 'año' — no por semana).
  const desde = cols[0].from, hasta = cols[cols.length - 1].to;
  const semanasVentana = ((parseISO(hasta) - parseISO(desde)) / 86400000 + 1) / 7;

  const rows = tipos.map((t) => {
    const counts = hist.filter((x) => x.type === t.name).reduce((acc, x) => { acc[x.date] = (acc[x.date] || 0) + 1; return acc; }, {});
    const cells = cols.map((c, i) => {
      const futuro = per === 'semana' && c.from > tISO;
      if (futuro) return { v: 0, futuro: true, current: i === current };
      const v = Object.keys(counts).filter((d) => d >= c.from && d <= c.to).reduce((a, d) => a + counts[d], 0);
      return { v, futuro: false, current: i === current };
    });
    const total = cells.reduce((a, c) => a + (c.futuro ? 0 : c.v), 0);
    const vigentes = cells.filter((c) => !c.futuro);
    let trail = 0;
    for (let i = vigentes.length - 1; i >= 0 && vigentes[i].v === 0; i--) trail++;
    const allOn = vigentes.length > 0 && vigentes.every((c) => c.v > 0);
    const activas = vigentes.filter((c) => c.v > 0).length;

    // `activas === 0` y `!total` son lo mismo (total suma exactamente las vigentes), pero
    // se deja `activas` porque es la cuenta que ya hace falta para el ratio de abajo.
    const status = activas === 0
      ? { label: 'SIN ENTRENAR', color: C.danger }
      : regularidadPorRatio(activas, vigentes.length);

    return {
      ...t, cells, total, trail, allOn, vigentes: vigentes.length, activas,
      avg: vigentes.length ? (vigentes.reduce((a, c) => a + c.v, 0) / vigentes.length) : 0,
      rate: total / semanasVentana,
      status,
    };
  });

  /* OJO: `totalGeneral` NO es la suma de las filas. Las filas cuentan MÚSCULOS (un turno
     de bícep + tríceps + hombro suma 1 en cada una de las tres), y "ENTRENOS" tiene que
     decir cuántas veces entrenaste — ese mismo turno es UN entreno. Por eso sale de
     gymSessions(), no de sumar la matriz. Tampoco cuenta abs (pedido explícito: "los
     abdominales no cuentan como entrenamientos") — eso ya lo filtra gymSessions(). */
  const totalGeneral = gymSessions(state).filter((s) => s.date >= desde && s.date <= hasta).length;
  const nC = cols.length;
  // "Gimnasio": las veces que se fue de verdad, sin fútbol ni cardio (ver gymGimnasio).
  const gimnasio = gymGimnasio(state).filter((x) => x.date >= desde && x.date <= hasta).length;
  const activeCols = cols.filter((c, i) => !c.futuro && tipos.some((t) => rows.find((r) => r.name === t.name).cells[i].v > 0)).length;
  const absRow = rows.find((r) => r.name === ABS_TYPE);
  const stats = per === 'semana'
    ? [
      { k: 'ENTRENOS', v: String(totalGeneral) },
      { k: 'GIMNASIO', v: String(gimnasio) },
      { k: 'DÍAS ACTIVOS', v: `${activeCols}/${current + 1}` },
      { k: 'ABS', v: absRow.cells[current]?.v || absRow.total ? 'Hecho' : 'Falta' },
    ]
    : [
      { k: 'ENTRENOS', v: String(totalGeneral) },
      { k: 'GIMNASIO', v: `${gimnasio} · ${(gimnasio / nC).toFixed(1).replace('.', ',')}/${unitAbbr}` },
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
      : { icon: '!', text: `Abs: ${absRow.activas} de ${absRow.vigentes} ${unitPl}`, color: C.amber });
    const top = rows.slice().sort((a, b) => b.total - a.total)[0];
    if (top && top.total) alerts.push({ icon: '↑', text: `Lo que más entrenaste: ${top.name} (${top.total})`, color: C.teal });
  }

  return { winLabel, unit, unitAbbr, unitPl, cols, current, rows, stats, alerts };
}

/* ----------------------------- ÚLTIMO ENTRENO POR MÚSCULO -----------------------------
   Rediseño Nocturne ("Último entreno"): en vez de "cuántas veces por semana", cuándo fue la
   última vez de cada músculo. Mira SIEMPRE las dos semanas anteriores y la actual (no
   depende del período elegido arriba: es "cómo estoy ahora"), un día por casillero, y
   ordena por lo que hace más tiempo que no se entrena — lo que no aparece en esas tres
   semanas va primero, porque es lo más urgente.

   `ago` son los días desde el último entrenamiento DENTRO de la ventana (0 = hoy), o null
   si no hubo ninguno en esas tres semanas. */
export function lastTrained(state) {
  const t = todayD(), tISO = todayISO();
  const curMon = mondayOf(t);
  const mondays = [addDays(curMon, -14), addDays(curMon, -7), curMon];
  const hist = gymHistory(state);
  const tipos = allTypes(state).filter((x) => !x.rest).map((x) => ({ name: x.name, color: x.color }))
    .concat([{ name: ABS_TYPE, color: typeColor(state, ABS_TYPE) }]);

  const rows = tipos.map((tp) => {
    const fechas = new Set(hist.filter((h) => h.type === tp.name).map((h) => h.date));
    const weeks = mondays.map((mon) => Array.from({ length: 7 }, (_, i) => {
      const d = iso(addDays(mon, i));
      return { dISO: d, done: fechas.has(d), future: d > tISO, today: d === tISO };
    }));
    const ult = [...fechas].filter((d) => d >= iso(mondays[0]) && d <= tISO).sort().pop() ?? null;
    const ago = ult ? Math.round((t - parseISO(ult)) / 86400000) : null;
    return { ...tp, weeks, ago };
  });

  // Primero lo que no se entrenó en las tres semanas, después de más viejo a más nuevo.
  rows.sort((a, b) => (b.ago ?? 1e9) - (a.ago ?? 1e9));
  const weekHeads = mondays.map((m, i) => ({ label: i === 2 ? 'ESTA SEMANA' : `${m.getDate()}/${m.getMonth() + 1}`, current: i === 2 }));
  return { rows, weekHeads, from: iso(mondays[0]), winLabel: 'Últimas 3 semanas' };
}
