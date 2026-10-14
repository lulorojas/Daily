import { describe, expect, it } from 'vitest';
import { hasPending, pendingCounts, summaryText } from './notifications';
import { normalize } from './model';
import { emptyDoc, TODAY, thisMonday } from '../test/fixtures';
import { dow, parseISO } from './dates';

/* ============================================================================
   RESUMEN AGREGADO DE NOTIFICACIONES (etapa 6)

   Sin equivalente en vanilla — se prueba directo, con un documento armado a mano en vez
   de fullDoc(): el plan semanal de fullDoc() depende de QUÉ DÍA DE LA SEMANA es "hoy"
   cuando corren los tests, y estos tests necesitan controlar el entreno de hoy a propósito.
   ============================================================================ */

const hoyIdx = dow(parseISO(TODAY));

function docCon({ tareas = [], citas = [], habits = [], habitLog = {}, entrenoHoy = null } = {}) {
  const d = normalize(emptyDoc());
  d.items = [...tareas, ...citas];
  d.habits = habits;
  d.habitLog = habitLog;
  if (entrenoHoy) {
    const plan = Array.from({ length: 7 }, () => ({ muscles: [], done: false }));
    plan[hoyIdx] = entrenoHoy;
    d.gym.weekPlans[thisMonday] = plan;
  }
  return d;
}

describe('pendingCounts', () => {
  it('cuenta nueva, sin nada: todo en cero', () => {
    expect(pendingCounts(normalize(emptyDoc()), TODAY)).toEqual({ tareas: 0, agenda: 0, habitos: 0, entreno: 0, comidas: [] });
  });

  it('tareas de hoy sin marcar cuentan; las hechas no', () => {
    const d = docCon({
      tareas: [
        { id: 't1', kind: 'tarea', title: 'a', date: TODAY, done: false },
        { id: 't2', kind: 'tarea', title: 'b', date: TODAY, done: true },
        { id: 't3', kind: 'tarea', title: 'c', date: null, done: false }, // sin fecha: no es "de hoy"
      ],
    });
    expect(pendingCounts(d, TODAY).tareas).toBe(1);
  });

  it('citas y anuales de hoy cuentan como "agenda" (Calendario)', () => {
    const d = docCon({
      citas: [
        { id: 'c1', kind: 'cita', title: 'Dentista', date: TODAY },
        { id: 'c2', kind: 'anual', title: 'Cumple', date: '1990-' + TODAY.slice(5) },
      ],
    });
    expect(pendingCounts(d, TODAY).agenda).toBe(2);
  });

  it('hábitos sin completar hoy cuentan; los completos no', () => {
    const d = docCon({
      habits: [
        { id: 'h1', name: 'Agua', timesPerDay: 3 },
        { id: 'h2', name: 'Leer', timesPerDay: 1 },
      ],
      habitLog: { [TODAY]: { h1: 2, h2: 1 } }, // h1 incompleto, h2 completo
    });
    expect(pendingCounts(d, TODAY).habitos).toBe(1);
  });

  it('turnos de hoy sin marcar cuentan; un día de descanso no aporta nada', () => {
    const d = docCon({ entrenoHoy: { muscles: ['Pecho'], done: false } });
    expect(pendingCounts(d, TODAY).entreno).toBe(1);
  });

  it('un turno ya hecho no cuenta como pendiente', () => {
    const d = docCon({ entrenoHoy: { muscles: ['Pecho'], done: true } });
    expect(pendingCounts(d, TODAY).entreno).toBe(0);
  });

  it('entrenamientos dobles: cada turno sin hacer suma su propio pendiente', () => {
    const d = docCon({ entrenoHoy: { muscles: ['Pecho'], done: true, muscles2: ['Cardio'], done2: false } });
    expect(pendingCounts(d, TODAY).entreno).toBe(1);
  });

  it('un día de descanso (sin marcar) no cuenta como entreno pendiente', () => {
    const d = docCon({ entrenoHoy: { muscles: [], done: false } });
    expect(pendingCounts(d, TODAY).entreno).toBe(0);
  });
});

describe('hasPending / summaryText', () => {
  it('sin nada pendiente, no hay texto que mandar', () => {
    const counts = { tareas: 0, agenda: 0, habitos: 0, entreno: 0 };
    expect(hasPending(counts)).toBe(false);
    expect(summaryText(counts)).toBeNull();
  });

  it('arma el texto con lo que haya, en singular o plural según corresponda', () => {
    expect(summaryText({ tareas: 1, agenda: 0, habitos: 0, entreno: 0 })).toBe('Pendiente hoy: 1 tarea.');
    expect(summaryText({ tareas: 2, agenda: 1, habitos: 3, entreno: 1 }))
      .toBe('Pendiente hoy: 2 tareas, 1 cita, un entreno, 3 hábitos.');
  });

  it('nunca menciona un ítem individual: el texto es siempre el agregado', () => {
    const texto = summaryText({ tareas: 5, agenda: 0, habitos: 0, entreno: 0 });
    expect(texto).toBe('Pendiente hoy: 5 tareas.');
    expect(texto).not.toMatch(/Tarea|Dentista|Pecho/);
  });
});

/* Comidas sin cargar (pedido explícito: "una noti a las 22 de la noche que me ponga si
   me faltan cargar comidas"). */
describe('comidas sin cargar', () => {
  function docConPlan(log = {}) {
    const d = normalize(emptyDoc());
    d.meals = {
      plans: [{
        id: 'p1', startISO: TODAY, endISO: null,
        slots: [
          { id: 's1', name: 'Desayuno', options: [{ id: 'o1', text: 'Panes' }] },
          { id: 's2', name: 'Merienda', options: [{ id: 'o2', text: 'Licuado' }] },
          { id: 's3', name: 'Cena', options: [{ id: 'o3', text: 'Milanesa' }] },
        ],
      }],
      extras: [],
      log,
    };
    return d;
  }

  it('apagado por defecto: a la mañana no se avisa de comidas', () => {
    expect(pendingCounts(docConPlan(), TODAY).comidas).toEqual([]);
  });

  it('prendido, nombra las comidas sin nada registrado hoy', () => {
    const log = { [TODAY]: [{ id: 'a', at: 0, text: 't', matches: { options: [{ slotId: 's1', optionId: 'o1' }], extras: [] } }] };
    expect(pendingCounts(docConPlan(log), TODAY, { comidas: true }).comidas).toEqual(['Merienda', 'Cena']);
  });

  it('algo fuera del plan anotado en una comida también cuenta como cargada', () => {
    const log = { [TODAY]: [{ id: 'a', at: 0, text: 't', libre: { slotId: 's2', que: 'alfajor', tipo: 'permitido' }, matches: { options: [], extras: [] } }] };
    expect(pendingCounts(docConPlan(log), TODAY, { comidas: true }).comidas).toEqual(['Desayuno', 'Cena']);
  });

  it('sin plan de comidas, no hay nada que reclamar', () => {
    expect(pendingCounts(normalize(emptyDoc()), TODAY, { comidas: true }).comidas).toEqual([]);
  });

  it('el texto nombra las comidas, en una frase aparte', () => {
    expect(summaryText({ tareas: 0, agenda: 0, habitos: 0, entreno: 0, comidas: ['Cena'] }))
      .toBe('Te falta cargar: Cena.');
    expect(summaryText({ tareas: 0, agenda: 0, habitos: 1, entreno: 0, comidas: ['Desayuno', 'Merienda', 'Cena'] }))
      .toBe('Pendiente hoy: 1 hábito. Te falta cargar: Desayuno, Merienda y Cena.');
  });

  it('con todas las comidas cargadas y nada más pendiente, no hay notificación', () => {
    expect(summaryText({ tareas: 0, agenda: 0, habitos: 0, entreno: 0, comidas: [] })).toBeNull();
  });
});
