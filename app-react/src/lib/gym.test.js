import { describe, expect, it } from 'vitest';
import { ABS_TYPE, dayAbs, dayTurnos, describeAbs, gymDayCounts, gymDayTypes, gymHistory, gymRanking, repsLabel, REST, typeColor } from './gym';
import { normalize } from './model';
import { emptyDoc } from '../test/fixtures';

/* ============================================================================
   ENTRENAMIENTOS DOBLES + SEGUIMIENTO POR MÚSCULO

   muscles2/done2 no existen en vanilla — no hay contra qué comparar, así que esto se
   prueba directo en vez de en src/compat/. El seguimiento por músculo (muscles como
   array en vez de un solo type) tampoco tiene equivalente: la app vanilla quedó de baja.
   ============================================================================ */

describe('dayTurnos', () => {
  it('un día sin muscles2 da un solo turno', () => {
    const day = { muscles: ['Pecho'], done: true };
    expect(dayTurnos(day)).toEqual([{ slot: 1, muscles: ['Pecho'], done: true }]);
  });

  it('con muscles2 da dos turnos', () => {
    const day = { muscles: [], done: false, muscles2: ['Cardio'], done2: true };
    expect(dayTurnos(day)).toEqual([
      { slot: 1, muscles: [], done: false },
      { slot: 2, muscles: ['Cardio'], done: true },
    ]);
  });

  it('un turno puede tener varios músculos a la vez', () => {
    const day = { muscles: ['Espalda', 'Tríceps', 'Hombro'], done: true };
    expect(dayTurnos(day)).toEqual([{ slot: 1, muscles: ['Espalda', 'Tríceps', 'Hombro'], done: true }]);
  });

  it('muscles2 vacío (borrado a mano en vez de con removeSecondTurno) cuenta como "no hay"', () => {
    expect(dayTurnos({ muscles: ['Pecho'], done: false, muscles2: undefined })).toHaveLength(1);
  });

  it('done ausente (día muy viejo) no explota: cuenta como no hecho', () => {
    expect(dayTurnos({ muscles: ['Pecho'] })).toEqual([{ slot: 1, muscles: ['Pecho'], done: false }]);
  });
});

describe('gymHistory con turnos dobles', () => {
  function docCon(day) {
    const d = normalize(emptyDoc());
    d.gym.weekPlans['2026-08-03'] = [day, ...Array.from({ length: 6 }, () => ({ muscles: [], done: false }))];
    return d;
  }

  it('un día con los dos turnos hechos aporta DOS entradas al historial', () => {
    const d = docCon({ muscles: ['Pecho'], done: true, muscles2: ['Cardio'], done2: true });
    const hist = gymHistory(d);
    expect(hist).toHaveLength(2);
    expect(hist.map((h) => h.type).sort()).toEqual(['Cardio', 'Pecho']);
    expect(hist.every((h) => h.date === '2026-08-03')).toBe(true);
  });

  it('un turno con varios músculos aporta una entrada POR CADA UNO', () => {
    const d = docCon({ muscles: ['Espalda', 'Tríceps', 'Hombro'], done: true });
    const hist = gymHistory(d);
    expect(hist).toHaveLength(3);
    expect(hist.map((h) => h.type).sort()).toEqual(['Espalda', 'Hombro', 'Tríceps']);
    expect(hist.every((h) => h.date === '2026-08-03')).toBe(true);
  });

  it('si el segundo turno no está hecho, solo cuenta el primero', () => {
    const d = docCon({ muscles: ['Pecho'], done: true, muscles2: ['Cardio'], done2: false });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: 'Pecho' }]);
  });

  it('un turno de descanso (sin músculos) hecho no cuenta como entreno (ni el primero ni el segundo)', () => {
    const d = docCon({ muscles: [], done: true, muscles2: [], done2: true });
    expect(gymHistory(d)).toEqual([]);
  });
});

describe('gymHistory cuenta abs como entreno, movilidad no (pedido explícito de Lulo)', () => {
  function docCon(day) {
    const d = normalize(emptyDoc());
    d.gym.weekPlans['2026-08-03'] = [day, ...Array.from({ length: 6 }, () => ({ muscles: [], done: false }))];
    return d;
  }

  it('un día con alguna categoría de abs marcada aporta una entrada con type ABS_TYPE', () => {
    const d = docCon({ muscles: [], done: false, absCategories: ['core'] });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: ABS_TYPE }]);
  });

  it('movilidad sola, sin ninguna categoría, NO aporta nada al historial', () => {
    const d = docCon({ muscles: [], done: false, movilidad: true });
    expect(gymHistory(d)).toEqual([]);
  });

  it('varias categorías el mismo día son UN solo evento, no uno por categoría', () => {
    const d = docCon({ muscles: [], done: false, absCategories: ['core', 'oblicuos', 'altos'] });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: ABS_TYPE }]);
  });

  it('abs y movilidad juntas: igual una sola entrada (la de abs)', () => {
    const d = docCon({ muscles: [], done: false, absCategories: ['bajos'], movilidad: true });
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: ABS_TYPE }]);
  });

  it('un día con turno de entreno Y abs aporta dos entradas: una por cada uno', () => {
    const d = docCon({ muscles: ['Pecho'], done: true, absCategories: ['core'] });
    const hist = gymHistory(d);
    expect(hist).toHaveLength(2);
    expect(hist.map((h) => h.type).sort()).toEqual([ABS_TYPE, 'Pecho']);
  });

  it('abs entra al ranking como cualquier músculo que se cree', () => {
    const d = docCon({ muscles: ['Pecho'], done: true, absCategories: ['core'] });
    expect(gymRanking(gymHistory(d))).toEqual(
      expect.arrayContaining([{ type: 'Pecho', count: 1 }, { type: ABS_TYPE, count: 1 }]),
    );
  });

  it('typeColor(ABS_TYPE) da el violeta del renglón de abs, sin depender de customTypes', () => {
    const d = normalize(emptyDoc());
    expect(typeColor(d, ABS_TYPE)).toBe('#B49BE8');
  });
});

describe('gymDayCounts (etapa 7, mapa de entrenamientos)', () => {
  it('un día sin entrenos no aparece en el objeto', () => {
    expect(gymDayCounts([])).toEqual({});
  });

  it('cuenta una entrada por día', () => {
    const hist = [{ date: '2026-08-03', type: 'Pecho' }, { date: '2026-08-05', type: 'Espalda' }];
    expect(gymDayCounts(hist)).toEqual({ '2026-08-03': 1, '2026-08-05': 1 });
  });

  it('un día con dos turnos y abs suma 3, no se pisan entre sí', () => {
    const hist = [
      { date: '2026-08-03', type: 'Pecho' },
      { date: '2026-08-03', type: 'Cardio' },
      { date: '2026-08-03', type: ABS_TYPE },
    ];
    expect(gymDayCounts(hist)).toEqual({ '2026-08-03': 3 });
  });
});

describe('gymDayTypes (etapa 7, globito del mapa de entrenamientos)', () => {
  it('un día sin entrenos no aparece en el objeto', () => {
    expect(gymDayTypes([])).toEqual({});
  });

  it('un tipo por día', () => {
    const hist = [{ date: '2026-08-03', type: 'Pecho' }, { date: '2026-08-05', type: 'Espalda' }];
    expect(gymDayTypes(hist)).toEqual({ '2026-08-03': ['Pecho'], '2026-08-05': ['Espalda'] });
  });

  it('varios tipos el mismo día quedan en orden, sin pisarse', () => {
    const hist = [
      { date: '2026-08-03', type: 'Pecho' },
      { date: '2026-08-03', type: 'Cardio' },
      { date: '2026-08-03', type: ABS_TYPE },
    ];
    expect(gymDayTypes(hist)).toEqual({ '2026-08-03': ['Pecho', 'Cardio', ABS_TYPE] });
  });
});

describe('dayAbs', () => {
  it('un día sin absCategories ni movilidad: nada marcado', () => {
    expect(dayAbs({ muscles: ['Pecho'], done: true })).toEqual({ categories: [], movilidad: false });
  });

  it('lee absCategories y movilidad tal cual estén', () => {
    const day = { muscles: ['Pecho'], done: true, absCategories: ['core', 'oblicuos'], movilidad: true };
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

describe('repsLabel (etapa 7, cargas por ejercicio)', () => {
  it('sin reps da string vacío', () => {
    expect(repsLabel(undefined)).toBe('');
    expect(repsLabel(0)).toBe('');
  });

  it('con reps da " × N"', () => {
    expect(repsLabel(5)).toBe(' × 5');
  });
});

describe('migración type/type2 → muscles/muscles2 (normalize)', () => {
  it('un día viejo con type se convierte a muscles: [type]', () => {
    const doc = emptyDoc();
    doc.gym = doc.gym || {};
    doc.gym.weekPlans = { '2026-08-03': [{ type: 'Pecho', done: true }, ...Array.from({ length: 6 }, () => ({ type: REST, done: false }))] };
    const d = normalize(doc);
    expect(d.gym.weekPlans['2026-08-03'][0]).toEqual({ muscles: ['Pecho'], done: true });
    expect(d.gym.weekPlans['2026-08-03'][1]).toEqual({ muscles: [], done: false });
  });

  it('type2/done2 migran a muscles2/done2', () => {
    const doc = emptyDoc();
    doc.gym = doc.gym || {};
    doc.gym.weekPlans = { '2026-08-03': [{ type: 'Pecho', done: true, type2: 'Cardio', done2: false }, ...Array.from({ length: 6 }, () => ({ type: REST, done: false }))] };
    const d = normalize(doc);
    expect(d.gym.weekPlans['2026-08-03'][0]).toEqual({ muscles: ['Pecho'], done: true, muscles2: ['Cardio'], done2: false });
  });

  it('un día roto (sin type ni muscles) queda como descanso en vez de reventar', () => {
    const doc = emptyDoc();
    doc.gym = doc.gym || {};
    doc.gym.weekPlans = { '2026-08-03': [{ done: true }, ...Array.from({ length: 6 }, () => ({ muscles: [], done: false }))] };
    const d = normalize(doc);
    expect(d.gym.weekPlans['2026-08-03'][0]).toEqual({ muscles: [], done: true });
    expect(() => gymHistory(d)).not.toThrow();
  });

  it('un muscles2 que no es una lista se descarta (no deja un turno roto)', () => {
    const doc = emptyDoc();
    doc.gym = doc.gym || {};
    doc.gym.weekPlans = { '2026-08-03': [{ muscles: ['Pecho'], done: true, muscles2: 'Espalda', done2: true }, ...Array.from({ length: 6 }, () => ({ muscles: [], done: false }))] };
    const d = normalize(doc);
    expect('muscles2' in d.gym.weekPlans['2026-08-03'][0]).toBe(false);
    expect(gymHistory(d)).toEqual([{ date: '2026-08-03', type: 'Pecho' }]);
  });

  it('es idempotente: un día ya migrado no se vuelve a tocar', () => {
    const doc = emptyDoc();
    doc.gym = doc.gym || {};
    doc.gym.weekPlans = { '2026-08-03': [{ muscles: ['Espalda', 'Tríceps'], done: true }, ...Array.from({ length: 6 }, () => ({ muscles: [], done: false }))] };
    const d = normalize(normalize(doc));
    expect(d.gym.weekPlans['2026-08-03'][0]).toEqual({ muscles: ['Espalda', 'Tríceps'], done: true });
  });
});
