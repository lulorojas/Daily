import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerifyEmailPage } from './VerifyEmailPage';
import { fakeAuth, fakeUser, firebaseError, renderWithAuth } from '../test/utils';
import { resendVerification, logout } from '../services/auth';

vi.mock('../services/auth', () => ({ resendVerification: vi.fn(), logout: vi.fn() }));
vi.mock('../services/firebase', () => ({ authSender: () => 'noreply@daily-app-2aae2.firebaseapp.com' }));

const sinVerificar = fakeUser('lulo@ejemplo.com', false);

function setup(reloadUser) {
  const auth = fakeAuth({ user: sinVerificar, reloadUser });
  return { ...renderWithAuth(<VerifyEmailPage />, { auth, route: '/verificar' }), auth };
}

const yaLoVerifique = () => screen.getByRole('button', { name: 'Ya lo verifiqué' });
const reenviar = () => screen.getByRole('button', { name: 'Reenviar email' });
const cerrarSesion = () => screen.getByRole('button', { name: 'Cerrar sesión' });

beforeEach(() => vi.resetAllMocks());

describe('VerifyEmailPage — qué se ve', () => {
  it('dice a qué casilla llegó el mail y de qué remitente', () => {
    setup();
    expect(screen.getByText('lulo@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByText('noreply@daily-app-2aae2.firebaseapp.com')).toBeInTheDocument();
    expect(screen.getByText(/Spam \/ No deseado/)).toBeInTheDocument();
  });

  it('ofrece las tres salidas', () => {
    setup();
    expect(yaLoVerifique()).toBeInTheDocument();
    expect(reenviar()).toBeInTheDocument();
    expect(cerrarSesion()).toBeInTheDocument();
  });
});

describe('VerifyEmailPage — "ya lo verifiqué"', () => {
  it('vuelve a preguntarle a Firebase por el usuario', async () => {
    const user = userEvent.setup();
    const reloadUser = vi.fn(async () => fakeUser('lulo@ejemplo.com', true));
    setup(reloadUser);
    await user.click(yaLoVerifique());

    expect(reloadUser).toHaveBeenCalledTimes(1);
  });

  it('si sigue sin verificar, lo dice y no deja pasar', async () => {
    const user = userEvent.setup();
    const reloadUser = vi.fn(async () => sinVerificar);
    setup(reloadUser);
    await user.click(yaLoVerifique());

    expect(await screen.findByText('Todavía figura sin verificar. Abrí el link del email y volvé a probar.')).toBeInTheDocument();
  });

  it('si ya está verificado, no muestra ningún reproche', async () => {
    const user = userEvent.setup();
    const reloadUser = vi.fn(async () => fakeUser('lulo@ejemplo.com', true));
    setup(reloadUser);
    await user.click(yaLoVerifique());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mientras chequea, bloquea las otras acciones', async () => {
    const user = userEvent.setup();
    const reloadUser = vi.fn(() => new Promise(() => {}));
    setup(reloadUser);
    await user.click(yaLoVerifique());

    expect(await screen.findByRole('button', { name: 'Un momento…' })).toBeDisabled();
    expect(reenviar()).toBeDisabled();
    expect(cerrarSesion()).toBeDisabled();
  });
});

describe('VerifyEmailPage — reenviar', () => {
  it('reenvía el mail y confirma a qué dirección', async () => {
    const user = userEvent.setup();
    resendVerification.mockResolvedValue(undefined);
    setup();
    await user.click(reenviar());

    expect(resendVerification).toHaveBeenCalledTimes(1);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveClass('ok');
    expect(alerta).toHaveTextContent('Listo, te reenviamos el email a lulo@ejemplo.com.');
  });

  it('si Firebase se queja por demasiados intentos, lo traduce', async () => {
    const user = userEvent.setup();
    resendVerification.mockRejectedValue(firebaseError('auth/too-many-requests'));
    setup();
    await user.click(reenviar());

    expect(await screen.findByText('Demasiados intentos seguidos. Esperá un momento y probá de nuevo.')).toBeInTheDocument();
  });
});

describe('VerifyEmailPage — cerrar sesión', () => {
  it('pide confirmación antes de cerrar', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(cerrarSesion());

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it('al cancelar, no cierra nada y el cartel se va', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(cerrarSesion());
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(logout).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('al confirmar, cierra la sesión', async () => {
    const user = userEvent.setup();
    logout.mockResolvedValue(undefined);
    setup();
    await user.click(cerrarSesion());
    // Dentro del cartel hay otro "Cerrar sesión": el que confirma.
    const dialogo = screen.getByRole('alertdialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar sesión' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
