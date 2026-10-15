import { describe, expect, it } from 'vitest';
import { cantidadEfectiva, claveAlimento, compensaEntreComidas, cumplimientoDeAlimento, esOpcional, toleranciaDe } from './mealRules';
import { dayMealSummary, itemsCompliance } from './meals';

/* ============================================================================
   REGLAS DE CALIFICACIÓN DE LAS COMIDAS (lib/mealRules.js)

   Cada caso sale de lo que Lulo fue pidiendo:
   - "no comer 1 tostada no baja nota, pero 50 gramos menos de proteína o 1 huevo menos sí";
   - "dos frutas en la merienda o 1 en el almuerzo y ninguna en el desayuno: se compensa; lo
     mismo con una ensalada de frutas";
   - proteína y grasa, estrictas; comer de más baja la nota salvo en proteína; compensar,
     por ahora, solo la fruta.
   ============================================================================ */

describe('tolerancias', () => {
  it('faltar 1 tostada de 4 no baja la nota', () => {
    expect(cumplimientoDeAlimento({ name: 'tostada', tipo: 'carbo', qty: 4 }, 3)).toBe(1);
  });

  it('faltar 2 tostadas de 4 sí baja (es más que la tolerancia)', () => {
    expect(cumplimientoDeAlimento({ name: 'tostada', tipo: 'carbo', qty: 4 }, 2)).toBe(0.5);
  });

  it('un carbohidrato en gramos tolera el 20%: 300 gr de arroz, hasta 60 gr menos', () => {
    expect(toleranciaDe({ tipo: 'carbo', unit: 'gr', qty: 300 })).toBe(60);
    expect(cumplimientoDeAlimento({ name: 'arroz', tipo: 'carbo', unit: 'gr', qty: 300 }, 240)).toBe(1);
    expect(cumplimientoDeAlimento({ name: 'arroz', tipo: 'carbo', unit: 'gr', qty: 300 }, 200)).toBeCloseTo(2 / 3);
  });

  it('1 huevo menos (proteína) sí baja', () => {
    expect(cumplimientoDeAlimento({ name: 'huevo', tipo: 'proteina', qty: 3 }, 2)).toBeCloseTo(2 / 3);
  });

  it('50 gr menos de proteína sí baja', () => {
    expect(cumplimientoDeAlimento({ name: 'pollo', tipo: 'proteina', unit: 'gr', qty: 250 }, 200)).toBeCloseTo(0.8);
  });

  it('la grasa también es estricta', () => {
    expect(cumplimientoDeAlimento({ name: 'aceite', tipo: 'grasa', qty: 2 }, 1)).toBe(0.5);
  });
});

describe('comer de más', () => {
  it('de más en proteína no baja la nota', () => {
    expect(cumplimientoDeAlimento({ name: 'huevo', tipo: 'proteina', qty: 3 }, 5)).toBe(1);
  });

  it('de más en carbohidratos sí, pasado el margen', () => {
    expect(cumplimientoDeAlimento({ name: 'arroz', tipo: 'carbo', unit: 'gr', qty: 300 }, 330)).toBe(1); // dentro del 20%
    expect(cumplimientoDeAlimento({ name: 'arroz', tipo: 'carbo', unit: 'gr', qty: 300 }, 450)).toBeCloseTo(300 / 450);
  });

  it('de más en grasa baja enseguida', () => {
    expect(cumplimientoDeAlimento({ name: 'aceite', tipo: 'grasa', qty: 2 }, 3)).toBeCloseTo(2 / 3);
  });

  it('la fruta (aunque sea carbohidrato) no se penaliza por pasarse: lo que sobra compensa a otra comida', () => {
    expect(cumplimientoDeAlimento({ name: 'fruta', tipo: 'carbo', unit: 'gr', qty: 200 }, 400)).toBe(1);
  });
});

describe('equivalencias', () => {
  it('banana, manzana y ensalada de frutas son fruta', () => {
    ['fruta', 'Banana', 'bananas', 'manzana', 'ensalada de frutas', 'Ensalada de fruta'].forEach((n) => {
      expect(claveAlimento(n)).toBe('fruta');
    });
  });

  it('una ensalada a secas es verdura, no fruta; el resto se compara por su nombre', () => {
    expect(claveAlimento('ensalada')).toBe('verdura');
    expect(claveAlimento('pollo')).toBe('pollo');
  });

  it('solo la fruta compensa entre comidas (por ahora)', () => {
    expect(compensaEntreComidas('banana')).toBe(true);
    expect(compensaEntreComidas('arroz')).toBe(false);
    expect(compensaEntreComidas('pollo')).toBe(false);
  });
});

describe('dentro de una comida', () => {
  const option = { items: [
    { id: 'i1', name: 'tostada', qty: 4, tipo: 'carbo' },
    { id: 'i2', name: 'huevo', qty: 3, tipo: 'proteina' },
  ] };

  it('faltar 1 tostada deja la comida cumplida; faltar 1 huevo, no', () => {
    expect(itemsCompliance(option, [{ itemId: 'i1', qty: 3 }, { itemId: 'i2', qty: 3 }])).toBe(1);
    expect(itemsCompliance(option, [{ itemId: 'i1', qty: 4 }, { itemId: 'i2', qty: 2 }])).toBeCloseTo((1 + 2 / 3) / 2);
  });

  it('una ensalada de frutas sumada de otra opción cubre la fruta del plan', () => {
    const con = { items: [{ id: 'f', name: 'fruta', qty: 200, unit: 'gr' }] };
    expect(itemsCompliance(con, [{ itemId: 'f', qty: 0 }], [{ name: 'ensalada de frutas', qty: 200, unit: 'gr' }])).toBe(1);
  });
});

describe('compensación en el día', () => {
  const DIA = '2026-10-14';
  const nombres = ['Desayuno', 'Almuerzo', 'Merienda'];
  const state = (alimento, tipo, unit, qtys) => ({
    meals: {
      plans: [{
        id: 'p', startISO: '2020-01-01', endISO: null,
        slots: nombres.map((n, i) => ({ id: `s${i}`, name: n, options: [{ id: `o${i}`, text: 'X', items: [{ id: `a${i}`, name: alimento, qty: 100, unit, tipo }] }] })),
      }],
      extras: [],
      log: { [DIA]: qtys.map((q, i) => ({ id: `e${i}`, at: i, text: 't', matches: { options: [{ slotId: `s${i}`, optionId: `o${i}`, items: [{ itemId: `a${i}`, qty: q }] }], extras: [] } })) },
    },
  });

  it('fruta: ninguna en el desayuno y de más en las otras → el día no baja', () => {
    const r = dayMealSummary(state('fruta', 'carbo', 'gr', [0, 200, 200]), DIA);
    expect(r.franjas[0].pct).toBe(0);
    expect(r.pct).toBeCloseTo(1);
  });

  it('fruta: la merienda pedía una banana, se comió además una manzana → cubre al desayuno', () => {
    const s = state('banana', 'carbo', 'gr', [0, 100, 100]);
    s.meals.log[DIA][2].matches.options[0].suma = [{ name: 'manzana', qty: 100, unit: 'gr' }];
    expect(dayMealSummary(s, DIA).pct).toBeCloseTo(1);
  });

  it('proteína: lo que sobra en una comida NO cubre lo que faltó en otra', () => {
    const r = dayMealSummary(state('pollo', 'proteina', 'gr', [0, 300, 300]), DIA);
    expect(r.pct).toBeCloseTo(2 / 3);
  });

  it('carbohidrato: tampoco compensa entre comidas', () => {
    const r = dayMealSummary(state('arroz', 'carbo', 'gr', [0, 100, 100]), DIA);
    expect(r.pct).toBeCloseTo(2 / 3);
  });
});

describe('la fruta se cuenta por pieza, no por gramos', () => {
  const fruta = { name: 'fruta', tipo: 'carbo', unit: 'gr', qty: 200 };

  it('comer una fruta cubre la del plan aunque no se pese', () => {
    expect(cumplimientoDeAlimento(fruta, 100)).toBe(1);
    expect(cumplimientoDeAlimento(fruta, 150)).toBe(1);
  });

  it('no comer fruta es 0, sin tolerancia (aunque la fruta sea "carbo")', () => {
    expect(cumplimientoDeAlimento(fruta, 0)).toBe(0);
  });

  it('un número chico ("2 frutas") se lee como piezas', () => {
    expect(cantidadEfectiva('fruta', 2, 'gr', 200)).toBe(2);
    expect(cantidadEfectiva('banana', 400, 'gr', 200)).toBe(2);
  });
});

describe('las verduras no bajan la nota', () => {
  it('una verdura o ensalada que falta cuenta como cumplida', () => {
    expect(cumplimientoDeAlimento({ name: 'verdura', unit: 'gr', qty: 200 }, 0)).toBe(1);
    expect(cumplimientoDeAlimento({ name: 'ensalada', unit: 'gr', qty: 200 }, 0)).toBe(1);
    expect(esOpcional('tomate y zanahoria')).toBe(true);
  });

  it('ni entra al promedio de la comida: pollo completo + sin verdura = cumplida; sin pollo + sin verdura = 0', () => {
    const option = { items: [
      { id: 'a', name: 'pollo', qty: 250, unit: 'gr', tipo: 'proteina' },
      { id: 'b', name: 'verdura', qty: 200, unit: 'gr' },
    ] };
    expect(itemsCompliance(option, [{ itemId: 'a', qty: 250 }, { itemId: 'b', qty: 0 }])).toBe(1);
    expect(itemsCompliance(option, [{ itemId: 'a', qty: 0 }, { itemId: 'b', qty: 0 }])).toBe(0);
  });
});
