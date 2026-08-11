import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import { isValidISO, useSelectedDay } from './useSelectedDay';
import { todayISO } from '../lib/dates';

/* El día que se está mirando vive en la URL (?d=…) en vez de en una variable global.
   Estos tests son sobre esa decisión: qué pasa con una URL rota, y que moverse de día no
   llene el historial del navegador. */

function Sonda() {
  const [day, setDay] = useSelectedDay();
  const { search } = useLocation();
  const tipo = useNavigationType();
  return (
    <div>
      <span data-testid="dia">{day}</span>
      <span data-testid="search">{search}</span>
      <span data-testid="tipo">{tipo}</span>
      <button type="button" onClick={() => setDay('2026-12-25')}>Navidad</button>
    </div>
  );
}

const montar = (route = '/') => render(
  <MemoryRouter initialEntries={[route]}><Sonda /></MemoryRouter>,
);

const dia = () => screen.getByTestId('dia').textContent;

describe('validación de la fecha', () => {
  it('acepta una fecha ISO real', () => {
    expect(isValidISO('2026-08-10')).toBe(true);
  });

  it('rechaza lo que no tiene forma de fecha', () => {
    for (const malo of ['chau', '', '2026-8-10', '10/08/2026', null, undefined, 20260810]) {
      expect(isValidISO(malo)).toBe(false);
    }
  });

  it('rechaza fechas que parecen válidas pero no existen', () => {
    // Sin este chequeo, new Date(2026,1,31) se iría a marzo y la app mostraría otro día.
    expect(isValidISO('2026-02-31')).toBe(false);
    expect(isValidISO('2026-13-01')).toBe(false);
    expect(isValidISO('2026-00-10')).toBe(false);
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(isValidISO('2024-02-29')).toBe(true);
    expect(isValidISO('2026-02-29')).toBe(false);
  });
});

describe('el día que devuelve el hook', () => {
  it('sin parámetro, es hoy', () => {
    montar('/');
    expect(dia()).toBe(todayISO());
  });

  it('con un parámetro válido, es ese', () => {
    montar('/?d=2026-03-05');
    expect(dia()).toBe('2026-03-05');
  });

  it('con basura, cae en hoy sin romperse', () => {
    montar('/?d=chau');
    expect(dia()).toBe(todayISO());
  });

  it('con una fecha imposible, también', () => {
    montar('/?d=2026-02-31');
    expect(dia()).toBe(todayISO());
  });
});

describe('cambiar de día', () => {
  it('escribe el parámetro en la URL', async () => {
    const user = userEvent.setup();
    montar('/');

    await user.click(screen.getByRole('button', { name: 'Navidad' }));
    expect(dia()).toBe('2026-12-25');
    expect(screen.getByTestId('search').textContent).toBe('?d=2026-12-25');
  });

  it('reemplaza la entrada del historial en vez de agregar una', async () => {
    /* Moverse por la tira semanal no es "navegar": si cada día agregara una entrada, el
       botón Atrás tendría que deshacer siete toques para salir de la pantalla. */
    const user = userEvent.setup();
    montar('/');

    await user.click(screen.getByRole('button', { name: 'Navidad' }));
    expect(screen.getByTestId('tipo').textContent).toBe('REPLACE');
  });

  it('conserva los otros parámetros que hubiera en la URL', async () => {
    const user = userEvent.setup();
    montar('/?otro=1');

    await user.click(screen.getByRole('button', { name: 'Navidad' }));
    expect(screen.getByTestId('search').textContent).toContain('otro=1');
    expect(screen.getByTestId('search').textContent).toContain('d=2026-12-25');
  });
});
