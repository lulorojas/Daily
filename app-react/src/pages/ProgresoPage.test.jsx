import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgresoPage } from './ProgresoPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc } from '../test/fixtures';

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

  it('"Semana" y "Todo" muestran una cantidad de sesiones distinta con los mismos datos', async () => {
    // El historial de entrenos de fullDoc() se extiende varias semanas atrás, así que
    // recortar a "los últimos 7 días" tiene que dejar afuera sesiones que "Todo" sí cuenta.
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });

    await user.click(screen.getByRole('button', { name: 'Semana' }));
    const conSemana = screen.getByText(/sesiones · semana/).textContent;

    await user.click(screen.getByRole('button', { name: 'Todo' }));
    const conTodo = screen.getByText(/sesiones · todo/).textContent;

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
  it('recorrer los cuatro períodos no guarda ningún cambio', async () => {
    const user = userEvent.setup();
    const { firestore } = renderScreen(<ProgresoPage />, { doc: fullDoc(), uid: 'uid-test' });

    for (const periodo of ['Semana', 'Año', 'Todo', 'Mes']) {
      await user.click(screen.getByRole('button', { name: periodo }));
    }

    expect(firestore.setsOf('uid-test')).toHaveLength(0);
  });

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
  it('muestra entrenamientos, tareas hechas y hábitos de hoy', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.getByText('Entrenamientos')).toBeInTheDocument();
    expect(screen.getByText('Tareas hechas')).toBeInTheDocument();
    expect(screen.getByText('Hábitos hoy')).toBeInTheDocument();
  });

  it('las tareas hechas NO se filtran por período (a propósito, como en vanilla)', async () => {
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });

    const tareasEnMes = within(screen.getByText('Tareas hechas').closest('.tile')).getByText(/^\d+$/).textContent;
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    const tareasEnSemana = within(screen.getByText('Tareas hechas').closest('.tile')).getByText(/^\d+$/).textContent;

    expect(tareasEnSemana).toBe(tareasEnMes);
  });
});

describe('estados vacíos: "sin datos" no es lo mismo que "sin datos en este recorte"', () => {
  it('cuenta nueva: cada sección explica que falta cargar algo', () => {
    renderScreen(<ProgresoPage />, { doc: emptyDoc() });
    expect(screen.getByText('Cargá tu peso para ver la tendencia.')).toBeInTheDocument();
    expect(screen.getByText('Marcá entrenamientos para ver tu frecuencia.')).toBeInTheDocument();
    expect(screen.getByText('Agregá ejercicios en Gimnasio para seguir tus cargas.')).toBeInTheDocument();
    // "Todavía no creaste hábitos." se repite en las tres secciones de hábitos
    // (Cumplimiento, Mapa, Rachas): cada una la muestra por su cuenta.
    expect(screen.getAllByText('Todavía no creaste hábitos.')).toHaveLength(3);
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

  it('las rachas de entrenamiento y las de hábitos son "estado actual": no cambian con el período', async () => {
    const user = userEvent.setup();
    renderScreen(<ProgresoPage />, { doc: fullDoc() });

    const antes = screen.getByText('Rachas de entrenamiento').closest('.sect').textContent;
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    const despues = screen.getByText('Rachas de entrenamiento').closest('.sect').textContent;

    expect(despues).toBe(antes);
  });

  it('el mapa de hábitos y las rachas de cada hábito aparecen con hábitos cargados', () => {
    renderScreen(<ProgresoPage />, { doc: fullDoc() });
    expect(screen.getByText('Mapa de hábitos')).toBeInTheDocument();
    expect(screen.getByText('Rachas')).toBeInTheDocument();
  });
});
