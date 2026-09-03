import { describe, expect, it } from 'vitest';
import { ABS_TYPE, dayAbs, dayTurnos, describeAbs, gymHistory, gymRanking, REST, typeColor } from './gym';
import { normalize } from './model';
import { emptyDoc } from '../test/fixtures';

/* ============================================================================
   ENTRENAMIENTOS DOBLES (etapa 6)

   type2/done2 no existen en vanilla — no hay contra qué comparar, así que esto se prueba
   directo en vez de en src/compat/. Lo único que importa de verdad: un día VIEJO, sin
   estos campos, se lee exactamente igual que antes (dayTurnos() devuelve un solo turno).
   ============================================================================ */

describe('dayTurnos', () => {
  it('un día sin type2 da un solo turno', () => {
    const day = { type: 'Pecho', done: true };
    expect(dayTurnos(day)).toEqual([{ slot: 1, type: 'Pecho', done: true }]);
  });

  it('con type2 da dos turnos', () => {
    const day = { type: 'Descanso', done: false, type2: 'Cardio', done2: true };
    expect(dayTurnos(day)).toEqual([
      { slot: 1, type: 'Descanso', done: false },
      { slot: 2, type: 'Cardio', done: true },
    ]);
  });

  it('type2 vacío (borrado a mano en vez de con removeSecondTurno) cuenta como "no hay"', () => {
    expect(dayTurnos({ type: 'Pecho', done: false, type2: '' })).toHaveLength(1);
  });

  it('done ausente (día muy viejo) no explota: cuenta como no hecho', () => {
    expect(dayTurnos({ type: 'Pecho' })).toEqual([{ slot: 1, type: 'Pecho', done: false }]);
  });
});

describe('gymHistory con turnos dobles', () => {
  function docCon(day) {
    const d = normalize(emptyDoc());
    d.gym.weekPlans['2026-08-03'] = [day, ...Array.from({ length: 6 }, () => ({ type: REST, done: false }))];
    return d;
  }

  it('un día con los dos turnos hechos aporta DOS entradas al historial', () => {
    const d = docCon({ type: 'Pecho', done: true, type2: 'Cardio', done2: true });
    const hist = gymHistory(d);
    expect(hist).toHaveLength(2);
    expect(hist.map((h) => h.type).sort()).toEqual(['Cardio', 'Pecho']);
    expect(hist.every((h) => h.date === '2026-08-03')).toBe(true);
  });

  it('si el segundo turno no está hecho, solo cuenta el primero', () => {
    const d = docCon({ type: 'Pecho', done: true, type2: 'Cardio', done2: false });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: 'Pecho' }]);
  });

  it('un turno de descanso hecho no cuenta como entreno (ni el primero ni el segundo)', () => {
    const d = docCon({ type: REST, done: true, type2: REST, done2: true });
    expect(gymHistory(d)).toEqual([]);
  });
});

describe('gymHistory cuenta abs como entreno, movilidad no (pedido explícito de Lulo)', () => {
  function docCon(day) {
    const d = normalize(emptyDoc());
    d.gym.weekPlans['2026-08-03'] = [day, ...Array.from({ length: 6 }, () => ({ type: REST, done: false }))];
    return d;
  }

  it('un día con alguna categoría de abs marcada aporta una entrada con type ABS_TYPE', () => {
    const d = docCon({ type: REST, done: false, absCategories: ['core'] });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: ABS_TYPE }]);
  });

  it('movilidad sola, sin ninguna categoría, NO aporta nada al historial', () => {
    const d = docCon({ type: REST, done: false, movilidad: true });
    expect(gymHistory(d)).toEqual([]);
  });

  it('varias categorías el mismo día son UN solo evento, no uno por categoría', () => {
    const d = docCon({ type: REST, done: false, absCategories: ['core', 'oblicuos', 'altos'] });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: ABS_TYPE }]);
  });

  it('abs y movilidad juntas: igual una sola entrada (la de abs)', () => {
    const d = docCon({ type: REST, done: false, absCategories: ['bajos'], movilidad: true });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: ABS_TYPE }]);
  });

  it('un día con turno de entreno Y abs aporta dos entradas: una por cada uno', () => {
    const d = docCon({ type: 'Pecho', done: true, absCategories: ['core'] });
    const hist = gymHistory(d);
    expect(hist).toHaveLength(2);
    expect(hist.map((h) => h.type).sort()).toEqual([ABS_TYPE, 'Pecho']);
  });

  it('abs entra al ranking como cualquier tipo que se cree', () => {
    const d = docCon({ type: 'Pecho', done: true, absCategories: ['core'] });
    expect(gymRanking(gymHistory(d))).toEqual(
      expect.arrayContaining([{ type: 'Pecho', count: 1 }, { type: ABS_TYPE, count: 1 }]),
    );
  });

  it('typeColor(ABS_TYPE) da el violeta del renglón de abs, sin depender de customTypes', () => {
    const d = normalize(emptyDoc());
    expect(typeColor(d, ABS_TYPE)).toBe('#B49BE8');
  });
});

describe('dayAbs', () => {
  it('un día sin absCategories ni movilidad: nada marcado', () => {
    expect(dayAbs({ type: 'Pecho', done: true })).toEqual({ categories: [], movilidad: false });
  });

  it('lee absCategories y movilidad tal cual estén', () => {
    const day = { type: 'Pecho', done: true, absCategories: ['core', 'oblicuos'], movilidad: true };
    expect(dayAbs(day)).toEqual({ categories: ['core', 'oblicuos'], movilidad: true });
  });

  it('absCategories sin movilidad: movilidad da false, no undefined', () => {
    expect(dayAbs({ absCategories: ['bajos'] })).toEqual({ categories: ['bajos'], movilidad: false });
  });
});

describe('describeAbs', () => {
  it('junta las categorías con coma', () => {
    expect(describeAbs({ categories: ['core', 'oblicuos'], movilidad: false })).toBe('Core, Oblicuos');
  });

  it('agrega Movilidad al final si corresponde', () => {
    expect(describeAbs({ categories: ['core'], movilidad: true })).toBe('Core, Movilidad');
  });

  it('movilidad sola, sin categorías', () => {
    expect(describeAbs({ categories: [], movilidad: true })).toBe('Movilidad');
  });

  it('nada marcado da null, no un string vacío', () => {
    expect(describeAbs({ categories: [], movilidad: false })).toBeNull();
  });
});
