import { describe, expect, it } from 'vitest';
import { normalize } from './model';
import { habitBestStreak, habitDayMarks, habitDayPossible, habitDone, habitStreak } from './habits';
import { gymHistory, gymRanking, gymTypeStreaks, liftGains, bodyList, weekPlanFor } from './gym';
import { agendaDe, pendVisible, pendientes, tareasDe } from './agenda';
import { dayProgress, progStart, inPeriod } from './progress';
import { TODAY, YESTERDAY, TOMORROW, ago, thisMonday, mondayAgo, fullDoc, emptyDoc } from '../test/fixtures';

/* Los tests de compat/ prueban que React da lo MISMO que la app vanilla. Estos prueban
   que ese resultado además es el CORRECTO, con números escritos a mano.

   La diferencia importa: si un día alguien cambia una fórmula en los dos lados a la vez,
   los diferenciales seguirían en verde y estos no. Son la red que atrapa eso. */

const doc = () => normalize(fullDoc());

describe('rachas de hábitos', () => {
  it('h2 (1 vez por día) viene completo hoy, ayer, anteayer y hace 3 días: racha de 4', () => {
    expect(habitStreak(doc(), 'h2')).toBe(4);
  });

  it('h1 (3 veces por día) hoy va 2 de 3, así que la racha se cuenta desde ayer: 2', () => {
    // ayer 3/3, anteayer 3/3, hace 3 días 1/3 → corta ahí.
    expect(habitStreak(doc(), 'h1')).toBe(2);
  });

  it('un día incompleto no cuenta para la racha', () => {
    expect(habitDone(doc(), 'h1', ago(3))).toBe(false);
    expect(habitDone(doc(), 'h1', ago(2))).toBe(true);
  });

  it('el récord de h2 es 4 (hoy y los tres días anteriores)', () => {
    expect(habitBestStreak(doc(), 'h2')).toBe(4);
  });

  it('un día suelto viejo no extiende el récord', () => {
    // h2 tiene también una marca hace 9 días, aislada.
    expect(habitBestStreak(doc(), 'h2')).toBe(4);
  });

  it('sin marcas, la racha es 0', () => {
    expect(habitStreak(normalize(emptyDoc()), 'x')).toBe(0);
  });

  it('las marcas posibles del día suman el timesPerDay de cada hábito', () => {
    expect(habitDayPossible(doc())).toBe(4);   // h1 (3) + h2 (1)
  });

  it('las marcas hechas se recortan al máximo del hábito', () => {
    const d = normalize({
      habits: [{ id: 'h', name: 'x', timesPerDay: 1 }],
      habitLog: { [TODAY]: { h: 5 } },   // quedó de cuando el hábito era de 5 veces
    });
    expect(habitDayMarks(d, TODAY)).toBe(1);
  });
});

describe('gimnasio', () => {
  it('el historial tiene 6 sesiones (los días marcados que no son descanso)', () => {
    expect(gymHistory(doc())).toHaveLength(6);
  });

  it('el día de Descanso marcado como hecho no entra', () => {
    expect(gymHistory(doc()).every((s) => s.type !== 'Descanso')).toBe(true);
  });

  it('viene del más nuevo al más viejo', () => {
    const h = gymHistory(doc());
    expect(h[0].date >= h[h.length - 1].date).toBe(true);
  });

  it('el ranking cuenta 3 de Pecho y 3 de Espalda', () => {
    const conteos = Object.fromEntries(gymRanking(gymHistory(doc())).map((r) => [r.type, r.count]));
    expect(conteos).toEqual({ Pecho: 3, Espalda: 3 });
  });

  it('Pecho lleva 2 semanas seguidas; Espalda, 3', () => {
    const rachas = gymTypeStreaks(doc());
    expect(rachas.find((r) => r.type === 'Espalda').weeks).toBe(3);
    expect(rachas.find((r) => r.type === 'Pecho').weeks).toBe(2);
  });

  it('la racha se ordena de mayor a menor', () => {
    expect(gymTypeStreaks(doc())[0].type).toBe('Espalda');
  });

  it('el avance de carga se mide del primer al último registro de la ventana', () => {
    const g = liftGains(doc(), null).find((x) => x.id === 'l1');
    expect(g).toMatchObject({ from: 60, to: 72.5, gain: 12.5, n: 3 });
  });

  it('un ejercicio con un solo registro queda afuera (no hay con qué comparar)', () => {
    expect(liftGains(doc(), null).some((g) => g.id === 'l2')).toBe(false);
  });

  it('acotando la ventana cambian los números', () => {
    const g = liftGains(doc(), ago(15)).find((x) => x.id === 'l1');
    expect(g).toMatchObject({ from: 70, to: 72.5, gain: 2.5, n: 2 });
  });

  it('el peso corporal sale ordenado del más viejo al más nuevo', () => {
    expect(bodyList(doc()).map((r) => r.kg)).toEqual([73, 72.5, 71.8]);
  });

  it('una semana sin plan devuelve 7 días de descanso', () => {
    const plan = weekPlanFor(normalize(emptyDoc()), 0);
    expect(plan).toHaveLength(7);
    expect(plan.every((d) => d.type === 'Descanso' && d.done === false)).toBe(true);
  });

  it('las claves de las semanas son lunes', () => {
    expect(new Date(thisMonday + 'T00:00:00').getDay()).toBe(1);
    expect(new Date(mondayAgo(2) + 'T00:00:00').getDay()).toBe(1);
  });
});

describe('agenda', () => {
  it('las tareas de hoy son 2, ordenadas por hora', () => {
    expect(tareasDe(doc(), TODAY).map((t) => t.title)).toEqual(['Tarea de hoy', 'Tarea de hoy hecha']);
  });

  it('una tarea vencida se queda en su fecha, no se arrastra a hoy', () => {
    expect(tareasDe(doc(), TODAY).some((t) => t.title === 'Tarea vencida')).toBe(false);
    expect(tareasDe(doc(), ago(40))).toHaveLength(1);
  });

  it('las tareas sin hora van después de las que tienen hora', () => {
    const conHora = tareasDe(doc(), TODAY).findIndex((t) => t.time === '09:00');
    const sinHora = tareasDe(doc(), TODAY).findIndex((t) => t.time === null);
    expect(conHora).toBeLessThan(sinHora);
  });

  it('la agenda de hoy trae la cita y la fecha anual', () => {
    expect(agendaDe(doc(), TODAY).map((e) => e.kind).sort()).toEqual(['anual', 'cita']);
  });

  it('la fecha anual NO aparece en otro día', () => {
    expect(agendaDe(doc(), TOMORROW).some((e) => e.kind === 'anual')).toBe(false);
  });

  it('la bandeja tiene las 2 tareas sin fecha', () => {
    expect(pendientes(doc())).toHaveLength(2);
  });

  it('una pendiente completada ayer se ve ayer y no hoy', () => {
    const p = pendientes(doc()).find((t) => t.title === 'Pendiente completada');
    expect(pendVisible(p, YESTERDAY)).toBe(true);
    expect(pendVisible(p, TODAY)).toBe(false);
  });

  it('una pendiente sin completar se ve siempre', () => {
    const p = pendientes(doc()).find((t) => t.title === 'Tarea sin fecha');
    expect(pendVisible(p, TODAY)).toBe(true);
    expect(pendVisible(p, ago(100))).toBe(true);
  });
});

describe('progreso del día', () => {
  it('mezcla tareas y marcas de hábitos en un solo porcentaje', () => {
    // hoy: 2 tareas (1 hecha) + 4 marcas posibles (3 hechas) = 4 de 6 → 67%
    expect(dayProgress(doc(), TODAY)).toEqual({ done: 4, total: 6, pct: 67 });
  });

  it('un día sin nada da 0% y no rompe con la división', () => {
    expect(dayProgress(normalize(emptyDoc()), TODAY)).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe('períodos', () => {
  it('"semana" arranca 6 días atrás: la ventana incluye hoy', () => {
    expect(progStart('semana')).toBe(ago(6));
  });

  it('"mes" arranca 29 días atrás', () => {
    expect(progStart('mes')).toBe(ago(29));
  });

  it('"todo" no tiene fecha de inicio', () => {
    expect(progStart('todo')).toBeNull();
  });

  it('sin fecha de inicio, todo entra en el período', () => {
    expect(inPeriod(ago(9999), null)).toBe(true);
  });

  it('el borde de la ventana entra', () => {
    expect(inPeriod(ago(6), progStart('semana'))).toBe(true);
    expect(inPeriod(ago(7), progStart('semana'))).toBe(false);
  });
});
