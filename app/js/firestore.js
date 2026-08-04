"use strict";
/* ----------------------------- FIRESTORE (v3, etapa 2) -----------------------------
   Los datos del usuario viven en Cloud Firestore, en un documento por cuenta: users/{uid}.
   Firestore es la unica fuente de verdad; su persistencia offline nativa (IndexedDB) hace de
   cache local, asi que ya no se guarda una copia manual en localStorage.

   Puente sincronico: se mantiene un `state` en memoria hidratado desde Firestore con un
   listener onSnapshot. El resto de la app sigue leyendo `state.*` de forma sincronica y
   escribiendo con commit() como siempre; las escrituras van a Firestore (optimistas, y offline
   se encolan). Solo la carga inicial es asincrona: hasta el primer snapshot se muestra "cargando".

   Se usa el SDK compat (firebase.firestore()), igual enfoque que Auth. */

const DATA = { ready:false, uid:null, error:null };
let dbUnsub = null;
let dbPersistTried = false;

function fbStore(){ return (typeof firebase!=='undefined' && firebase.firestore) ? firebase.firestore() : null; }
function dbUserDoc(uid){ const s=fbStore(); return s ? s.collection('users').doc(uid) : null; }

// daily.v2 local (SOLO lectura) para sembrar la nube la primera vez. Nunca se escribe.
function localV2(){ try{ const s=JSON.parse(localStorage.getItem('daily.v2')); return (s&&typeof s==='object'&&!Array.isArray(s))?s:null; }catch(e){ return null; } }

// Arranca el sync para un usuario. Idempotente: no re-suscribe al mismo uid.
function dataStart(uid){
  const s=fbStore(); if(!s || !uid) return;
  if(DATA.uid===uid && dbUnsub) return;
  dataStop();
  DATA.uid=uid; DATA.ready=false; DATA.error=null;
  // Persistencia offline: una sola vez, antes del primer uso. .catch por multiples pestañas o
  // navegadores que no la soportan; si falla, la app sigue andando (online).
  if(!dbPersistTried){ dbPersistTried=true; try{ const p=s.enablePersistence&&s.enablePersistence({synchronizeTabs:true}); if(p&&p.catch) p.catch(()=>{}); }catch(e){} }
  const doc=dbUserDoc(uid);
  dbUnsub = doc.onSnapshot(
    snap=>{
      DATA.error=null;
      if(snap && snap.exists){
        state = normalize(snap.data());
      } else {
        // Primera vez para esta cuenta: se siembra desde el daily.v2 local si existe (migracion),
        // si no con un estado nuevo, y se crea el documento en la nube.
        state = normalize(localV2() || seed());
        DATA.ready=true; render();
        dataSave();
        return;
      }
      DATA.ready=true; render();
    },
    err=>{ DATA.error=(err&&err.code)||'error'; render(); }
  );
}

// Escribe el state completo al documento del usuario. Fire-and-forget: offline lo encola y la
// UI ya se actualizo desde el state en memoria. JSON.parse(stringify) limpia undefined/no-serializable.
function dataSave(){
  const doc = DATA.uid ? dbUserDoc(DATA.uid) : null;
  if(!doc || !state) return;
  let clean; try{ clean=JSON.parse(JSON.stringify(state)); }catch(e){ return; }
  const p=doc.set(clean); if(p&&p.catch) p.catch(()=>{});
}

// Corta el sync (logout / usuario null). Deja el state vacio para que el gate muestre login.
function dataStop(){
  if(dbUnsub){ try{ dbUnsub(); }catch(e){} dbUnsub=null; }
  DATA.uid=null; DATA.ready=false; DATA.error=null;
  state=null;
}

// Pantalla de error de carga (permisos/red la primera vez sin cache). Autocontenida.
function viewDataError(){
  return `<div class="view auth" style="--accent:${C.danger}"><div class="head">
      <div class="authmark" style="background:linear-gradient(140deg,${C.danger},${C.coral})">D</div>
      <h1>No pudimos cargar tus datos</h1>
      <div class="sub">Revisá la conexión y volvé a intentar.</div></div>
    <div class="body">
      <div class="card" style="padding:20px 18px"><div class="empty">Hubo un problema al traer tus datos de la nube. Si es la primera vez que entrás, necesitás conexión.</div></div>
      <div class="abtn primary" data-act="data-retry">Reintentar</div></div></div>`;
}
