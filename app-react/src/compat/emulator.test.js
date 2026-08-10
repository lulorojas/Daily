import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance } from '../services/firebase';
import { getDb, subscribeToUserDoc, saveUserDoc, userDocRef } from '../services/firestore';
import { createDataStore } from '../store/dataStore';
import { normalize } from '../lib/model';
import { fullDoc, emptyDoc, TODAY } from '../test/fixtures';
import { addTask, setHabitSlot } from '../store/mutations';

/* ============================================================================
   INTEGRACIÓN CONTRA FIRESTORE DE VERDAD (emulador)

   Todo el resto de los tests usa un Firestore de mentira, que es lo correcto para probar
   lógica. Pero eso deja un hueco: si estuviera mal usado el SDK modular —el nombre de la
   colección, snap.exists() como método en vez de propiedad, setDoc con los argumentos al
   revés— los tests con mock seguirían pasando y la app fallaría recién en producción.

   Este archivo tapa ese hueco: corre services/firestore.js REAL contra el emulador de
   Firestore. No toca el proyecto de producción.

   Corre autenticado de verdad contra el emulador de Auth, así las reglas de seguridad
   (firestore.rules) también se aplican: si el documento no fuera users/{uid} del usuario
   logueado, estos tests fallarían con permission-denied.

   No corre en `npm test` para no pedirle a nadie tener el emulador levantado. Se corre así:
     firebase emulators:start --only firestore,auth
     npm run test:emulator
   ============================================================================ */

const HOST = '127.0.0.1';
const FS_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT || 8080);
const AUTH_PORT = Number(process.env.AUTH_EMULATOR_PORT || 9099);
const CORRER = process.env.VITEST_EMULATOR === '1';

let UID = null;

beforeAll(async () => {
  if (!CORRER) return;
  connectFirestoreEmulator(getDb(), HOST, FS_PORT);
  connectAuthEmulator(getAuthInstance(), `http://${HOST}:${AUTH_PORT}`, { disableWarnings: true });

  // Un usuario de mentira en el emulador. El uid que asigne es el que manda: el documento
  // tiene que colgar de users/{ese uid} o las reglas lo rechazan.
  const email = 'integracion@ejemplo.com';
  const pass = 'secreta1';
  const cred = await createUserWithEmailAndPassword(getAuthInstance(), email, pass)
    .catch(() => signInWithEmailAndPassword(getAuthInstance(), email, pass));
  UID = cred.user.uid;
});

afterAll(async () => {
  if (CORRER && UID) await deleteDoc(userDocRef(UID)).catch(() => {});
});

// Espera a que se cumpla una condición, con un tope de tiempo.
function esperar(condicion, ms = 4000) {
  return new Promise((resolve, reject) => {
    const desde = Date.now();
    const tick = () => {
      if (condicion()) return resolve();
      if (Date.now() - desde > ms) return reject(new Error('se acabó el tiempo esperando'));
      setTimeout(tick, 25);
    };
    tick();
  });
}

describe.runIf(CORRER)('Firestore real (emulador)', () => {
  it('hay un usuario autenticado', () => {
    expect(UID).toBeTruthy();
    expect(getAuthInstance().currentUser).toBeTruthy();
  });

  it('el documento va a users/{uid}, igual que en la app vanilla', () => {
    expect(userDocRef(UID).path).toBe(`users/${UID}`);
  });

  it('una cuenta sin documento avisa null (y no un objeto vacío)', async () => {
    await deleteDoc(userDocRef(UID)).catch(() => {});
    let recibido = 'nada';
    const cortar = subscribeToUserDoc(UID, (raw) => { recibido = raw; }, () => {});
    await esperar(() => recibido !== 'nada');
    cortar();
    expect(recibido).toBeNull();
  });

  it('lo que guarda saveUserDoc() vuelve idéntico al leerlo', async () => {
    const state = normalize(fullDoc());
    await saveUserDoc(UID, JSON.parse(JSON.stringify(state)));

    const snap = await getDoc(userDocRef(UID));
    expect(snap.exists()).toBe(true);
    expect(snap.data()).toEqual(state);
  });

  it('el store carga de Firestore de verdad, escribe y el cambio vuelve por el snapshot', async () => {
    await setDoc(userDocRef(UID), JSON.parse(JSON.stringify(normalize(emptyDoc()))));

    const store = createDataStore({
      subscribe: subscribeToUserDoc,
      save: saveUserDoc,
      readLocalSeed: () => null,
    });
    store.start(UID);
    await esperar(() => store.getSnapshot().status === 'ready');
    expect(store.getSnapshot().data).toEqual(normalize(emptyDoc()));

    await store.update((draft) => addTask(draft, { title: 'Desde React', date: TODAY }));
    await esperar(() => store.getSnapshot().data.items.length === 1);

    // Y lo que quedó en la base es el documento completo, no un parche.
    const snap = await getDoc(userDocRef(UID));
    expect(snap.data()).toEqual(store.getSnapshot().data);
    expect(snap.data().items[0].title).toBe('Desde React');
    store.stop();
  });

  it('un cambio hecho por fuera (otro dispositivo) llega al store solo', async () => {
    await setDoc(userDocRef(UID), JSON.parse(JSON.stringify(normalize(emptyDoc()))));
    const store = createDataStore({ subscribe: subscribeToUserDoc, save: saveUserDoc, readLocalSeed: () => null });
    store.start(UID);
    await esperar(() => store.getSnapshot().status === 'ready');

    const otro = normalize(fullDoc());
    await setDoc(userDocRef(UID), JSON.parse(JSON.stringify(otro)));
    await esperar(() => store.getSnapshot().data.items.length === otro.items.length);

    expect(store.getSnapshot().data).toEqual(otro);
    store.stop();
  });

  it('cuenta nueva: el store crea el documento en la base', async () => {
    await deleteDoc(userDocRef(UID)).catch(() => {});
    const store = createDataStore({ subscribe: subscribeToUserDoc, save: saveUserDoc, readLocalSeed: () => null });
    store.start(UID);
    await esperar(() => store.getSnapshot().status === 'ready');
    await esperar(async () => true);

    const snap = await getDoc(userDocRef(UID));
    expect(snap.exists()).toBe(true);
    expect(snap.data()).toEqual(normalize(emptyDoc()));
    store.stop();
  });

  it('los tipos sobreviven el viaje a la base (números, null, booleanos, anidados)', async () => {
    const state = normalize(emptyDoc());
    addTask(state, { title: 'sin fecha', date: null, time: null });
    setHabitSlot(state, 'x', TODAY, 0);           // hábito inexistente: no escribe nada
    state.habits.push({ id: 'h', name: 'x', detail: '', color: '#fff', icon: 'agua', timesPerDay: 3 });
    setHabitSlot(state, 'h', TODAY, 2);
    state.gym.bodyWeights.push({ id: 'b', kg: 72.5, date: TODAY });

    await saveUserDoc(UID, JSON.parse(JSON.stringify(state)));
    const vuelta = (await getDoc(userDocRef(UID))).data();

    expect(vuelta.items[0].date).toBeNull();
    expect(vuelta.items[0].done).toBe(false);
    expect(vuelta.habitLog[TODAY].h).toBe(3);
    expect(vuelta.gym.bodyWeights[0].kg).toBe(72.5);
    expect(vuelta).toEqual(state);
  });

  it('las reglas de seguridad bloquean el documento de otro usuario', async () => {
    // Sin sesión, firestore.rules no deja tocar users/{uid}. El emulador las aplica igual.
    await expect(getDoc(doc(getDb(), 'users', 'otro-usuario'))).rejects.toThrow();
  });
});
