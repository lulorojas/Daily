import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { RequireData } from './RequireData';
import { fakeUser, renderWithAuth } from '../test/utils';
import { createFakeFirestore } from '../test/fakeFirestore';
import { createDataStore } from '../store/dataStore';
import { fullDoc } from '../test/fixtures';

vi.mock('../services/auth', () => ({ logout: vi.fn() }));

const UID = 'uid-test';

function Pantalla() { return <h1>La app</h1>; }

function montar(store) {
  return renderWithAuth(
    <Routes>
      <Route element={<RequireData />}>
        <Route path="/" element={<Pantalla />} />
      </Route>
    </Routes>,
    { auth: { user: fakeUser('lulo@ejemplo.com', true) }, route: '/', data: store ? { store } : { doc: fullDoc() } },
  );
}

describe('RequireData — la segunda puerta', () => {
  it('con los datos cargados, deja pasar a la app', () => {
    montar();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('La app');
  });

  it('mientras los datos no llegan, muestra "Abriendo tu Daily…" y no la app', () => {
    const store = createDataStore({ subscribe: () => () => {}, save: vi.fn(), readLocalSeed: () => null });
    store.start(UID);
    montar(store);

    expect(screen.getByText('Abriendo tu Daily…')).toBeInTheDocument();
    expect(screen.queryByText('La app')).not.toBeInTheDocument();
  });

  it('si Firestore falla, muestra el error y no la app', () => {
    const firestore = createFakeFirestore();
    firestore.failWith('permission-denied');
    const store = createDataStore({ subscribe: firestore.subscribe, save: firestore.save, readLocalSeed: () => null });
    store.start(UID);
    montar(store);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No pudimos cargar tus datos');
    expect(screen.getByText(/necesitás conexión/)).toBeInTheDocument();
    expect(screen.queryByText('La app')).not.toBeInTheDocument();
  });

  it('el botón Reintentar vuelve a pedir los datos y entra si ya anda', async () => {
    const user = userEvent.setup();
    const firestore = createFakeFirestore({ [UID]: fullDoc() });
    firestore.failWith('unavailable');
    const store = createDataStore({ subscribe: firestore.subscribe, save: firestore.save, readLocalSeed: () => null });
    store.start(UID);
    montar(store);

    firestore.recover();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('La app')).toBeInTheDocument();
  });
});
