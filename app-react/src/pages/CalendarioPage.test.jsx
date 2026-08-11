import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarioPage } from './CalendarioPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, TODAY } from '../test/fixtures';
import { MONTHS } from '../lib/dates';

/* ============================================================================
   CALENDARIO
   ============================================================================ */

const conItems = (items) => ({ ...emptyDoc(), items });

// Un casillero del mes (su nombre accesible es la fecha ISO).
const dia = (dISO) => screen.getByRole('button', { name: dISO });
const titulo = () => screen.getByRole('heading', { level: 1 }).textContent;

describe('navegación de meses', () => {
  it('arranca en el mes del día elegido', () => {
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-15' });
    expect(titulo()).toBe('Marzo');
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('las flechas cambian de mes', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-15' });

    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(titulo()).toBe('Abril');

    await user.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(titulo()).toBe('Febrero');
  });

  it('de diciembre pasa a enero del año siguiente', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-12-10' });

    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(titulo()).toBe('Enero');
    expect(screen.getByText('2027')).toBeInTheDocument();
  });

  it('pasear por otro mes NO cambia el día elegido', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-15' });

    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    // El detalle de abajo sigue hablando del 15 de marzo.
    expect(screen.getByText('Domingo 15')).toBeInTheDocument();
  });

  it('las fechas son reales: marzo de 2026 tiene 31 días y arranca domingo', () => {
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-15' });
    expect(dia('2026-03-01')).toBeInTheDocument();
    expect(dia('2026-03-31')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2026-03-32' })).not.toBeInTheDocument();
  });

  it('febrero bisiesto tiene 29', () => {
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2024-02-10' });
    expect(dia('2024-02-29')).toBeInTheDocument();
  });
});

describe('lo que muestra cada casillero', () => {
  const doc = conItems([
    { id: 't1', kind: 'tarea', title: 'Comprar pan', desc: '', date: '2026-03-10', time: null, done: false },
    { id: 'c1', kind: 'cita', title: 'Dentista', desc: '', date: '2026-03-10', time: '10:00' },
    { id: 'c2', kind: 'cita', title: 'Reunión', desc: '', date: '2026-03-10', time: '11:00' },
    { id: 'c3', kind: 'cita', title: 'Cena', desc: '', date: '2026-03-10', time: '21:00' },
  ]);

  it('muestra hasta dos entradas por día, ordenadas por hora', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-01' });
    const casillero = dia('2026-03-10');
    /* El orden lo decide byTime(), igual que en la app vanilla: primero las que tienen
       hora, de la más temprana a la más tardía, y lo que no tiene hora al final. Por eso
       la tarea sin hora no entra en las dos primeras aunque sea una tarea. */
    expect([...casillero.querySelectorAll('.ctag')].map((n) => n.textContent))
      .toEqual(['Dentista', 'Reunión']);
    expect(within(casillero).queryByText('Comprar pan')).not.toBeInTheDocument();
  });

  it('el resto se resume en un "+N"', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-01' });
    expect(within(dia('2026-03-10')).getByText('+2')).toBeInTheDocument();
  });

  it('con dos o menos, no hay "+N"', () => {
    renderScreen(<CalendarioPage />, {
      doc: conItems([{ id: 't1', kind: 'tarea', title: 'Sola', desc: '', date: '2026-03-10', time: null, done: false }]),
      route: '/calendario?d=2026-03-01',
    });
    expect(within(dia('2026-03-10')).queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('un día vacío no muestra nada más que su número', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-01' });
    expect(within(dia('2026-03-11')).getByText('11')).toBeInTheDocument();
    expect(dia('2026-03-11').querySelectorAll('.ctag')).toHaveLength(0);
  });

  it('hoy queda marcado', () => {
    const { container } = renderScreen(<CalendarioPage />, { route: `/calendario?d=${TODAY}` });
    expect(container.querySelectorAll('.cnum.today')).toHaveLength(1);
    expect(within(dia(TODAY)).getByText(String(Number(TODAY.slice(8))))).toBeInTheDocument();
  });

  it('la leyenda explica los tres colores', () => {
    renderScreen(<CalendarioPage />);
    expect(screen.getByText('Tareas')).toBeInTheDocument();
    expect(screen.getByText('Citas')).toBeInTheDocument();
    expect(screen.getByText('Anuales')).toBeInTheDocument();
  });
});

describe('las fechas anuales se repiten todos los años', () => {
  const doc = conItems([
    { id: 'a1', kind: 'anual', title: 'Cumple de Ana', desc: '', date: '1990-03-12', time: null },
  ]);

  it('aparece en su mes+día de un año muy posterior', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-01' });
    expect(within(dia('2026-03-12')).getByText('Cumple de Ana')).toBeInTheDocument();
  });

  it('y también el año siguiente', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2027-03-01' });
    expect(within(dia('2027-03-12')).getByText('Cumple de Ana')).toBeInTheDocument();
    expect(user).toBeTruthy();
  });

  it('no aparece en otro mes', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-04-01' });
    expect(screen.queryByText('Cumple de Ana')).not.toBeInTheDocument();
  });
});

describe('detalle del día', () => {
  const doc = conItems([
    { id: 't1', kind: 'tarea', title: 'Comprar pan', desc: '', date: '2026-03-10', time: null, done: false },
    { id: 'c1', kind: 'cita', title: 'Dentista', desc: '', date: '2026-03-10', time: '10:00' },
    { id: 'a1', kind: 'anual', title: 'Cumple de Ana', desc: '', date: '1990-03-10', time: null },
  ]);

  it('muestra el día elegido y cuántas entradas tiene', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-10' });
    expect(screen.getByText('Martes 10')).toBeInTheDocument();
    expect(screen.getByText('3 entradas · marzo')).toBeInTheDocument();
  });

  it('una sola entrada va en singular', () => {
    renderScreen(<CalendarioPage />, {
      doc: conItems([{ id: 't', kind: 'tarea', title: 'Una', desc: '', date: '2026-03-11', time: null, done: false }]),
      route: '/calendario?d=2026-03-11',
    });
    expect(screen.getByText('1 entrada · marzo')).toBeInTheDocument();
  });

  it('lista tareas y citas, y dice qué es cada una', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-10' });
    expect(screen.getByText('Cita')).toBeInTheDocument();
    expect(screen.getByText(/se repite cada año/)).toBeInTheDocument();
  });

  it('tocar otro casillero cambia el detalle', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-10' });

    await user.click(dia('2026-03-20'));
    expect(screen.getByText('Viernes 20')).toBeInTheDocument();
    expect(screen.getByText('Sin entradas este día')).toBeInTheDocument();
  });

  it('un día sin nada ofrece agregar', () => {
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-20' });
    expect(screen.getByText('+ Agregar a este día')).toBeInTheDocument();
  });

  it('la tarea se puede marcar desde acá', async () => {
    const user = userEvent.setup();
    const { item } = renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-10' });

    await user.click(within(screen.getByRole('button', { name: 'Comprar pan' })).getByRole('checkbox'));
    expect(item('Comprar pan').done).toBe(true);
    // El doneAt es el día que se está mirando en el calendario.
    expect(item('Comprar pan').doneAt).toBe('2026-03-10');
  });

  it('tocar una entrada abre su formulario', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { doc, route: '/calendario?d=2026-03-10' });

    await user.click(screen.getByRole('button', { name: 'Dentista' }));
    expect(screen.getByRole('dialog', { name: 'Editar cita' })).toBeInTheDocument();
  });

  it('los recordatorios que vienen de una tarea se editan como tarea', async () => {
    /* Una tarea con hora se ve en el calendario igual que una cita, pero al tocarla abre
       el formulario de TAREA: es la misma entidad mostrada en dos lugares, y se edita
       donde nació. */
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, {
      doc: conItems([{ id: 't', kind: 'tarea', title: 'Con hora', desc: '', date: '2026-03-10', time: '15:00', done: false }]),
      route: '/calendario?d=2026-03-10',
    });

    await user.click(screen.getByRole('button', { name: 'Con hora' }));
    expect(screen.getByRole('dialog', { name: 'Editar tarea' })).toBeInTheDocument();
  });
});

describe('agregar desde un día', () => {
  it('el menú ofrece tarea y cita', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-20' });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByText('Nueva tarea')).toBeInTheDocument();
    expect(screen.getByText('Con la fecha de este día')).toBeInTheDocument();
    expect(screen.getByText('Nueva cita')).toBeInTheDocument();
  });

  it('el título del menú es la fecha del día', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-20' });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('dialog', { name: 'Viernes 20 de marzo' })).toBeInTheDocument();
  });

  it('la tarea nueva nace con la fecha de ese día', async () => {
    const user = userEvent.setup();
    const { item } = renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-20' });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByText('Nueva tarea'));
    await user.type(screen.getByLabelText('Título'), 'Desde el calendario');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(item('Desde el calendario').date).toBe('2026-03-20');
  });

  it('el atajo del día vacío hace lo mismo', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-20' });

    await user.click(screen.getByText('+ Agregar a este día'));
    expect(screen.getByRole('dialog', { name: 'Viernes 20 de marzo' })).toBeInTheDocument();
  });

  it('lo recién creado aparece en el casillero y en el detalle', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-20' });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByText('Nueva cita'));
    await user.type(screen.getByLabelText('Título'), 'Almuerzo');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(within(dia('2026-03-20')).getByText('Almuerzo')).toBeInTheDocument();
    expect(screen.getByText('1 entrada · marzo')).toBeInTheDocument();
  });
});

describe('el mes sigue al día elegido', () => {
  it('guardar algo en otro mes mueve la vista a ese mes', async () => {
    const user = userEvent.setup();
    renderScreen(<CalendarioPage />, { route: '/calendario?d=2026-03-20' });
    expect(titulo()).toBe(MONTHS[2]);

    // Se crea una cita y, desde el formulario, se le cambia la fecha a abril.
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByText('Nueva cita'));

    /* Las consultas se acotan al modal: adentro hay otro par de flechas de mes (las del
       selector de fecha) que se llaman igual que las de la pantalla de atrás. */
    const modal = screen.getByRole('dialog', { name: 'Nueva cita' });
    await user.type(within(modal).getByLabelText('Título'), 'En abril');
    await user.click(within(modal).getByText('Viernes 20 de marzo'));   // abre el calendario
    await user.click(within(modal).getByRole('button', { name: 'Mes siguiente' }));
    await user.click(within(modal).getByRole('button', { name: '7' }));
    await user.click(within(modal).getByRole('button', { name: 'Guardar' }));

    expect(titulo()).toBe(MONTHS[3]);
    expect(screen.getByText('Martes 7')).toBeInTheDocument();
  });
});
