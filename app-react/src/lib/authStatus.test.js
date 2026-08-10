import { describe, expect, it } from 'vitest';
import { AUTH_STATUS, authStatus, pathForStatus } from './authStatus';
import { fakeUser } from '../test/utils';

/* La lógica de la puerta, aislada de React. Es el equivalente de los tests de
   "35. Puerta de acceso" de la app vanilla, pero sin tener que montar nada. */

describe('authStatus', () => {
  it('con Firebase caído, error (aunque haya usuario)', () => {
    expect(authStatus({ ready: true, user: fakeUser(), error: new Error('x') })).toBe(AUTH_STATUS.ERROR);
  });

  it('mientras Firebase no contesta, loading', () => {
    expect(authStatus({ ready: false, user: null, error: null })).toBe(AUTH_STATUS.LOADING);
  });

  it('sin sesión, signed-out', () => {
    expect(authStatus({ ready: true, user: null, error: null })).toBe(AUTH_STATUS.SIGNED_OUT);
  });

  it('con sesión sin verificar, unverified', () => {
    expect(authStatus({ ready: true, user: fakeUser('a@b.com', false), error: null })).toBe(AUTH_STATUS.UNVERIFIED);
  });

  it('con sesión verificada, ready', () => {
    expect(authStatus({ ready: true, user: fakeUser('a@b.com', true), error: null })).toBe(AUTH_STATUS.READY);
  });

  it('un usuario sin el campo emailVerified cuenta como sin verificar', () => {
    expect(authStatus({ ready: true, user: { uid: 'u', email: 'a@b.com' }, error: null })).toBe(AUTH_STATUS.UNVERIFIED);
  });

  it('loading gana sobre "no hay usuario": no se muestra el login antes de tiempo', () => {
    expect(authStatus({ ready: false, user: null, error: null })).not.toBe(AUTH_STATUS.SIGNED_OUT);
  });
});

describe('pathForStatus', () => {
  it('sin sesión, al login', () => expect(pathForStatus(AUTH_STATUS.SIGNED_OUT)).toBe('/login'));
  it('sin verificar, a la traba', () => expect(pathForStatus(AUTH_STATUS.UNVERIFIED)).toBe('/verificar'));
  it('verificado, a la app', () => expect(pathForStatus(AUTH_STATUS.READY)).toBe('/'));
  it('ante cualquier otra cosa, al login', () => expect(pathForStatus('cualquiera')).toBe('/login'));
});
