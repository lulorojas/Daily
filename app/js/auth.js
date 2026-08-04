"use strict";
/* ----------------------------- AUTH (v3, etapa 1) -----------------------------
   Capa de sesión por encima de la app: Firebase Auth con email y contraseña.

   Se usa el SDK en versión "compat", que expone el namespace global `firebase`. Así estos
   siguen siendo scripts clásicos como el resto del proyecto, sin import/export ni módulos
   ES, que era la arquitectura acordada en la refactorización anterior.

   La app solo se dibuja con sesión iniciada Y email verificado. De eso se encarga
   authGate(), que render() consulta antes que cualquier otra cosa.

   Los DATOS siguen siendo locales (localStorage daily.v2), sin tocar: esto es solo la
   puerta de entrada. Lo que hoy hay en el teléfono sigue estando después de loguearse. */

const AUTH = {
  ready:false,     // onAuthStateChanged ya contestó al menos una vez
  user:null,       // usuario de Firebase, o null si no hay sesión
  screen:'login',  // qué formulario se ve sin sesión: login | registro | reset
  busy:false,      // hay una llamada a Firebase en curso: bloquea el botón
  flash:null,      // aviso arriba del formulario: {kind:'ok'|'err', msg}
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASS_MIN = 6;               // el mínimo que exige Firebase

function fbAuth(){ return (typeof firebase!=='undefined' && firebase.auth) ? firebase.auth() : null; }
// De dónde llega el mail de Firebase (remitente por defecto: noreply@<authDomain>). Se muestra
// en las pantallas para que la persona lo reconozca y no lo tome por spam peligroso.
function authSender(){ return 'noreply@'+((typeof firebaseConfig!=='undefined' && firebaseConfig.authDomain)||'firebaseapp.com'); }
function authRoot(){ return document.getElementById('app'); }
function authUser(){ return AUTH.user; }
function av(sel){ const el=authRoot().querySelector(sel); return el?el.value.trim():''; }

/* ---- qué pantalla corresponde ----
   null = vía libre, se dibuja la app. Cualquier otra cosa = pantalla de sesión. */
function authGate(){
  if(!fbAuth())              return 'sdk';        // el SDK no cargó
  if(!AUTH.ready)            return 'cargando';   // todavía no sabemos si hay sesión
  if(!AUTH.user)             return AUTH.screen;  // sin sesión
  if(!AUTH.user.emailVerified) return 'verificar';// con sesión, sin verificar
  return null;
}

// Única suscripción al estado de sesión. Firebase la persiste en IndexedDB, así que al
// reabrir la app (incluso sin internet) vuelve el usuario que ya estaba logueado.
function authInit(){
  const a=fbAuth(); if(!a) return;
  a.onAuthStateChanged(u=>{
    const wasUser=!!AUTH.user;
    AUTH.ready=true; AUTH.user=u||null; AUTH.busy=false; AUTH.flash=null;
    // Al cerrarse una sesión (de tener usuario a no tener), la puerta vuelve al login y no
    // al último formulario que se hubiera visto (registro/reset).
    if(!u && wasUser) AUTH.screen='login';
    authSyncData();
    render();
  });
  // Al volver a la app después de abrir el mail, se re-chequea la verificación en silencio.
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') authRecheckSilent();
  });
}

// Conecta la sesión con sus datos: con usuario verificado arranca el sync de Firestore para su
// uid; sin sesión o sin verificar, lo corta. firestore.js hace el trabajo; acá solo se decide.
function authSyncData(){
  if(typeof dataStart!=='function' || typeof dataStop!=='function') return;
  const u=AUTH.user;
  if(u && u.emailVerified) dataStart(u.uid); else dataStop();
}

/* ---- mensajes de error de Firebase, en criollo ---- */
const AUTH_ERR = {
  'auth/invalid-email':          'Ese email no tiene un formato válido.',
  'auth/user-disabled':          'Esta cuenta está deshabilitada.',
  'auth/user-not-found':         'No hay ninguna cuenta con ese email.',
  'auth/wrong-password':         'La contraseña no es correcta.',
  'auth/invalid-credential':     'El email o la contraseña no son correctos.',
  'auth/email-already-in-use':   'Ya existe una cuenta con ese email. Probá iniciar sesión.',
  'auth/weak-password':          'La contraseña es muy débil. Poné al menos '+PASS_MIN+' caracteres.',
  'auth/too-many-requests':      'Demasiados intentos seguidos. Esperá un momento y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión. Para entrar la primera vez hace falta internet.',
  'auth/operation-not-allowed':  'El ingreso con email y contraseña no está habilitado en el proyecto.',
  'auth/requires-recent-login':  'Por seguridad, volvé a iniciar sesión.',
};
function authErrMsg(e){ return (e && AUTH_ERR[e.code]) || 'Algo salió mal. Probá de nuevo en un momento.'; }

/* ---- aviso y botón ocupado: se escriben en el DOM, sin re-render ----
   Importante: un re-render borraría lo que la persona ya tipeó. Por eso un error de
   Firebase o de validación nunca redibuja la pantalla, solo la retoca. */
function authFlashHTML(f){
  const col = f.kind==='ok' ? C.green : C.danger;
  const icon = f.kind==='ok' ? 'M20 6.5 9.5 17 4 11.5' : 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM12 8v5M12 16.2v.3';
  return `<div style="display:flex;align-items:flex-start;gap:10px;padding:13px 15px;border-radius:16px;background:${tint(col,'1A')};border:1px solid ${tint(col,'3D')};color:${col};font-size:13px;font-weight:500;line-height:1.45">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px"><path d="${icon}"/></svg>
    <span>${esc(f.msg)}</span></div>`;
}
function authFlash(kind,msg){
  AUTH.flash = msg ? {kind,msg} : null;
  const box=authRoot().querySelector('#auth-flash');
  if(box) box.innerHTML = AUTH.flash ? authFlashHTML(AUTH.flash) : '';
}
function authBusy(on){
  AUTH.busy=on;
  const b=authRoot().querySelector('.abtn[data-idle]');
  if(!b) return;
  b.classList.toggle('busy',on);
  b.textContent = on ? 'Un momento…' : b.dataset.idle;
}

/* ============================ pantallas ============================ */
function authShell(o){
  const col=o.color||C.amber;
  const back = o.back ? `<div class="rut-back" style="margin-bottom:18px" data-act="auth-screen" data-s="${o.back}">
      <svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10l8 8"/></svg>
      <span>${esc(o.backLabel||'Volver')}</span></div>` : '';
  return `<div class="view auth" style="--accent:${col}">
    <div class="head">${back}
      <div class="authmark" style="background:linear-gradient(140deg,${col},${C.coral})">D</div>
      <h1>${esc(o.title)}</h1>
      <div class="sub">${o.sub}</div></div>
    <div class="body">
      <div id="auth-flash">${AUTH.flash?authFlashHTML(AUTH.flash):''}</div>
      ${o.body}</div></div>`;
}
function authField(id,label,type,ph,extra){
  return `<div class="fld"><div class="flabel">${esc(label)}${extra||''}</div>
    <input class="inp" id="${id}" type="${type}" placeholder="${esc(ph)}"
      autocapitalize="none" autocorrect="off" spellcheck="false"
      ${type==='email'?'inputmode="email" autocomplete="email"':''}></div>`;
}
function authBtn(act,label,cls){
  return `<div class="abtn ${cls||'primary'}" data-act="${act}" data-idle="${esc(label)}">${esc(label)}</div>`;
}

function viewAuthLogin(){
  return authShell({ title:'Hola de nuevo', sub:'Entrá a tu Daily para seguir donde lo dejaste.', body:`
    ${authField('au-email','Email','email','vos@ejemplo.com')}
    ${authField('au-pass','Contraseña','password','Tu contraseña')}
    <div style="text-align:right;font-size:13px;font-weight:500;color:${C.amber};cursor:pointer;margin:-8px 2px 0" data-act="auth-screen" data-s="reset">¿Olvidaste tu contraseña?</div>
    ${authBtn('auth-login','Entrar')}
    <div class="alink" data-act="auth-screen" data-s="registro">¿Todavía no tenés cuenta? <b>Creá una</b></div>` });
}

function viewAuthRegistro(){
  return authShell({ title:'Creá tu cuenta', sub:'Con tu email y una contraseña alcanza.', body:`
    ${authField('au-email','Email','email','vos@ejemplo.com')}
    ${authField('au-pass','Contraseña','password','Mínimo '+PASS_MIN+' caracteres',` <span class="opt">· mínimo ${PASS_MIN}</span>`)}
    ${authField('au-pass2','Repetir contraseña','password','La misma de arriba')}
    ${authBtn('auth-registro','Crear cuenta')}
    <div style="font-size:12px;color:rgba(242,244,248,.42);text-align:center;line-height:1.55;margin:-4px 8px 0">
      Te va a llegar un mail de <b style="color:rgba(242,244,248,.7)">${esc(authSender())}</b> para confirmar tu casilla.
      Puede caer en <b style="color:rgba(242,244,248,.7)">Spam</b> o Correo no deseado: es nuestro, podés abrirlo tranquilo.</div>
    <div class="alink" data-act="auth-screen" data-s="login">¿Ya tenés cuenta? <b>Entrá</b></div>` });
}

function viewAuthReset(){
  return authShell({ title:'Recuperar contraseña', back:'login', backLabel:'Entrar',
    sub:'Poné tu email y te mandamos un link para cambiarla.', body:`
    ${authField('au-email','Email','email','vos@ejemplo.com')}
    ${authBtn('auth-reset','Enviar email de recuperación')}` });
}

function viewAuthVerificar(){
  const mail=(AUTH.user&&AUTH.user.email)||'';
  return authShell({ title:'Verificá tu email', color:C.coral,
    sub:'Te mandamos un link para confirmar que la casilla es tuya.', body:`
    <div class="card" style="padding:20px 18px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
      <div style="width:54px;height:54px;border-radius:19px;background:${tint(C.coral,'24')};color:${C.coral};display:grid;place-items:center">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg></div>
      <div style="font-size:14px;line-height:1.55;color:rgba(242,244,248,.65)">Revisá tu casilla en<br><b style="color:${C.coral};font-weight:600">${esc(mail)}</b><br>y abrí el link para continuar.</div>
      <div style="font-size:12px;line-height:1.55;color:rgba(242,244,248,.42);padding-top:2px;border-top:1px solid rgba(255,255,255,.06);width:100%">
        El mail viene de <b style="color:rgba(242,244,248,.7)">${esc(authSender())}</b>. Puede tardar un par de minutos o caer en
        <b style="color:rgba(242,244,248,.7)">Spam / No deseado</b> — es un correo nuestro, es seguro abrir el link.</div>
    </div>
    ${authBtn('auth-recheck','Ya lo verifiqué')}
    ${authBtn('auth-resend','Reenviar email','ghost')}
    ${authBtn('auth-logout','Cerrar sesión','ghost')}` });
}

// El SDK no cargó: sin internet y sin caché no se puede ni preguntar si hay sesión.
function viewAuthSdk(){
  return authShell({ title:'No se pudo cargar', color:C.danger,
    sub:'Falta una pieza para poder iniciar sesión.', body:`
    <div class="card" style="padding:20px 18px"><div class="empty">No se pudo cargar Firebase. Conectate a internet y volvé a abrir la app.</div></div>` });
}

function viewAuthCargando(){
  return `<div class="view auth" style="--accent:${C.amber}"><div class="emptybig">
    <div class="authmark" style="width:64px;height:64px;border-radius:22px;font-size:32px;background:linear-gradient(140deg,${C.amber},${C.coral});margin:0">D</div>
    <div class="ex">Abriendo tu Daily…</div></div></div>`;
}

function authView(screen){
  if(screen==='registro')  return viewAuthRegistro();
  if(screen==='reset')     return viewAuthReset();
  if(screen==='verificar') return viewAuthVerificar();
  if(screen==='cargando')  return viewAuthCargando();
  if(screen==='sdk')       return viewAuthSdk();
  return viewAuthLogin();
}

/* ============================ acciones ============================ */
function authAction(act,el){
  switch(act){
    case 'auth-screen':   AUTH.screen=el.dataset.s; AUTH.flash=null; render(); break;
    case 'auth-login':    authDoLogin(); break;
    case 'auth-registro': authDoRegistro(); break;
    case 'auth-reset':    authDoReset(); break;
    case 'auth-recheck':  authDoRecheck(); break;
    case 'auth-resend':   authDoResend(); break;
    case 'auth-logout':   authDoLogout(); break;
  }
}

function authDoLogin(){
  if(AUTH.busy) return;
  const email=av('#au-email'), pass=av('#au-pass');
  if(!validateForm([
    ['#au-email', EMAIL_RE.test(email), email?'Ese email no tiene un formato válido.':'Poné tu email.'],
    ['#au-pass',  !!pass,               'Poné tu contraseña.'],
  ], authRoot())) return;
  authFlash(null,null); authBusy(true);
  // El caso feliz no necesita nada acá: onAuthStateChanged redibuja solo.
  fbAuth().signInWithEmailAndPassword(email,pass)
    .catch(e=>{ authBusy(false); authFlash('err',authErrMsg(e)); });
}

function authDoRegistro(){
  if(AUTH.busy) return;
  const email=av('#au-email'), p1=av('#au-pass'), p2=av('#au-pass2');
  if(!validateForm([
    ['#au-email', EMAIL_RE.test(email), email?'Ese email no tiene un formato válido.':'Poné tu email.'],
    ['#au-pass',  p1.length>=PASS_MIN,  p1?'La contraseña tiene que tener al menos '+PASS_MIN+' caracteres.':'Poné una contraseña.'],
    ['#au-pass2', !!p2 && p1===p2,      p2?'Las dos contraseñas no coinciden.':'Repetí la contraseña.'],
  ], authRoot())) return;
  authFlash(null,null); authBusy(true);
  // Creada la cuenta, el mail de verificación sale automático y la pantalla pasa a "verificar".
  fbAuth().createUserWithEmailAndPassword(email,p1)
    .then(cred=>{ const u=cred&&cred.user; if(u&&u.sendEmailVerification) return u.sendEmailVerification(); })
    .catch(e=>{ authBusy(false); authFlash('err',authErrMsg(e)); });
}

function authDoReset(){
  if(AUTH.busy) return;
  const email=av('#au-email');
  if(!validateForm([
    ['#au-email', EMAIL_RE.test(email), email?'Ese email no tiene un formato válido.':'Poné tu email.'],
  ], authRoot())) return;
  authFlash(null,null); authBusy(true);
  fbAuth().sendPasswordResetEmail(email)
    .then(()=>{ authBusy(false); authFlash('ok','Si hay una cuenta con ese email, ya salió el link para cambiar la contraseña. Revisá también el correo no deseado.'); })
    .catch(e=>{ authBusy(false); authFlash('err',authErrMsg(e)); });
}

function authDoResend(){
  if(AUTH.busy) return;
  const u=AUTH.user; if(!u) return;
  authBusy(true);
  u.sendEmailVerification()
    .then(()=>{ authBusy(false); authFlash('ok','Listo, te reenviamos el email a '+u.email+'.'); })
    .catch(e=>{ authBusy(false); authFlash('err',authErrMsg(e)); });
}

// emailVerified viene del token cacheado: recién después de reload() refleja el link abierto.
function authDoRecheck(){
  if(AUTH.busy) return;
  const a=fbAuth(), u=AUTH.user; if(!a||!u) return;
  authBusy(true);
  u.reload()
    .then(()=>{
      AUTH.user=a.currentUser; authBusy(false);
      if(AUTH.user && AUTH.user.emailVerified){ authSyncData(); render(); }
      else authFlash('err','Todavía figura sin verificar. Abrí el link del email y volvé a probar.');
    })
    .catch(e=>{ authBusy(false); authFlash('err',authErrMsg(e)); });
}

// Igual que authDoRecheck pero sin avisar nada: se dispara sola al volver a la app.
function authRecheckSilent(){
  const a=fbAuth(), u=AUTH.user;
  if(!a || !u || u.emailVerified || AUTH.busy) return;
  u.reload().then(()=>{
    const f=a.currentUser;
    if(f && f.emailVerified){ AUTH.user=f; authSyncData(); render(); }
  }).catch(()=>{});
}

function authDoLogout(){
  const a=fbAuth(); if(!a) return;
  confirmAction('¿Cerrar sesión?',
    'Vas a volver a la pantalla de ingreso. Tus datos siguen guardados en este teléfono.',
    'Cerrar sesión', ()=>{
      AUTH.screen='login'; AUTH.flash=null; ui.hoySub=null;
      a.signOut().catch(e=>notice('No se pudo cerrar sesión', authErrMsg(e)));
    });
}
