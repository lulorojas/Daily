import { describe, expect, it } from 'vitest';
import {
  activePlan, breakdownLabel, comoComes, dayMealSummary, extraCount, extraLoggedOn, extraMatchDates, extraStreak,
  itemsBreakdown, itemsCompliance, itemsLabel, matchEntry, missingFromTemplate, normalizeText, optionLabel, qtyLabel,
} from './meals';
import { mondayAgo, thisMonday } from '../test/fixtures';

/* ============================================================================
   COMIDAS: el "bot" sin IA (substring match), la frecuencia de extras y el seguimiento
   de adherencia al plan ("Cómo comés").

   Sin equivalente en vanilla: se prueba directo, con documentos armados a mano.
   ============================================================================ */

// `plan` acá es la lista de franjas de la versión ACTIVA — el helper arma esa única
// versión (`endISO: null`) para no repetir el envoltorio de `plans` en cada test.
function state({ plan = [], extras = [], log = {} } = {}) {
  return { meals: { plans: [{ id: 'p1', startISO: '2026-01-01', endISO: null, slots: plan }], extras, log } };
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

/* Opciones cuantificadas (pedido explícito: "quiero que las opciones de cada comida y lo
   que yo comí importe... si ese día comí 2 tostadas y 3 huevos"). Lulo confirmó que
   escribe "número pegado al alimento". */
describe('matchEntry: opciones con ítems de cantidad', () => {
  const planItems = [
    { id: 's1', name: 'Desayuno', options: [{ id: 'o1', items: [{ id: 'i1', name: 'tostadas', qty: 3 }, { id: 'i2', name: 'huevos', qty: 3 }] }] },
  ];

  it('"2 tostadas" matchea con la cantidad exacta escrita', () => {
    const s = state({ plan: planItems });
    const { options } = matchEntry(s, 'comí 2 tostadas y 3 huevos');
    expect(options).toEqual([{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 2 }, { itemId: 'i2', qty: 3 }] }]);
  });

  it('el nombre del ítem SIN número cuenta como "la cantidad entera del plan"', () => {
    const s = state({ plan: planItems });
    const { options } = matchEntry(s, 'comí tostadas y huevos');
    expect(options[0].items).toEqual([{ itemId: 'i1', qty: 3 }, { itemId: 'i2', qty: 3 }]);
  });

  it('un ítem que no aparece para nada cuenta 0, pero no se omite de la lista', () => {
    const s = state({ plan: planItems });
    const { options } = matchEntry(s, 'comí 2 tostadas'); // sin mencionar huevos
    expect(options[0].items).toEqual([{ itemId: 'i1', qty: 2 }, { itemId: 'i2', qty: 0 }]);
  });

  it('si NINGÚN ítem aparece, la opción no está referenciada (no hay match)', () => {
    const s = state({ plan: planItems });
    expect(matchEntry(s, 'tomé agua nomás').options).toEqual([]);
  });

  it('sin tildes ni mayúsculas, igual matchea', () => {
    const s = state({ plan: planItems });
    expect(matchEntry(s, '3 TOSTADAS').options[0].items[0]).toEqual({ itemId: 'i1', qty: 3 });
  });
});

/* Pesos (pedido explícito: "no solo cantidades, a veces pueden ser pesos"). */
describe('matchEntry: ítems en gramos', () => {
  const plan = [
    { id: 's1', name: 'Almuerzo', options: [{ id: 'o1', text: 'Pollo con papas', items: [{ id: 'i1', name: 'pollo', qty: 250, unit: 'gr' }, { id: 'i2', name: 'papa', qty: 3 }] }] },
  ];

  it.each([
    ['200gr de pollo'],
    ['200 gr de pollo'],
    ['200 gramos de pollo'],
    ['200g pollo'],
    ['200 pollo'],
  ])('"%s" cuenta 200', (texto) => {
    expect(matchEntry(state({ plan }), texto).options[0].items[0]).toEqual({ itemId: 'i1', qty: 200 });
  });

  it('nombrar la opción sin ningún ítem cuenta como comida entera', () => {
    const { options } = matchEntry(state({ plan }), 'comí pollo con papas');
    expect(options[0].items).toEqual([{ itemId: 'i1', qty: 250 }, { itemId: 'i2', qty: 3 }]);
  });
});

describe('etiquetas', () => {
  it('qtyLabel: unidades sin sufijo, gramos con "gr"', () => {
    expect(qtyLabel(3, undefined)).toBe('3');
    expect(qtyLabel(200, 'gr')).toBe('200 gr');
  });

  it('itemsLabel arma lo que lleva una opción en una línea', () => {
    expect(itemsLabel([{ name: 'pan', qty: 3 }, { name: 'fruta', qty: 200, unit: 'gr' }])).toBe('3 pan, 200 gr fruta');
  });

  it('optionLabel: el nombre si lo tiene; si no, lo que lleva', () => {
    expect(optionLabel({ text: 'Milanesa con ensalada' })).toBe('Milanesa con ensalada');
    expect(optionLabel({ text: 'Tostadas', items: [{ name: 'tostada', qty: 3 }] })).toBe('Tostadas');
    expect(optionLabel({ items: [{ id: 'i1', name: 'Tostadas', qty: 3 }, { id: 'i2', name: 'Huevos', qty: 3 }] })).toBe('3 Tostadas, 3 Huevos');
  });

  it('breakdownLabel: "2/3 pan" y "150/200 gr pollo"', () => {
    expect(breakdownLabel({ got: 2, expected: 3, name: 'pan' })).toBe('2/3 pan');
    expect(breakdownLabel({ got: 150, expected: 200, unit: 'gr', name: 'pollo' })).toBe('150/200 gr pollo');
  });
});

/* "Tu día" (pedido explícito: "que yo pueda llevar de una manera fácil, clara y didáctica
   el registro de mis comidas"). */
describe('dayMealSummary', () => {
  const DIA = '2026-10-14';
  const plan = [
    { id: 's1', name: 'Desayuno', options: [{ id: 'o1', text: 'Panes', items: [{ id: 'i1', name: 'pan', qty: 3 }] }] },
    { id: 's2', name: 'Cena', options: [{ id: 'o2', text: 'Milanesa' }] },
  ];
  const entrada = (matchOpts, extra = {}) => ({ id: Math.random().toString(36), at: 0, text: 't', matches: { options: matchOpts, extras: [] }, ...extra });

  it('sin nada registrado: todo pendiente, 0% y la frase para empezar', () => {
    const r = dayMealSummary(state({ plan }), DIA);
    expect(r.franjas.map((f) => f.status.key)).toEqual(['pendiente', 'pendiente']);
    expect(r.pct).toBe(0);
    expect(r.message).toBe('Todavía no registraste nada. Tocá una comida para empezar.');
  });

  it('2 de 3 panes es "parcial"; una opción sin ítems, "cumplida"', () => {
    const log = { [DIA]: [
      entrada([{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 2 }] }]),
      entrada([{ slotId: 's2', optionId: 'o2' }]),
    ] };
    const r = dayMealSummary(state({ plan, log }), DIA);
    expect(r.franjas.map((f) => f.status.key)).toEqual(['parcial', 'cumplida']);
    expect(r.pct).toBeCloseTo((2 / 3 + 1) / 2);
    expect(r.message).toBe('Registraste todas las comidas, algunas por debajo de lo que pide el plan.');
  });

  it('dos registros de la misma franja: vale el mejor, no se suman', () => {
    const log = { [DIA]: [
      entrada([{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 1 }] }]),
      entrada([{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 3 }] }]),
    ] };
    expect(dayMealSummary(state({ plan, log }), DIA).franjas[0].pct).toBe(1);
  });

  it('con una franja sin registrar, la frase dice cuál falta', () => {
    const log = { [DIA]: [entrada([{ slotId: 's2', optionId: 'o2' }])] };
    expect(dayMealSummary(state({ plan, log }), DIA).message).toBe('Te falta: Desayuno.');
  });

  it('todo cumplido: "día completo"', () => {
    const log = { [DIA]: [
      entrada([{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 3 }] }]),
      entrada([{ slotId: 's2', optionId: 'o2' }]),
    ] };
    expect(dayMealSummary(state({ plan, log }), DIA).message).toBe('¡Día completo! Seguiste el plan en todas las comidas.');
  });

  it('cuenta lo que no es ni del plan ni un extra como "fuera del plan", y lleva el "pesado"', () => {
    const log = { [DIA]: [
      { id: 'a', at: 0, text: 'pastel de carne', matches: { options: [], extras: [] } },
      entrada([{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 3 }] }], { pesado: true }),
    ] };
    const r = dayMealSummary(state({ plan, log }), DIA);
    expect(r.fueraDePlan).toBe(1);
    expect(r.franjas[0].registros[0].pesado).toBe(true);
  });

  it('sin plan, no hay franjas ni frase', () => {
    const r = dayMealSummary({}, DIA);
    expect(r.franjas).toEqual([]);
    expect(r.message).toBeNull();
  });

  /* Comida libre (pedido explícito: "unas galletas en el desayuno"): la franja deja de
     estar pendiente, pero no suma ni resta al % del plan. */
  it('una franja con solo comida libre queda "Libre" y fuera del % del plan', () => {
    const log = { [DIA]: [
      { id: 'l', at: 0, text: 'Desayuno: galletas (comida libre)', libre: { slotId: 's1', que: 'galletas' }, matches: { options: [], extras: [] } },
      entrada([{ slotId: 's2', optionId: 'o2' }]),
    ] };
    const r = dayMealSummary(state({ plan, log }), DIA);
    expect(r.franjas[0].status.key).toBe('libre');
    expect(r.franjas[0].libres).toEqual([{ entryId: 'l', que: 'galletas' }]);
    expect(r.pct).toBe(1);           // solo cuenta la cena, cumplida
    expect(r.fueraDePlan).toBe(0);   // la comida libre no es "otra cosa suelta"
    expect(r.message).toBe('¡Día completo! Seguiste el plan, con 1 comida libre.');
  });
});

/* Recuperar lo borrado (pedido explícito: "restablecé lo del queso que borré"). */
describe('missingFromTemplate', () => {
  const plantilla = {
    slots: [{
      name: 'Desayuno',
      options: [
        { text: 'Panes con queso', items: [{ name: 'pan', qty: 3 }, { name: 'queso', qty: 3 }] },
        { text: 'Tortita', items: [{ name: 'banana', qty: 200 }] },
      ],
    }],
  };

  it('encuentra un alimento borrado de una opción (sin importar tildes/mayúsculas del resto)', () => {
    const plan = { slots: [{ name: 'DESAYUNO', options: [
      { text: 'panes con queso', items: [{ name: 'Pan', qty: 2 }] },
      { text: 'Tortita', items: [{ name: 'banana', qty: 200 }] },
    ] }] };
    expect(missingFromTemplate(plan, plantilla)).toEqual({
      faltan: [{ slot: 'Desayuno', option: 'Panes con queso', item: 'queso' }],
      parecido: true,
    });
  });

  it('un plan armado a mano, que no se parece, no ofrece "recuperar"', () => {
    const plan = { slots: [{ name: 'Desayuno', options: [{ text: 'Mate con facturas' }] }] };
    expect(missingFromTemplate(plan, plantilla).parecido).toBe(false);
  });

  it('sin plan, nada es "parecido"', () => {
    expect(missingFromTemplate(null, plantilla).parecido).toBe(false);
  });
});

describe('itemsBreakdown / itemsCompliance', () => {
  const option = { items: [{ id: 'i1', name: 'Tostadas', qty: 3 }, { id: 'i2', name: 'Huevos', qty: 3 }] };

  it('itemsBreakdown trae got/expected por cada ítem del plan, en orden', () => {
    const matched = [{ itemId: 'i1', qty: 2 }, { itemId: 'i2', qty: 3 }];
    expect(itemsBreakdown(option, matched)).toEqual([
      { id: 'i1', name: 'Tostadas', tipo: undefined, unit: undefined, got: 2, expected: 3 },
      { id: 'i2', name: 'Huevos', tipo: undefined, unit: undefined, got: 3, expected: 3 },
    ]);
  });

  it('itemsCompliance: 5 de 6 pedidos entre los dos ítems → 0.83...', () => {
    const matched = [{ itemId: 'i1', qty: 2 }, { itemId: 'i2', qty: 3 }];
    expect(itemsCompliance(option, matched)).toBeCloseTo(5 / 6);
  });

  it('comer de más no da más de 1 (se recorta a lo que pedía el plan)', () => {
    const matched = [{ itemId: 'i1', qty: 10 }, { itemId: 'i2', qty: 3 }];
    expect(itemsCompliance(option, matched)).toBe(1);
  });

  it('nada comido → 0', () => {
    expect(itemsCompliance(option, [])).toBe(0);
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

describe('activePlan', () => {
  it('sin ningún plan, null', () => {
    expect(activePlan({ meals: { plans: [], extras: [], log: {} } })).toBeNull();
  });

  it('sin state.meals en absoluto, null (no explota)', () => {
    expect(activePlan({})).toBeNull();
  });

  it('entre una archivada y la vigente, devuelve la que tiene endISO:null', () => {
    const s = {
      meals: {
        plans: [
          { id: 'p1', startISO: '2026-01-01', endISO: '2026-03-01', slots: [{ id: 'old', name: 'Vieja', options: [] }] },
          { id: 'p2', startISO: '2026-03-01', endISO: null, slots: [{ id: 'new', name: 'Nueva', options: [] }] },
        ],
        extras: [],
        log: {},
      },
    };
    expect(activePlan(s).id).toBe('p2');
  });
});

/* "Cómo comés" (pedido explícito: "quiero que a nivel seguimiento daily entienda si estoy
   comiendo bien o mal"). Se prueba con per='mes' por el mismo motivo que comoVenis en
   src/lib/logic.test.js: 4 columnas semanales, siempre las mismas (mondayAgo(3..0)), sin
   depender de qué día de la semana es "hoy" cuando corre el test. */
describe('comoComes', () => {
  function docConFranja(fechas) {
    const plan = [{ id: 's1', name: 'Almuerzo', options: [{ id: 'o1', text: 'Milanesa' }] }];
    const log = {};
    fechas.forEach((d) => { (log[d] ||= []).push({ id: 'x', at: 0, text: 'milanesa', matches: { options: [{ slotId: 's1', optionId: 'o1' }], extras: [] } }); });
    return state({ plan, log });
  }

  it('sin plan, no hay filas', () => {
    expect(comoComes(state(), 'mes').rows).toEqual([]);
  });

  it('una franja cumplida en la semana actual suma al total', () => {
    const v = comoComes(docConFranja([thisMonday]), 'mes');
    expect(v.rows[0].name).toBe('Almuerzo');
    expect(v.rows[0].total).toBe(1);
  });

  it('mide la misma ventana que "Cómo venís" para el mismo período: 5 semanas atrás ya no entra en "mes"', () => {
    expect(comoComes(docConFranja([mondayAgo(5)]), 'mes').rows[0].total).toBe(0);
  });

  it('4 de 4 semanas cumplidas → REGULAR (mismo balde que Cómo venís)', () => {
    const fechas = [mondayAgo(3), mondayAgo(2), mondayAgo(1), mondayAgo(0)];
    expect(comoComes(docConFranja(fechas), 'mes').rows[0].status.label).toBe('REGULAR');
  });

  it('nunca cumplida en la ventana → SIN REGISTRAR', () => {
    expect(comoComes(docConFranja([]), 'mes').rows[0].status.label).toBe('SIN REGISTRAR');
  });
});

/* Avisos de "calidad" (pedido explícito: "evitar el alcohol" por un lado, "comí algo
   fuera del plan que no está tan mal" por el otro — ver quality en store/mutations.js). */
describe('comoComes: avisos de calidad (extras bueno/malo)', () => {
  function docConExtra(quality, fechas) {
    const log = {};
    fechas.forEach((d) => { (log[d] ||= []).push({ id: 'x', at: 0, text: 't', matches: { options: [], extras: ['e1'] } }); });
    return state({
      plan: [{ id: 's1', name: 'Almuerzo', options: [] }],
      extras: [{ id: 'e1', name: 'Alcohol', color: '#fff', icon: 'agua', quality }],
      log,
    });
  }

  it('un extra "malo" que no aparece en el período da un aviso en verde', () => {
    const v = comoComes(docConExtra('malo', []), 'mes');
    expect(v.alerts.some((a) => a.text === 'Evitaste alcohol en este período')).toBe(true);
  });

  it('un extra "malo" que sí aparece da una alerta con la cuenta', () => {
    const v = comoComes(docConExtra('malo', [thisMonday]), 'mes');
    expect(v.alerts.some((a) => a.text === 'Alcohol: 1 vez en este período')).toBe(true);
  });

  it('un extra "bueno" que aparece suma un aviso informativo, no una alerta', () => {
    const v = comoComes(docConExtra('bueno', [thisMonday]), 'mes');
    expect(v.alerts.some((a) => a.text.includes('fuera del plan pero está bien'))).toBe(true);
  });

  it('un extra "bueno" que no aparece no genera ningún aviso (no hay nada que avisar)', () => {
    expect(comoComes(docConExtra('bueno', []), 'mes').alerts).toEqual([]);
  });

  it('un extra neutro (sin quality) no genera ningún aviso', () => {
    expect(comoComes(docConExtra(undefined, [thisMonday]), 'mes').alerts).toEqual([]);
  });
});

/* Una opción cuantificada no cuenta el día solo por aparecer: tiene que llegar al menos
   a la mitad de lo pedido (UMBRAL_CUMPLIMIENTO en lib/meals.js) — pedido explícito:
   "quiero... una medición de bien o mal", no un simple sí/no de si la tocaste. */
describe('comoComes: una franja cuantificada exige cumplimiento mínimo', () => {
  function docConCumplimiento(qtyTostadas, qtyHuevos) {
    const plan = [{ id: 's1', name: 'Desayuno', options: [{ id: 'o1', items: [{ id: 'i1', name: 'tostadas', qty: 3 }, { id: 'i2', name: 'huevos', qty: 3 }] }] }];
    const log = {
      [thisMonday]: [{
        id: 'x', at: 0, text: 'comí',
        matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: qtyTostadas }, { itemId: 'i2', qty: qtyHuevos }] }], extras: [] },
      }],
    };
    return state({ plan, log });
  }

  it('comer la mitad o más (3 de 6) SÍ cuenta el día como activo', () => {
    expect(comoComes(docConCumplimiento(3, 0), 'mes').rows[0].total).toBe(1);
  });

  it('comer menos de la mitad (2 de 6) NO cuenta el día', () => {
    expect(comoComes(docConCumplimiento(2, 0), 'mes').rows[0].total).toBe(0);
  });

  it('el tile ENTRADAS se reemplaza por CUMPLIMIENTO cuando hay algo cuantificado', () => {
    const v = comoComes(docConCumplimiento(2, 2), 'mes'); // 4/6 = 67%
    const tile = v.stats.find((s) => s.k === 'CUMPLIMIENTO' || s.k === 'ENTRADAS');
    expect(tile.k).toBe('CUMPLIMIENTO');
    expect(tile.v).toBe('67%');
  });

  it('sin ninguna opción cuantificada logueada, el tile sigue siendo ENTRADAS', () => {
    const v = comoComes(docConFranjaSimple(), 'mes');
    expect(v.stats.some((s) => s.k === 'ENTRADAS')).toBe(true);
  });

  function docConFranjaSimple() {
    const plan = [{ id: 's1', name: 'Almuerzo', options: [{ id: 'o1', text: 'Milanesa' }] }];
    return state({ plan, log: { [thisMonday]: [{ id: 'x', at: 0, text: 'milanesa', matches: { options: [{ slotId: 's1', optionId: 'o1' }], extras: [] } }] } });
  }
});

/* Por macro (pedido explícito, segunda vuelta: "las mediciones podrian hacerse en
   carbohidratos y proteinas para tambien tener un registro de con que soy mas regular"). */
describe('comoComes: cumplimiento por macro', () => {
  function docConMacros(entradas) {
    const plan = [{
      id: 's1',
      name: 'Desayuno',
      options: [{ id: 'o1', items: [{ id: 'i1', name: 'tostadas', qty: 4, tipo: 'carbo' }, { id: 'i2', name: 'huevos', qty: 2, tipo: 'proteina' }] }],
    }];
    const log = {};
    entradas.forEach(([dISO, qtyTostadas, qtyHuevos]) => {
      (log[dISO] ||= []).push({
        id: 'x', at: 0, text: 'comí',
        matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: qtyTostadas }, { itemId: 'i2', qty: qtyHuevos }] }], extras: [] },
      });
    });
    return state({ plan, log });
  }

  it('suma el cumplimiento de cada macro por separado, no mezclado', () => {
    // Una sola entrada: 4/4 tostadas (100% carbo), 1/2 huevos (50% proteína).
    const v = comoComes(docConMacros([[thisMonday, 4, 1]]), 'mes');
    const carbo = v.macros.find((m) => m.tipo === 'carbo');
    const proteina = v.macros.find((m) => m.tipo === 'proteina');
    expect(carbo.pct).toBe(100);
    expect(proteina.pct).toBe(50);
  });

  it('ordena de mayor a menor cumplimiento ("con qué soy más regular" a simple vista)', () => {
    const v = comoComes(docConMacros([[thisMonday, 4, 1]]), 'mes');
    expect(v.macros.map((m) => m.tipo)).toEqual(['carbo', 'proteina']);
  });

  it('sin ningún ítem clasificado por macro, la lista viene vacía', () => {
    const plan = [{ id: 's1', name: 'Almuerzo', options: [{ id: 'o1', items: [{ id: 'i1', name: 'arroz', qty: 1 }] }] }]; // sin tipo
    const log = { [thisMonday]: [{ id: 'x', at: 0, text: 'arroz', matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 1 }] }], extras: [] } }] };
    expect(comoComes(state({ plan, log }), 'mes').macros).toEqual([]);
  });
});
