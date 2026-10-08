import { describe, expect, it } from 'vitest';
import { normalize } from '../lib/model';
import { gymHistory } from '../lib/gym';
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

  it('reps es opcional: un ejercicio nuevo sin reps no tiene el campo', () => {
    const d = vacio();
    const lift = m.addLift(d, { name: 'Sentadilla', weight: 80, date: TODAY });
    expect(lift.history[0]).toEqual({ date: TODAY, weight: 80 });
    expect('reps' in lift.history[0]).toBe(false);
  });

  it('reps se guarda si se manda', () => {
    const d = vacio();
    const lift = m.addLift(d, { name: 'Sentadilla', weight: 80, date: TODAY, reps: 5 });
    expect(lift.history[0]).toEqual({ date: TODAY, weight: 80, reps: 5 });
  });

  it('cargar peso nuevo con reps se agrega al historial existente', () => {
    const d = doc();
    m.logLift(d, 'l1', { date: TODAY, weight: 65, reps: 3 });
    const ultimo = d.gym.lifts.find((l) => l.id === 'l1').history.at(-1);
    expect(ultimo).toEqual({ date: TODAY, weight: 65, reps: 3 });
  });

  it('editar un registro puede agregarle o sacarle las reps', () => {
    const d = doc();
    m.updateLiftRecord(d, 'l1', 0, { date: TODAY, weight: 62.5, reps: 8 });
    expect(d.gym.lifts[0].history[0]).toEqual({ date: TODAY, weight: 62.5, reps: 8 });

    // Editar de nuevo sin reps las saca (no las deja pisadas en undefined).
    m.updateLiftRecord(d, 'l1', 0, { date: TODAY, weight: 62.5 });
    expect(d.gym.lifts[0].history[0]).toEqual({ date: TODAY, weight: 62.5 });
    expect('reps' in d.gym.lifts[0].history[0]).toBe(false);
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
    expect(d.gym.weekPlans['2026-08-03'][0]).toEqual({ muscles: [], done: true });
  });

  it('marcar y desmarcar vuelve al estado inicial', () => {
    const d = vacio();
    m.toggleWeekDayDone(d, '2026-08-03', 3);
    m.toggleWeekDayDone(d, '2026-08-03', 3);
    expect(d.gym.weekPlans['2026-08-03'][3]).toEqual({ muscles: [], done: false });
  });

  it('un índice de día inválido no rompe', () => {
    const d = vacio();
    expect(m.toggleWeekDayMuscle(d, '2026-08-03', 99, 'Pecho')).toBe(false);
    expect(m.toggleWeekDayDone(d, '2026-08-03', -1)).toBe(false);
  });

  it('ensureWeekPlan no pisa una semana que ya existe', () => {
    const d = doc();
    const antes = JSON.stringify(d.gym.weekPlans);
    m.ensureWeekPlan(d, Object.keys(d.gym.weekPlans)[0]);
    expect(JSON.stringify(d.gym.weekPlans)).toBe(antes);
  });
});

describe('plan semanal: multi-select de músculos', () => {
  it('tocar un músculo lo agrega a la lista', () => {
    const d = vacio();
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Pecho');
    expect(d.gym.weekPlans['2026-08-03'][0].muscles).toEqual(['Pecho']);
  });

  it('tocar dos músculos distintos los junta, sin pisar el primero', () => {
    const d = vacio();
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Espalda');
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Tríceps');
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Hombro');
    expect(d.gym.weekPlans['2026-08-03'][0].muscles).toEqual(['Espalda', 'Tríceps', 'Hombro']);
  });

  it('tocar un músculo ya elegido lo saca (toggle)', () => {
    const d = vacio();
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Pecho');
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Espalda');
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Pecho');
    expect(d.gym.weekPlans['2026-08-03'][0].muscles).toEqual(['Espalda']);
  });

  it('elegir "Descanso" vacía el turno entero, aunque haya varios músculos marcados', () => {
    const d = vacio();
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Pecho');
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Espalda');
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Descanso');
    expect(d.gym.weekPlans['2026-08-03'][0].muscles).toEqual([]);
  });
});

/* Entrenamientos dobles (etapa 6): muscles2/done2 son opcionales, así que un día sin ellos
   tiene que leerse EXACTAMENTE como si el campo nunca hubiera existido — no un muscles2:[]
   ni un done2:false de más, que un backup viejo jamás va a mandar. */
describe('plan semanal: segundo turno', () => {
  it('un día nuevo no tiene segundo turno', () => {
    const d = vacio();
    m.toggleWeekDayDone(d, '2026-08-03', 0);
    expect(d.gym.weekPlans['2026-08-03'][0].muscles2).toBeUndefined();
  });

  it('agregarlo lo deja en Descanso sin marcar, sin tocar el primero', () => {
    const d = vacio();
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Pecho');
    m.toggleWeekDayDone(d, '2026-08-03', 0);
    m.addSecondTurno(d, '2026-08-03', 0);
    expect(d.gym.weekPlans['2026-08-03'][0]).toEqual({ muscles: ['Pecho'], done: true, muscles2: [], done2: false });
  });

  it('agregarlo dos veces no pisa el segundo turno ya elegido', () => {
    const d = vacio();
    m.addSecondTurno(d, '2026-08-03', 0);
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Espalda', 2);
    expect(m.addSecondTurno(d, '2026-08-03', 0)).toBe(false);
    expect(d.gym.weekPlans['2026-08-03'][0].muscles2).toEqual(['Espalda']);
  });

  it('toggleWeekDayMuscle y toggleWeekDayDone con slot 2 tocan muscles2/done2, no el turno 1', () => {
    const d = vacio();
    m.addSecondTurno(d, '2026-08-03', 0);
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Cardio', 2);
    m.toggleWeekDayDone(d, '2026-08-03', 0, 2);
    const day = d.gym.weekPlans['2026-08-03'][0];
    expect(day.muscles2).toEqual(['Cardio']);
    expect(day.done2).toBe(true);
    expect(day.muscles).toEqual([]);
    expect(day.done).toBe(false);
  });

  it('quitarlo lo saca del todo (no lo deja en blanco)', () => {
    const d = vacio();
    m.addSecondTurno(d, '2026-08-03', 0);
    m.removeSecondTurno(d, '2026-08-03', 0);
    const day = d.gym.weekPlans['2026-08-03'][0];
    expect('muscles2' in day).toBe(false);
    expect('done2' in day).toBe(false);
    expect(day).toEqual({ muscles: [], done: false });
  });

  it('quitar un segundo turno que no existe no rompe', () => {
    const d = vacio();
    expect(m.removeSecondTurno(d, '2026-08-03', 0)).toBe(false);
  });

  it('renombrar un músculo también lo renombra en el segundo turno si lo usaba', () => {
    const d = doc(); // ct1 = 'Pecho'
    m.addSecondTurno(d, Object.keys(d.gym.weekPlans)[0], 0);
    m.toggleWeekDayMuscle(d, Object.keys(d.gym.weekPlans)[0], 0, 'Pecho', 2);
    m.updateCustomType(d, 'ct1', { name: 'Torso', color: '#fff' });
    expect(d.gym.weekPlans[Object.keys(d.gym.weekPlans)[0]][0].muscles2).toEqual(['Torso']);
  });
});

describe('abs y movilidad (campos del día, no una lista aparte)', () => {
  it('un día nuevo no tiene absCategories ni movilidad', () => {
    const d = vacio();
    m.toggleWeekDayDone(d, '2026-08-03', 0); // toca la semana, sin tocar abs
    const day = d.gym.weekPlans['2026-08-03'][0];
    expect(day.absCategories).toBeUndefined();
    expect(day.movilidad).toBeUndefined();
  });

  it('marcar una categoría la agrega', () => {
    const d = vacio();
    m.toggleAbsCategory(d, '2026-08-03', 0, 'core');
    expect(d.gym.weekPlans['2026-08-03'][0].absCategories).toEqual(['core']);
  });

  it('marcar dos categorías las junta, sin pisar la primera', () => {
    const d = vacio();
    m.toggleAbsCategory(d, '2026-08-03', 0, 'core');
    m.toggleAbsCategory(d, '2026-08-03', 0, 'oblicuos');
    expect(d.gym.weekPlans['2026-08-03'][0].absCategories).toEqual(['core', 'oblicuos']);
  });

  it('tocar una categoría ya marcada la saca (toggle)', () => {
    const d = vacio();
    m.toggleAbsCategory(d, '2026-08-03', 0, 'core');
    m.toggleAbsCategory(d, '2026-08-03', 0, 'core');
    expect(d.gym.weekPlans['2026-08-03'][0].absCategories).toBeUndefined();
  });

  it('sacar la última categoría borra el campo entero, no deja un array vacío', () => {
    const d = vacio();
    m.toggleAbsCategory(d, '2026-08-03', 0, 'core');
    m.toggleAbsCategory(d, '2026-08-03', 0, 'oblicuos');
    m.toggleAbsCategory(d, '2026-08-03', 0, 'core');
    m.toggleAbsCategory(d, '2026-08-03', 0, 'oblicuos');
    const day = d.gym.weekPlans['2026-08-03'][0];
    expect('absCategories' in day).toBe(false);
  });

  it('movilidad se prende y apaga igual que una categoría', () => {
    const d = vacio();
    m.toggleMovilidad(d, '2026-08-03', 0);
    expect(d.gym.weekPlans['2026-08-03'][0].movilidad).toBe(true);
    m.toggleMovilidad(d, '2026-08-03', 0);
    expect('movilidad' in d.gym.weekPlans['2026-08-03'][0]).toBe(false);
  });

  it('categorías y movilidad son independientes: tocar una no toca la otra', () => {
    const d = vacio();
    m.toggleAbsCategory(d, '2026-08-03', 0, 'bajos');
    m.toggleMovilidad(d, '2026-08-03', 0);
    const day = d.gym.weekPlans['2026-08-03'][0];
    expect(day.absCategories).toEqual(['bajos']);
    expect(day.movilidad).toBe(true);
  });

  it('no toca los músculos/done del día ni los turnos', () => {
    const d = vacio();
    m.toggleWeekDayMuscle(d, '2026-08-03', 0, 'Pecho');
    m.toggleWeekDayDone(d, '2026-08-03', 0);
    m.toggleAbsCategory(d, '2026-08-03', 0, 'core');
    m.toggleMovilidad(d, '2026-08-03', 0);
    const day = d.gym.weekPlans['2026-08-03'][0];
    expect(day.muscles).toEqual(['Pecho']);
    expect(day.done).toBe(true);
  });
});

describe('notificaciones: token de FCM', () => {
  it('un documento sin ningún token no tiene el campo (se materializa recién al primero)', () => {
    const d = vacio();
    expect(d.fcmTokens).toBeUndefined();
  });

  it('registrar el primer token crea la lista', () => {
    const d = vacio();
    expect(m.registerFcmToken(d, 'tok-1')).toBe(true);
    expect(d.fcmTokens).toEqual(['tok-1']);
  });

  it('registrar el mismo token dos veces no lo duplica', () => {
    const d = vacio();
    m.registerFcmToken(d, 'tok-1');
    expect(m.registerFcmToken(d, 'tok-1')).toBe(false);
    expect(d.fcmTokens).toEqual(['tok-1']);
  });

  it('dos dispositivos distintos quedan como dos tokens', () => {
    const d = vacio();
    m.registerFcmToken(d, 'tok-1');
    m.registerFcmToken(d, 'tok-2');
    expect(d.fcmTokens).toEqual(['tok-1', 'tok-2']);
  });

  it('quitar un token saca solo ese, no los demás', () => {
    const d = vacio();
    m.registerFcmToken(d, 'tok-1');
    m.registerFcmToken(d, 'tok-2');
    expect(m.removeFcmToken(d, 'tok-1')).toBe(true);
    expect(d.fcmTokens).toEqual(['tok-2']);
  });

  it('quitar un token que no existe no rompe, y no crea el campo si no existía', () => {
    const d = vacio();
    expect(m.removeFcmToken(d, 'no-existe')).toBe(false);
    expect(d.fcmTokens).toBeUndefined();
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
    'agregar franja de comidas': (d) => m.addMealSlot(d, { name: 'Desayuno' }),
    'agregar extra de comidas': (d) => m.addMealExtra(d, { name: 'Café', color: '#fff', icon: 'agua' }),
    'agregar entrada a la bitácora de comidas': (d) => m.addMealLogEntry(d, TODAY, 'tomé un café'),
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

describe('dividir un músculo combinado', () => {
  // Un documento con el combinado viejo usado en días sueltos y en un segundo turno.
  function docConCombinado() {
    const d = vacio();
    d.gym.customTypes = [{ id: 'ct1', name: 'Pecho y bicep', color: '#FF9B93' }];
    d.gym.weekPlans['2026-08-03'] = [
      { muscles: ['Pecho y bicep'], done: true },
      { muscles: [], done: false },
      { muscles: ['Pecho y bicep'], done: false, muscles2: ['Pecho y bicep'], done2: true },
      ...Array.from({ length: 4 }, () => ({ muscles: [], done: false })),
    ];
    return d;
  }

  it('crea los músculos sueltos y saca el combinado del catálogo', () => {
    const d = docConCombinado();
    m.splitCustomType(d, 'ct1', ['Pecho', 'Bicep']);

    expect(d.gym.customTypes.map((t) => t.name)).toEqual(['Pecho', 'Bicep']);
  });

  it('el primero hereda el color del combinado, para que el historial no cambie de color', () => {
    const d = docConCombinado();
    m.splitCustomType(d, 'ct1', ['Pecho', 'Bicep']);

    expect(d.gym.customTypes.find((t) => t.name === 'Pecho').color).toBe('#FF9B93');
    expect(d.gym.customTypes.find((t) => t.name === 'Bicep').color).toBeTruthy();
  });

  it('reescribe TODOS los días que lo usaban, en los dos turnos', () => {
    const d = docConCombinado();
    m.splitCustomType(d, 'ct1', ['Pecho', 'Bicep']);

    const plan = d.gym.weekPlans['2026-08-03'];
    expect(plan[0].muscles).toEqual(['Pecho', 'Bicep']);
    expect(plan[2].muscles).toEqual(['Pecho', 'Bicep']);
    expect(plan[2].muscles2).toEqual(['Pecho', 'Bicep']);
    expect(plan[1].muscles).toEqual([]);   // un día que no lo usaba no se toca
  });

  it('cada músculo nuevo cuenta por su cuenta en el historial', () => {
    const d = docConCombinado();
    m.splitCustomType(d, 'ct1', ['Pecho', 'Bicep']);

    // El día 0 estaba hecho: antes aportaba 1 entrada, ahora aporta 2 (una por músculo).
    const hist = gymHistory(d).filter((x) => x.date === '2026-08-03');
    expect(hist.map((x) => x.type).sort()).toEqual(['Bicep', 'Pecho']);
  });

  it('no duplica un músculo que el día ya tenía marcado por separado', () => {
    const d = docConCombinado();
    d.gym.customTypes.push({ id: 'ct2', name: 'Pecho', color: '#fff' });
    d.gym.weekPlans['2026-08-03'][0].muscles = ['Pecho', 'Pecho y bicep'];

    m.splitCustomType(d, 'ct1', ['Pecho', 'Bicep']);
    expect(d.gym.weekPlans['2026-08-03'][0].muscles).toEqual(['Pecho', 'Bicep']);
  });

  it('si un músculo del destino ya existía en el catálogo, no se crea de nuevo', () => {
    const d = docConCombinado();
    d.gym.customTypes.push({ id: 'ct2', name: 'Pecho', color: '#123456' });

    m.splitCustomType(d, 'ct1', ['Pecho', 'Bicep']);
    const pechos = d.gym.customTypes.filter((t) => t.name === 'Pecho');
    expect(pechos).toHaveLength(1);
    expect(pechos[0].color).toBe('#123456');   // se respeta el que ya estaba
  });

  it('dividir en un solo nombre equivale a renombrar, arrastrando el historial', () => {
    const d = docConCombinado();
    m.splitCustomType(d, 'ct1', ['Pectorales']);

    expect(d.gym.customTypes.map((t) => t.name)).toEqual(['Pectorales']);
    expect(d.gym.weekPlans['2026-08-03'][0].muscles).toEqual(['Pectorales']);
  });

  it('nombres repetidos o vacíos en la lista no ensucian el resultado', () => {
    const d = docConCombinado();
    m.splitCustomType(d, 'ct1', ['Pecho', '  ', 'Pecho', 'Bicep']);

    expect(d.gym.customTypes.map((t) => t.name)).toEqual(['Pecho', 'Bicep']);
    expect(d.gym.weekPlans['2026-08-03'][0].muscles).toEqual(['Pecho', 'Bicep']);
  });

  it('una lista vacía no hace nada', () => {
    const d = docConCombinado();
    expect(m.splitCustomType(d, 'ct1', [])).toBe(false);
    expect(d.gym.customTypes.map((t) => t.name)).toEqual(['Pecho y bicep']);
  });

  it('un id que no existe no rompe', () => {
    const d = docConCombinado();
    expect(m.splitCustomType(d, 'zzz', ['Pecho'])).toBe(false);
  });
});

describe('comidas', () => {
  it('meals no existe hasta la primera escritura (mismo truco que fcmTokens)', () => {
    const d = vacio();
    expect(d.meals).toBeUndefined();
    m.addMealSlot(d, { name: 'Desayuno' });
    expect(d.meals).toBeTruthy();
  });

  describe('plan: franjas y opciones', () => {
    it('agregar una franja la suma al final', () => {
      const d = vacio();
      m.addMealSlot(d, { name: 'Desayuno' });
      m.addMealSlot(d, { name: 'Almuerzo' });
      expect(d.meals.plan.map((s) => s.name)).toEqual(['Desayuno', 'Almuerzo']);
      expect(d.meals.plan[0].options).toEqual([]);
    });

    it('renombrar una franja', () => {
      const d = vacio();
      const slot = m.addMealSlot(d, { name: 'Desayuno' });
      m.updateMealSlot(d, slot.id, { name: 'Mañana' });
      expect(d.meals.plan[0].name).toBe('Mañana');
    });

    it('borrar una franja la saca de la lista', () => {
      const d = vacio();
      const slot = m.addMealSlot(d, { name: 'Desayuno' });
      expect(m.deleteMealSlot(d, slot.id)).toBe(true);
      expect(d.meals.plan).toEqual([]);
    });

    it('borrar una franja que no existe da false', () => {
      const d = vacio();
      m.addMealSlot(d, { name: 'Desayuno' });
      expect(m.deleteMealSlot(d, 'zzz')).toBe(false);
    });

    it('mover una franja cambia el orden', () => {
      const d = vacio();
      const a = m.addMealSlot(d, { name: 'A' });
      m.addMealSlot(d, { name: 'B' });
      m.moveMealSlot(d, a.id, 1);
      expect(d.meals.plan.map((s) => s.name)).toEqual(['B', 'A']);
    });

    it('agregar/editar/borrar una opción dentro de una franja', () => {
      const d = vacio();
      const slot = m.addMealSlot(d, { name: 'Almuerzo' });
      const opt = m.addMealOption(d, slot.id, { text: 'Milanesa con ensalada' });
      expect(d.meals.plan[0].options).toEqual([{ id: opt.id, text: 'Milanesa con ensalada' }]);

      m.updateMealOption(d, slot.id, opt.id, { text: 'Milanesa con puré' });
      expect(d.meals.plan[0].options[0].text).toBe('Milanesa con puré');

      expect(m.deleteMealOption(d, slot.id, opt.id)).toBe(true);
      expect(d.meals.plan[0].options).toEqual([]);
    });

    it('una franja admite varias opciones a la vez', () => {
      const d = vacio();
      const slot = m.addMealSlot(d, { name: 'Almuerzo' });
      m.addMealOption(d, slot.id, { text: 'Milanesa' });
      m.addMealOption(d, slot.id, { text: 'Pollo' });
      expect(d.meals.plan[0].options.map((o) => o.text)).toEqual(['Milanesa', 'Pollo']);
    });
  });

  describe('extras (catálogo libre)', () => {
    it('agregar un extra', () => {
      const d = vacio();
      const extra = m.addMealExtra(d, { name: 'Café', color: '#EAC06A', icon: 'agua' });
      expect(d.meals.extras).toEqual([extra]);
    });

    it('nextExtraColor rota por PALETTE según la cantidad actual', () => {
      const d = vacio();
      m.addMealExtra(d, { name: 'Café', color: m.nextExtraColor(d), icon: 'agua' });
      // El color del segundo extra no puede ser igual al criterio de "cantidad 0" otra vez.
      expect(m.nextExtraColor(d)).not.toBe(m.nextExtraColor(vacio()));
    });

    it('editar y borrar un extra', () => {
      const d = vacio();
      const extra = m.addMealExtra(d, { name: 'Café', color: '#fff', icon: 'agua' });
      m.updateMealExtra(d, extra.id, { name: 'Mate', color: '#000', icon: 'agua' });
      expect(d.meals.extras[0]).toMatchObject({ name: 'Mate', color: '#000' });

      expect(m.deleteMealExtra(d, extra.id)).toBe(true);
      expect(d.meals.extras).toEqual([]);
    });

    it('borrar un extra no re-escribe la bitácora ya guardada que lo había matcheado', () => {
      const d = vacio();
      const extra = m.addMealExtra(d, { name: 'Café', color: '#fff', icon: 'agua' });
      m.addMealLogEntry(d, TODAY, 'un café');
      expect(d.meals.log[TODAY][0].matches.extras).toEqual([extra.id]);

      m.deleteMealExtra(d, extra.id);
      // La entrada vieja se queda con el id tal cual, aunque el extra ya no exista.
      expect(d.meals.log[TODAY][0].matches.extras).toEqual([extra.id]);
      expect(d.meals.extras).toEqual([]);
    });
  });

  describe('bitácora diaria', () => {
    it('agregar una entrada corre el matching y lo guarda junto con el texto', () => {
      const d = vacio();
      const slot = m.addMealSlot(d, { name: 'Almuerzo' });
      m.addMealOption(d, slot.id, { text: 'Milanesa con ensalada' });
      const entry = m.addMealLogEntry(d, TODAY, 'Comí milanesa con ensalada');

      expect(entry.text).toBe('Comí milanesa con ensalada');
      expect(entry.matches.options).toEqual([{ slotId: slot.id, optionId: d.meals.plan[0].options[0].id }]);
      expect(d.meals.log[TODAY]).toEqual([entry]);
    });

    it('un texto vacío (o solo espacios) no agrega nada', () => {
      const d = vacio();
      expect(m.addMealLogEntry(d, TODAY, '   ')).toBeNull();
      expect(d.meals).toBeUndefined();
    });

    it('recorta los espacios de los bordes', () => {
      const d = vacio();
      const entry = m.addMealLogEntry(d, TODAY, '  tomé agua  ');
      expect(entry.text).toBe('tomé agua');
    });

    it('varias entradas el mismo día se acumulan, en orden', () => {
      const d = vacio();
      m.addMealLogEntry(d, TODAY, 'primera');
      m.addMealLogEntry(d, TODAY, 'segunda');
      expect(d.meals.log[TODAY].map((e) => e.text)).toEqual(['primera', 'segunda']);
    });

    it('borrar una entrada la saca de la bitácora de ese día', () => {
      const d = vacio();
      const entry = m.addMealLogEntry(d, TODAY, 'algo');
      expect(m.deleteMealLogEntry(d, TODAY, entry.id)).toBe(true);
      expect(d.meals.log[TODAY]).toEqual([]);
    });

    it('borrar de un día sin entradas da false', () => {
      const d = vacio();
      expect(m.deleteMealLogEntry(d, TODAY, 'zzz')).toBe(false);
    });
  });
});
