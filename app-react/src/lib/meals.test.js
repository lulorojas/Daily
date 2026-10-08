import { describe, expect, it } from 'vitest';
import { extraCount, extraLoggedOn, extraMatchDates, extraStreak, matchEntry, normalizeText } from './meals';

/* ============================================================================
   COMIDAS: el "bot" sin IA (substring match) y la frecuencia de extras.

   Sin equivalente en vanilla: se prueba directo, con documentos armados a mano.
   ============================================================================ */

function state({ plan = [], extras = [], log = {} } = {}) {
  return { meals: { plan, extras, log } };
}

describe('normalizeText', () => {
  it('pasa a minúsculas', () => {
    expect(normalizeText('MILANESA')).toBe('milanesa');
  });

  it('saca tildes', () => {
    expect(normalizeText('café con leché')).toBe('cafe con leche');
  });

  it('colapsa espacios repetidos y recorta los de los bordes', () => {
    expect(normalizeText('  pan   con   queso  ')).toBe('pan con queso');
  });
});

describe('matchEntry', () => {
  const plan = [
    { id: 's1', name: 'Almuerzo', options: [{ id: 'o1', text: 'Milanesa con ensalada' }, { id: 'o2', text: 'Pollo con arroz' }] },
  ];
  const extras = [{ id: 'e1', name: 'Café', color: '#fff', icon: 'agua' }, { id: 'e2', name: 'Permitidos', color: '#fff', icon: 'agua' }];

  it('matchea una opción del plan por substring', () => {
    const s = state({ plan, extras });
    expect(matchEntry(s, 'Comí milanesa con ensalada y quedé lleno')).toEqual({
      options: [{ slotId: 's1', optionId: 'o1' }],
      extras: [],
    });
  });

  it('matchea sin importar mayúsculas ni tildes', () => {
    const s = state({ plan, extras });
    expect(matchEntry(s, 'CAFÉ antes de salir').extras).toEqual(['e1']);
  });

  it('matchea varios extras a la vez', () => {
    const s = state({ plan, extras });
    expect(matchEntry(s, 'un café con un permitidos').extras.sort()).toEqual(['e1', 'e2']);
  });

  it('un extra con nombre en plural no matchea su forma singular/distinta (límite conocido)', () => {
    const s = state({ plan, extras: [{ id: 'e2', name: 'Permitidos', color: '#fff', icon: 'agua' }] });
    expect(matchEntry(s, 'me di un permitido').extras).toEqual([]);
  });

  it('sin ningún match, devuelve listas vacías (la entrada se guarda igual, afuera de acá)', () => {
    const s = state({ plan, extras });
    expect(matchEntry(s, 'tomé agua nomás')).toEqual({ options: [], extras: [] });
  });

  it('sin state.meals (cuenta que nunca usó Comidas), no explota', () => {
    expect(matchEntry({}, 'milanesa')).toEqual({ options: [], extras: [] });
  });
});

describe('frecuencia de extras', () => {
  function docCon(entradas) {
    const log = {};
    entradas.forEach(([dISO, extraIds]) => { (log[dISO] ||= []).push({ id: 'x', at: 0, text: 't', matches: { options: [], extras: extraIds } }); });
    return state({ extras: [{ id: 'e1', name: 'Café', color: '#fff', icon: 'agua' }], log });
  }

  it('extraMatchDates junta todas las fechas, con repetición', () => {
    const s = docCon([['2026-08-01', ['e1']], ['2026-08-01', []], ['2026-08-02', ['e1']]]);
    expect(extraMatchDates(s, 'e1')).toEqual(['2026-08-01', '2026-08-02']);
  });

  it('extraLoggedOn da true solo si matcheó ESE día', () => {
    const s = docCon([['2026-08-01', ['e1']]]);
    expect(extraLoggedOn(s, 'e1', '2026-08-01')).toBe(true);
    expect(extraLoggedOn(s, 'e1', '2026-08-02')).toBe(false);
  });

  it('extraStreak cuenta días consecutivos hacia atrás desde hoy', () => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const iso = (d) => d.toISOString().slice(0, 10);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const anteayer = new Date(hoy); anteayer.setDate(anteayer.getDate() - 2);
    const s = docCon([[iso(hoy), ['e1']], [iso(ayer), ['e1']], [iso(anteayer), ['e1']]]);
    expect(extraStreak(s, 'e1')).toBe(3);
  });

  it('extraStreak es 0 si no matcheó ni hoy ni ayer', () => {
    const s = docCon([]);
    expect(extraStreak(s, 'e1')).toBe(0);
  });

  it('extraCount cuenta ocurrencias en un período, null = todo el historial', () => {
    const s = docCon([['2026-08-01', ['e1']], ['2026-08-10', ['e1']], ['2026-09-01', ['e1']]]);
    expect(extraCount(s, 'e1', null)).toBe(3);
    expect(extraCount(s, 'e1', '2026-08-05')).toBe(2);
  });

  it('un extra sin ninguna marca da 0 en todo', () => {
    const s = docCon([]);
    expect(extraCount(s, 'e1', null)).toBe(0);
    expect(extraMatchDates(s, 'e1')).toEqual([]);
  });
});
