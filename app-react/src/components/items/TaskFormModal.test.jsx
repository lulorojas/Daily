import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoyPage } from '../../pages/HoyPage';
import { renderScreen } from '../../test/utils';
import { emptyDoc, TODAY, TOMORROW } from '../../test/fixtures';
import { shortDate, todayISO, tomorrowISO } from '../../lib/dates';

/* ============================================================================
   FORMULARIO DE TAREA

   Se prueba desde adentro de la pantalla, abriéndolo como lo abre un usuario, y no
   montando el modal suelto: así se comprueba también que lo que se guarda llega al
   documento y se ve en la pantalla de atrás.

   Las validaciones son el port del bloque de validaciones de los tests de la app vanilla
   ("tarea sin título avisa y no guarda").
   ============================================================================ */

const conItems = (items) => ({ ...emptyDoc(), items });
const modal = () => screen.getByRole('dialog', { name: /tarea/i });
const guardar = () => screen.getByRole('button', { name: 'Guardar' });

describe('crear una tarea', () => {
  const abrir = async (user) => {
    const utils = renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'Existente', desc: '', date: TODAY, time: null, done: false }]),
    });
    await user.click(screen.getByRole('button', { name: 'Existente' }));
    return utils;
  };

  it('el formulario abre con los datos de la tarea', async () => {
    const user = userEvent.setup();
    await abrir(user);
    expect(modal()).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Existente');
  });

  it('sin título no guarda y avisa qué falta', async () => {
    const user = userEvent.setup();
    const { doc } = await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.click(guardar());

    expect(screen.getByText('Poné un título para la tarea.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveClass('bad');
    expect(modal()).toBeInTheDocument();               // sigue abierto
    expect(doc().items[0].title).toBe('Existente');    // no se tocó nada
  });

  it('un título de puros espacios tampoco alcanza', async () => {
    const user = userEvent.setup();
    await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), '   ');
    await user.click(guardar());
    expect(screen.getByText('Poné un título para la tarea.')).toBeInTheDocument();
  });

  it('el aviso desaparece al corregir el campo', async () => {
    const user = userEvent.setup();
    await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.click(guardar());
    expect(screen.getByText('Poné un título para la tarea.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Título'), 'A');
    expect(screen.queryByText('Poné un título para la tarea.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Título')).not.toHaveClass('bad');
  });

  it('el foco va al campo con problema', async () => {
    const user = userEvent.setup();
    await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.click(guardar());
    expect(screen.getByLabelText('Título')).toHaveFocus();
  });

  it('guardar recorta los espacios de más', async () => {
    const user = userEvent.setup();
    const { item } = await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), '  Con espacios  ');
    await user.click(guardar());

    expect(item('Con espacios')).toBeTruthy();
  });

  it('editar cambia título y descripción, y cierra el modal', async () => {
    const user = userEvent.setup();
    const { item } = await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Cambiada');
    await user.type(screen.getByLabelText('Descripción · opcional'), 'con detalle');
    await user.click(guardar());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(item('Cambiada').desc).toBe('con detalle');
    expect(screen.getByText('Cambiada')).toBeInTheDocument();
  });

  it('editar NO toca el estado de completada', async () => {
    const user = userEvent.setup();
    const { item } = renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'Hecha', desc: '', date: TODAY, time: null, done: true, doneAt: TODAY }]),
    });

    await user.click(screen.getByRole('button', { name: 'Hecha' }));
    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Hecha y editada');
    await user.click(guardar());

    expect(item('Hecha y editada').done).toBe(true);
    expect(item('Hecha y editada').doneAt).toBe(TODAY);
  });
});

describe('el "Cuándo"', () => {
  const abrirTarea = async (user, date) => {
    const utils = renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'T', desc: '', date, time: null, done: false }]),
      route: date ? `/?d=${date}` : '/',
    });
    await user.click(screen.getByRole('button', { name: 'T' }));
    return utils;
  };

  it('el chip encendido sale de la fecha de la tarea', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, TODAY);
    expect(within(modal()).getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('una tarea de mañana enciende "Mañana"', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, TOMORROW);
    expect(within(modal()).getByRole('button', { name: 'Mañana' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('una pendiente sin fecha enciende "Sin fecha"', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, null);
    expect(within(modal()).getByRole('button', { name: 'Sin fecha' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('una fecha cualquiera enciende el cuarto chip, que muestra esa fecha', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, '2026-03-05');
    // El cuarto chip no es un "elegido/no elegido" como los otros tres: además de mostrar
    // la fecha, despliega el calendario. Por eso su estado se mira por la clase.
    expect(within(modal()).getByRole('button', { name: shortDate('2026-03-05') }))
      .toHaveClass('on');
  });

  it('tocar un chip cambia la fecha que se guarda', async () => {
    const user = userEvent.setup();
    const { item } = await abrirTarea(user, TODAY);

    await user.click(within(modal()).getByRole('button', { name: 'Mañana' }));
    await user.click(guardar());
    expect(item('T').date).toBe(tomorrowISO());
  });

  it('"Sin fecha" la manda a la bandeja', async () => {
    const user = userEvent.setup();
    const { item } = await abrirTarea(user, TODAY);

    await user.click(within(modal()).getByRole('button', { name: 'Sin fecha' }));
    await user.click(guardar());
    expect(item('T').date).toBeNull();
  });

  /* El calendario del formulario tiene que buscarse acotado: adentro del mismo modal, el
     selector de hora también tiene botones que se llaman "12". */
  const calendario = () => modal().querySelector('.dpick');

  it('elegir una fecha en el calendario del formulario', async () => {
    const user = userEvent.setup();
    const { item } = await abrirTarea(user, '2026-03-05');

    // El calendario ya viene abierto porque la fecha no es hoy ni mañana.
    expect(calendario()).toHaveClass('open');
    await user.click(within(calendario()).getByRole('button', { name: '12' }));
    await user.click(guardar());
    expect(item('T').date).toBe('2026-03-12');
  });

  it('el calendario se puede pasear por meses', async () => {
    const user = userEvent.setup();
    const { item } = await abrirTarea(user, '2026-03-05');

    await user.click(within(calendario()).getByRole('button', { name: 'Mes siguiente' }));
    await user.click(within(calendario()).getByRole('button', { name: '3' }));
    await user.click(guardar());
    expect(item('T').date).toBe('2026-04-03');
  });

  it('con la fecha en hoy, el calendario arranca cerrado', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, TODAY);
    expect(calendario()).not.toHaveClass('open');

    await user.click(within(modal()).getByRole('button', { name: 'Otra fecha' }));
    expect(calendario()).toHaveClass('open');
  });
});

describe('la hora', () => {
  const abrirTarea = async (user, time) => {
    const utils = renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'T', desc: '', date: TODAY, time, done: false }]),
    });
    await user.click(screen.getByRole('button', { name: 'T' }));
    return utils;
  };

  it('arranca apagada en una tarea sin hora', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, null);
    expect(within(modal()).getByRole('switch', { name: 'Con hora' })).toHaveAttribute('aria-checked', 'false');
    expect(within(modal()).getByText('08:00')).toBeInTheDocument();   // la propuesta
  });

  it('arranca encendida y con su valor si la tarea tiene hora', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, '14:30');
    expect(within(modal()).getByRole('switch', { name: 'Con hora' })).toHaveAttribute('aria-checked', 'true');
    expect(within(modal()).getByText('14:30')).toBeInTheDocument();
  });

  it('encenderla guarda la hora propuesta', async () => {
    const user = userEvent.setup();
    const { item } = await abrirTarea(user, null);

    await user.click(within(modal()).getByRole('switch', { name: 'Con hora' }));
    await user.click(guardar());
    expect(item('T').time).toBe('08:00');
  });

  it('apagarla guarda null, no la hora', async () => {
    const user = userEvent.setup();
    const { item } = await abrirTarea(user, '14:30');

    await user.click(within(modal()).getByRole('switch', { name: 'Con hora' }));
    await user.click(guardar());
    expect(item('T').time).toBeNull();
  });

  it('elegir hora y minutos', async () => {
    const user = userEvent.setup();
    const { item } = await abrirTarea(user, '14:30');
    const columnas = modal().querySelectorAll('.tpick-col');

    await user.click(within(columnas[0]).getByText('07'));
    await user.click(within(columnas[1]).getByText('45'));
    await user.click(guardar());
    expect(item('T').time).toBe('07:45');
  });

  it('los minutos van de cinco en cinco', async () => {
    const user = userEvent.setup();
    await abrirTarea(user, '14:30');
    const columnas = modal().querySelectorAll('.tpick-col');
    expect(columnas[1].querySelectorAll('.tpick-itm')).toHaveLength(12);
    expect(columnas[0].querySelectorAll('.tpick-itm')).toHaveLength(24);
  });
});

describe('eliminar', () => {
  const abrir = async (user) => {
    const utils = renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'Para borrar', desc: '', date: TODAY, time: null, done: false }]),
    });
    await user.click(screen.getByRole('button', { name: 'Para borrar' }));
    return utils;
  };

  it('una tarea nueva no ofrece eliminar', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />);
    expect(screen.queryByRole('button', { name: 'Eliminar tarea' })).not.toBeInTheDocument();
    expect(user).toBeTruthy();
  });

  it('pide confirmación antes de borrar', async () => {
    const user = userEvent.setup();
    const { doc } = await abrir(user);

    await user.click(screen.getByRole('button', { name: 'Eliminar tarea' }));
    expect(screen.getByText('¿Eliminar esta tarea?')).toBeInTheDocument();
    expect(screen.getByText('La tarea se quita de la app.')).toBeInTheDocument();
    expect(doc().items).toHaveLength(1);   // todavía no
  });

  it('cancelar no borra nada', async () => {
    const user = userEvent.setup();
    const { doc } = await abrir(user);

    await user.click(screen.getByRole('button', { name: 'Eliminar tarea' }));
    // El "Cancelar" del cartel de confirmación, no el de la hoja que está atrás.
    const cartel = screen.getByRole('alertdialog');
    await user.click(within(cartel).getByRole('button', { name: 'Cancelar' }));

    expect(doc().items).toHaveLength(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Editar tarea' })).toBeInTheDocument();
  });

  it('confirmar la borra y cierra todo', async () => {
    const user = userEvent.setup();
    const { doc } = await abrir(user);

    await user.click(screen.getByRole('button', { name: 'Eliminar tarea' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(doc().items).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Para borrar')).not.toBeInTheDocument();
  });
});

describe('teclado y cierre', () => {
  const abrir = async (user) => {
    const utils = renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'T', desc: '', date: TODAY, time: null, done: false }]),
    });
    await user.click(screen.getByRole('button', { name: 'T' }));
    return utils;
  };

  it('Escape cierra sin guardar', async () => {
    const user = userEvent.setup();
    const { item } = await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'No guardada');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(item('T')).toBeTruthy();
  });

  it('Cancelar hace lo mismo', async () => {
    const user = userEvent.setup();
    await abrir(user);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Enter guarda', async () => {
    const user = userEvent.setup();
    const { item } = await abrir(user);

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Con Enter{Enter}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(item('Con Enter')).toBeTruthy();
  });

  it('Enter dentro de la descripción NO guarda: escribe un renglón', async () => {
    const user = userEvent.setup();
    await abrir(user);

    await user.type(screen.getByLabelText('Descripción · opcional'), 'linea 1{Enter}linea 2');
    expect(screen.getByRole('dialog', { name: 'Editar tarea' })).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción · opcional')).toHaveValue('linea 1\nlinea 2');
  });

  it('tocar el fondo cierra', async () => {
    const user = userEvent.setup();
    const { container } = await abrir(user);
    await user.click(document.querySelector('.scrim'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});

describe('el día que se está mirando sigue a la tarea guardada', () => {
  it('guardar con otra fecha mueve el día de Hoy a esa fecha', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'T', desc: '', date: TODAY, time: null, done: false }]),
    });

    await user.click(screen.getByRole('button', { name: 'T' }));
    await user.click(within(modal()).getByRole('button', { name: 'Mañana' }));
    await user.click(guardar());

    // focusDate() de la app vanilla: la tira semanal queda parada en el día nuevo.
    expect(screen.getByRole('button', { name: tomorrowISO() })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('mandarla a "sin fecha" no mueve el día', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'T', desc: '', date: TODAY, time: null, done: false }]),
    });

    await user.click(screen.getByRole('button', { name: 'T' }));
    await user.click(within(modal()).getByRole('button', { name: 'Sin fecha' }));
    await user.click(guardar());

    expect(screen.getByRole('button', { name: todayISO() })).toHaveAttribute('aria-pressed', 'true');
  });
});
