import { describe, expect, it } from 'vitest';
import {
  dayKicker, dayTitle, hoySubtitle, progressMessage, saludo, shiftWeek, weekDays,
} from './items';
import { monthCells, monthOf, shiftMonth } from './calendar';
import { SECTIONS, accentForPath, sectionForPath } from './sections';
import { addDays, iso, mondayOf, parseISO, todayD, todayISO } from './dates';
import { C } from './theme';

/* Las funciones puras que aparecieron con Hoy y Calendario. Nada de React acá: entra un
   dato, sale un texto o una lista. Lo que se compara contra la app vanilla está en
   src/compat/vanilla.test.js; estos son los casos borde que conviene fijar igual. */

describe('saludo según la hora', () => {
  const alas = (h) => saludo(new Date(2026, 7, 10, h, 0));

  it.each([
    [0, 'Buenas noches'], [5, 'Buenas noches'],
    [6, 'Buenos días'], [12, 'Buenos días'],
    [13, 'Buenas tardes'], [19, 'Buenas tardes'],
    [20, 'Buenas noches'], [23, 'Buenas noches'],
  ])('a las %i hs: %s', (h, esperado) => expect(alas(h)).toBe(esperado));
});

describe('título del día', () => {
  it('mañana y ayer tienen nombre propio', () => {
    expect(dayTitle(addDays(todayD(), 1))).toBe('Mañana');
    expect(dayTitle(addDays(todayD(), -1))).toBe('Ayer');
  });

  /* Las fechas van bien lejos de hoy y en el pasado: "Ayer" y "Mañana" le ganan al día de
     la semana, así que una fecha fija que hoy sirve puede caer justo al lado de hoy dentro
     de un tiempo y romper el test sola. (Pasó: este caso usaba el 10/8/2026 y se rompió
     el 11.) El 6/1/2020 fue lunes y el 11/1/2020, sábado. */
  it('cualquier otro día es su día de la semana', () => {
    expect(dayTitle(new Date(2020, 0, 6))).toBe('Lunes');
    expect(dayTitle(new Date(2020, 0, 11))).toBe('Sábado');
  });

  it('el kicker escribe la fecha completa', () => {
    expect(dayKicker(new Date(2026, 7, 10))).toBe('Lunes 10 de Agosto');
    expect(dayKicker(new Date(2026, 0, 1))).toBe('Jueves 1 de Enero');
  });
});

describe('bajada de la cabecera', () => {
  it('mirando hoy, cuenta lo que queda', () => {
    expect(hoySubtitle({ pendingTasks: 2, pendingHabits: 3, isToday: true }))
      .toBe('Tenés 2 tareas y 3 hábitos para hoy.');
  });

  it('el singular es singular', () => {
    expect(hoySubtitle({ pendingTasks: 1, pendingHabits: 1, isToday: true }))
      .toBe('Tenés 1 tarea y 1 hábito para hoy.');
  });

  it('cero también va en plural', () => {
    expect(hoySubtitle({ pendingTasks: 0, pendingHabits: 0, isToday: true }))
      .toBe('Tenés 0 tareas y 0 hábitos para hoy.');
  });

  it('mirando el futuro y el pasado, dice otra cosa', () => {
    expect(hoySubtitle({ isToday: false, isFuture: true })).toBe('Así viene este día.');
    expect(hoySubtitle({ isToday: false, isFuture: false })).toBe('Podés marcar los hábitos de este día.');
  });
});

describe('mensaje del progreso', () => {
  /* Se replica un detalle de la app vanilla: cuando hay algo que contar, SIEMPRE gana el
     conteo. Los mensajes de aliento que había en el código nunca llegaban a la pantalla
     (ver el comentario en lib/items.js). */
  it('con cosas, cuenta', () => {
    expect(progressMessage({ done: 3, total: 8 })).toBe('3 de 8 completados');
  });

  it('completo, sigue contando (no felicita)', () => {
    expect(progressMessage({ done: 8, total: 8 })).toBe('8 de 8 completados');
  });

  it('sin nada agendado, lo dice', () => {
    expect(progressMessage({ done: 0, total: 0 })).toBe('No tenés nada agendado para este día.');
  });
});

describe('semanas', () => {
  it('devuelve siete días desde el lunes', () => {
    const dias = weekDays(mondayOf(parseISO('2026-08-12')));   // miércoles
    expect(dias).toHaveLength(7);
    expect(dias[0]).toBe('2026-08-10');
    expect(dias[6]).toBe('2026-08-16');
  });

  it('correr semanas suma y resta siete días', () => {
    expect(shiftWeek('2026-08-10', 1)).toBe('2026-08-17');
    expect(shiftWeek('2026-08-10', -1)).toBe('2026-08-03');
  });

  it('cruza el cambio de mes y de año sin ayuda', () => {
    expect(shiftWeek('2026-12-29', 1)).toBe('2027-01-05');
    expect(shiftWeek('2026-01-02', -1)).toBe('2025-12-26');
  });
});

describe('grilla del mes', () => {
  it('agosto de 2026 arranca sábado: cinco huecos antes del 1', () => {
    const cells = monthCells(2026, 7);
    expect(cells.slice(0, 5).every((c) => c === null)).toBe(true);
    expect(cells[5]).toEqual({ day: 1, dISO: '2026-08-01' });
    expect(cells).toHaveLength(5 + 31);
  });

  it('un mes que arranca lunes no lleva huecos', () => {
    const cells = monthCells(2026, 5);   // junio 2026 arranca lunes
    expect(cells[0]).toEqual({ day: 1, dISO: '2026-06-01' });
  });

  it('febrero bisiesto tiene 29', () => {
    const dias = monthCells(2024, 1).filter(Boolean);
    expect(dias).toHaveLength(29);
    expect(dias[28].dISO).toBe('2024-02-29');
  });

  it('febrero normal tiene 28', () => {
    expect(monthCells(2026, 1).filter(Boolean)).toHaveLength(28);
  });

  it('las fechas son reales, no un contador', () => {
    const cells = monthCells(2026, 7).filter(Boolean);
    expect(cells.map((c) => c.dISO)).toEqual(
      Array.from({ length: 31 }, (_, i) => iso(new Date(2026, 7, i + 1))),
    );
  });
});

describe('navegación de meses', () => {
  it('avanza y retrocede', () => {
    expect(shiftMonth({ y: 2026, m: 5 }, 1)).toEqual({ y: 2026, m: 6 });
    expect(shiftMonth({ y: 2026, m: 5 }, -1)).toEqual({ y: 2026, m: 4 });
  });

  it('de diciembre pasa a enero del año que viene', () => {
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
  });

  it('de enero vuelve a diciembre del anterior', () => {
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
  });

  it('no muta el objeto que recibe (es estado de React)', () => {
    const view = { y: 2026, m: 0 };
    shiftMonth(view, -1);
    expect(view).toEqual({ y: 2026, m: 0 });
  });

  it('monthOf() ubica el mes de una fecha', () => {
    expect(monthOf('2026-08-10')).toEqual({ y: 2026, m: 7 });
    expect(monthOf(todayISO())).toEqual({ y: todayD().getFullYear(), m: todayD().getMonth() });
  });
});

describe('secciones', () => {
  it('la raíz es Hoy', () => {
    expect(sectionForPath('/').key).toBe('hoy');
  });

  it('cada sección se reconoce por su URL', () => {
    expect(sectionForPath('/calendario').key).toBe('calendario');
    expect(sectionForPath('/gym').key).toBe('gym');
    expect(sectionForPath('/progreso').key).toBe('progreso');
  });

  it('Ajustes cuenta como Hoy: es su sub-pantalla', () => {
    expect(sectionForPath('/ajustes').key).toBe('hoy');
  });

  it('las pantallas de sesión no son ninguna sección', () => {
    expect(sectionForPath('/login')).toBeNull();
    expect(sectionForPath('/registro')).toBeNull();
  });

  it('el acento sale de la sección, y fuera de ellas manda el ámbar', () => {
    expect(accentForPath('/')).toBe(C.amber);
    expect(accentForPath('/calendario')).toBe(C.coral);
    expect(accentForPath('/habitos')).toBe(C.green);
    expect(accentForPath('/login')).toBe(C.amber);
  });

  it('son cinco, en el orden de la barra: todas listas desde la etapa 3c', () => {
    expect(SECTIONS.map((s) => s.key)).toEqual(['hoy', 'calendario', 'gym', 'habitos', 'progreso']);
  });
});
