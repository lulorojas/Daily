import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthForm } from './useAuthForm';

const validarNoVacio = (values) => {
  const errors = {};
  if (!values.email) errors.email = 'Poné tu email.';
  if (!values.password) errors.password = 'Poné tu contraseña.';
  return errors;
};

function montar(validate = validarNoVacio) {
  return renderHook(() => useAuthForm({ email: '', password: '' }, validate));
}

describe('useAuthForm', () => {
  it('register devuelve el valor actual del campo', () => {
    const { result } = montar();
    expect(result.current.register('email').value).toBe('');
  });

  it('onChange guarda lo tipeado', () => {
    const { result } = montar();
    act(() => result.current.register('email').onChange({ target: { value: 'lulo@ejemplo.com' } }));
    expect(result.current.values.email).toBe('lulo@ejemplo.com');
  });

  it('validateAll devuelve null y marca los campos cuando falta algo', () => {
    const { result } = montar();
    let salida;
    act(() => { salida = result.current.validateAll(); });
    expect(salida).toBeNull();
    expect(result.current.errors).toEqual({ email: 'Poné tu email.', password: 'Poné tu contraseña.' });
  });

  it('validateAll devuelve los valores ya recortados cuando está todo bien', () => {
    const { result } = montar();
    act(() => {
      result.current.register('email').onChange({ target: { value: '  lulo@ejemplo.com ' } });
      result.current.register('password').onChange({ target: { value: ' secreta1 ' } });
    });
    let salida;
    act(() => { salida = result.current.validateAll(); });
    expect(salida).toEqual({ email: 'lulo@ejemplo.com', password: 'secreta1' });
  });

  it('valida sobre los valores recortados, no sobre los crudos', () => {
    const validate = vi.fn(() => ({}));
    const { result } = renderHook(() => useAuthForm({ email: '' }, validate));
    act(() => result.current.register('email').onChange({ target: { value: '   ' } }));
    act(() => result.current.validateAll());
    expect(validate).toHaveBeenCalledWith({ email: '' });
  });

  it('corregir un campo borra solo su error', () => {
    const { result } = montar();
    act(() => { result.current.validateAll(); });
    act(() => result.current.register('email').onChange({ target: { value: 'l' } }));

    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.errors.password).toBe('Poné tu contraseña.');
  });

  it('el error del campo llega en las props que register entrega', () => {
    const { result } = montar();
    act(() => { result.current.validateAll(); });
    expect(result.current.register('password').error).toBe('Poné tu contraseña.');
  });

  it('lleva el foco al primer campo con problema, en el orden del formulario', () => {
    const { result } = montar();
    const email = { focus: vi.fn(), scrollIntoView: vi.fn() };
    const password = { focus: vi.fn(), scrollIntoView: vi.fn() };
    act(() => {
      result.current.register('email').inputRef(email);
      result.current.register('password').inputRef(password);
    });
    act(() => { result.current.validateAll(); });

    expect(email.focus).toHaveBeenCalledTimes(1);
    expect(password.focus).not.toHaveBeenCalled();
  });

  it('una segunda validación limpia los errores que ya se corrigieron', () => {
    const { result } = montar();
    act(() => { result.current.validateAll(); });
    act(() => {
      result.current.register('email').onChange({ target: { value: 'lulo@ejemplo.com' } });
      result.current.register('password').onChange({ target: { value: 'secreta1' } });
    });
    act(() => { result.current.validateAll(); });
    expect(result.current.errors).toEqual({});
  });
});
