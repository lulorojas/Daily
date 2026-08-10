/* ----------------------------- FIRESTORE (servicio) -----------------------------
   Único lugar del proyecto que importa 'firebase/firestore'. Igual que con Auth, todo lo
   demás habla con estas cuatro funciones, así el store se puede testear sin red.

   Un documento por cuenta: users/{uid}. Firestore es la única fuente de verdad; su
   persistencia offline (IndexedDB) hace de caché local, así que no se guarda ninguna
   copia manual en localStorage — exactamente como en la app vanilla desde la v3. */
import {
  initializeFirestore, getFirestore,
  persistentLocalCache, persistentMultipleTabManager,
  doc, onSnapshot, setDoc,
} from 'firebase/firestore';
import { getAppInstance } from './firebase';

/* Persistencia offline. En vanilla era firestore().enablePersistence({synchronizeTabs:true});
   en el SDK modular esa API está deprecada y se declara al inicializar, con
   persistentLocalCache + persistentMultipleTabManager (el equivalente de synchronizeTabs).

   Se hace una sola vez y de forma perezosa. Si falla —varias pestañas en un navegador que
   no lo soporta, o Firestore ya inicializado— se cae a getFirestore() y la app sigue
   andando online, igual que el .catch(()=>{}) de la app actual. */
let db = null;
let persistenceEnabled = false;

// Sin IndexedDB no hay caché persistente: pasa en navegación privada, en navegadores
// viejos y en los tests (jsdom no lo trae). Ahí se arranca sin caché y la app funciona
// online, que es lo mismo que hacía el .catch(()=>{}) de la app vanilla.
function canPersist() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export function getDb() {
  if (db) return db;
  const app = getAppInstance();
  if (!app) return null;
  try {
    if (canPersist()) {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
      persistenceEnabled = true;
    } else {
      db = initializeFirestore(app, {});
      persistenceEnabled = false;
    }
  } catch {
    // Firestore ya estaba inicializado (o el entorno no lo soporta): se toma el que haya.
    db = getFirestore(app);
    persistenceEnabled = false;
  }
  return db;
}

export function isPersistenceEnabled() { return persistenceEnabled; }

export function userDocRef(uid) {
  const database = getDb();
  return database ? doc(database, 'users', uid) : null;
}

/* Escucha el documento del usuario. onData recibe los datos crudos, o null si el
   documento todavía no existe (cuenta nueva). Devuelve la función para desuscribirse. */
export function subscribeToUserDoc(uid, onData, onError) {
  const ref = userDocRef(uid);
  if (!ref) return () => {};
  return onSnapshot(
    ref,
    (snap) => onData(snap.exists() ? snap.data() : null),
    (err) => onError((err && err.code) || 'error'),
  );
}

/* Escribe el documento COMPLETO, igual que doc.set(clean) en vanilla.
   Es a propósito y no se cambia por update() con campos sueltos: las dos versiones de la
   app tienen que escribir de la misma forma. Si una hiciera merge parcial y la otra
   reemplazo total, dos dispositivos a la vez se comportarían distinto según cuál usaras. */
export function saveUserDoc(uid, cleanData) {
  const ref = userDocRef(uid);
  if (!ref) return Promise.resolve();
  return setDoc(ref, cleanData);
}
