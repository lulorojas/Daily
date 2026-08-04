// Harness de tests de integración de Daily.
// Bootea la app en jsdom cargando los scripts clásicos en el mismo orden que index.html,
// con acceso al scope léxico (const ui / let state no viven en window).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

// La app está una carpeta más arriba (app/), sin importar dónde esté clonado el repo.
const APP = path.resolve(__dirname, '..');
const FILES = ['utils.js','hoy.js','agenda.js','calendario.js','gimnasio.js','rutinas.js','habitos.js','progreso.js','ajustes.js','app.js'];
// Con la capa de sesión encima, en el mismo orden que index.html.
const FILES_AUTH = ['firebase-config.js'].concat(FILES.slice(0,-1)).concat(['auth.js','app.js']);
// Con la capa de datos (Firestore) también, en el mismo orden que index.html.
const FILES_FS = ['firebase-config.js'].concat(FILES.slice(0,-1)).concat(['firestore.js','auth.js','app.js']);

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' -> ' + extra : '')); }
};

const d = new Date(); d.setHours(0,0,0,0);
const iso = x => x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const TODAY = iso(d);
const TOMORROW = iso(new Date(d.getTime() + 86400000));
const ANUAL_DATE = '1990-' + TODAY.slice(5);
const ago = n => iso(new Date(d.getTime() - n*86400000));

// daily.v1 de ejemplo (modelo viejo): sirve para probar la migración y que nunca se toque.
const V1 = {
  tasks: [
    { id:'t1', text:'Tarea sin fecha',  desc:'una desc', time:null,    date:null,        done:false },
    { id:'t2', text:'Tarea de hoy',     desc:'',         time:null,    date:TODAY,       done:false },
    { id:'t3', text:'Tarea de mañana',  desc:'',         time:null,    date:TOMORROW,    done:false },
    { id:'t4', text:'Tarea con hora',   desc:'',         time:'14:30', date:TODAY,       done:true  },
    { id:'t5', text:'Tarea vencida',    desc:'',         time:null,    date:'2020-01-05',done:false },
  ],
  reminders: [
    { id:'r1', type:'puntual', title:'Dentista',         date:TODAY,      time:'10:00', desc:'llevar estudios' },
    { id:'r2', type:'puntual', title:'Puntual sin hora', date:TODAY,      time:null,    desc:'' },
    { id:'r3', type:'anual',   title:'Cumple de Ana',    date:ANUAL_DATE, time:null,    desc:'' },
  ],
  gym: { customTypes:[{id:'ct1',name:'Pecho',color:'#4D96FF'}], weekPlans:{}, lifts:[{id:'l1',name:'Sentadilla',unit:'kg',color:'#FF6B6B',history:[{date:TODAY,weight:60}]}], seeded:true, typesSeeded:true },
  habits: [{ id:'h1', name:'Tomar agua', detail:'8 vasos', color:'#06D6A0', icon:'agua' }],
  habitLog: { [TODAY]: { h1:true } },
};
const V1_RAW = JSON.stringify(V1);

function boot(seedV1, seedV2) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div><div class="overlay" id="overlay"></div></body></html>',
    { url:'http://localhost/', pretendToBeVisual:true, runScripts:'outside-only' });
  const w = dom.window;
  if (seedV1) w.localStorage.setItem('daily.v1', seedV1);
  if (seedV2) w.localStorage.setItem('daily.v2', seedV2);
  const ctx = dom.getInternalVMContext();
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(APP, 'js', f), 'utf8'), ctx, { filename:f });
  // `const ui` / `let state` son léxicas: no viven en window, se leen evaluando en el contexto.
  w.ev = code => vm.runInContext(code, ctx);
  return w;
}

/* ---- SDK de Firebase de mentira ----
   El flujo real de Auth depende de servicios de Google, así que acá se simula: registra
   qué se llamó y con qué, y deja disparar a mano el cambio de sesión. Alcanza para probar
   la puerta de acceso y las validaciones de los formularios sin tocar la red. */
function fakeFirebase(win, opts) {
  const o = opts || {};
  const calls = [];
  let onChange = null;
  const rec = (name, args, res) => { calls.push({ name, args }); return res; };
  const boom = () => Promise.reject({ code: o.failCode });

  function fakeUser(email, verified) {
    return {
      email, emailVerified: !!verified, uid: 'uid_' + email,
      sendEmailVerification() { return rec('sendEmailVerification', [email], o.failCode ? boom() : Promise.resolve()); },
      reload() { return rec('reload', [email], o.failCode ? boom() : Promise.resolve()); },
    };
  }
  const auth = {
    currentUser: null,
    onAuthStateChanged(fn) { onChange = fn; return () => {}; },
    signInWithEmailAndPassword(...a) { return rec('signIn', a, o.failCode ? boom() : Promise.resolve({ user: fakeUser(a[0], true) })); },
    createUserWithEmailAndPassword(...a) { return rec('createUser', a, o.failCode ? boom() : Promise.resolve({ user: fakeUser(a[0], false) })); },
    sendPasswordResetEmail(...a) { return rec('sendPasswordResetEmail', a, o.failCode ? boom() : Promise.resolve()); },
    signOut() { return rec('signOut', [], Promise.resolve()); },
  };

  /* ---- Firestore de mentira (solo si opts.fs) ----
     Documentos por uid en memoria. onSnapshot/set disparan de forma SÍNCRONA para que los tests
     sean deterministas (Firestore real es async, pero acá probamos la lógica del puente). */
  const store = { docs: (o.fs && o.fs.docs) || {}, sets: [], persistCalled: 0 };
  function snap(uid) { const dt = store.docs[uid]; return { exists: dt !== undefined, data: () => dt && JSON.parse(JSON.stringify(dt)) }; }
  function docRef(uid) {
    return {
      onSnapshot(onNext, onErr) {
        (store.subs[uid] = store.subs[uid] || []).push(onNext);
        if (o.fs && o.fs.failSnapshot) { if (onErr) onErr({ code: 'permission-denied' }); }
        else if (!(o.fs && o.fs.deferSnapshot)) onNext(snap(uid));   // deferSnapshot: no dispara hasta emit()
        return () => { store.subs[uid] = (store.subs[uid] || []).filter(f => f !== onNext); };
      },
      set(data) {
        store.sets.push({ uid, data: JSON.parse(JSON.stringify(data)) });
        store.docs[uid] = JSON.parse(JSON.stringify(data));
        (store.subs[uid] || []).forEach(fn => fn(snap(uid)));
        return Promise.resolve();
      },
      get() { return Promise.resolve(snap(uid)); },
    };
  }
  store.subs = {};
  const firestore = {
    enablePersistence() { store.persistCalled++; return (o.fs && o.fs.persistFail) ? Promise.reject({ code: 'failed-precondition' }) : Promise.resolve(); },
    collection() { return { doc: uid => docRef(uid) }; },
  };

  if (!o.noSdk) {
    win.firebase = { apps: [], initializeApp() { this.apps.push({}); return {}; }, auth: () => auth };
    if (o.fs) win.firebase.firestore = () => firestore;
  }
  return {
    auth, calls, fakeUser, store,
    called: n => calls.filter(c => c.name === n),
    // Simula que Firebase avisa el estado de sesión: null, o un usuario (verificado o no).
    signal(u) { auth.currentUser = u || null; if (onChange) onChange(u || null); },
    // Dispara a mano el snapshot pendiente (para deferSnapshot).
    emit(uid) { (store.subs[uid] || []).forEach(fn => fn(snap(uid))); },
    docOf(uid) { return store.docs[uid]; },
    setsOf(uid) { return store.sets.filter(s => s.uid === uid); },
  };
}

// Bootea la app CON la capa de sesión y el SDK simulado. opts: {failCode, noSdk}.
function bootAuth(seedV2, opts) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div><div class="overlay" id="overlay"></div></body></html>',
    { url:'http://localhost/', pretendToBeVisual:true, runScripts:'outside-only' });
  const w = dom.window;
  if (seedV2) w.localStorage.setItem('daily.v2', seedV2);
  const fb = fakeFirebase(w, opts);
  const ctx = dom.getInternalVMContext();
  for (const f of FILES_AUTH) vm.runInContext(fs.readFileSync(path.join(APP, 'js', f), 'utf8'), ctx, { filename:f });
  w.ev = code => vm.runInContext(code, ctx);
  w.fb = fb;
  w.html = () => w.document.getElementById('app').innerHTML;
  w.set = (sel, val) => { w.document.querySelector(sel).value = val; };
  w.tap = sel => { const el = w.document.querySelector(sel); if (!el) throw new Error('no existe ' + sel); el.click(); };
  return w;
}

// Bootea la app CON sesión Y capa de datos Firestore (mock). opts: {docs, failSnapshot,
// persistFail, seedV2}. Los `docs` son documentos users/{uid} preexistentes en la nube.
function bootFs(opts) {
  const o = opts || {};
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div><div class="overlay" id="overlay"></div></body></html>',
    { url:'http://localhost/', pretendToBeVisual:true, runScripts:'outside-only' });
  const w = dom.window;
  if (o.seedV2) w.localStorage.setItem('daily.v2', o.seedV2);
  const fb = fakeFirebase(w, { fs: { docs: o.docs || {}, failSnapshot: o.failSnapshot, persistFail: o.persistFail, deferSnapshot: o.deferSnapshot } });
  const ctx = dom.getInternalVMContext();
  for (const f of FILES_FS) vm.runInContext(fs.readFileSync(path.join(APP, 'js', f), 'utf8'), ctx, { filename:f });
  w.ev = code => vm.runInContext(code, ctx);
  w.fb = fb;
  w.html = () => w.document.getElementById('app').innerHTML;
  w.set = (sel, val) => { w.document.querySelector(sel).value = val; };
  w.tap = sel => { const el = w.document.querySelector(sel); if (!el) throw new Error('no existe ' + sel); el.click(); };
  return w;
}

module.exports = {
  boot, bootAuth, bootFs, ok,
  done: () => { console.log('\n' + '='.repeat(46)); console.log(pass + ' ok, ' + fail + ' fail'); process.exit(fail ? 1 : 0); },
  d, iso, TODAY, TOMORROW, ANUAL_DATE, ago, V1_RAW,
};
