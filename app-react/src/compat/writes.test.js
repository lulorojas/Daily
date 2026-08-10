import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clone, loadVanilla } from '../test/vanilla';
import { emptyDoc, TODAY, ago } from '../test/fixtures';
import { normalize } from '../lib/model';
import * as m from '../store/mutations';

/* ============================================================================
   COMPATIBILIDAD DE ESCRITURA

   Los tests de vanilla.test.js prueban que las dos versiones LEEN igual. Estos prueban
   que ESCRIBEN igual, que es la mitad más riesgosa: si React guardara un campo de más,
   uno de menos, o con otro tipo, el documento quedaría corrupto para la app vanilla y
   habría que arreglarlo a mano cuenta por cuenta.

   El método: se abre el formulario REAL de la app vanilla (el mismo modal que ve el
   usuario), se lo llena, se lo guarda, y se compara el objeto que quedó en su `state`
   contra el que produce la mutación de React con los mismos datos de entrada.

   Los `id` se ignoran en la comparación porque son aleatorios por diseño; que tengan el
   mismo FORMATO se prueba aparte, al final.
   ============================================================================ */

let V;
beforeAll(() => { V = loadVanilla(); });

beforeEach(() => {
  V.setState(V.normalize(clone(emptyDoc())));
  V.closeModal();
  V.ui.rutId = null;
  V.ui.rutDayId = null;
  V.ui.tab = 'hoy';
});

// Llena un campo del modal abierto de la app vanilla.
function escribir(sel, valor) {
  const el = V.mq(sel);
  if (!el) throw new Error('no existe el campo ' + sel + ' en el modal');
  el.value = valor;
}

// Compara dos objetos ignorando los id (que son aleatorios).
function sinIds(value) {
  if (Array.isArray(value)) return value.map(sinIds);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) { if (k !== 'id') out[k] = sinIds(value[k]); }
    return out;
  }
  return value;
}

/* Comparación completa de una escritura: mismas claves, mismos valores, y además el
   documento entero queda igual de un lado y del otro. */
function esperarMismaEscritura(vanillaDoc, reactDoc) {
  expect(sinIds(reactDoc)).toEqual(sinIds(vanillaDoc));
  // Y vanilla tiene que poder leer lo de React sin cambiarle nada.
  expect(V.normalize(clone(reactDoc))).toEqual(reactDoc);
}

/* ---------------------------------------------------------------- tareas */
describe('nueva tarea', () => {
  it('escribe el mismo ítem que el formulario de la app actual', () => {
    V.taskModal(null, TODAY);
    escribir('#t-title', 'Comprar pan');
    escribir('#t-desc', 'en la de la esquina');
    V.saveModal();
    const vanilla = V.getState();

    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'Comprar pan', desc: 'en la de la esquina', date: TODAY, time: null });

    esperarMismaEscritura(vanilla, react);
  });

  it('la tarea nace con done:false y SIN doneAt', () => {
    V.taskModal(null, TODAY);
    escribir('#t-title', 'x');
    escribir('#t-desc', '');
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'x', desc: '', date: TODAY, time: null });

    expect(Object.keys(react.items[0]).sort()).toEqual(Object.keys(V.getState().items[0]).sort());
    expect(react.items[0].done).toBe(false);
    expect('doneAt' in react.items[0]).toBe(false);
  });

  it('una tarea sin fecha guarda date:null, no el campo ausente', () => {
    V.taskModal(null, null);
    escribir('#t-title', 'suelta');
    escribir('#t-desc', '');
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'suelta', desc: '', date: null, time: null });

    esperarMismaEscritura(V.getState(), react);
    expect(react.items[0].date).toBeNull();
  });

  it('marcar una tarea agrega doneAt con el día que se estaba mirando', () => {
    V.taskModal(null, TODAY);
    escribir('#t-title', 'x'); escribir('#t-desc', ''); V.saveModal();

    // Así lo hace app.js: t.done=!t.done; if(t.done) t.doneAt=ui.daySel; else delete t.doneAt;
    const vt = V.getState().items[0];
    vt.done = true; vt.doneAt = ago(1);

    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'x', desc: '', date: TODAY, time: null });
    m.toggleTaskDone(react, react.items[0].id, ago(1));

    esperarMismaEscritura(V.getState(), react);
  });

  it('desmarcarla BORRA doneAt en vez de dejarlo en null', () => {
    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'x', date: TODAY });
    const id = react.items[0].id;
    m.toggleTaskDone(react, id, TODAY);
    expect(react.items[0].doneAt).toBe(TODAY);

    m.toggleTaskDone(react, id, TODAY);
    expect('doneAt' in react.items[0]).toBe(false);
    expect(react.items[0].done).toBe(false);
  });

  it('editar una tarea no toca kind, done ni doneAt', () => {
    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'vieja', date: TODAY });
    const id = react.items[0].id;
    m.toggleTaskDone(react, id, TODAY);

    m.updateTask(react, id, { title: 'nueva', date: null, time: '10:00', desc: 'd' });
    expect(react.items[0]).toMatchObject({ kind: 'tarea', done: true, doneAt: TODAY, title: 'nueva', date: null, time: '10:00', desc: 'd' });
  });
});

/* ---------------------------------------------------------------- citas */
describe('nueva cita / fecha anual', () => {
  it('escribe el mismo ítem que el formulario de la app actual', () => {
    V.eventModal(null, TODAY);
    escribir('#r-title', 'Dentista');
    escribir('#r-desc', 'llevar estudios');
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addEvent(react, { kind: 'cita', title: 'Dentista', desc: 'llevar estudios', date: TODAY, time: null });

    esperarMismaEscritura(V.getState(), react);
  });

  it('una cita NO lleva campo done', () => {
    V.eventModal(null, TODAY);
    escribir('#r-title', 'x'); escribir('#r-desc', ''); V.saveModal();

    expect('done' in V.getState().items[0]).toBe(false);

    const react = normalize(emptyDoc());
    m.addEvent(react, { kind: 'cita', title: 'x', desc: '', date: TODAY, time: null });
    expect('done' in react.items[0]).toBe(false);
  });

  it('editar una cita borra el done que hubiera quedado de cuando era tarea', () => {
    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'era tarea', date: TODAY });
    const id = react.items[0].id;

    m.updateEvent(react, id, { kind: 'cita', title: 'ahora cita', date: TODAY, time: null, desc: '' });
    expect('done' in react.items[0]).toBe(false);
    expect(react.items[0].kind).toBe('cita');
  });
});

/* ---------------------------------------------------------------- hábitos */
describe('nuevo hábito', () => {
  it('escribe el mismo objeto que el formulario de la app actual', () => {
    V.habitModal(null);
    escribir('#h-name', 'Tomar agua');
    escribir('#h-detail', '8 vasos');
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addHabit(react, {
      name: 'Tomar agua', detail: '8 vasos',
      color: m.nextHabitColor(react), icon: 'estrella', timesPerDay: 1,
    });

    esperarMismaEscritura(V.getState(), react);
  });

  it('el color por defecto sale de la paleta, por posición', () => {
    const react = normalize(emptyDoc());
    const colores = [];
    for (let i = 0; i < 8; i++) {
      colores.push(m.nextHabitColor(react));
      m.addHabit(react, { name: 'h' + i, color: colores[i], icon: 'estrella', timesPerDay: 1 });
    }
    // Se repite cada 6 (el largo de la paleta), igual que PALETTE[habits.length % 6].
    expect(colores[6]).toBe(colores[0]);
    expect(colores[7]).toBe(colores[1]);
  });

  it('borrar un hábito se lleva también sus marcas del historial', () => {
    const react = normalize({
      habits: [{ id: 'h1', name: 'a', timesPerDay: 1 }, { id: 'h2', name: 'b', timesPerDay: 1 }],
      habitLog: { [TODAY]: { h1: 1, h2: 1 }, [ago(1)]: { h1: 1 } },
    });
    m.deleteHabit(react, 'h1');

    expect(react.habits.map((h) => h.id)).toEqual(['h2']);
    expect(react.habitLog[TODAY]).toEqual({ h2: 1 });
    expect(react.habitLog[ago(1)]).toEqual({});
  });

  it('marcar y desmarcar slots da los mismos números que la app actual', () => {
    const react = normalize({ habits: [{ id: 'h', name: 'x', timesPerDay: 3 }], habitLog: {} });
    V.setState(V.normalize({ habits: [{ id: 'h', name: 'x', timesPerDay: 3 }], habitLog: {} }));

    // Réplica de lo que hace app.js en 'habit-toggle', para los 3 slots y de nuevo.
    const tocarVanilla = (slot) => {
      const s = V.getState(), hb = s.habits[0];
      const tpd = hb.timesPerDay || 1, cur = V.habitMarks('h', TODAY);
      const next = slot < cur ? slot : slot + 1;
      s.habitLog[TODAY] ||= {};
      if (next <= 0) delete s.habitLog[TODAY].h; else s.habitLog[TODAY].h = Math.min(next, tpd);
    };

    for (const slot of [0, 1, 2, 2, 1, 0]) {
      tocarVanilla(slot);
      m.setHabitSlot(react, 'h', TODAY, slot);
      expect(react.habitLog).toEqual(V.getState().habitLog);
    }
  });

  it('al desmarcar la última marca queda el día vacío, igual que en la app actual', () => {
    const react = normalize({ habits: [{ id: 'h', name: 'x', timesPerDay: 1 }], habitLog: {} });
    m.setHabitSlot(react, 'h', TODAY, 0);
    m.setHabitSlot(react, 'h', TODAY, 0);
    // No queda { }: queda la clave del día con un objeto vacío. Es así en vanilla.
    expect(react.habitLog[TODAY]).toEqual({});
  });
});

/* ---------------------------------------------------------------- gimnasio */
describe('gimnasio', () => {
  it('nuevo tipo de entrenamiento: mismo objeto', () => {
    V.typeCreateModal(null);
    escribir('#ty-name', 'Pierna');
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addCustomType(react, { name: 'Pierna', color: '#FF9B93' });

    esperarMismaEscritura(V.getState(), react);
  });

  it('renombrar un tipo lo renombra también en los planes ya guardados', () => {
    const doc = {
      gym: {
        customTypes: [{ id: 't1', name: 'Pecho', color: '#fff' }],
        weekPlans: { '2026-08-03': [{ type: 'Pecho', done: true }, { type: 'Descanso', done: false }] },
      },
    };
    const react = normalize(clone(doc));
    m.updateCustomType(react, 't1', { name: 'Pectorales', color: '#fff' });

    expect(react.gym.weekPlans['2026-08-03'][0].type).toBe('Pectorales');
    expect(react.gym.weekPlans['2026-08-03'][1].type).toBe('Descanso');
  });

  it('borrar un tipo NO reescribe el historial de entrenos', () => {
    const react = normalize({
      gym: {
        customTypes: [{ id: 't1', name: 'Pecho', color: '#fff' }],
        weekPlans: { '2026-08-03': [{ type: 'Pecho', done: true }] },
      },
    });
    m.deleteCustomType(react, 't1');

    expect(react.gym.customTypes).toEqual([]);
    expect(react.gym.weekPlans['2026-08-03'][0].type).toBe('Pecho');
  });

  it('nuevo ejercicio con carga: mismo objeto que el formulario de la app actual', () => {
    V.liftModal(null);
    escribir('#l-new', 'Sentadilla');
    escribir('#l-date', TODAY);
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addLift(react, { name: 'Sentadilla', weight: 0, date: TODAY });

    esperarMismaEscritura(V.getState(), react);
    expect(react.gym.lifts[0].unit).toBe('kg');
  });

  it('cargar un peso se AGREGA al final, sin reordenar por fecha', () => {
    const react = normalize(emptyDoc());
    m.addLift(react, { name: 'x', weight: 50, date: ago(10) });
    const id = react.gym.lifts[0].id;
    m.logLift(react, id, { date: ago(30), weight: 40 });

    expect(react.gym.lifts[0].history.map((h) => h.weight)).toEqual([50, 40]);
  });

  it('editar un registro redondea el peso a un decimal', () => {
    const react = normalize(emptyDoc());
    m.addLift(react, { name: 'x', weight: 50, date: TODAY });
    const id = react.gym.lifts[0].id;
    m.updateLiftRecord(react, id, 0, { date: TODAY, weight: 72.46 });

    expect(react.gym.lifts[0].history[0]).toEqual({ date: TODAY, weight: 72.5 });
  });

  it('no se puede borrar el único registro de un ejercicio', () => {
    const react = normalize(emptyDoc());
    m.addLift(react, { name: 'x', weight: 50, date: TODAY });
    const id = react.gym.lifts[0].id;

    expect(m.deleteLiftRecord(react, id, 0)).toBe(false);
    expect(react.gym.lifts[0].history).toHaveLength(1);
  });

  it('registrar peso corporal: mismo objeto que el formulario de la app actual', () => {
    V.bodyModal(null);
    escribir('#b-kg', '72,5');            // con coma, como se tipea en el teléfono
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addBodyWeight(react, { kg: 72.5, date: TODAY });

    esperarMismaEscritura(V.getState(), react);
    expect(react.gym.bodyWeights[0].kg).toBe(72.5);
  });

  it('el peso corporal se guarda con un solo decimal', () => {
    const react = normalize(emptyDoc());
    m.addBodyWeight(react, { kg: 72.456, date: TODAY });
    expect(react.gym.bodyWeights[0].kg).toBe(72.5);
  });

  it('el plan semanal se materializa recién al cambiar algo', () => {
    const react = normalize(emptyDoc());
    expect(react.gym.weekPlans).toEqual({});

    m.setWeekDayType(react, '2026-08-03', 2, 'Pecho');
    expect(react.gym.weekPlans['2026-08-03']).toHaveLength(7);
    expect(react.gym.weekPlans['2026-08-03'][2]).toEqual({ type: 'Pecho', done: false });
    expect(react.gym.weekPlans['2026-08-03'][0]).toEqual({ type: 'Descanso', done: false });
  });

  it('la semana creada por React es idéntica a la que crea la app actual', () => {
    const react = normalize(emptyDoc());
    m.ensureWeekPlan(react, V.weekKey(0));

    V.setState(V.normalize(clone(emptyDoc())));
    V.getWeekPlan(0);

    expect(react.gym.weekPlans).toEqual(V.getState().gym.weekPlans);
  });
});

/* ---------------------------------------------------------------- rutinas */
describe('rutinas', () => {
  it('nueva rutina: mismo objeto que el formulario de la app actual', () => {
    V.rutModal(null);
    escribir('#ru-name', 'Rutina A');
    V.saveModal();

    const react = normalize(emptyDoc());
    m.addRoutine(react, { name: 'Rutina A' });

    esperarMismaEscritura(V.getState(), react);
  });

  it('nuevo día de rutina: mismo objeto', () => {
    V.rutModal(null); escribir('#ru-name', 'R'); V.saveModal();
    V.ui.rutId = V.getState().gym.routines[0].id;
    V.rutDayModal(null); escribir('#rd-name', 'Pecho'); V.saveModal();

    const react = normalize(emptyDoc());
    const r = m.addRoutine(react, { name: 'R' });
    m.addRoutineDay(react, r.id, { name: 'Pecho' });

    esperarMismaEscritura(V.getState(), react);
  });

  it('nuevo ejercicio de rutina: mismo objeto', () => {
    V.rutModal(null); escribir('#ru-name', 'R'); V.saveModal();
    V.ui.rutId = V.getState().gym.routines[0].id;
    V.rutDayModal(null); escribir('#rd-name', 'D'); V.saveModal();
    V.ui.rutDayId = V.getState().gym.routines[0].days[0].id;
    V.rutExModal(null); escribir('#re-name', 'Press banca'); escribir('#re-detail', '4x8'); V.saveModal();

    const react = normalize(emptyDoc());
    const r = m.addRoutine(react, { name: 'R' });
    const d = m.addRoutineDay(react, r.id, { name: 'D' });
    m.addExercise(react, r.id, d.id, { name: 'Press banca', detail: '4x8' });

    esperarMismaEscritura(V.getState(), react);
  });

  it('reordenar usa el mismo algoritmo que la app actual', () => {
    const react = normalize(emptyDoc());
    ['A', 'B', 'C'].forEach((n) => m.addRoutine(react, { name: n }));
    const ids = react.gym.routines.map((r) => r.id);

    const vanillaArr = ['A', 'B', 'C'];
    V.moveInArray(vanillaArr, 2, -1);
    m.moveRoutine(react, ids[2], -1);

    expect(react.gym.routines.map((r) => r.name)).toEqual(vanillaArr);
    // A sigue primera después del movimiento: no se puede subir más.
    expect(m.moveRoutine(react, ids[0], -1)).toBe(false);
  });
});

/* ---------------------------------------------------------------- ids */
describe('los ids que genera React tienen el mismo formato que los de la app actual', () => {
  it('mismo patrón: timestamp en base 36 + 4 caracteres', () => {
    const react = normalize(emptyDoc());
    m.addTask(react, { title: 'x' });
    const reactId = react.items[0].id;
    const vanillaId = V.uid();

    const patron = /^[0-9a-z]{8,9}[0-9a-z]{4}$/;
    expect(reactId).toMatch(patron);
    expect(vanillaId).toMatch(patron);
    expect(reactId).toHaveLength(vanillaId.length);
  });

  it('no se repiten', () => {
    const vistos = new Set();
    const react = normalize(emptyDoc());
    for (let i = 0; i < 300; i++) { m.addTask(react, { title: 'x' }); }
    react.items.forEach((t) => vistos.add(t.id));
    expect(vistos.size).toBe(300);
  });
});

/* ---------------------------------------------------------------- onboarding */
describe('onboarding', () => {
  it('guardar que ya se vio el tutorial deja el mismo campo', () => {
    const react = normalize(emptyDoc());
    m.setOnboardingSeen(react, true);
    expect(react.onboarding).toEqual({ seen: true });
    expect(V.normalize(clone(react)).onboarding).toEqual({ seen: true });
  });
});
