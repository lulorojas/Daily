import { describe, expect, it } from 'vitest';
import {
  EMAIL_RE, PASS_MIN, hasErrors,
  validateLogin, validateRegister, validateReset,
} from './validation';

/* Los tests más baratos del proyecto: funciones puras, sin DOM ni componentes.
   Son también los que más rinden, porque acá vive la regla de negocio ("qué es un email
   válido") y las pantallas solo la muestran. */

describe('EMAIL_RE', () => {
  const validos = ['lulo@ejemplo.com', 'a@b.co', 'nombre.apellido+etiqueta@sub.dominio.com.ar'];
  const invalidos = ['', 'esto-no-es-un-email', 'sin@dominio', 'sin@dominio.a', 'con espacio@x.com', '@x.com', 'dos@@x.com'];

  it.each(validos)('acepta %s', (email) => expect(EMAIL_RE.test(email)).toBe(true));
  it.each(invalidos)('rechaza %s', (email) => expect(EMAIL_RE.test(email)).toBe(false));
});

describe('hasErrors', () => {
  it('un objeto vacío es "está todo bien"', () => expect(hasErrors({})).toBe(false));
  it('con un campo marcado, hay errores', () => expect(hasErrors({ email: 'falta' })).toBe(true));
});

describe('validateLogin', () => {
  it('sin nada, marca los dos campos', () => {
    const errors = validateLogin({ email: '', password: '' });
    expect(errors).toEqual({ email: 'Poné tu email.', password: 'Poné tu contraseña.' });
  });

  it('distingue "falta el email" de "el email está mal escrito"', () => {
    expect(validateLogin({ email: '', password: 'x' }).email).toBe('Poné tu email.');
    expect(validateLogin({ email: 'no-va', password: 'x' }).email).toBe('Ese email no tiene un formato válido.');
  });

  it('no le pide un mínimo a la contraseña (una cuenta vieja puede tener cualquiera)', () => {
    expect(validateLogin({ email: 'lulo@ejemplo.com', password: '1' })).toEqual({});
  });

  it('con email válido y contraseña, no hay errores', () => {
    expect(validateLogin({ email: 'lulo@ejemplo.com', password: 'secreta1' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const base = { email: 'lulo@ejemplo.com', password: 'secreta1', password2: 'secreta1' };

  it('el caso completo pasa', () => {
    expect(validateRegister(base)).toEqual({});
  });

  it('exige el mínimo de Firebase', () => {
    const errors = validateRegister({ ...base, password: '123', password2: '123' });
    expect(errors.password).toBe('La contraseña tiene que tener al menos 6 caracteres.');
    expect(PASS_MIN).toBe(6);
  });

  it('justo en el límite, la contraseña vale', () => {
    expect(validateRegister({ ...base, password: '123456', password2: '123456' }).password).toBeUndefined();
  });

  it('avisa si las dos contraseñas no coinciden', () => {
    const errors = validateRegister({ ...base, password2: 'secreta2' });
    expect(errors.password2).toBe('Las dos contraseñas no coinciden.');
  });

  it('la confirmación vacía pide repetir, no "no coinciden"', () => {
    expect(validateRegister({ ...base, password2: '' }).password2).toBe('Repetí la contraseña.');
  });

  it('la contraseña vacía pide una, no el mínimo', () => {
    expect(validateRegister({ ...base, password: '', password2: '' }).password).toBe('Poné una contraseña.');
  });

  it('marca todos los campos con problema, no solo el primero', () => {
    const errors = validateRegister({ email: 'no-va', password: '12', password2: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'password', 'password2']);
  });
});

describe('validateReset', () => {
  it('pide el email', () => {
    expect(validateReset({ email: '' })).toEqual({ email: 'Poné tu email.' });
  });

  it('con un email válido no hay errores', () => {
    expect(validateReset({ email: 'lulo@ejemplo.com' })).toEqual({});
  });

  it('no pide contraseña', () => {
    expect(Object.keys(validateReset({ email: 'lulo@ejemplo.com' }))).toHaveLength(0);
  });
});
