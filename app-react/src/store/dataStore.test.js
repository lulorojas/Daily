import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataStore, readLocalV2, DATA_STATUS } from './dataStore';
import { createFakeFirestore } from '../test/fakeFirestore';
import { emptyDoc, fullDoc } from '../test/fixtures';
import { normalize } from '../lib/model';
import { addTask } from './mutations';

const UID = 'uid-lulo';

function setup({ docs = {}, local = null } = {}) {
  const fs = createFakeFirestore(docs);
  const store = createDataStore({
    subscribe: fs.subscribe,
    save: fs.save,
    readLocalSeed: () => local,
  });
  return { fs, store };
}

beforeEach(() => localStorage.clear());

describe('carga', () => {
  it('arranca en idle, sin datos', () => {
    const { store } = setup();
    expect(store.getSnapshot()).toEqual({ status: DATA_STATUS.IDLE, data: null, error: null, uid: null });
  });

  it('con un documento existente, queda listo y normalizado', () => {
    const { store } = setup({ docs: { [UID]: fullDoc() } });
    store.start(UID);
    const { status, data } = store.getSnapshot();
    expect(status).toBe(DATA_STATUS.READY);
    expect(data).toEqual(normalize(fullDoc()));
  });

  it('normaliza al leer: un documento a medias llega completo', () => {
    const { store } = setup({ docs: { [UID]: { items: [] } } });
    store.start(UID);
    const { data } = store.getSnapshot();
    expect(data.gym.routines).toEqual([]);
    expect(data.habitLog).toEqual({});
    expect(data.onboarding).toEqual({ seen: false });
  });

  it('cuenta nueva sin documento: siembra vacío y CREA el documento en la nube', () => {
    const { fs, store } = setup();
    store.start(UID);

    expect(store.getSnapshot().status).toBe(DATA_STATUS.READY);
    expect(store.getSnapshot().data).toEqual(normalize(emptyDoc()));
    expect(fs.setsOf(UID)).toHaveLength(1);
    expect(fs.lastSet(UID)).toEqual(normalize(emptyDoc()));
  });

  it('cuenta nueva con daily.v2 en el teléfono: migra esos datos a la nube', () => {
    const viejo = fullDoc();
    const { fs, store } = setup({ local: viejo });
    store.start(UID);

    expect(store.getSnapshot().data).toEqual(normalize(viejo));
    expect(fs.lastSet(UID)).toEqual(normalize(viejo));
  });

  it('si el documento ya existe, NO se mira el localStorage', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc() }, local: fullDoc() });
    store.start(UID);

    expect(store.getSnapshot().data).toEqual(normalize(emptyDoc()));
    expect(fs.setsOf(UID)).toHaveLength(0);   // no se escribe nada al solo leer
  });

  it('mientras no llega el primer snapshot, el estado es loading', () => {
    const { store } = setup();
    const pendiente = createDataStore({ subscribe: () => () => {}, save: vi.fn(), readLocalSeed: () => null });
    pendiente.start(UID);
    expect(pendiente.getSnapshot().status).toBe(DATA_STATUS.LOADING);
    expect(pendiente.getSnapshot().data).toBeNull();
    expect(store).toBeTruthy();
  });
});

describe('suscripción', () => {
  it('avisa a quien esté escuchando cuando cambian los datos', () => {
    const { store } = setup({ docs: { [UID]: emptyDoc() } });
    const escucha = vi.fn();
    store.subscribe(escucha);
    store.start(UID);
    expect(escucha).toHaveBeenCalled();
  });

  it('el snapshot es el MISMO objeto mientras no cambie nada', () => {
    const { store } = setup({ docs: { [UID]: fullDoc() } });
    store.start(UID);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it('desuscribirse corta los avisos', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);
    const escucha = vi.fn();
    const cortar = store.subscribe(escucha);
    cortar();
    fs.emit(UID, fullDoc());
    expect(escucha).not.toHaveBeenCalled();
  });

  it('un cambio hecho en otro dispositivo llega solo', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);
    expect(store.getSnapshot().data.items).toHaveLength(0);

    fs.emit(UID, fullDoc());
    expect(store.getSnapshot().data).toEqual(normalize(fullDoc()));
  });

  it('start() dos veces con el mismo uid no vuelve a suscribir (StrictMode)', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);
    store.start(UID);
    expect(fs.subscribe).toHaveBeenCalledTimes(1);
    expect(fs.subscribers(UID)).toBe(1);
  });

  it('cambiar de usuario corta la suscripción anterior', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc(), otro: fullDoc() } });
    store.start(UID);
    store.start('otro');
    expect(fs.subscribers(UID)).toBe(0);
    expect(fs.subscribers('otro')).toBe(1);
    expect(store.getSnapshot().uid).toBe('otro');
  });
});

describe('cortar el sync (logout)', () => {
  it('stop() deja el store en idle y sin datos', () => {
    const { store } = setup({ docs: { [UID]: fullDoc() } });
    store.start(UID);
    store.stop();
    expect(store.getSnapshot()).toEqual({ status: DATA_STATUS.IDLE, data: null, error: null, uid: null });
  });

  it('stop() suelta la suscripción a Firestore', () => {
    const { fs, store } = setup({ docs: { [UID]: fullDoc() } });
    store.start(UID);
    store.stop();
    expect(fs.subscribers(UID)).toBe(0);
  });

  it('después de stop(), un cambio en la nube ya no toca el store', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);
    store.stop();
    fs.emit(UID, fullDoc());
    expect(store.getSnapshot().data).toBeNull();
  });
});

describe('errores', () => {
  it('un error de Firestore deja el store en error, con el código', () => {
    const fs = createFakeFirestore();
    fs.failWith('permission-denied');
    const store = createDataStore({ subscribe: fs.subscribe, save: fs.save, readLocalSeed: () => null });
    store.start(UID);

    expect(store.getSnapshot().status).toBe(DATA_STATUS.ERROR);
    expect(store.getSnapshot().error).toBe('permission-denied');
  });

  it('con error no se escribe nada', () => {
    const fs = createFakeFirestore();
    fs.failWith('unavailable');
    const store = createDataStore({ subscribe: fs.subscribe, save: fs.save, readLocalSeed: () => null });
    store.start(UID);
    expect(fs.sets).toHaveLength(0);
  });

  it('retry() vuelve a intentar y sale adelante si el problema pasó', () => {
    const fs = createFakeFirestore({ [UID]: fullDoc() });
    fs.failWith('unavailable');
    const store = createDataStore({ subscribe: fs.subscribe, save: fs.save, readLocalSeed: () => null });
    store.start(UID);
    expect(store.getSnapshot().status).toBe(DATA_STATUS.ERROR);

    fs.recover();
    store.retry();
    expect(store.getSnapshot().status).toBe(DATA_STATUS.READY);
    expect(store.getSnapshot().data).toEqual(normalize(fullDoc()));
  });

  it('retry() sin usuario no hace nada', () => {
    const { fs, store } = setup();
    store.retry();
    expect(fs.subscribe).not.toHaveBeenCalled();
  });
});

describe('escritura', () => {
  it('update() aplica el cambio en memoria y lo guarda', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);

    store.update((draft) => addTask(draft, { title: 'Comprar pan', date: '2026-08-10' }));

    expect(store.getSnapshot().data.items).toHaveLength(1);
    expect(fs.lastSet(UID).items[0].title).toBe('Comprar pan');
  });

  it('update() guarda el documento COMPLETO, no solo lo que cambió', () => {
    const { fs, store } = setup({ docs: { [UID]: fullDoc() } });
    store.start(UID);
    store.update((draft) => addTask(draft, { title: 'x' }));

    const escrito = fs.lastSet(UID);
    expect(Object.keys(escrito).sort()).toEqual(['gym', 'habitLog', 'habits', 'items', 'onboarding', 'v']);
    expect(escrito.gym.lifts).toHaveLength(3);
    expect(escrito.habits).toHaveLength(2);
  });

  it('update() NO muta el estado anterior: React ve un objeto nuevo', () => {
    const { store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);
    const antes = store.getSnapshot().data;

    store.update((draft) => addTask(draft, { title: 'x' }));
    const después = store.getSnapshot().data;

    expect(antes).not.toBe(después);
    expect(antes.items).toHaveLength(0);      // el viejo quedó intacto
    expect(después.items).toHaveLength(1);
  });

  it('update() avisa a quien esté escuchando', () => {
    const { store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);
    const escucha = vi.fn();
    store.subscribe(escucha);
    store.update((draft) => addTask(draft, { title: 'x' }));
    expect(escucha).toHaveBeenCalledTimes(1);
  });

  it('update() sin datos cargados no hace nada', () => {
    const { fs, store } = setup();
    store.update((draft) => addTask(draft, { title: 'x' }));
    expect(fs.sets).toHaveLength(0);
  });

  it('lo que se guarda no lleva undefined (Firestore los rechaza)', () => {
    const { fs, store } = setup({ docs: { [UID]: emptyDoc() } });
    store.start(UID);
    store.update((draft) => { draft.items.push({ id: 'x', kind: 'tarea', title: 't', desc: undefined }); });

    expect('desc' in fs.lastSet(UID).items[0]).toBe(false);
  });

  it('si el guardado falla, la app no se rompe (offline se encola)', async () => {
    const fs = createFakeFirestore({ [UID]: emptyDoc() });
    fs.save.mockImplementation(() => Promise.reject(new Error('sin red')));
    const store = createDataStore({ subscribe: fs.subscribe, save: fs.save, readLocalSeed: () => null });
    store.start(UID);

    await expect(store.update((draft) => addTask(draft, { title: 'x' }))).resolves.toBeUndefined();
    expect(store.getSnapshot().data.items).toHaveLength(1);   // en pantalla ya está
  });

  it('replaceAll() reemplaza todo y lo normaliza (importar un backup)', () => {
    const { fs, store } = setup({ docs: { [UID]: fullDoc() } });
    store.start(UID);

    store.replaceAll({ items: [{ id: 'z', kind: 'tarea', title: 'del backup', date: null, done: false }] });

    const { data } = store.getSnapshot();
    expect(data.items).toHaveLength(1);
    expect(data.habits).toEqual([]);
    expect(data.gym.lifts).toEqual([]);
    expect(fs.lastSet(UID)).toEqual(data);
  });
});

describe('readLocalV2()', () => {
  it('devuelve el daily.v2 guardado en el teléfono', () => {
    localStorage.setItem('daily.v2', JSON.stringify({ items: [{ id: 'a' }] }));
    expect(readLocalV2()).toEqual({ items: [{ id: 'a' }] });
  });

  it('sin nada guardado, null', () => {
    expect(readLocalV2()).toBeNull();
  });

  it('con basura adentro, null en vez de romper', () => {
    localStorage.setItem('daily.v2', 'no es json');
    expect(readLocalV2()).toBeNull();
  });

  it('si no es un objeto, null', () => {
    localStorage.setItem('daily.v2', '[1,2,3]');
    expect(readLocalV2()).toBeNull();
  });

  it('nunca escribe la clave daily.v2', () => {
    const { store } = setup();
    store.start(UID);
    expect(localStorage.getItem('daily.v2')).toBeNull();
  });
});
