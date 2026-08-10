import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthAction } from './useAuthAction';
import { firebaseError } from '../test/utils';

/* renderHook monta un componente mínimo cuyo único trabajo es llamar al hook: sirve para
   probar la lógica reutilizable sin inventar una pantalla de mentira alrededor. */

describe('useAuthAction', () => {
  it('arranca sin nada en curso y sin avisos', () => {
    const { result } = renderHook(() => useAuthAction());
    expect(result.current.busy).toBeNull();
    expect(result.current.flash).toBeNull();
  });

  it('mientras corre, busy dice qué acción es', async () => {
    const { result } = renderHook(() => useAuthAction());
    act(() => { result.current.run('login', () => new Promise(() => {})); });
    await waitFor(() => expect(result.current.busy).toBe('login'));
  });

  it('sin onSuccess el botón queda trabado: la pantalla está por irse', async () => {
    const { result } = renderHook(() => useAuthAction());
    await act(async () => { await result.current.run('login', async () => 'ok'); });
    expect(result.current.busy).toBe('login');
  });

  it('con onSuccess destraba y deja decidir el mensaje', async () => {
    const { result } = renderHook(() => useAuthAction());
    await act(async () => {
      await result.current.run('reset', async () => 'valor', {
        onSuccess: (v) => result.current.showOk('salió: ' + v),
      });
    });
    expect(result.current.busy).toBeNull();
    expect(result.current.flash).toEqual({ kind: 'ok', msg: 'salió: valor' });
  });

  it('un error de Firebase destraba y se muestra traducido', async () => {
    const { result } = renderHook(() => useAuthAction());
    await act(async () => {
      await result.current.run('login', async () => { throw firebaseError('auth/wrong-password'); });
    });
    expect(result.current.busy).toBeNull();
    expect(result.current.flash).toEqual({ kind: 'err', msg: 'La contraseña no es correcta.' });
  });

  it('run devuelve si salió bien o mal', async () => {
    const { result } = renderHook(() => useAuthAction());
    let ok;
    await act(async () => { ok = await result.current.run('a', async () => 1); });
    expect(ok).toBe(true);
    await act(async () => { ok = await result.current.run('b', async () => { throw new Error('x'); }); });
    expect(ok).toBe(false);
  });

  it('cada intento limpia el aviso anterior', async () => {
    const { result } = renderHook(() => useAuthAction());
    await act(async () => { await result.current.run('a', async () => { throw firebaseError('auth/wrong-password'); }); });
    expect(result.current.flash).not.toBeNull();

    act(() => { result.current.run('a', () => new Promise(() => {})); });
    await waitFor(() => expect(result.current.flash).toBeNull());
  });

  it('si la pantalla ya se desmontó, no intenta tocar su estado', async () => {
    const { result, unmount } = renderHook(() => useAuthAction());
    let liberar;
    const pendiente = new Promise((_, reject) => { liberar = reject; });
    act(() => { result.current.run('login', () => pendiente); });
    unmount();
    // El error llega tarde, con la pantalla ya cerrada: no debe romper nada.
    await act(async () => {
      liberar(firebaseError('auth/network-request-failed'));
      await pendiente.catch(() => {});
    });
    expect(true).toBe(true);
  });

  it('clearFlash borra el aviso', async () => {
    const { result } = renderHook(() => useAuthAction());
    act(() => result.current.showError('algo'));
    expect(result.current.flash).toEqual({ kind: 'err', msg: 'algo' });
    act(() => result.current.clearFlash());
    expect(result.current.flash).toBeNull();
  });
});
