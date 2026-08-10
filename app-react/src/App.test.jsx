import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { App } from './App';
import { fakeUser, renderWithAuth } from './test/utils';

vi.mock('./services/auth', () => ({
  login: vi.fn(), register: vi.fn(), sendReset: vi.fn(),
  resendVerification: vi.fn(), logout: vi.fn(),
}));
vi.mock('./services/firebase', () => ({ authSender: () => 'noreply@daily-app-2aae2.firebaseapp.com' }));

/* Los dos cortes que van ANTES del router: mientras no se sabe en qué estado está la
   sesión, no hay ninguna URL que tenga sentido mostrar. */
describe('App — puerta previa al router', () => {
  it('mientras Firebase no contesta, muestra la pantalla de espera', () => {
    renderWithAuth(<App />, { auth: { user: null, ready: false }, route: '/' });
    expect(screen.getByText('Abriendo tu Daily…')).toBeInTheDocument();
  });

  it('durante la espera no se filtra ni el login ni la app', () => {
    renderWithAuth(<App />, { auth: { user: null, ready: false }, route: '/' });
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sesión iniciada como/)).not.toBeInTheDocument();
  });

  it('si Firebase no arrancó, avisa y no deja entrar', () => {
    renderWithAuth(<App />, { auth: { user: null, ready: true, error: new Error('boom') }, route: '/' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No se pudo cargar');
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('el error de arranque gana incluso si hubiera una sesión cacheada', () => {
    renderWithAuth(<App />, { auth: { user: fakeUser(), ready: true, error: new Error('boom') }, route: '/' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No se pudo cargar');
  });

  it('resuelta la sesión, entra el router', () => {
    renderWithAuth(<App />, { auth: { user: null, ready: true }, route: '/login' });
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('el contenedor #app existe, que es lo que el CSS de la app actual espera', () => {
    const { container } = renderWithAuth(<App />, { auth: { user: null, ready: true }, route: '/login' });
    expect(container.querySelector('#app')).not.toBeNull();
  });
});
