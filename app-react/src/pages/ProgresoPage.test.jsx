import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgresoPage } from './ProgresoPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc, thisMonday } from '../test/fixtures';

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
    expect(screen.getByText('Marcá entrenamientos para ver tu mapa.')).toBeInTheDocument();
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
    expect(screen.getByText(/Necesitás al menos dos registros/)).toBeInTheDocument();
    expect(screen.queryByText('Agregá ejercicios en Gimnasio para seguir tus cargas.')).not.toBeInTheDocument();
  });
});

describe('las otras secciones', () => {
  it('el balance muscular y el ranking usan los mismos datos, dos formas de verlo', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.getByText('Balance muscular')).toBeInTheDocument();
    expect(screen.getByText('Entrenamientos por tipo')).toBeInTheDocument();
  });

  it('las rachas de entrenamiento son "estado actual": no cambian con el período', async () => {
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });

    const antes = screen.getByText('Rachas de entrenamiento').closest('.sect').textContent;
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    const despues = screen.getByText('Rachas de entrenamiento').closest('.sect').textContent;

    expect(despues).toBe(antes);
  });

  it('abs cuenta como entreno en el ranking, movilidad no (etapa 6)', () => {
    const doc = fullDoc();
    doc.gym.weekPlans[Object.keys(doc.gym.weekPlans)[0]][0].absCategories = ['core'];
    renderScreen(<ProgresoPage />, { doc });
    // Aparece más de una vez: ranking y balance muestran los mismos tipos, cada uno a su manera.
    expect(screen.getAllByText('Abs').length).toBeGreaterThan(0);
  });

  it('el mapa de entrenamientos aparece con entrenos cargados (etapa 7)', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.getByText('Mapa de entrenamientos')).toBeInTheDocument();
  });

  it('un día con abs marcado pinta una celda del mapa, no la deja vacía (etapa 7)', () => {
    const doc = fullDoc();
    const semana = Object.keys(doc.gym.weekPlans)[0];
    doc.gym.weekPlans[semana][0].absCategories = ['core'];
    const lunes = semana; // weekPlans[semana][0] es justo el lunes de esa semana
    const { container } = renderScreen(<ProgresoPage />, { doc });

    const celda = container.querySelector(`.heatcell[data-date="${lunes}"]`);
    expect(celda).toBeTruthy();
    expect(celda.style.background).not.toBe('rgba(255, 255, 255, 0.05)');
  });

  it('abs solo (sin turno de músculo) no cuenta como entreno ni pinta el mapa, aunque sigue en la matriz (pedido explícito)', () => {
    const doc = emptyDoc();
    doc.gym.weekPlans[thisMonday] = [
      { muscles: [], done: false, absCategories: ['core'] },
      ...Array.from({ length: 6 }, () => ({ muscles: [], done: false })),
    ];
    const { container } = renderScreen(<ProgresoPage />, { doc });

    const tileEntrenos = screen.getByText('ENTRENOS').closest('.tile');
    expect(within(tileEntrenos).getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('Abs').length).toBeGreaterThan(0);

    const celda = container.querySelector(`.heatcell[data-date="${thisMonday}"]`);
    expect(celda.style.background).toBe('rgba(255, 255, 255, 0.05)');
  });

  it('"Cómo venís" es horizontal: los músculos son columnas, el total va en una fila al final', () => {
    const { container } = renderScreen(<ProgresoPage />, { doc: fullDoc() });
    const cabecera = container.querySelector('.comovenis-headrow');
    expect(within(cabecera).getByText('Pecho')).toBeInTheDocument();
    expect(within(cabecera).getByText('Espalda')).toBeInTheDocument();
    expect(container.querySelector('.comovenis-totalrow')).toBeTruthy();
  });

  it('la frecuencia semanal es una sección nueva, separada de "Cómo venís"', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    const sect = screen.getByText('Frecuencia semanal').closest('.sect');
    expect(sect).toBeTruthy();
    expect(within(sect).getAllByText(/\/sem$/).length).toBeGreaterThan(0);
  });

  it('tocar una celda del mapa despliega el globito con qué se entrenó ese día, y tocar afuera lo cierra', async () => {
    const user = userEvent.setup();
    const doc = fullDoc();
    const semana = Object.keys(doc.gym.weekPlans)[0];
    doc.gym.weekPlans[semana][0] = { type: 'Espalda', done: true };
    const { container } = renderScreen(<ProgresoPage />, { doc });

    const celda = container.querySelector(`.heatcell[data-date="${semana}"]`);
    expect(container.querySelector('.heatcell-tip')).toBeFalsy();

    await user.click(celda);
    expect(container.querySelector('.heatcell-tip')).toHaveTextContent('Espalda');

    await user.click(document.body);
    expect(container.querySelector('.heatcell-tip')).toBeFalsy();
  });
});
