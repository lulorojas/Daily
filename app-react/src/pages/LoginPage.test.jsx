import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';
import { firebaseError, renderWithAuth } from '../test/utils';
import { login } from '../services/auth';

/* vi.mock reemplaza el módulo entero por funciones espía: la pantalla se monta de verdad,
   pero nunca sale un pedido a Firebase. Así se puede probar "qué se le pidió a Firebase y
   con qué argumentos" sin credenciales, sin red y sin ensuciar el proyecto real. */
vi.mock('../services/auth', () => ({ login: vi.fn() }));

const setup = () => renderWithAuth(<LoginPage />, { auth: { user: null, ready: true }, route: '/login' });
const emailInput = () => screen.getByLabelText('Email');
const passInput = () => screen.getByLabelText('Contraseña');
const entrar = () => screen.getByRole('button', { name: 'Entrar' });

beforeEach(() => vi.resetAllMocks());

describe('LoginPage — validación', () => {
  it('vacío: marca los dos campos y no llama a Firebase', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(entrar());

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Poné tu email.')).toBeInTheDocument();
    expect(screen.getByText('Poné tu contraseña.')).toBeInTheDocument();
    expect(emailInput()).toHaveClass('bad');
    expect(passInput()).toHaveClass('bad');
  });

  it('el foco va al primer campo con problema', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(passInput(), 'secreta1');
    await user.click(entrar());
    expect(emailInput()).toHaveFocus();
  });

  it('email con formato inválido: lo dice y no llama a Firebase', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(emailInput(), 'esto-no-es-un-email');
    await user.type(passInput(), 'secreta1');
    await user.click(entrar());

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Ese email no tiene un formato válido.')).toBeInTheDocument();
  });

  it('al corregir el campo, su aviso desaparece', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(entrar());
    expect(screen.getByText('Poné tu email.')).toBeInTheDocument();

    await user.type(emailInput(), 'l');
    expect(screen.queryByText('Poné tu email.')).not.toBeInTheDocument();
    expect(emailInput()).not.toHaveClass('bad');
  });
});

describe('LoginPage — ingreso', () => {
  it('con datos válidos le pide a Firebase el ingreso, con lo tipeado', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({});
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), 'secreta1');
    await user.click(entrar());

    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith('lulo@ejemplo.com', 'secreta1');
  });

  it('recorta los espacios de más, como la app actual', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({});
    setup();
    await user.type(emailInput(), '  lulo@ejemplo.com  ');
    await user.type(passInput(), 'secreta1 ');
    await user.click(entrar());

    expect(login).toHaveBeenCalledWith('lulo@ejemplo.com', 'secreta1');
  });

  it('Enter dentro del formulario también entra', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({});
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), 'secreta1{Enter}');

    expect(login).toHaveBeenCalledTimes(1);
  });

  it('mientras espera, el botón queda bloqueado', async () => {
    const user = userEvent.setup();
    login.mockReturnValue(new Promise(() => {})); // nunca resuelve: se queda esperando
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), 'secreta1');
    await user.click(entrar());

    const boton = await screen.findByRole('button', { name: 'Un momento…' });
    expect(boton).toBeDisabled();
    expect(boton).toHaveClass('busy');
  });

  it('dos clics seguidos no mandan dos pedidos', async () => {
    const user = userEvent.setup();
    login.mockReturnValue(new Promise(() => {}));
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), 'secreta1');
    await user.click(entrar());
    await user.click(await screen.findByRole('button', { name: 'Un momento…' }));

    expect(login).toHaveBeenCalledTimes(1);
  });
});

describe('LoginPage — errores de Firebase', () => {
  async function fallarCon(code) {
    const user = userEvent.setup();
    login.mockRejectedValue(firebaseError(code));
    setup();
    await user.type(emailInput(), 'lulo@ejemplo.com');
    await user.type(passInput(), 'secreta1');
    await user.click(entrar());
    return user;
  }

  it('traduce el error al criollo', async () => {
    await fallarCon('auth/invalid-credential');
    expect(await screen.findByText('El email o la contraseña no son correctos.')).toBeInTheDocument();
  });

  it('explica la falta de conexión', async () => {
    await fallarCon('auth/network-request-failed');
    expect(await screen.findByText('No hay conexión. Para entrar la primera vez hace falta internet.')).toBeInTheDocument();
  });

  it('no se pierde lo tipeado y el botón se destraba', async () => {
    await fallarCon('auth/invalid-credential');
    await screen.findByText('El email o la contraseña no son correctos.');

    expect(emailInput()).toHaveValue('lulo@ejemplo.com');
    expect(passInput()).toHaveValue('secreta1');
    expect(entrar()).toBeEnabled();
  });

  it('el aviso se anuncia como alerta', async () => {
    await fallarCon('auth/too-many-requests');
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveClass('auth-flash', 'err');
  });

  it('al reintentar, el error anterior se limpia', async () => {
    const user = await fallarCon('auth/invalid-credential');
    await screen.findByText('El email o la contraseña no son correctos.');

    login.mockReturnValue(new Promise(() => {}));
    await user.click(entrar());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
