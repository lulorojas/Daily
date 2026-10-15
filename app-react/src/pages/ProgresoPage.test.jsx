import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgresoPage } from './ProgresoPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc, thisMonday } from '../test/fixtures';
import { DOW_SHORT, dow, parseISO } from '../lib/dates';

/* ============================================================================
   PROGRESO

   Las cuentas (rachas, ranking, baldes de cumplimiento) ya están comparadas contra la
   app vanilla en src/compat/vanilla.test.js, y el texto completo contra viewProgreso()
   en src/compat/screens.test.jsx. Acá se prueba lo que el pedido pide explícito: que el
   período recorte de verdad (que "semana" y "todo" den números distintos con los MISMOS
   datos) y que Progreso —a diferencia de cada otra pantalla de la app— no escriba nunca
   nada en el documento: es un tablero de solo lectura.
   ============================================================================ */

describe('el período recorta la pantalla', () => {
  it('arranca en "Mes", como en la app vanilla', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('"Semana" y "Todo" muestran una cantidad de entrenos distinta con los mismos datos', async () => {
    // El historial de entrenos de fullDoc() se extiende varias semanas atrás, así que
    // recortar a "esta semana" tiene que dejar afuera entrenos que "Todo" sí cuenta.
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });

    await user.click(screen.getByRole('button', { name: 'Semana' }));
    const conSemana = screen.getByText(/entrenos? · semana/).textContent;

    await user.click(screen.getByRole('button', { name: 'Todo' }));
    const conTodo = screen.getByText(/entrenos? · todo/).textContent;

    expect(conSemana).not.toBe(conTodo.replace('todo', 'semana'));
  });

  it('el rótulo de la nota cambia de "mes" a "semana" al cambiar el período', async () => {
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });

    expect(screen.getByText(/· mes/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    expect(screen.queryByText(/· mes/)).not.toBeInTheDocument();
    expect(screen.getByText(/· semana/)).toBeInTheDocument();
  });
});

describe('Progreso no escribe nada', () => {
  // Timeout largo a propósito: "Año" y "Todo" hacen que el mapa de entrenamientos
  // dibuje su ventana completa (50-70 columnas desde que mide lo mismo que "Cómo venís"
  // en vez de un recorte fijo de 8-26 semanas, pedido explícito) y jsdom tarda en
  // montar esa cantidad de celdas — un navegador real no tiene este problema.
  it('recorrer los cuatro períodos no guarda ningún cambio', async () => {
    const user = userEvent.setup();
    const { firestore } = renderScreen(<ProgresoPage />, { doc: fullDoc(), uid: 'uid-test' });

    for (const periodo of ['Semana', 'Año', 'Todo', 'Mes']) {
      await user.click(screen.getByRole('button', { name: periodo }));
    }

    expect(firestore.setsOf('uid-test')).toHaveLength(0);
  }, 15000);

  it('tocar un punto del gráfico de peso tampoco escribe (solo abre el globito)', async () => {
    const user = userEvent.setup();
    const { container, firestore } = renderScreen(<ProgresoPage />, { doc: fullDoc(), uid: 'uid-test' });

    const punto = container.querySelector('.chartwrap circle[cx]');
    expect(punto).toBeTruthy();
    await user.click(punto);

    expect(firestore.setsOf('uid-test')).toHaveLength(0);
  });

  it('la pantalla entera no tiene un solo <input>, <textarea> ni formulario', () => {
    // Prueba estructural: si algún día alguien agrega sin querer un campo editable acá,
    // este test lo va a marcar. Progreso es puro texto y botones de navegación/selección.
    const { container } = renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(container.querySelectorAll('input, textarea, form')).toHaveLength(0);
  });
});

describe('resumen', () => {
  // Pedido explícito: "la pantalla resumen no sirve" — se sacó entero, no queda ninguna
  // sección "Resumen" en Progreso (ver ProgresoPage.jsx y el corte correspondiente en
  // src/compat/screens.test.jsx, que ahora excluye "Resumen" del lado vanilla).
  it('no muestra la sección "Resumen" (se sacó, pedido explícito)', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.queryByText('Resumen')).not.toBeInTheDocument();
  });
});

describe('estados vacíos: "sin datos" no es lo mismo que "sin datos en este recorte"', () => {
  it('cuenta nueva: cada sección explica que falta cargar algo', () => {
    renderScreen(<ProgresoPage />, { doc: emptyDoc() });
    expect(screen.getByText('Cargá tu peso para ver la tendencia.')).toBeInTheDocument();
    expect(screen.getByText('Agregá ejercicios en Gimnasio para seguir tus cargas.')).toBeInTheDocument();
  });

  it('con ejercicios pero sin dos registros en la ventana, el mensaje es otro', async () => {
    // Un ejercicio con un solo registro reciente: hay datos, pero no alcanza para
    // comparar. Tiene que ser un mensaje distinto de "agregá ejercicios".
    const user = userEvent.setup();
    const doc = fullDoc();
    // Press banca (l2) tiene un solo registro en todo el documento.
    doc.gym.lifts = [doc.gym.lifts.find((l) => l.id === 'l2')];
    renderScreen(<ProgresoPage />, { doc });

    await user.click(screen.getByRole('button', { name: 'Semana' }));
    expect(screen.getByText(/Necesitás al menos dos marcas/)).toBeInTheDocument();
    expect(screen.queryByText('Agregá ejercicios en Gimnasio para seguir tus cargas.')).not.toBeInTheDocument();
  });
});

describe('las otras secciones', () => {
  it('el ranking y el balance muscular son una sola tarjeta: la dona y la lista (rediseño Nocturne)', () => {
    const { container } = renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.getByText('Entrenamientos por tipo')).toBeInTheDocument();
    expect(screen.queryByText('Balance muscular')).not.toBeInTheDocument();
    const tarjeta = container.querySelector('.tipos');
    expect(tarjeta.querySelector('.tipos-donut svg')).toBeTruthy();
    expect(tarjeta.querySelectorAll('.tipos-row').length).toBeGreaterThan(0);
  });

  it('las rachas de entrenamiento son "estado actual": no cambian con el período', async () => {
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });

    const antes = screen.getByText('Rachas de entrenamiento').closest('.progcard').textContent;
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    const despues = screen.getByText('Rachas de entrenamiento').closest('.progcard').textContent;

    expect(despues).toBe(antes);
  });

  it('abs cuenta como entreno en el ranking, movilidad no (etapa 6)', () => {
    const doc = fullDoc();
    doc.gym.weekPlans[Object.keys(doc.gym.weekPlans)[0]][0].absCategories = ['core'];
    renderScreen(<ProgresoPage />, { doc });
    // Aparece más de una vez: ranking y balance muestran los mismos tipos, cada uno a su manera.
    expect(screen.getAllByText('Abs').length).toBeGreaterThan(0);
  });

  it('"Último entreno" reemplaza al mapa y a la frecuencia semanal, y no depende del período', async () => {
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.getByText('Último entreno')).toBeInTheDocument();
    expect(screen.queryByText('Mapa de entrenamientos')).not.toBeInTheDocument();
    expect(screen.queryByText('Frecuencia semanal')).not.toBeInTheDocument();

    const antes = screen.getByText('Último entreno').closest('.progcard').textContent;
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    expect(screen.getByText('Último entreno').closest('.progcard').textContent).toBe(antes);
  });

  it('un día con abs marcado cuenta en "Último entreno": no queda como "3 sem+" (etapa 7)', () => {
    const doc = emptyDoc();
    doc.gym.weekPlans[thisMonday] = [
      { muscles: [], done: false, absCategories: ['core'] },
      ...Array.from({ length: 6 }, () => ({ muscles: [], done: false })),
    ];
    const { container } = renderScreen(<ProgresoPage />, { doc });

    const fila = [...container.querySelectorAll('.lasttrained .last-list .last-grid')].find((r) => r.textContent.includes('Abs'));
    expect(fila).toBeTruthy();
    expect(fila.querySelector('.last-ago')).not.toHaveTextContent('3 sem+');
  });

  it('abs solo (sin turno de músculo) no cuenta como entreno, aunque sigue en la matriz (pedido explícito)', () => {
    const doc = emptyDoc();
    doc.gym.weekPlans[thisMonday] = [
      { muscles: [], done: false, absCategories: ['core'] },
      ...Array.from({ length: 6 }, () => ({ muscles: [], done: false })),
    ];
    renderScreen(<ProgresoPage />, { doc });

    const tileEntrenos = screen.getByText('ENTRENOS').closest('.venis-stat');
    expect(within(tileEntrenos).getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('Abs').length).toBeGreaterThan(0);
  });

  it('"Cómo venís": un renglón por tipo, con una casilla por columna y el total al final', () => {
    const { container } = renderScreen(<ProgresoPage />, { doc: fullDoc() });
    const cabecera = container.querySelector('.venis-head');
    expect(cabecera).toHaveTextContent('TIPO');
    expect(cabecera).toHaveTextContent('TOTAL');
    const nombres = [...container.querySelectorAll('.venis-nm')].map((n) => n.textContent);
    expect(nombres).toContain('Pecho');
    expect(nombres).toContain('Espalda');
    expect(container.querySelectorAll('.venis-total').length).toBeGreaterThan(0);
  });

  it('el selector tiene 3 y 6 meses, y recortan a una columna por mes', async () => {
    const user = userEvent.setup();
    const { container } = renderScreen(<ProgresoPage />, { doc: fullDoc() });
    await user.click(screen.getByRole('button', { name: '3 meses' }));
    expect(container.querySelector('.venis-head')).toHaveTextContent(/TIPO.*TOTAL/);
    expect(container.querySelector('.venis-head').children).toHaveLength(3 + 2); // tipo + 3 meses + total
    await user.click(screen.getByRole('button', { name: '6 meses' }));
    expect(container.querySelector('.venis-head').children).toHaveLength(6 + 2);
  });

  it('"Cómo comés" invita a armar el plan cuando todavía no hay ninguno', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    const sect = screen.getByText('Cómo comés').closest('.progcard');
    expect(within(sect).getByText(/Armá tu plan de comidas/)).toBeInTheDocument();
  });

  it('"Cómo comés" muestra la franja y avisa de un extra a evitar que apareció (pedido explícito: seguimiento de comidas)', async () => {
    const user = userEvent.setup();
    const doc = fullDoc();
    doc.meals = {
      plans: [{ id: 'p1', startISO: thisMonday, endISO: null, slots: [{ id: 's1', name: 'Almuerzo', options: [{ id: 'o1', text: 'Milanesa' }] }] }],
      extras: [{ id: 'e1', name: 'Alcohol', color: '#fff', icon: 'agua', quality: 'malo' }],
      log: {
        [thisMonday]: [
          { id: 'x1', at: 0, text: 'milanesa y una cerveza, alcohol', matches: { options: [{ slotId: 's1', optionId: 'o1' }], extras: ['e1'] } },
        ],
      },
    };
    renderScreen(<ProgresoPage />, { doc });

    const sect = screen.getByText('Cómo comés').closest('.progcard');
    // El día elegido por defecto es hoy; se toca el anillo del día con el registro y aparece
    // su detalle comida por comida.
    const f = parseISO(thisMonday);
    await user.click(sect.querySelector(`[aria-label="${DOW_SHORT[dow(f)]} ${f.getDate()}"]`));
    const franja = [...sect.querySelectorAll('.ring-slot')].find((r) => r.textContent.includes('Almuerzo'));
    expect(franja).toHaveTextContent('Cumplida');
    expect(within(sect).getByText(/Alcohol: 1 vez en este período/)).toBeInTheDocument();
  });

  it('"Cómo comés" va día por día: qué comida le pifiaste y qué permitidos hubo (pedido explícito)', () => {
    const doc = fullDoc();
    doc.meals = {
      plans: [{
        id: 'p1', startISO: thisMonday, endISO: null,
        slots: [
          { id: 's1', name: 'Desayuno', options: [{ id: 'o1', text: 'Panes', items: [{ id: 'i1', name: 'pan', qty: 3 }] }] },
          { id: 's2', name: 'Cena', options: [{ id: 'o2', text: 'Milanesa' }] },
        ],
      }],
      extras: [],
      log: {
        [thisMonday]: [
          { id: 'a', at: 0, text: 't', matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 1 }] }], extras: [] } },
          { id: 'b', at: 0, text: 't', libre: { slotId: 's2', que: 'pizza', tipo: 'permitido' }, matches: { options: [], extras: [] } },
          { id: 'c', at: 0, text: 't', libre: { que: 'un alfajor', tipo: 'permitido' }, matches: { options: [], extras: [] } },
        ],
      },
    };
    renderScreen(<ProgresoPage />, { doc });

    const sect = screen.getByText('Cómo comés').closest('.progcard');
    expect(within(sect).getByText('CON PIFIADAS')).toBeInTheDocument(); // el veredicto del día
    expect(within(sect).getByText(/^pizza · /)).toBeInTheDocument();
    expect(within(sect).getByText(/^un alfajor · /)).toBeInTheDocument();
    expect(within(sect).getByText('PERMITIDOS').nextSibling).toHaveTextContent('2');
    const filas = [...sect.querySelectorAll('.comes-bar')].map((r) => r.textContent);
    expect(filas).toContain('Desayuno1');
    expect(filas).toContain('Cena1');
  });

  it('"Cómo comés" desglosa el cumplimiento por macro cuando hay ítems clasificados (pedido explícito: "con qué soy más regular")', () => {
    const doc = fullDoc();
    doc.meals = {
      plans: [{
        id: 'p1',
        startISO: thisMonday,
        endISO: null,
        slots: [{ id: 's1', name: 'Desayuno', options: [{ id: 'o1', items: [{ id: 'i1', name: 'tostadas', qty: 4, tipo: 'carbo' }, { id: 'i2', name: 'huevos', qty: 2, tipo: 'proteina' }] }] }],
      }],
      extras: [],
      log: {
        [thisMonday]: [
          { id: 'x1', at: 0, text: 'comí 4 tostadas y 1 huevo', matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 4 }, { itemId: 'i2', qty: 1 }] }], extras: [] } },
        ],
      },
    };
    renderScreen(<ProgresoPage />, { doc });

    const sect = screen.getByText('Cómo comés').closest('.progcard');
    expect(within(sect).getByText('Carbohidratos')).toBeInTheDocument();
    expect(within(sect).getByText('100%')).toBeInTheDocument();
    expect(within(sect).getByText('Proteínas')).toBeInTheDocument();
    expect(within(sect).getByText('50%')).toBeInTheDocument();
  });

  it('"¿Comiste bien?" cuenta comidas bien, pifiadas y sin registrar (pedido explícito)', () => {
    const doc = fullDoc();
    doc.meals = {
      plans: [{
        id: 'p1', startISO: thisMonday, endISO: null,
        slots: [
          { id: 's1', name: 'Desayuno', options: [{ id: 'o1', text: 'Panes', items: [{ id: 'i1', name: 'pan', qty: 3 }] }] },
          { id: 's2', name: 'Cena', options: [{ id: 'o2', text: 'Panes de nuevo', items: [{ id: 'i2', name: 'pan', qty: 4 }] }] },
        ],
      }],
      extras: [],
      log: {
        [thisMonday]: [
          { id: 'a', at: 0, text: 't', matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 3 }] }], extras: [] } },
          { id: 'b', at: 0, text: 't', matches: { options: [{ slotId: 's2', optionId: 'o2', items: [{ itemId: 'i2', qty: 1 }] }], extras: [] } },
        ],
      },
    };
    renderScreen(<ProgresoPage />, { doc });

    const sect = screen.getByText('¿Comiste bien?').closest('.progcard');
    expect(within(sect).getByText('50%')).toBeInTheDocument();
    expect(within(sect).getByText('de las 2 comidas que registraste estuvieron bien.')).toBeInTheDocument();
    expect(within(sect).getByText(/^Bien 1$/)).toBeInTheDocument();
    expect(within(sect).getByText(/^Le pifiaste 1$/)).toBeInTheDocument();
  });

  it('"¿Comiste bien?": tocar un tramo de la barra abre el globito con el número, y tocar de nuevo lo cierra', async () => {
    const user = userEvent.setup();
    const doc = fullDoc();
    doc.meals = {
      plans: [{ id: 'p1', startISO: thisMonday, endISO: null, slots: [{ id: 's1', name: 'Desayuno', options: [{ id: 'o1', text: 'Panes', items: [{ id: 'i1', name: 'pan', qty: 3 }] }] }] }],
      extras: [],
      log: { [thisMonday]: [{ id: 'a', at: 0, text: 't', matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 3 }] }], extras: [] } }] },
    };
    const { container } = renderScreen(<ProgresoPage />, { doc });

    const tramo = container.querySelector('.score-seg.bien');
    expect(container.querySelector('.score-tip')).toBeFalsy();
    await user.click(tramo);
    expect(container.querySelector('.score-tip')).toHaveTextContent('1 bien');
    await user.click(container.querySelector('.score-seg.bien'));
    expect(container.querySelector('.score-tip')).toBeFalsy();
  });
});
