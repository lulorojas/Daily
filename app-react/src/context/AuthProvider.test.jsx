import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { fakeUser } from '../test/utils';

/* El proveedor es el corazón de la sesión: una sola suscripción a Firebase que alimenta a
   toda la app. Estos tests le pasan un Firebase de mentira por props (subscribe / refresh)
   y comprueban el ciclo completo: espera → sesión → cierre. */
vi.mock('../services/auth', () => ({
  subscribeToAuth: vi.fn(),
  refreshUser: vi.fn(),
  initError: () => null,
}));

// Componente-sonda: no dibuja nada útil, solo expone lo que ve del contexto.
function Sonda() {
  const { status, user, ready } = useAuth();
  return <div data-testid="sonda">{status}|{user?.email ?? '-'}|{String(ready)}</div>;
}
const leer = () => screen.getByTestId('sonda').textContent;

let avisar; // el callback que el proveedor le entregó al "Firebase" falso
let desuscribir;
let subscribe;

beforeEach(() => {
  avisar = null;
  desuscribir = vi.fn();
  subscribe = vi.fn((cb) => { avisar = cb; return desuscribir; });
});

function montar(refresh = vi.fn()) {
  return render(
    <AuthProvider subscribe={subscribe} refresh={refresh}>
      <Sonda />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  it('arranca esperando la respuesta de Firebase', () => {
    montar();
    expect(leer()).toBe('loading|-|false');
  });

  it('se suscribe una sola vez', () => {
    montar();
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('sin sesión pasa a signed-out', () => {
    montar();
    act(() => avisar(null));
    expect(leer()).toBe('signed-out|-|true');
  });

  it('con sesión sin verificar, unverified', () => {
    montar();
    act(() => avisar(fakeUser('lulo@ejemplo.com', false)));
    expect(leer()).toBe('unverified|lulo@ejemplo.com|true');
  });

  it('con sesión verificada, ready', () => {
    montar();
    act(() => avisar(fakeUser('lulo@ejemplo.com', true)));
    expect(leer()).toBe('ready|lulo@ejemplo.com|true');
  });

  it('al cerrarse la sesión vuelve a signed-out', () => {
    montar();
    act(() => avisar(fakeUser('lulo@ejemplo.com', true)));
    act(() => avisar(null));
    expect(leer()).toBe('signed-out|-|true');
  });

  it('al desmontar corta la suscripción (no deja escuchando a Firebase)', () => {
    const { unmount } = montar();
    unmount();
    expect(desuscribir).toHaveBeenCalledTimes(1);
  });

  it('reloadUser trae el usuario actualizado y redibuja', async () => {
    const refresh = vi.fn(async () => fakeUser('lulo@ejemplo.com', true));
    let contexto;
    function Captura() { contexto = useAuth(); return null; }
    render(
      <AuthProvider subscribe={subscribe} refresh={refresh}>
        <Sonda /><Captura />
      </AuthProvider>,
    );
    act(() => avisar(fakeUser('lulo@ejemplo.com', false)));
    expect(leer()).toBe('unverified|lulo@ejemplo.com|true');

    await act(async () => { await contexto.reloadUser(); });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(leer()).toBe('ready|lulo@ejemplo.com|true');
  });

  it('al volver a la app, re-chequea en silencio si el email sigue sin verificar', async () => {
    const refresh = vi.fn(async () => fakeUser('lulo@ejemplo.com', true));
    montar(refresh);
    act(() => avisar(fakeUser('lulo@ejemplo.com', false)));

    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(leer()).toBe('ready|lulo@ejemplo.com|true');
  });

  it('con el email ya verificado no molesta a Firebase al volver a la app', async () => {
    const refresh = vi.fn();
    montar(refresh);
    act(() => avisar(fakeUser('lulo@ejemplo.com', true)));

    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('si el re-chequeo silencioso falla, no rompe la pantalla', async () => {
    const refresh = vi.fn(async () => { throw new Error('sin red'); });
    montar(refresh);
    act(() => avisar(fakeUser('lulo@ejemplo.com', false)));

    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

    expect(leer()).toBe('unverified|lulo@ejemplo.com|true');
  });
});

describe('useAuth', () => {
  it('avisa claro si se usa fuera del proveedor', () => {
    // React loguea el error del render; se silencia para no ensuciar la salida del test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Sonda />)).toThrow(/fuera de <AuthProvider>/);
    spy.mockRestore();
  });
});
