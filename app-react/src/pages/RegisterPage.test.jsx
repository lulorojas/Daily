import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterPage } from './RegisterPage';
import { firebaseError, renderWithAuth } from '../test/utils';
import { register as createAccount } from '../services/auth';

vi.mock('../services/auth', () => ({ register: vi.fn() }));
vi.mock('../services/firebase', () => ({ authSender: () => 'noreply@daily-app-2aae2.firebaseapp.com' }));

const setup = () => renderWithAuth(<RegisterPage />, { auth: { user: null, ready: true }, route: '/registro' });
const emailInput = () => screen.getByLabelText(/^Email/);
const passInput = () => screen.getByLabelText(/^Contraseña/);
const pass2Input = () => screen.getByLabelText(/^Repetir contraseña/);
const crear = () => screen.getByRole('button', { name: 'Crear cuenta' });

beforeEach(() => vi.resetAllMocks());

describe('RegisterPage — validación', () => {
  it('vacío: marca los tres campos y no crea nada', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(crear());

    expect(createAccount).not.toHaveBeenCalled();
    expect(screen.getByText('Poné tu email.')).toBeInTheDocument();
    expect(screen.getByText('Poné una contraseña.')).toBeInTheDocument();
    expect(screen.getByText('Repetí la contraseña.')).toBeInTheDocument();
  });

  it('contraseña corta: lo explica y no crea la cuenta', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), '123');
    await user.type(pass2Input(), '123');
    await user.click(crear());

    expect(createAccount).not.toHaveBeenCalled();
    expect(screen.getByText(/al menos 6 caracteres/)).toBeInTheDocument();
  });

  it('contraseñas distintas: lo explica y no crea la cuenta', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), 'secreta1');
    await user.type(pass2Input(), 'secreta2');
    await user.click(crear());

    expect(createAccount).not.toHaveBeenCalled();
    expect(screen.getByText('Las dos contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('el campo de confirmación existe (no alcanza con una sola contraseña)', () => {
    setup();
    expect(pass2Input()).toBeInTheDocument();
    expect(pass2Input()).toHaveAttribute('type', 'password');
  });
});

describe('RegisterPage — alta', () => {
  it('con todo bien, crea la cuenta con el email y la contraseña tipeados', async () => {
    const user = userEvent.setup();
    createAccount.mockResolvedValue({});
    setup();
    await user.type(emailInput(), 'nuevo@ejemplo.com');
    await user.type(passInput(), 'secreta1');
    await user.type(pass2Input(), 'secreta1');
    await user.click(crear());

    expect(createAccount).toHaveBeenCalledTimes(1);
    expect(createAccount).toHaveBeenCalledWith('nuevo@ejemplo.com', 'secreta1');
  });

  it('si el email ya existe, invita a iniciar sesión', async () => {
    const user = userEvent.setup();
    createAccount.mockRejectedValue(firebaseError('auth/email-already-in-use'));
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), 'secreta1');
    await user.type(pass2Input(), 'secreta1');
    await user.click(crear());

    expect(await screen.findByText('Ya existe una cuenta con ese email. Probá iniciar sesión.')).toBeInTheDocument();
    expect(crear()).toBeEnabled();
  });
});

describe('RegisterPage — avisos', () => {
  it('avisa de qué casilla llega el mail y que puede caer en spam', () => {
    setup();
    expect(screen.getByText('noreply@daily-app-2aae2.firebaseapp.com')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
  });

  it('ofrece volver al login', () => {
    setup();
    expect(screen.getByRole('link', { name: /Entrá/ })).toHaveAttribute('href', '/login');
  });
});
