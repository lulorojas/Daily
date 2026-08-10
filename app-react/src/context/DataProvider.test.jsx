import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DataProvider } from './DataProvider';
import { AuthContext } from './AuthContext';
import { useData } from '../hooks/useData';
import { fakeAuth, fakeUser } from '../test/utils';
import { createFakeFirestore } from '../test/fakeFirestore';
import { createDataStore, DATA_STATUS } from '../store/dataStore';
import { fullDoc } from '../test/fixtures';
import { addTask } from '../store/mutations';

/* El enganche entre la sesión y los datos: que el sync arranque solo cuando hay un
   usuario verificado, y se corte cuando deja de haberlo. */

const UID = 'uid-lulo@ejemplo.com';

function Sonda() {
  const { status, data } = useData();
  return <div data-testid="sonda">{status}|{data ? data.items.length : '-'}</div>;
}
const leer = () => screen.getByTestId('sonda').textContent;

function montar({ auth, docs = {} } = {}) {
  const firestore = createFakeFirestore(docs);
  const store = createDataStore({
    subscribe: firestore.subscribe,
    save: firestore.save,
    readLocalSeed: () => null,
  });
  const result = render(
    <AuthContext.Provider value={auth}>
      <DataProvider store={store}><Sonda /></DataProvider>
    </AuthContext.Provider>,
  );
  return { ...result, store, firestore };
}

describe('DataProvider — cuándo arranca el sync', () => {
  it('sin sesión no se pide nada a Firestore', () => {
    const { firestore } = montar({ auth: fakeAuth({ user: null }) });
    expect(firestore.subscribe).not.toHaveBeenCalled();
    expect(leer()).toBe('idle|-');
  });

  it('con sesión SIN verificar tampoco', () => {
    const { firestore } = montar({ auth: fakeAuth({ user: fakeUser('a@b.com', false) }) });
    expect(firestore.subscribe).not.toHaveBeenCalled();
  });

  it('mientras Firebase no contestó, tampoco', () => {
    const { firestore } = montar({ auth: fakeAuth({ user: null, ready: false }) });
    expect(firestore.subscribe).not.toHaveBeenCalled();
  });

  it('con sesión verificada arranca el sync de ese uid', () => {
    const { firestore } = montar({
      auth: fakeAuth({ user: fakeUser('lulo@ejemplo.com', true) }),
      docs: { [UID]: fullDoc() },
    });
    expect(firestore.subscribe).toHaveBeenCalledTimes(1);
    expect(firestore.subscribe.mock.calls[0][0]).toBe(UID);
    expect(leer()).toBe('ready|7');
  });
});

describe('DataProvider — cuándo se corta', () => {
  it('al cerrar sesión se suelta la suscripción y se limpian los datos', () => {
    const auth = fakeAuth({ user: fakeUser('lulo@ejemplo.com', true) });
    const firestore = createFakeFirestore({ [UID]: fullDoc() });
    const store = createDataStore({ subscribe: firestore.subscribe, save: firestore.save, readLocalSeed: () => null });

    const { rerender } = render(
      <AuthContext.Provider value={auth}>
        <DataProvider store={store}><Sonda /></DataProvider>
      </AuthContext.Provider>,
    );
    expect(leer()).toBe('ready|7');

    rerender(
      <AuthContext.Provider value={fakeAuth({ user: null })}>
        <DataProvider store={store}><Sonda /></DataProvider>
      </AuthContext.Provider>,
    );

    expect(leer()).toBe('idle|-');
    expect(firestore.subscribers(UID)).toBe(0);
  });

  it('al desmontar también se suelta (no queda escuchando Firestore)', () => {
    const { firestore, unmount } = montar({
      auth: fakeAuth({ user: fakeUser('lulo@ejemplo.com', true) }),
      docs: { [UID]: fullDoc() },
    });
    unmount();
    expect(firestore.subscribers(UID)).toBe(0);
  });

  it('un aviso de sesión que no cambia el uid NO re-suscribe', () => {
    const usuario = fakeUser('lulo@ejemplo.com', true);
    const firestore = createFakeFirestore({ [UID]: fullDoc() });
    const store = createDataStore({ subscribe: firestore.subscribe, save: firestore.save, readLocalSeed: () => null });

    const pintar = (auth) => (
      <AuthContext.Provider value={auth}>
        <DataProvider store={store}><Sonda /></DataProvider>
      </AuthContext.Provider>
    );
    const { rerender } = render(pintar(fakeAuth({ user: usuario })));
    // Mismo uid, objeto nuevo: es lo que pasa cuando se re-chequea la verificación.
    rerender(pintar(fakeAuth({ user: { ...usuario } })));

    expect(firestore.subscribe).toHaveBeenCalledTimes(1);
  });
});

describe('useData — lo que ven las pantallas', () => {
  it('un cambio en los datos redibuja lo que los está mirando', () => {
    const { store } = montar({
      auth: fakeAuth({ user: fakeUser('lulo@ejemplo.com', true) }),
      docs: { [UID]: fullDoc() },
    });
    expect(leer()).toBe('ready|7');

    act(() => { store.update((draft) => addTask(draft, { title: 'nueva' })); });
    expect(leer()).toBe('ready|8');
  });

  it('un cambio llegado de otro dispositivo también redibuja', () => {
    const { firestore } = montar({
      auth: fakeAuth({ user: fakeUser('lulo@ejemplo.com', true) }),
      docs: { [UID]: fullDoc() },
    });

    const otro = fullDoc();
    otro.items = otro.items.slice(0, 2);
    act(() => { firestore.emit(UID, otro); });

    expect(leer()).toBe('ready|2');
  });

  it('avisa claro si se usa fuera del proveedor', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Sonda />)).toThrow(/fuera de <DataProvider>/);
    spy.mockRestore();
  });

  it('el estado de carga es visible para las pantallas', () => {
    const store = createDataStore({ subscribe: () => () => {}, save: vi.fn(), readLocalSeed: () => null });
    render(
      <AuthContext.Provider value={fakeAuth({ user: fakeUser('lulo@ejemplo.com', true) })}>
        <DataProvider store={store}><Sonda /></DataProvider>
      </AuthContext.Provider>,
    );
    expect(leer()).toBe(DATA_STATUS.LOADING + '|-');
  });
});
