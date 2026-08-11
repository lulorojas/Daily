import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarioPage } from '../../pages/CalendarioPage';
import { renderScreen } from '../../test/utils';
import { emptyDoc } from '../../test/fixtures';

/* ============================================================================
   FORMULARIO DE CITA / FECHA ANUAL

   Se abre desde el Calendario, que es de donde sale en la app. Lo que más importa acá es
   el selector de tipo: la misma pantalla crea dos entidades distintas, y de eso dependen
   la aclaración, el mensaje de error y —sobre todo— cómo se guarda.
   ============================================================================ */

const RUTA = '/calendario?d=2026-03-20';
const conItems = (items) => ({ ...emptyDoc(), items });
const modal = () => screen.getByRole('dialog', { name: /cita/i });
const guardar = () => within(modal()).getByRole('button', { name: 'Guardar' });

async function abrirNueva(user, opts = {}) {
  const utils = renderScreen(<CalendarioPage />, { route: RUTA, ...opts });
  await user.click(screen.getByRole('button', { name: 'Agregar' }));
  await user.click(screen.getByText('Nueva cita'));
  return utils;
}

describe('tipo de la entrada', () => {
  it('arranca como cita, y lo explica', async () => {
    const user = userEvent.setup();
    await abrirNueva(user);

    expect(within(modal()).getByRole('button', { name: 'Cita' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ocurre una sola vez en la fecha elegida.')).toBeInTheDocument();
  });

  it('al elegir anual, cambia la aclaración', async () => {
    const user = userEvent.setup();
    await abrirNueva(user);

    await user.click(within(modal()).getByRole('button', { name: 'Anual' }));
    expect(screen.getByText('Se repite cada año en esta fecha (cumpleaños, feriados).')).toBeInTheDocument();
    expect(within(modal()).getByRole('button', { name: 'Anual' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(modal()).getByRole('button', { name: 'Cita' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('una cita se guarda con kind cita', async () => {
    const user = userEvent.setup();
    const { item } = await abrirNueva(user);

    await user.type(within(modal()).getByLabelText('Título'), 'Dentista');
    await user.click(guardar());
    expect(item('Dentista').kind).toBe('cita');
    expect(item('Dentista').date).toBe('2026-03-20');
  });

  it('una anual se guarda con kind anual y se repite todos los años', async () => {
    const user = userEvent.setup();
    const { item } = await abrirNueva(user);

    await user.click(within(modal()).getByRole('button', { name: 'Anual' }));
    await user.type(within(modal()).getByLabelText('Título'), 'Cumple de Ana');
    await user.click(guardar());

    expect(item('Cumple de Ana').kind).toBe('anual');
    // Se ve en su casillero del mes y en el detalle del día, que son dos lugares.
    const casillero = screen.getByRole('button', { name: '2026-03-20' });
    expect(within(casillero).getByText('Cumple de Ana')).toBeInTheDocument();
    expect(screen.getByText(/se repite cada año/)).toBeInTheDocument();
  });

  it('ni la cita ni la anual guardan el campo done: no se completan', async () => {
    const user = userEvent.setup();
    const { item } = await abrirNueva(user);

    await user.type(within(modal()).getByLabelText('Título'), 'Dentista');
    await user.click(guardar());
    expect('done' in item('Dentista')).toBe(false);
  });
});

describe('validaciones', () => {
  it('sin título no guarda, y lo dice con la palabra "cita"', async () => {
    const user = userEvent.setup();
    const { doc } = await abrirNueva(user);

    await user.click(guardar());
    expect(screen.getByText('Poné un título para la cita.')).toBeInTheDocument();
    expect(doc().items).toHaveLength(0);
    expect(modal()).toBeInTheDocument();
  });

  it('siendo anual, el mensaje cambia', async () => {
    const user = userEvent.setup();
    await abrirNueva(user);

    await user.click(within(modal()).getByRole('button', { name: 'Anual' }));
    await user.click(guardar());
    expect(screen.getByText('Poné un título para la fecha anual.')).toBeInTheDocument();
  });

  it('el aviso se va al escribir', async () => {
    const user = userEvent.setup();
    await abrirNueva(user);

    await user.click(guardar());
    await user.type(within(modal()).getByLabelText('Título'), 'D');
    expect(screen.queryByText('Poné un título para la cita.')).not.toBeInTheDocument();
  });

  it('el foco va al título', async () => {
    const user = userEvent.setup();
    await abrirNueva(user);

    await user.click(guardar());
    expect(within(modal()).getByLabelText('Título')).toHaveFocus();
  });
});

describe('editar una cita que ya existe', () => {
  const doc = conItems([
    { id: 'c1', kind: 'cita', title: 'Dentista', desc: 'llevar estudios', date: '2026-03-20', time: '10:00' },
  ]);

  const abrir = async (user) => {
    const utils = renderScreen(<CalendarioPage />, { doc, route: RUTA });
    await user.click(screen.getByRole('button', { name: 'Dentista' }));
    return utils;
  };

  it('abre con todo cargado', async () => {
    const user = userEvent.setup();
    await abrir(user);

    expect(screen.getByRole('dialog', { name: 'Editar cita' })).toBeInTheDocument();
    expect(within(modal()).getByLabelText('Título')).toHaveValue('Dentista');
    expect(within(modal()).getByLabelText('Descripción · opcional')).toHaveValue('llevar estudios');
    expect(within(modal()).getByText('Viernes 20 de marzo')).toBeInTheDocument();
    expect(within(modal()).getByRole('switch', { name: 'Con hora' })).toHaveAttribute('aria-checked', 'true');
  });

  it('convertir una cita en anual la deja como anual', async () => {
    const user = userEvent.setup();
    const { item } = await abrir(user);

    await user.click(within(modal()).getByRole('button', { name: 'Anual' }));
    await user.click(guardar());
    expect(item('Dentista').kind).toBe('anual');
  });

  it('cambiar la fecha la mueve de día', async () => {
    const user = userEvent.setup();
    const { item } = await abrir(user);

    await user.click(within(modal()).getByText('Viernes 20 de marzo'));
    await user.click(within(modal().querySelector('.dpick')).getByRole('button', { name: '25' }));
    await user.click(guardar());

    expect(item('Dentista').date).toBe('2026-03-25');
    // El calendario queda parado en la fecha nueva (focusDate).
    expect(screen.getByText('Miércoles 25')).toBeInTheDocument();
  });

  it('eliminar pide confirmación con el texto de una cita', async () => {
    const user = userEvent.setup();
    const { doc: leer } = await abrir(user);

    await user.click(within(modal()).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('¿Eliminar esta cita?')).toBeInTheDocument();
    expect(screen.getByText('Se quita del calendario.')).toBeInTheDocument();

    const cartel = screen.getByRole('alertdialog');
    await user.click(within(cartel).getByRole('button', { name: 'Eliminar' }));
    expect(leer().items).toHaveLength(0);
  });

  it('una anual se borra con su propia advertencia', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, {
      doc: conItems([{ id: 'a1', kind: 'anual', title: 'Cumple', desc: '', date: '1990-03-20', time: null }]),
      route: RUTA,
    });

    await user.click(screen.getByRole('button', { name: 'Cumple' }));
    await user.click(within(modal()).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('¿Eliminar esta fecha anual?')).toBeInTheDocument();
    expect(screen.getByText('Se quita del calendario y deja de repetirse cada año.')).toBeInTheDocument();
  });

  it('una cita nueva no ofrece eliminar', async () => {
    const user = userEvent.setup();
    await abrirNueva(user);
    expect(within(modal()).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
});

describe('la hora de una cita', () => {
  it('propone las 09:00 y arranca apagada', async () => {
    const user = userEvent.setup();
    await abrirNueva(user);

    expect(within(modal()).getByText('09:00')).toBeInTheDocument();
    expect(within(modal()).getByRole('switch', { name: 'Con hora' })).toHaveAttribute('aria-checked', 'false');
  });

  it('sin encenderla, se guarda sin hora', async () => {
    const user = userEvent.setup();
    const { item } = await abrirNueva(user);

    await user.type(within(modal()).getByLabelText('Título'), 'Sin hora');
    await user.click(guardar());
    expect(item('Sin hora').time).toBeNull();
  });
});
