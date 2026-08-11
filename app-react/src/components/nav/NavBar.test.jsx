import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavBar } from './NavBar';
import { renderScreen } from '../../test/utils';
import { TODAY } from '../../test/fixtures';
import { todayISO } from '../../lib/dates';

/* La barra de abajo: las cinco secciones y el botón +. Es el port de navbar(), donde la
   sección abierta salía de `ui.tab`; acá sale de la URL. */

const link = (name) => screen.getByRole('link', { name });

describe('las cinco secciones', () => {
  it('están todas, en orden', () => {
    renderScreen(<NavBar />);
    const nombres = screen.getAllByRole('link').map((a) => a.getAttribute('aria-label'));
    expect(nombres).toEqual(['Hoy', 'Calendario', 'Gimnasio', 'Hábitos', 'Progreso']);
  });

  it('la abreviatura es lo que se ve', () => {
    renderScreen(<NavBar />);
    expect(within(link('Calendario')).getByText('Cal')).toBeInTheDocument();
    expect(within(link('Gimnasio')).getByText('Gym')).toBeInTheDocument();
  });

  it('en la raíz, Hoy queda marcada', () => {
    renderScreen(<NavBar />, { route: '/' });
    expect(link('Hoy')).toHaveClass('on');
    expect(link('Hoy')).toHaveAttribute('aria-current', 'page');
    expect(link('Calendario')).not.toHaveClass('on');
  });

  it('en el calendario, se marca el calendario', () => {
    renderScreen(<NavBar />, { route: '/calendario' });
    expect(link('Calendario')).toHaveClass('on');
    expect(link('Hoy')).not.toHaveClass('on');
  });

  it('en Ajustes sigue marcada Hoy: es su sub-pantalla', () => {
    renderScreen(<NavBar />, { route: '/ajustes' });
    expect(link('Hoy')).toHaveClass('on');
  });

  it('cada sección apunta a su URL', () => {
    renderScreen(<NavBar />, { route: '/' });
    expect(link('Calendario').getAttribute('href')).toMatch(/^\/calendario\?/);
    expect(link('Gimnasio').getAttribute('href')).toMatch(/^\/gym\?/);
  });
});

describe('el día viaja entre secciones', () => {
  it('los links se llevan puesto el día que se está mirando', () => {
    renderScreen(<NavBar />, { route: '/?d=2026-03-05' });
    expect(link('Calendario')).toHaveAttribute('href', '/calendario?d=2026-03-05');
  });

  it('sin ?d, los links llevan el día de hoy', () => {
    renderScreen(<NavBar />, { route: '/' });
    expect(link('Calendario')).toHaveAttribute('href', `/calendario?d=${todayISO()}`);
  });

  it('un ?d inválido no se propaga', () => {
    renderScreen(<NavBar />, { route: '/?d=cualquier-cosa' });
    expect(link('Calendario')).toHaveAttribute('href', `/calendario?d=${todayISO()}`);
  });
});

describe('el botón +', () => {
  it('abre el menú de carga rápida', async () => {
    const user = userEvent.setup();
    renderScreen(<NavBar />);

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('dialog', { name: 'Agregar' })).toBeInTheDocument();
    expect(screen.getByText('Nueva tarea')).toBeInTheDocument();
    expect(screen.getByText('Con fecha y hora opcionales')).toBeInTheDocument();
    expect(screen.getByText('Nueva cita')).toBeInTheDocument();
    expect(screen.getByText('Va al calendario')).toBeInTheDocument();
  });

  it('en esta etapa ofrece dos opciones: hábito y peso llegan con sus pantallas', async () => {
    const user = userEvent.setup();
    renderScreen(<NavBar />);

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.queryByText('Nuevo hábito')).not.toBeInTheDocument();
    expect(screen.queryByText('Registrar peso')).not.toBeInTheDocument();
  });

  it('elegir "Nueva tarea" abre el formulario', async () => {
    const user = userEvent.setup();
    renderScreen(<NavBar />);

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByText('Nueva tarea'));
    expect(screen.getByRole('dialog', { name: 'Nueva tarea' })).toBeInTheDocument();
  });

  it('desde Hoy, la tarea nueva nace con el día que se está mirando', async () => {
    const user = userEvent.setup();
    renderScreen(<NavBar />, { route: '/?d=2026-03-05' });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByText('Nueva tarea'));
    expect(screen.getByText('Jue 5/3')).toBeInTheDocument();   // el chip "otra fecha"
  });

  it('desde el calendario, la tarea nueva nace hoy (como en la app actual)', async () => {
    const user = userEvent.setup();
    renderScreen(<NavBar />, { route: '/calendario?d=2026-03-05' });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByText('Nueva tarea'));
    const modal = screen.getByRole('dialog', { name: 'Nueva tarea' });
    expect(within(modal).getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('la cita nueva sí toma el día elegido, esté donde esté', async () => {
    const user = userEvent.setup();
    renderScreen(<NavBar />, { route: '/calendario?d=2026-03-05' });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByText('Nueva cita'));
    expect(screen.getByText('Jueves 5 de marzo')).toBeInTheDocument();
  });

  it('el menú se cierra con Escape', async () => {
    const user = userEvent.setup();
    renderScreen(<NavBar />, { route: `/?d=${TODAY}` });

    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
