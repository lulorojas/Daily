// Test de las reglas de seguridad de Firestore contra el emulador.
// Corre con:  cd security && npm install && npm test
// (npm test lanza el emulador de Firestore y ejecuta este archivo adentro).
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

let pass = 0, fail = 0;
async function ok(name, p) {
  try { await p; pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name); }
}

(async () => {
  const rules = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');
  const env = await initializeTestEnvironment({
    projectId: 'demo-daily',                 // demo-*: el emulador corre 100% offline, sin credenciales
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });

  const alice = env.authenticatedContext('alice').firestore();
  const bob   = env.authenticatedContext('bob').firestore();
  const anon  = env.unauthenticatedContext().firestore();

  // El dueño puede leer y escribir SU documento.
  await ok('alice escribe su propio doc', assertSucceeds(alice.doc('users/alice').set({ v: 2, items: [] })));
  await ok('alice lee su propio doc',     assertSucceeds(alice.doc('users/alice').get()));
  await ok('bob escribe su propio doc',   assertSucceeds(bob.doc('users/bob').set({ v: 2, items: [] })));

  // Nadie puede tocar el documento de otro usuario.
  await ok('alice NO lee el doc de bob',      assertFails(alice.doc('users/bob').get()));
  await ok('alice NO escribe el doc de bob',  assertFails(alice.doc('users/bob').set({ hack: true })));
  await ok('bob NO lee el doc de alice',      assertFails(bob.doc('users/alice').get()));

  // Sin sesion, nada.
  await ok('anonimo NO lee',    assertFails(anon.doc('users/alice').get()));
  await ok('anonimo NO escribe',assertFails(anon.doc('users/alice').set({ x: 1 })));

  // La regla defensiva cubre subcolecciones: cada uno solo en la suya.
  await ok('alice escribe una subcoleccion suya', assertSucceeds(alice.doc('users/alice/agenda/x').set({ a: 1 })));
  await ok('alice NO escribe subcoleccion de bob', assertFails(alice.doc('users/bob/agenda/x').set({ a: 1 })));

  await env.cleanup();
  console.log('\n' + pass + ' ok, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
