import { describe, expect, it } from 'vitest';
import { AUTH_ERR, authErrorMessage } from './authErrors';
import { firebaseError } from '../test/utils';

describe('authErrorMessage', () => {
  it('traduce el código de Firebase al criollo', () => {
    expect(authErrorMessage(firebaseError('auth/invalid-credential')))
      .toBe('El email o la contraseña no son correctos.');
  });

  it('explica el caso de estar sin internet', () => {
    expect(authErrorMessage(firebaseError('auth/network-request-failed')))
      .toBe('No hay conexión. Para entrar la primera vez hace falta internet.');
  });

  it('un código desconocido no deja a la persona sin respuesta', () => {
    expect(authErrorMessage(firebaseError('auth/algo-nuevo')))
      .toBe('Algo salió mal. Probá de nuevo en un momento.');
  });

  it('aguanta que no venga error', () => {
    expect(authErrorMessage(null)).toBe('Algo salió mal. Probá de nuevo en un momento.');
    expect(authErrorMessage(undefined)).toBe('Algo salió mal. Probá de nuevo en un momento.');
  });

  it('ningún mensaje muestra el código crudo de Firebase', () => {
    for (const [code, msg] of Object.entries(AUTH_ERR)) {
      expect(msg).not.toContain(code);
      expect(msg).not.toContain('auth/');
    }
  });

  it('están traducidos los errores que Firebase devuelve al entrar y al registrarse', () => {
    for (const code of ['auth/invalid-email', 'auth/user-not-found', 'auth/wrong-password',
      'auth/invalid-credential', 'auth/email-already-in-use', 'auth/weak-password',
      'auth/too-many-requests', 'auth/user-disabled']) {
      expect(AUTH_ERR[code]).toBeTruthy();
    }
  });
});
