import { describe, expect, it } from 'vitest';
import { normalize } from '../lib/model';
import {
  activePlan, alcoholExtra, dayMealSummary, entryTime, extraEntriesDelMes, slotMeta, sortedLog, vasosDeAlcohol,
} from '../lib/meals';
import { emptyDoc, TODAY } from '../test/fixtures';
import * as m from './mutations';

/* ============================================================================
   COMIDAS, rediseño Nocturne (sección 8 del handoff): recuperar lo que faltó desde la
   bitácora, y Alcohol / Permitido con hora y cantidad. Sin equivalente en vanilla: se
   prueban directo sobre el documento.
   ============================================================================ */

const vacio = () => normalize(emptyDoc());

/* Un día con un almuerzo registrado al que le faltó la verdura (200 gr) y un cantidad de
   pollo de 250 gr pedidos y 250 comidos. */
function conAlmuerzoIncompleto() {
  const d = vacio();
  const almuerzo = m.addMealSlot(d, { name: 'Almuerzo' });
  const cena = m.addMealSlot(d, { name: 'Cena' });
  m.addMealOption(d, almuerzo.id, { text: 'Pollo con verdura', items: [{ id: 'i1', name: 'pollo', qty: 250, unit: 'gr' }, { id: 'i2', name: 'verdura', qty: 200, unit: 'gr' }] });
  m.addMealOption(d, cena.id, { text: 'Ensalada completa', items: [{ id: 'i3', name: 'lechuga', qty: 100, unit: 'gr' }, { id: 'i4', name: 'verdura', qty: 200, unit: 'gr' }] });
  const opcion = activePlan(d).slots[0].options[0];
  const [pollo, verdura] = opcion.items;
  m.addMealLogStructured(d, TODAY, { slotId: almuerzo.id, optionId: opcion.id, qtys: { [pollo.id]: 250, [verdura.id]: 0 } });
  return { d, almuerzo, cena, opcion, pollo, verdura };
}

describe('bitácora que recupera lo que faltó', () => {
  it('"al final comí la verdura" suma la verdura a la comida ya registrada', () => {
    const { d, almuerzo, verdura } = conAlmuerzoIncompleto();
    const antes = dayMealSummary(d, TODAY).franjas[0];
    expect(antes.pct).toBe(0.5);

    const entrada = m.addMealLogEntry(d, TODAY, 'al final comí la verdura');

    const almuerzoHoy = dayMealSummary(d, TODAY).franjas.find((f) => f.slot.id === almuerzo.id);
    expect(almuerzoHoy.pct).toBe(1);
    expect(entrada.recupera).toEqual([{ slotName: 'Almuerzo', name: 'verdura' }]);
    const registro = d.meals.log[TODAY][0].matches.options[0].items.find((i) => i.itemId === verdura.id);
    expect(registro.qty).toBe(200); // lo que faltaba
  });

  it('si el texto trae cantidad, suma esa', () => {
    const { d, verdura } = conAlmuerzoIncompleto();
    m.addMealLogEntry(d, TODAY, 'comí 120 gr de verdura');
    expect(d.meals.log[TODAY][0].matches.options[0].items.find((i) => i.itemId === verdura.id).qty).toBe(120);
  });

  it('no se registra además como otra comida (la verdura de la cena no es una cena)', () => {
    const { d, cena } = conAlmuerzoIncompleto();
    const entrada = m.addMealLogEntry(d, TODAY, 'comí la verdura');
    expect(entrada.matches.options).toEqual([]);
    expect(dayMealSummary(d, TODAY).franjas.find((f) => f.slot.id === cena.id).status.key).toBe('pendiente');
  });

  it('un alimento que no le faltó a nadie no cambia nada y se registra como siempre', () => {
    const { d } = conAlmuerzoIncompleto();
    const entrada = m.addMealLogEntry(d, TODAY, 'comí lechuga');
    expect(entrada.recupera).toBeUndefined();
    expect(entrada.matches.options.length).toBeGreaterThan(0);
  });
});

describe('hora de una entrada y orden de la bitácora', () => {
  it('una comida registrada tocando toma la hora de su franja (almuerzo 13:00)', () => {
    const { d, almuerzo } = conAlmuerzoIncompleto();
    const slots = activePlan(d).slots;
    expect(slotMeta(almuerzo, 0, 2).time).toBe('13:00');
    expect(entryTime(d.meals.log[TODAY][0], slots)).toBe('13:00');
  });

  it('lo anotado con hora manda sobre la de la franja, y la bitácora sale ordenada por hora', () => {
    const { d } = conAlmuerzoIncompleto();
    const slots = activePlan(d).slots;
    const alc = m.addMealExtra(d, { name: 'Alcohol', color: '#FF9B93', icon: 'agua', quality: 'malo' });
    m.addMealExtraEntry(d, TODAY, alc.id, { time: '11:30', qty: 2 });
    m.addMealLogLibre(d, TODAY, null, 'un alfajor', 'permitido', { time: '22:00' });

    const horas = sortedLog(d.meals.log[TODAY], slots).map((e) => entryTime(e, slots));
    expect(horas).toEqual(['11:30', '13:00', '22:00']);
  });
});

describe('alcohol y permitidos con calendario', () => {
  it('guarda hora y cantidad (vasos) en la entrada del extra; sin cantidad es 1 y no se guarda', () => {
    const d = vacio();
    const alc = m.addMealExtra(d, { name: 'Alcohol', color: '#FF9B93', icon: 'agua', quality: 'malo' });
    const a = m.addMealExtraEntry(d, TODAY, alc.id, { time: '21:00', qty: 3 });
    const b = m.addMealExtraEntry(d, TODAY, alc.id, { time: '22:00', qty: 1 });
    expect(a).toMatchObject({ time: '21:00', qty: 3 });
    expect(b.qty).toBeUndefined();
    expect(vasosDeAlcohol(d, TODAY, TODAY)).toBe(4);
    expect(alcoholExtra(d).id).toBe(alc.id);
  });

  it('el calendario del mes junta alcohol (en vasos) y permitidos (de a uno, con su comida)', () => {
    const { d, almuerzo } = conAlmuerzoIncompleto();
    const alc = m.addMealExtra(d, { name: 'Alcohol', color: '#FF9B93', icon: 'agua', quality: 'malo' });
    m.addMealExtraEntry(d, TODAY, alc.id, { qty: 2 });
    m.addMealLogLibre(d, TODAY, almuerzo.id, 'pizza', 'permitido', { time: '14:00' });
    const mes = TODAY.slice(0, 7);

    expect(extraEntriesDelMes(d, 'alcohol', mes).map((x) => x.qty)).toEqual([2]);
    const perms = extraEntriesDelMes(d, 'permitido', mes);
    expect(perms).toHaveLength(1);
    expect(perms[0]).toMatchObject({ que: 'pizza', slotId: almuerzo.id });
  });

  it('editar una entrada cambia hora y cantidad, y puede moverla de día', () => {
    const d = vacio();
    const alc = m.addMealExtra(d, { name: 'Alcohol', color: '#FF9B93', icon: 'agua', quality: 'malo' });
    const e = m.addMealExtraEntry(d, TODAY, alc.id, { time: '21:00', qty: 3 });

    m.updateMealEntryDetails(d, TODAY, e.id, { time: '23:15', qty: 1, toDISO: '2026-01-02' });

    expect(d.meals.log[TODAY]).toHaveLength(0);
    const movida = d.meals.log['2026-01-02'][0];
    expect(movida.time).toBe('23:15');
    expect(movida.qty).toBeUndefined();
  });

  it('un permitido se puede pasar de "suelto" a "en lugar de una comida" y reescribe su texto', () => {
    const { d, almuerzo } = conAlmuerzoIncompleto();
    const e = m.addMealLogLibre(d, TODAY, null, 'helado', 'permitido');
    expect(e.text).toBe('Permitido: helado');

    m.updateMealEntryDetails(d, TODAY, e.id, { slotId: almuerzo.id, que: 'helado grande' });

    expect(e.libre).toMatchObject({ slotId: almuerzo.id, que: 'helado grande', tipo: 'permitido' });
    expect(e.text).toBe('Almuerzo: helado grande (permitido)');
  });
});
