import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../context/AuthContext';
import { authStatus } from '../lib/authStatus';

/* Herramientas para los tests, equivalentes al harness.js de la app vanilla.

   La idea es la misma que allá: montar la app de verdad con una sesión inventada y mirar
   qué se dibuja. Lo que cambia es cómo se inventa la sesión — en vez de un Firebase falso
   con globals, se inyecta el valor del contexto directamente. */

// Un usuario como el que llega del servicio: la foto plana, no el objeto de Firebase.
export function fakeUser(email = 'lulo@ejemplo.com', emailVerified = true) {
  return { uid: 'uid-' + email, email, emailVerified };
}

/* Arma el valor del contexto de sesión. `status` se calcula con la misma función que usa
   la app, así que un test nunca puede simular un estado imposible. */
export function fakeAuth({ user = null, ready = true, error = null, reloadUser } = {}) {
  return {
    user,
    ready,
    error,
    status: authStatus({ ready, user, error }),
    reloadUser: reloadUser || vi.fn(async () => user),
  };
}

/* MemoryRouter = un router que guarda la URL en memoria en vez de tocar la barra del
   navegador. Es lo que permite testear rutas: se arranca en la URL que uno quiera. */
export function renderWithAuth(ui, { auth = {}, route = '/' } = {}) {
  const value = auth.status ? auth : fakeAuth(auth);
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>
    </MemoryRouter>,
  );
  return { ...result, auth: value };
}

// Un error tal como lo tira Firebase: lo que importa es el campo `code`.
export function firebaseError(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}
