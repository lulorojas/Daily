import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordPage } from './ResetPasswordPage';
import { firebaseError, renderWithAuth } from '../test/utils';
import { sendReset } from '../services/auth';

vi.mock('../services/auth', () => ({ sendReset: vi.fn() }));

const setup = () => renderWithAuth(<ResetPasswordPage />, { auth: { user: null, ready: true }, route: '/recuperar' });
const emailInput = () => screen.getByLabelText('Email');
const enviar = () => screen.getByRole('button', { name: 'Enviar email de recuperación' });

beforeEach(() => vi.resetAllMocks());

describe('ResetPasswordPage', () => {
  it('con email inválido no manda nada', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(emailInput(), 'no-va');
    await user.click(enviar());

    expect(sendReset).not.toHaveBeenCalled();
    expect(screen.getByText('Ese email no tiene un formato válido.')).toBeInTheDocument();
  });

  it('con email válido pide el link de recuperación', async () => {
    const user = userEvent.setup();
    sendReset.mockResolvedValue(undefined);
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.click(enviar());

    expect(sendReset).toHaveBeenCalledWith('lulo@ejemplo.com');
  });

  it('avisa que salió el mail y destraba el botón (la pantalla no cambia)', async () => {
    const user = userEvent.setup();
    sendReset.mockResolvedValue(undefined);
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.click(enviar());

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveClass('auth-flash', 'ok');
    expect(alerta).toHaveTextContent(/link para cambiar la contraseña/);
    expect(enviar()).toBeEnabled();
  });

  it('el aviso no delata si el email está registrado o no', async () => {
    const user = userEvent.setup();
    sendReset.mockResolvedValue(undefined);
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.click(enviar());

    expect(await screen.findByRole('alert')).toHaveTextContent(/^Si hay una cuenta con ese email/);
  });

  it('un error de Firebase se muestra traducido', async () => {
    const user = userEvent.setup();
    sendReset.mockRejectedValue(firebaseError('auth/too-many-requests'));
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.click(enviar());

    expect(await screen.findByText('Demasiados intentos seguidos. Esperá un momento y probá de nuevo.')).toBeInTheDocument();
  });

  it('tiene la salida "Volver" al login', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });

  it('no pide contraseña: solo el email', () => {
    setup();
    expect(screen.queryByLabelText(/Contraseña/)).not.toBeInTheDocument();
  });
});
