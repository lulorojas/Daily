import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { AppRoutes } from './AppRoutes';
import { fakeUser, renderWithAuth } from '../test/utils';

/* Rutas protegidas: la parte más importante de la etapa. Se simula cada estado de sesión
   y se comprueba dos cosas en cada uno — que se vea lo que corresponde, y sobre todo que
   NO se vea lo que no corresponde.

   Las pantallas se montan de verdad; lo único falso es Firebase. */
vi.mock('../services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  sendReset: vi.fn(),
  resendVerification: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../services/firebase', () => ({
  authSender: () => 'noreply@daily-app-2aae2.firebaseapp.com',
}));

const titulo = () => screen.getByRole('heading', { level: 1 }).textContent;

describe('sin sesión', () => {
  const auth = { user: null, ready: true };

  it('la raíz manda al login', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/' });
    expect(titulo()).toBe('Hola de nuevo');
  });

  it('/login muestra el formulario de ingreso', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/login' });
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('/registro muestra el formulario de registro, con confirmación de contraseña', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/registro' });
    expect(titulo()).toBe('Creá tu cuenta');
    expect(screen.getByLabelText(/Repetir contraseña/)).toBeInTheDocument();
  });

  it('/recuperar muestra el pedido de link', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/recuperar' });
    expect(titulo()).toBe('Recuperar contraseña');
  });

  it('/verificar no es accesible: vuelve al login', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/verificar' });
    expect(titulo()).toBe('Hola de nuevo');
  });

  it('una URL inventada cae en el login', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/gimnasio' });
    expect(titulo()).toBe('Hola de nuevo');
  });

  it('no se filtra nada de la app', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/login' });
    expect(screen.queryByText(/Sesión iniciada como/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });

  it('ofrece recuperar la contraseña y crear cuenta', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/login' });
    expect(screen.getByRole('link', { name: /Olvidaste tu contraseña/ })).toHaveAttribute('href', '/recuperar');
    expect(screen.getByRole('link', { name: /Creá una/ })).toHaveAttribute('href', '/registro');
  });
});

describe('con sesión sin verificar', () => {
  const auth = { user: fakeUser('lulo@ejemplo.com', false), ready: true };

  it('la raíz manda a la pantalla de verificación', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/' });
    expect(titulo()).toBe('Verificá tu email');
  });

  it('la traba dice a qué casilla se mandó el mail', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/verificar' });
    expect(screen.getByText('lulo@ejemplo.com')).toBeInTheDocument();
  });

  it('no se puede volver al login estando logueado sin verificar', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/login' });
    expect(titulo()).toBe('Verificá tu email');
  });

  it('tampoco entra a la app', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/' });
    expect(screen.queryByText(/Sesión iniciada como/)).not.toBeInTheDocument();
  });

  it('ofrece reenviar el mail y cerrar sesión', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/verificar' });
    expect(screen.getByRole('button', { name: 'Reenviar email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });
});

describe('con sesión verificada', () => {
  const auth = { user: fakeUser('lulo@ejemplo.com', true), ready: true };
  // Hoy no tiene un título fijo (cambia con la hora y con el día que se mire), así que se
  // la reconoce por la bandeja de pendientes, que está siempre.
  const enHoy = () => screen.getByText('Sin fecha');

  it('la raíz muestra la app', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/' });
    expect(enHoy()).toBeInTheDocument();
    expect(screen.getByText('Progreso del día')).toBeInTheDocument();
  });

  it('/login ya no es accesible: redirige a la app', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/login' });
    expect(enHoy()).toBeInTheDocument();
  });

  it('/verificar tampoco: ya está verificado', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/verificar' });
    expect(enHoy()).toBeInTheDocument();
  });

  it('/calendario muestra el calendario', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/calendario' });
    expect(screen.getByText('Anuales')).toBeInTheDocument();
  });

  it('/ajustes muestra la cuenta y el cerrar sesión', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/ajustes' });
    expect(screen.getByText(/Sesión iniciada como/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('las secciones que faltan tienen su URL y avisan', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/gym' });
    expect(titulo()).toBe('Gimnasio');
    expect(screen.getByText(/todavía no se migró/)).toBeInTheDocument();
  });

  it('una URL inventada cae en Hoy', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/lo-que-sea' });
    expect(enHoy()).toBeInTheDocument();
  });

  it('la barra de abajo tiene las cinco secciones', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/' });
    // El nombre accesible es el completo (aria-label), no la abreviatura que se ve.
    for (const label of ['Hoy', 'Calendario', 'Gimnasio', 'Hábitos', 'Progreso']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('no quedan formularios de sesión en pantalla', () => {
    renderWithAuth(<AppRoutes />, { auth, route: '/' });
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Contraseña/)).not.toBeInTheDocument();
  });
});
