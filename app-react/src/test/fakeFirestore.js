import { vi } from 'vitest';

/* Firestore de mentira, con la misma idea que el fakeFirebase del harness de app/tests:
   documentos en memoria, y los snapshots se disparan de forma SÍNCRONA para que los tests
   sean deterministas. El Firestore real es asincrónico, pero acá lo que se prueba es la
   lógica del puente, no el SDK.

   Registra todo lo que se escribió (`sets`) para poder afirmar QUÉ se mandó a guardar,
   que es el corazón de los tests de compatibilidad de escritura. */
export function createFakeFirestore(initialDocs = {}) {
  const docs = { ...initialDocs };
  const sets = [];
  const subs = {};
  let failCode = null;

  const api = {
    docs,
    sets,

    // Se le pasa al store como `subscribe`.
    subscribe: vi.fn((uid, onData, onError) => {
      const entry = { onData, onError };
      (subs[uid] ||= []).push(entry);
      if (failCode) onError(failCode);
      else onData(docs[uid] !== undefined ? structuredClone(docs[uid]) : null);
      return () => { subs[uid] = (subs[uid] || []).filter((e) => e !== entry); };
    }),

    // Se le pasa al store como `save`.
    save: vi.fn((uid, data) => {
      sets.push({ uid, data: structuredClone(data) });
      docs[uid] = structuredClone(data);
      return Promise.resolve();
    }),

    // Simula un cambio venido de afuera (otro dispositivo, otra pestaña).
    emit(uid, data) {
      docs[uid] = data === undefined ? docs[uid] : structuredClone(data);
      (subs[uid] || []).forEach((e) => e.onData(docs[uid] !== undefined ? structuredClone(docs[uid]) : null));
    },

    // Simula que Firestore rechaza la lectura.
    failWith(code) { failCode = code; },
    recover() { failCode = null; },

    subscribers(uid) { return (subs[uid] || []).length; },
    lastSet(uid) {
      const míos = sets.filter((s) => s.uid === uid);
      return míos.length ? míos[míos.length - 1].data : null;
    },
    setsOf(uid) { return sets.filter((s) => s.uid === uid); },
  };

  return api;
}
