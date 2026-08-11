import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { ItemFormsProvider } from '../context/ItemFormsProvider';
import { authStatus } from '../lib/authStatus';
import { createDataStore } from '../store/dataStore';
import { createFakeFirestore } from './fakeFirestore';
import { emptyDoc } from './fixtures';

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

/* Un store de datos real, pero con un Firestore de mentira: el mismo código que corre en
   producción, sin red. `doc` es el documento que ya tendría esa cuenta en la nube. */
export function fakeDataStore({ doc = emptyDoc(), uid = 'uid-test', start = true } = {}) {
  const firestore = createFakeFirestore(doc === null ? {} : { [uid]: doc });
  const store = createDataStore({
    subscribe: firestore.subscribe,
    save: firestore.save,
    readLocalSeed: () => null,
  });
  if (start) store.start(uid);
  return { store, firestore };
}

/* MemoryRouter = un router que guarda la URL en memoria en vez de tocar la barra del
   navegador. Es lo que permite testear rutas: se arranca en la URL que uno quiera.

   `data` es opcional: si no se pasa, se monta un store con un documento vacío. Las
   pantallas de sesión no lo usan, pero tampoco molesta que esté. */
export function renderWithAuth(ui, { auth = {}, route = '/', data = {} } = {}) {
  const value = auth.status ? auth : fakeAuth(auth);
  const { store, firestore } = data.store ? data : fakeDataStore(data);
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={value}>
        <DataContext.Provider value={store}>{ui}</DataContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { ...result, auth: value, store, firestore };
}

/* Montar una pantalla de la app (Hoy, Calendario) como se monta de verdad: adentro del
   router, con una sesión verificada, con un documento en un Firestore de mentira y con el
   proveedor de formularios, que es el que abre los modales de tarea y cita.

   Devuelve además `doc()`, que lee el documento tal como quedó en el store después de lo
   que haya hecho el test. Es la forma de comprobar QUÉ se guardó, no solo qué se ve. */
export function renderScreen(ui, { doc = emptyDoc(), route = '/', uid = 'uid-test' } = {}) {
  const { store, firestore } = fakeDataStore({ doc, uid });
  const auth = fakeAuth({ user: fakeUser() });

  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={auth}>
        <DataContext.Provider value={store}>
          <ItemFormsProvider>{ui}</ItemFormsProvider>
        </DataContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return {
    ...result,
    store,
    firestore,
    doc: () => store.getSnapshot().data,
    // Los ítems por título, que es como los busca un test cuando no conoce el id.
    item: (title) => store.getSnapshot().data.items.find((x) => x.title === title),
  };
}

// Un error tal como lo tira Firebase: lo que importa es el campo `code`.
export function firebaseError(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}
