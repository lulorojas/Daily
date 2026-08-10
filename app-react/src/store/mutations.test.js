import { describe, expect, it } from 'vitest';
import { normalize } from '../lib/model';
import { emptyDoc, fullDoc, TODAY, ago } from '../test/fixtures';
import * as m from './mutations';

/* Las escrituras que compat/writes.test.js no compara contra un formulario de la app
   vanilla (porque no hay formulario que las cree: son borrados, ediciones y reordenes que
   se disparan desde botones). Acá se fija su comportamiento y, sobre todo, que ninguna
   deje el documento en un estado que la app vanilla no sepa leer. */

const doc = () => normalize(fullDoc());
const vacio = () => normalize(emptyDoc());

describe('borrar ítems de la agenda', () => {
  it('borra el que corresponde y deja el resto', () => {
    const d = doc();
    expect(m.deleteItem(d, 'i2')).toBe(true);
    expect(d.items.map((x) => x.id)).not.toContain('i2');
    expect(d.items).toHaveLength(6);
  });

  it('borrar algo que no existe no cambia nada', () => {
    const d = doc();
    expect(m.deleteItem(d, 'no-existe')).toBe(false);
    expect(d.items).toHaveLength(7);
  });

  it('editar un ítem que no existe avisa en vez de romper', () => {
    const d = doc();
    expect(m.updateTask(d, 'no-existe', { title: 'x' })).toBe(false);
    expect(m.updateEvent(d, 'no-existe', { kind: 'cita', title: 'x' })).toBe(false);
    expect(m.toggleTaskDone(d, 'no-existe', TODAY)).toBe(false);
  });

  it('no se puede marcar como hecha una cita (no tiene estado)', () => {
    const d = doc();
    expect(m.toggleTaskDone(d, 'i5', TODAY)).toBe(false);
    expect('done' in d.items.find((x) => x.id === 'i5')).toBe(false);
  });
});

describe('hábitos', () => {
  it('editar cambia los cinco campos del formulario', () => {
    const d = doc();
    m.updateHabit(d, 'h1', { name: 'Agua', detail: 'x', color: '#fff', icon: 'llama', timesPerDay: 5 });
    expect(d.habits[0]).toEqual({ id: 'h1', name: 'Agua', detail: 'x', color: '#fff', icon: 'llama', timesPerDay: 5 });
  });

  it('editar uno que no existe no toca nada', () => {
    const d = doc();
    expect(m.updateHabit(d, 'zzz', { name: 'x' })).toBe(false);
    expect(d.habits).toHaveLength(2);
  });

  it('marcar un slot que no existe en un hábito borrado no rompe', () => {
    const d = doc();
    expect(m.setHabitSlot(d, 'zzz', TODAY, 0)).toBe(false);
  });

  it('la marca nunca supera el timesPerDay del hábito', () => {
    const d = doc();
    m.setHabitSlot(d, 'h1', TODAY, 9);
    expect(d.habitLog[TODAY].h1).toBe(3);
  });
});

describe('ejercicios y cargas', () => {
  it('borrar un registro del medio deja el resto en orden', () => {
    const d = doc();
    expect(m.deleteLiftRecord(d, 'l1', 1)).toBe(true);
    expect(d.gym.lifts[0].history.map((h) => h.weight)).toEqual([60, 72.5]);
  });

  it('borrar un ejercicio se lleva todo su historial', () => {
    const d = doc();
    expect(m.deleteLift(d, 'l1')).toBe(true);
    expect(d.gym.lifts.map((l) => l.id)).toEqual(['l2', 'l3']);
  });

  it('cargar peso en un ejercicio que no existe no crea nada', () => {
    const d = doc();
    expect(m.logLift(d, 'zzz', { date: TODAY, weight: 10 })).toBe(false);
    expect(d.gym.lifts).toHaveLength(3);
  });

  it('editar un registro fuera de rango no rompe', () => {
    const d = doc();
    expect(m.updateLiftRecord(d, 'l1', 99, { date: TODAY, weight: 10 })).toBe(false);
  });

  it('el color de un ejercicio nuevo sale de la paleta por posición', () => {
    const d = vacio();
    const colores = [];
    for (let i = 0; i < 7; i++) colores.push(m.addLift(d, { name: 'e' + i, weight: 0, date: TODAY }).color);
    expect(colores[6]).toBe(colores[0]);
  });
});

describe('peso corporal', () => {
  it('editar redondea a un decimal y cambia la fecha', () => {
    const d = doc();
    m.updateBodyWeight(d, 'b1', { kg: 70.44, date: ago(1) });
    expect(d.gym.bodyWeights.find((r) => r.id === 'b1')).toEqual({ id: 'b1', kg: 70.4, date: ago(1) });
  });

  it('borrar saca solo ese registro', () => {
    const d = doc();
    expect(m.deleteBodyWeight(d, 'b2')).toBe(true);
    expect(d.gym.bodyWeights.map((r) => r.id)).toEqual(['b1', 'b3']);
  });

  it('editar uno que no existe no toca nada', () => {
    const d = doc();
    expect(m.updateBodyWeight(d, 'zzz', { kg: 1, date: TODAY })).toBe(false);
    expect(d.gym.bodyWeights).toHaveLength(3);
  });
});

describe('rutinas: los tres niveles', () => {
  it('editar una rutina cambia solo el nombre, no sus días', () => {
    const d = doc();
    m.updateRoutine(d, 'r1', { name: 'Otra' });
    expect(d.gym.routines[0].name).toBe('Otra');
    expect(d.gym.routines[0].days).toHaveLength(2);
  });

  it('borrar una rutina se lleva sus días y ejercicios', () => {
    const d = doc();
    expect(m.deleteRoutine(d, 'r1')).toBe(true);
    expect(d.gym.routines.map((r) => r.id)).toEqual(['r2']);
  });

  it('editar y borrar un día', () => {
    const d = doc();
    m.updateRoutineDay(d, 'r1', 'd1', { name: 'Pectoral' });
    expect(d.gym.routines[0].days[0].name).toBe('Pectoral');
    expect(d.gym.routines[0].days[0].exercises).toHaveLength(2);

    expect(m.deleteRoutineDay(d, 'r1', 'd2')).toBe(true);
    expect(d.gym.routines[0].days.map((x) => x.id)).toEqual(['d1']);
  });

  it('editar y borrar un ejercicio', () => {
    const d = doc();
    m.updateExercise(d, 'r1', 'd1', 'e1', { name: 'Press', detail: '5x5' });
    expect(d.gym.routines[0].days[0].exercises[0]).toEqual({ id: 'e1', name: 'Press', detail: '5x5' });

    expect(m.deleteExercise(d, 'r1', 'd1', 'e2')).toBe(true);
    expect(d.gym.routines[0].days[0].exercises.map((x) => x.id)).toEqual(['e1']);
  });

  it('reordenar días y ejercicios', () => {
    const d = doc();
    expect(m.moveRoutineDay(d, 'r1', 'd2', -1)).toBe(true);
    expect(d.gym.routines[0].days.map((x) => x.id)).toEqual(['d2', 'd1']);

    expect(m.moveExercise(d, 'r1', 'd1', 'e2', -1)).toBe(true);
    expect(d.gym.routines[0].days[1].exercises.map((x) => x.id)).toEqual(['e2', 'e1']);
  });

  it('no se puede mover más allá de los bordes', () => {
    const d = doc();
    expect(m.moveRoutine(d, 'r1', -1)).toBe(false);
    expect(m.moveRoutine(d, 'r2', 1)).toBe(false);
  });

  it('operar sobre una rutina o un día que no existe devuelve falso', () => {
    const d = doc();
    expect(m.addRoutineDay(d, 'zzz', { name: 'x' })).toBeNull();
    expect(m.addExercise(d, 'r1', 'zzz', { name: 'x' })).toBeNull();
    expect(m.updateRoutineDay(d, 'zzz', 'd1', { name: 'x' })).toBe(false);
    expect(m.deleteRoutineDay(d, 'zzz', 'd1')).toBe(false);
    expect(m.moveRoutineDay(d, 'zzz', 'd1', 1)).toBe(false);
    expect(m.updateExercise(d, 'r1', 'zzz', 'e1', { name: 'x' })).toBe(false);
    expect(m.deleteExercise(d, 'r1', 'zzz', 'e1')).toBe(false);
    expect(m.moveExercise(d, 'r1', 'zzz', 'e1', 1)).toBe(false);
    expect(m.updateRoutine(d, 'zzz', { name: 'x' })).toBe(false);
    expect(m.deleteRoutine(d, 'zzz')).toBe(false);
  });
});

describe('plan semanal', () => {
  it('marcar un día lo crea si la semana no existía', () => {
    const d = vacio();
    m.toggleWeekDayDone(d, '2026-08-03', 0);
    expect(d.gym.weekPlans['2026-08-03'][0]).toEqual({ type: 'Descanso', done: true });
  });

  it('marcar y desmarcar vuelve al estado inicial', () => {
    const d = vacio();
    m.toggleWeekDayDone(d, '2026-08-03', 3);
    m.toggleWeekDayDone(d, '2026-08-03', 3);
    expect(d.gym.weekPlans['2026-08-03'][3]).toEqual({ type: 'Descanso', done: false });
  });

  it('un índice de día inválido no rompe', () => {
    const d = vacio();
    expect(m.setWeekDayType(d, '2026-08-03', 99, 'Pecho')).toBe(false);
    expect(m.toggleWeekDayDone(d, '2026-08-03', -1)).toBe(false);
  });

  it('ensureWeekPlan no pisa una semana que ya existe', () => {
    const d = doc();
    const antes = JSON.stringify(d.gym.weekPlans);
    m.ensureWeekPlan(d, Object.keys(d.gym.weekPlans)[0]);
    expect(JSON.stringify(d.gym.weekPlans)).toBe(antes);
  });
});

describe('tipos de entrenamiento', () => {
  it('editar uno que no existe no toca nada', () => {
    const d = doc();
    expect(m.updateCustomType(d, 'zzz', { name: 'x', color: '#fff' })).toBe(false);
    expect(m.deleteCustomType(d, 'zzz')).toBe(false);
  });

  it('cambiar solo el color no toca los planes', () => {
    const d = doc();
    const antes = JSON.stringify(d.gym.weekPlans);
    m.updateCustomType(d, 'ct1', { name: 'Pecho', color: '#000000' });
    expect(JSON.stringify(d.gym.weekPlans)).toBe(antes);
    expect(d.gym.customTypes[0].color).toBe('#000000');
  });
});

describe('después de cualquier escritura, el documento sigue siendo válido', () => {
  const operaciones = {
    'agregar tarea': (d) => m.addTask(d, { title: 'x', date: TODAY }),
    'agregar cita': (d) => m.addEvent(d, { kind: 'cita', title: 'x', date: TODAY }),
    'agregar anual': (d) => m.addEvent(d, { kind: 'anual', title: 'x', date: TODAY }),
    'marcar tarea': (d) => m.toggleTaskDone(d, 'i2', TODAY),
    'borrar ítem': (d) => m.deleteItem(d, 'i1'),
    'agregar hábito': (d) => m.addHabit(d, { name: 'x', color: '#fff', icon: 'agua', timesPerDay: 2 }),
    'marcar hábito': (d) => m.setHabitSlot(d, 'h1', TODAY, 2),
    'borrar hábito': (d) => m.deleteHabit(d, 'h1'),
    'agregar tipo': (d) => m.addCustomType(d, { name: 'Pierna', color: '#fff' }),
    'renombrar tipo': (d) => m.updateCustomType(d, 'ct1', { name: 'Torso', color: '#fff' }),
    'marcar día del plan': (d) => m.toggleWeekDayDone(d, '2026-08-03', 1),
    'agregar ejercicio': (d) => m.addLift(d, { name: 'x', weight: 20, date: TODAY }),
    'cargar peso': (d) => m.logLift(d, 'l1', { date: TODAY, weight: 80 }),
    'borrar registro': (d) => m.deleteLiftRecord(d, 'l1', 0),
    'registrar peso corporal': (d) => m.addBodyWeight(d, { kg: 70, date: TODAY }),
    'agregar rutina': (d) => m.addRoutine(d, { name: 'x' }),
    'agregar día de rutina': (d) => m.addRoutineDay(d, 'r1', { name: 'x' }),
    'agregar ejercicio de rutina': (d) => m.addExercise(d, 'r1', 'd1', { name: 'x', detail: '' }),
    'marcar onboarding': (d) => m.setOnboardingSeen(d, true),
  };

  it.each(Object.keys(operaciones))('%s: normalize() no le cambia nada', (nombre) => {
    const d = doc();
    operaciones[nombre](d);
    // Si normalize() encontrara algo fuera de esquema, lo acomodaría y el objeto cambiaría.
    expect(normalize(structuredClone(d))).toEqual(d);
  });

  it.each(Object.keys(operaciones))('%s: se puede serializar a JSON sin perder nada', (nombre) => {
    const d = doc();
    operaciones[nombre](d);
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
  });
});
