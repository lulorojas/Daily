import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from './HomePage';
import { fakeUser, firebaseError, renderWithAuth } from '../test/utils';
import { logout } from '../services/auth';

vi.mock('../services/auth', () => ({ logout: vi.fn() }));

const setup = () => renderWithAuth(<HomePage />, { auth: { user: fakeUser('lulo@ejemplo.com', true) }, route: '/' });
const confirmar = () => within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cerrar sesión' });

beforeEach(() => vi.resetAllMocks());

describe('HomePage (placeholder de la app)', () => {
  it('muestra con qué cuenta se entró', () => {
    setup();
    expect(screen.getByText('Sesión iniciada como lulo@ejemplo.com')).toBeInTheDocument();
  });

  it('cerrar sesión pide confirmación primero', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it('al confirmar, cierra la sesión', async () => {
    const user = userEvent.setup();
    logout.mockResolvedValue(undefined);
    setup();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await user.click(confirmar());

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('si Firebase no puede cerrar la sesión, lo avisa en pantalla', async () => {
    const user = userEvent.setup();
    logout.mockRejectedValue(firebaseError('auth/network-request-failed'));
    setup();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await user.click(confirmar());

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('No hay conexión. Para entrar la primera vez hace falta internet.');
  });
});
