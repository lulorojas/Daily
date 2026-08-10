/* ============================================================================
   STORE DE DATOS

   JavaScript puro: ni React ni Firebase aparecen acá adentro. Recibe por parámetro cómo
   suscribirse y cómo guardar, así que en los tests se le pasa un Firestore de mentira y
   se puede probar el ciclo entero (cargar → editar → guardar → cortar) sin red.

   Es un "external store" clásico: guarda un valor, avisa a quien esté escuchando cuando
   cambia, y expone getSnapshot() para leerlo. React se conecta con useSyncExternalStore,
   que es el enganche oficial para fuentes de datos que viven afuera de React.

   El snapshot es SIEMPRE el mismo objeto mientras no cambie nada. Eso no es un detalle:
   useSyncExternalStore compara por referencia, y devolver un objeto nuevo en cada lectura
   lo mandaría a un bucle infinito de renders.
   ============================================================================ */
import { normalize, seed, cleanForFirestore } from '../lib/model';

export const DATA_STATUS = {
  IDLE: 'idle',        // no hay usuario: nada que cargar
  LOADING: 'loading',  // esperando el primer snapshot
  READY: 'ready',      // datos en memoria
  ERROR: 'error',      // no se pudieron traer (permisos, red la primera vez)
};

const IDLE_SNAPSHOT = { status: DATA_STATUS.IDLE, data: null, error: null, uid: null };

export function createDataStore({ subscribe: subscribeToDoc, save: saveDoc, readLocalSeed }) {
  let snapshot = IDLE_SNAPSHOT;
  let listeners = new Set();
  let unsubDoc = null;

  function emit(next) {
    snapshot = next;
    listeners.forEach((fn) => fn());
  }

  function patch(changes) {
    emit({ ...snapshot, ...changes });
  }

  /* Guarda el documento entero. Fire-and-forget, igual que dataSave() en vanilla: offline
     Firestore lo encola, y la pantalla ya se actualizó con el estado en memoria. */
  function persist(uid, data) {
    const clean = cleanForFirestore(data);
    if (clean == null) return Promise.resolve();
    return Promise.resolve(saveDoc(uid, clean)).catch(() => {});
  }

  function handleSnapshot(uid, raw) {
    if (snapshot.uid !== uid) return;   // llegó tarde, de un usuario que ya se fue

    if (raw != null) {
      emit({ status: DATA_STATUS.READY, data: normalize(raw), error: null, uid });
      return;
    }

    /* Primera vez para esta cuenta: no hay documento. Se siembra desde el daily.v2 local
       si existe (la migración de quien usó la app antes de que hubiera nube), y si no con
       un estado nuevo. Después se crea el documento. Mismo camino que la app vanilla. */
    const local = readLocalSeed ? readLocalSeed() : null;
    const data = normalize(local || seed());
    emit({ status: DATA_STATUS.READY, data, error: null, uid });
    persist(uid, data);
  }

  /* Todas las funciones se declaran sueltas y se devuelven en un objeto: nada depende de
     `this`. Así se pueden pasar de a una (useSyncExternalStore recibe `store.subscribe`
     y `store.getSnapshot` por separado) sin que se pierda el contexto. */

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot() { return snapshot; }

  // Corta el sync (logout). Deja los datos en null para que nada quede colgado en pantalla.
  function stop() {
    if (unsubDoc) { try { unsubDoc(); } catch { /* ya estaba cortada */ } unsubDoc = null; }
    if (snapshot !== IDLE_SNAPSHOT) emit(IDLE_SNAPSHOT);
  }

  /* Arranca el sync para un usuario. Idempotente: llamarlo dos veces con el mismo uid no
     vuelve a suscribir (React monta los efectos dos veces en StrictMode). */
  function start(uid) {
    if (!uid) return;
    if (snapshot.uid === uid && unsubDoc) return;
    stop();
    emit({ status: DATA_STATUS.LOADING, data: null, error: null, uid });
    unsubDoc = subscribeToDoc(
      uid,
      (raw) => handleSnapshot(uid, raw),
      (code) => { if (snapshot.uid === uid) patch({ status: DATA_STATUS.ERROR, error: code }); },
    );
  }

  // Reintentar después de un error de carga.
  function retry() {
    const { uid } = snapshot;
    if (!uid) return;
    stop();
    start(uid);
  }

  /* La única forma de escribir. Recibe una función que modifica un BORRADOR: una copia
     del estado actual. El borrador se muta a gusto (que es como está escrita toda la
     lógica de la app vanilla, y así el port es línea por línea), pero lo que entra al
     store es un objeto nuevo — React necesita una referencia distinta para enterarse.

     Devuelve la promesa del guardado, por si alguien quiere esperarla. */
  function update(mutator) {
    const { status, data, uid } = snapshot;
    if (status !== DATA_STATUS.READY || !data || !uid) return Promise.resolve();
    const draft = structuredClone(data);
    mutator(draft);
    emit({ ...snapshot, data: draft });
    return persist(uid, draft);
  }

  /* Reemplazo total del documento (importar un backup). Pasa por normalize() igual que
     applyBackup() en vanilla, así un archivo viejo se acomoda al esquema actual. */
  function replaceAll(raw) {
    const { status, uid } = snapshot;
    if (status !== DATA_STATUS.READY || !uid) return Promise.resolve();
    const data = normalize(raw);
    emit({ ...snapshot, data });
    return persist(uid, data);
  }

  return { subscribe, getSnapshot, start, stop, retry, update, replaceAll };
}

/* daily.v2 de localStorage, SOLO lectura. Es el puente para quien venía usando la app
   antes de que los datos vivieran en la nube: si su cuenta todavía no tiene documento, se
   siembra con lo que tenga en el teléfono. Nunca se escribe esta clave. */
export function readLocalV2() {
  try {
    const s = JSON.parse(localStorage.getItem('daily.v2'));
    return (s && typeof s === 'object' && !Array.isArray(s)) ? s : null;
  } catch {
    return null;
  }
}
