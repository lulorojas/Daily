import { beforeAll, describe, expect, it, vi } from 'vitest';
import { clone, loadVanilla } from '../test/vanilla';
import { emptyDoc, fullDoc, weirdDocs, TODAY, YESTERDAY, TOMORROW, ago, thisMonday } from '../test/fixtures';

import { normalize, seed } from '../lib/model';
import * as dates from '../lib/dates';
import * as agenda from '../lib/agenda';
import * as habits from '../lib/habits';
import * as gym from '../lib/gym';
import * as progress from '../lib/progress';
import * as backup from '../lib/backup';
import * as items from '../lib/items';
import { monthCells } from '../lib/calendar';
import { addDays, todayD } from '../lib/dates';

/* ============================================================================
   TESTS DIFERENCIALES CONTRA LA APP VANILLA

   Acá no se compara contra números escritos a mano: se corre el código REAL de app/js/
   (el que está en producción) y el de app-react/src/lib/ sobre los mismos datos, y se
   exige que den exactamente lo mismo.

   Es la garantía más fuerte que se puede tener de que la migración no cambió el modelo.
   Si mañana alguien "mejora" una fórmula de un solo lado, estos tests se ponen rojos.
   ============================================================================ */

let V;
beforeAll(() => { V = loadVanilla(); });

// Le pone a la app vanilla un documento adelante y devuelve el que le quedó.
function withVanillaState(doc) {
  const s = V.normalize(clone(doc));
  V.setState(s);
  return s;
}

/* ---------------------------------------------------------------- normalize */
describe('normalize() da lo mismo en las dos implementaciones', () => {
  const docs = weirdDocs();

  it.each(Object.keys(docs))('%s', (nombre) => {
    const entrada = docs[nombre];
    expect(normalize(clone(entrada))).toEqual(V.normalize(clone(entrada)));
  });

  it('seed() también arranca igual', () => {
    expect(normalize(seed())).toEqual(V.normalize(V.seed()));
  });
});

describe('normalize() conserva lo que no conoce', () => {
  it('no borra los campos de la migración desde daily.v1', () => {
    const doc = { v: 2, items: [], migratedFrom: 'daily.v1', migratedAt: '2024-03-01T10:00:00.000Z' };
    const out = normalize(doc);
    expect(out.migratedFrom).toBe('daily.v1');
    expect(out.migratedAt).toBe('2024-03-01T10:00:00.000Z');
    expect(out).toEqual(V.normalize(clone(doc)));
  });

  it('no borra un campo que esta versión todavía no conoce', () => {
    const out = normalize({ v: 2, campoDelFuturo: { a: 1 } });
    expect(out.campoDelFuturo).toEqual({ a: 1 });
  });

  it('a diferencia de vanilla, NO modifica el objeto que recibe', () => {
    const entrada = { habits: [{ id: 'h', name: 'x' }], habitLog: { '2024-01-01': { h: 0 } } };
    const copia = clone(entrada);
    normalize(entrada);
    expect(entrada).toEqual(copia);

    // La versión vanilla sí lo muta: por eso el store de React clona antes de tocar nada.
    const paraVanilla = clone(entrada);
    V.normalize(paraVanilla);
    expect(paraVanilla).not.toEqual(copia);
  });
});

/* ------------------------------------------------- ida y vuelta entre apps */
describe('un documento puede ir y volver entre las dos versiones', () => {
  const docs = weirdDocs();

  it.each(Object.keys(docs))('vanilla lee sin cambiar nada lo que escribe React: %s', (nombre) => {
    const escritoPorReact = normalize(clone(docs[nombre]));
    // Si vanilla al leerlo lo dejara distinto, se estaría perdiendo o mutando algo.
    expect(V.normalize(clone(escritoPorReact))).toEqual(escritoPorReact);
  });

  it.each(Object.keys(docs))('React lee sin cambiar nada lo que escribe vanilla: %s', (nombre) => {
    const escritoPorVanilla = V.normalize(clone(docs[nombre]));
    expect(normalize(clone(escritoPorVanilla))).toEqual(escritoPorVanilla);
  });

  it('cinco vueltas alternando implementaciones no derivan', () => {
    let doc = fullDoc();
    for (let i = 0; i < 5; i++) {
      doc = normalize(clone(doc));
      doc = V.normalize(clone(doc));
    }
    expect(doc).toEqual(normalize(fullDoc()));
  });
});

/* ---------------------------------------------------------------- fechas */
describe('fechas', () => {
  const muestras = [new Date(2026, 0, 1), new Date(2026, 7, 10), new Date(2025, 11, 31), new Date(2024, 1, 29), new Date(2026, 4, 3)];

  it.each(muestras)('iso(%s)', (d) => expect(dates.iso(d)).toBe(V.iso(d)));
  it.each(muestras)('dow(%s)', (d) => expect(dates.dow(d)).toBe(V.dow(d)));
  it.each(muestras)('mondayOf(%s)', (d) => expect(dates.iso(dates.mondayOf(d))).toBe(V.iso(V.mondayOf(d))));

  it('iso() usa hora local, no UTC (un hábito marcado a las 23 hs cae en el día correcto)', () => {
    const tarde = new Date(2026, 7, 10, 23, 30);
    expect(dates.iso(tarde)).toBe('2026-08-10');
    expect(dates.iso(tarde)).toBe(V.iso(tarde));
  });

  const isos = ['2026-08-10', '2026-01-01', '2025-12-31', '2024-02-29'];
  it.each(isos)('shortDate(%s)', (s) => expect(dates.shortDate(s)).toBe(V.shortDate(s)));
  it.each(isos)('fmtDateLong(%s)', (s) => expect(dates.fmtDateLong(s)).toBe(V.fmtDateLong(s)));
  it.each([0, 1, 2.5, 72.5, 100, 0.1, -3.25])('fmtNum(%s)', (n) => expect(dates.fmtNum(n)).toBe(V.fmtNum(n)));
  it.each([[-7], [-1], [0], [1], [30], [365]])('addDays(hoy, %i)', (n) => {
    expect(dates.iso(dates.addDays(dates.todayD(), n))).toBe(V.iso(V.addDays(V.todayD(), n)));
  });
});

/* ---------------------------------------------------------------- agenda */
describe('agenda', () => {
  const doc = fullDoc();
  const dias = [TODAY, YESTERDAY, TOMORROW, ago(40), ago(3)];

  it.each(dias)('tareasDe(%s)', (d) => {
    const s = withVanillaState(doc);
    expect(agenda.tareasDe(normalize(doc), d)).toEqual(V.tareasDe(d));
    expect(s).toBeTruthy();
  });

  it.each(dias)('agendaDe(%s)', (d) => {
    withVanillaState(doc);
    expect(agenda.agendaDe(normalize(doc), d)).toEqual(V.agendaDe(d));
  });

  it.each(dias)('itemsDe(%s)', (d) => {
    withVanillaState(doc);
    expect(agenda.itemsDe(normalize(doc), d)).toEqual(V.itemsDe(d));
  });

  it('pendientes()', () => {
    withVanillaState(doc);
    expect(agenda.pendientes(normalize(doc))).toEqual(V.pendientes());
  });

  it('pendVisible(): una pendiente completada solo se ve el día que se marcó', () => {
    const t = { done: true, doneAt: YESTERDAY };
    for (const d of [TODAY, YESTERDAY, TOMORROW]) {
      expect(agenda.pendVisible(t, d)).toBe(V.pendVisible(t, d));
    }
  });

  it.each(dias)('entrenoDe(%s)', (d) => {
    withVanillaState(doc);
    expect(agenda.entrenoDe(normalize(doc), d)).toEqual(V.entrenoDe(d));
  });

  it('la fecha anual cae por mes+día, sin importar el año', () => {
    withVanillaState(doc);
    const react = agenda.agendaDe(normalize(doc), TODAY).map((x) => x.title);
    expect(react).toContain('Cumple de Ana');
    expect(react).toEqual(V.agendaDe(TODAY).map((x) => x.title));
  });
});

/* ---------------------------------------------------------------- hábitos */
describe('hábitos', () => {
  const doc = fullDoc();
  const dias = [TODAY, ago(1), ago(2), ago(3), ago(9), ago(20), TOMORROW];

  it.each(dias)('habitDayMarks(%s)', (d) => {
    withVanillaState(doc);
    expect(habits.habitDayMarks(normalize(doc), d)).toBe(V.habitDayMarks(d));
  });

  it.each(dias)('habitDoneCount(%s)', (d) => {
    withVanillaState(doc);
    expect(habits.habitDoneCount(normalize(doc), d)).toBe(V.habitDoneCount(d));
  });

  it('habitDayPossible()', () => {
    withVanillaState(doc);
    expect(habits.habitDayPossible(normalize(doc))).toBe(V.habitDayPossible());
  });

  it('habitFirstISO()', () => {
    withVanillaState(doc);
    expect(habits.habitFirstISO(normalize(doc))).toBe(V.habitFirstISO());
  });

  it.each(['h1', 'h2'])('habitStreak(%s) — racha actual', (id) => {
    withVanillaState(doc);
    expect(habits.habitStreak(normalize(doc), id)).toBe(V.habitStreak(id));
  });

  it.each(['h1', 'h2'])('habitBestStreak(%s) — récord', (id) => {
    withVanillaState(doc);
    expect(habits.habitBestStreak(normalize(doc), id)).toBe(V.habitBestStreak(id));
  });

  it('la racha no se corta porque hoy todavía no marcaste', () => {
    // h2 está completo ayer, anteayer y hace 3 días, pero hoy también: se saca hoy a mano.
    const sinHoy = fullDoc();
    delete sinHoy.habitLog[TODAY];
    withVanillaState(sinHoy);
    const react = normalize(sinHoy);
    expect(habits.habitStreak(react, 'h2')).toBe(V.habitStreak('h2'));
    expect(habits.habitStreak(react, 'h2')).toBeGreaterThan(0);
  });

  it('un hábito multi-check solo cuenta el día si llegó a todas las marcas', () => {
    withVanillaState(doc);
    const react = normalize(doc);
    // h1 tiene timesPerDay 3 y hoy va 2 de 3.
    expect(habits.habitDone(react, 'h1', TODAY)).toBe(false);
    expect(habits.habitDone(react, 'h1', TODAY)).toBe(V.habitDone('h1', TODAY));
    expect(habits.habitDone(react, 'h1', ago(1))).toBe(V.habitDone('h1', ago(1)));
  });
});

/* ---------------------------------------------------------------- gimnasio */
describe('gimnasio', () => {
  const doc = fullDoc();

  it('gymHistory() — mismas sesiones y en el mismo orden', () => {
    withVanillaState(doc);
    expect(gym.gymHistory(normalize(doc))).toEqual(V.gymHistory());
  });

  it('un día de Descanso marcado no cuenta como entrenamiento', () => {
    withVanillaState(doc);
    expect(gym.gymHistory(normalize(doc)).some((x) => x.type === 'Descanso')).toBe(false);
  });

  it('gymRanking()', () => {
    withVanillaState(doc);
    const hist = gym.gymHistory(normalize(doc));
    expect(gym.gymRanking(hist)).toEqual(V.gymRanking(V.gymHistory()));
  });

  it('gymWeekCounts()', () => {
    withVanillaState(doc);
    expect(gym.gymWeekCounts(gym.gymHistory(normalize(doc)))).toEqual(V.gymWeekCounts(V.gymHistory()));
  });

  it('gymTypeStreaks() — rachas por tipo, en semanas', () => {
    withVanillaState(doc);
    expect(gym.gymTypeStreaks(normalize(doc))).toEqual(V.gymTypeStreaks());
  });

  it.each([null, ago(15), ago(7), ago(1)])('liftGains(desde %s)', (start) => {
    withVanillaState(doc);
    expect(gym.liftGains(normalize(doc), start)).toEqual(V.liftGains(start));
  });

  it('liftGains() ordena el historial por fecha aunque se haya cargado desordenado', () => {
    withVanillaState(doc);
    const react = gym.liftGains(normalize(doc), null).find((g) => g.id === 'l3');
    expect(react.from).toBe(90);
    expect(react.to).toBe(100);
    expect(react).toEqual(V.liftGains(null).find((g) => g.id === 'l3'));
  });

  it('bodyList() — del más viejo al más nuevo', () => {
    withVanillaState(doc);
    expect(gym.bodyList(normalize(doc))).toEqual(V.bodyList());
  });

  it('allTypes() y typeColor()', () => {
    withVanillaState(doc);
    const react = normalize(doc);
    expect(gym.allTypes(react)).toEqual(V.allTypes());
    for (const n of ['Pecho', 'Espalda', 'Descanso', 'No existe']) {
      expect(gym.typeColor(react, n)).toBe(V.typeColor(n));
    }
  });

  it('weekOf() y weekKey()', () => {
    expect(gym.weekOf(TODAY)).toBe(V.weekOf(TODAY));
    for (const off of [-2, -1, 0, 1]) expect(gym.weekKey(off)).toBe(V.weekKey(off));
  });

  it('weekPlanFor() devuelve el mismo plan que getWeekPlan()', () => {
    withVanillaState(doc);
    expect(gym.weekPlanFor(normalize(doc), 0)).toEqual(V.getWeekPlan(0));
  });

  it('para una semana sin plan, el contenido es el mismo (7 días de descanso)', () => {
    const vacio = withVanillaState(emptyDoc());
    expect(gym.weekPlanFor(normalize(emptyDoc()), 0)).toEqual(V.getWeekPlan(0));
    expect(vacio.gym.weekPlans[thisMonday]).toBeTruthy();   // vanilla la creó al leerla
  });

  it('la diferencia acordada: leer NO crea la semana en el documento de React', () => {
    const react = normalize(emptyDoc());
    gym.weekPlanFor(react, 0);
    expect(react.gym.weekPlans).toEqual({});

    // Y vanilla, leyendo ese documento sin la semana, la reconstruye igual.
    withVanillaState(react);
    expect(V.getWeekPlan(0)).toEqual(gym.emptyWeekPlan());
  });
});

/* ---------------------------------------------------------------- progreso */
describe('progreso', () => {
  const doc = fullDoc();
  const periodos = ['semana', 'mes', 'ano', 'todo'];

  it.each(periodos)('progStart(%s)', (p) => expect(progress.progStart(p)).toBe(V.progStart(p)));
  it.each(periodos)('progLabel(%s)', (p) => expect(progress.progLabel(p)).toBe(V.progLabel(p)));
  it.each(periodos)('progPeriodNote(%s)', (p) => expect(progress.progPeriodNote(p)).toBe(V.progPeriodNote(p)));

  it.each(periodos)('progWeekWindow(%s)', (p) => {
    withVanillaState(doc);
    const react = progress.progWeekWindow(p, [ago(60)]);
    const van = V.progWeekWindow(p, [ago(60)]);
    expect(react.weeks).toBe(van.weeks);
    expect(react.from.getTime()).toBe(van.from.getTime());
  });

  it.each(periodos)('progHabitBuckets(%s)', (p) => {
    withVanillaState(doc);
    expect(progress.progHabitBuckets(normalize(doc), p)).toEqual(V.progHabitBuckets(p));
  });

  it.each(periodos)('bucketPct() sobre los baldes de %s', (p) => {
    withVanillaState(doc);
    const react = normalize(doc);
    const buckets = progress.progHabitBuckets(react, p);
    const vanBuckets = V.progHabitBuckets(p);
    expect(buckets.map((b) => progress.bucketPct(react, b.days)))
      .toEqual(vanBuckets.map((b) => V.bucketPct(b.days)));
  });

  it('inPeriod()', () => {
    for (const [d, s] of [[TODAY, null], [TODAY, ago(7)], [ago(40), ago(7)], [ago(7), ago(7)]]) {
      expect(progress.inPeriod(d, s)).toBe(V.inPeriod(d, s));
    }
  });
});

/* ---------------------------------------------------------------- backup */
describe('backup', () => {
  it('el JSON exportado tiene el mismo encabezado', () => {
    const state = normalize(fullDoc());
    withVanillaState(fullDoc());
    const react = backup.backupPayload(state, '2026-08-10T12:00:00.000Z');
    const van = V.backupPayload();
    expect(react.app).toBe(van.app);
    expect(react.format).toBe(van.format);
    expect(react.data).toEqual(van.data);
  });

  const archivos = {
    'no es JSON': 'esto no es json {',
    'es un array': '[1,2,3]',
    'no es de Daily': JSON.stringify({ app: 'otra', format: 2, data: {} }),
    'sin format': JSON.stringify({ app: 'daily', data: {} }),
    'de otro formato': JSON.stringify({ app: 'daily', format: 1, data: {} }),
    'sin datos': JSON.stringify({ app: 'daily', format: 2 }),
    'sin items': JSON.stringify({ app: 'daily', format: 2, data: { habits: [], habitLog: {}, gym: {} } }),
    'sin hábitos': JSON.stringify({ app: 'daily', format: 2, data: { items: [], gym: {} } }),
    'sin gym': JSON.stringify({ app: 'daily', format: 2, data: { items: [], habits: [], habitLog: {} } }),
    'válido y mínimo': JSON.stringify({ app: 'daily', format: 2, data: { items: [], habits: [], habitLog: {}, gym: {} } }),
    'válido y completo': JSON.stringify({ app: 'daily', format: 2, exportedAt: '2026-01-01T00:00:00.000Z', data: fullDoc() }),
  };

  it.each(Object.keys(archivos))('validateBackup(): %s', (nombre) => {
    expect(backup.validateBackup(archivos[nombre])).toEqual(V.validateBackup(archivos[nombre]));
  });

  it('bkHasData()', () => {
    for (const doc of [emptyDoc(), fullDoc()]) {
      withVanillaState(doc);
      expect(backup.backupHasData(normalize(doc))).toBe(V.bkHasData());
    }
  });
});

/* ------------------------------------------------- pantallas de la etapa 3a */
/* Hoy y Calendario dejaron de ser dos funciones que escupen HTML y pasaron a ser
   componentes. En el camino, los textos y las cuentas que estaban ADENTRO de viewHoy() y
   viewCalendario() salieron a lib/. Estos tests comprueban que esa mudanza no cambió nada:
   se corre la función vieja (la que está en producción) y la nueva sobre lo mismo. */
describe('cabecera de Hoy', () => {
  const horas = [0, 5, 6, 12, 13, 19, 20, 23];

  it.each(horas)('saludo() a las %i hs da lo mismo en las dos', (h) => {
    /* Vanilla lee el reloj adentro de la función y no recibe parámetros, así que la única
       forma de compararlas es congelar el reloj del sistema para las dos. */
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 10, h, 30));
    try {
      expect(items.saludo()).toBe(V.saludo());
    } finally {
      vi.useRealTimers();
    }
  });

  const dias = [0, 1, -1, 3, -10, 40];
  it.each(dias)('dayTitle(hoy %+i)', (n) => {
    const d = addDays(todayD(), n);
    expect(items.dayTitle(d)).toBe(V.dayTitle(d));
  });
});

describe('grilla del calendario', () => {
  /* viewCalendario() calcula los huecos del principio y la cantidad de días con dos
     líneas sueltas adentro de la vista, así que no hay una función vanilla que llamar.
     Lo que se compara es el resultado contra esa misma cuenta hecha con las primitivas
     de la app vanilla (su dow() y su iso()), que es de donde salía. */
  const meses = [[2026, 7], [2026, 5], [2024, 1], [2026, 1], [2025, 11], [2027, 0]];

  it.each(meses)('%i-%i: huecos y días', (y, m) => {
    const lead = V.dow(new Date(y, m, 1));
    const total = new Date(y, m + 1, 0).getDate();
    const esperado = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: total }, (_, i) => ({ day: i + 1, dISO: V.iso(new Date(y, m, i + 1)) })),
    ];
    expect(monthCells(y, m)).toEqual(esperado);
  });

  it.each(meses)('%i-%i: lo que muestra cada casillero sale de itemsDe()', (y, m) => {
    const doc = fullDoc();
    withVanillaState(doc);
    const state = normalize(doc);
    for (const cell of monthCells(y, m)) {
      if (!cell) continue;
      expect(agenda.itemsDe(state, cell.dISO)).toEqual(V.itemsDe(cell.dISO));
    }
  });
});
