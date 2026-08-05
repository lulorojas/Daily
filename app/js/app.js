"use strict";
/* ============================ render ============================ */
const app=document.getElementById('app');

// Qué pantalla se está mirando. Mientras no cambie, un re-render (marcar una tarea, un
// hábito, guardar algo) mantiene el scroll donde estaba y no repite la animación de
// entrada: solo al cambiar de pantalla se vuelve arriba de todo.
function screenKey(){ return [ui.tab,ui.hoySub,ui.gymSub,ui.rutId,ui.rutDayId].join('|'); }
let lastScreen=null;

function render(){
  // Puerta de sesión: sin cuenta iniciada, o con el email sin verificar, no se dibuja nada
  // de la app. authGate() devuelve null cuando hay vía libre. Si auth.js no está cargado
  // (los tests de datos no lo cargan) la app se dibuja como siempre.
  const authg = (typeof authGate==='function') ? authGate() : null;
  // Con sesión verificada pero los datos de Firestore todavía en camino (o con error de carga),
  // se muestra una pantalla intermedia y no la app. Sin capa de datos (tests) esto no aplica.
  const datag = (!authg && typeof DATA!=='undefined' && DATA.uid && !DATA.ready)
    ? (DATA.error ? 'data-error' : 'data-loading') : null;
  // Bienvenida: con sesión y datos listos, pero la primera vez, antes de entrar a la app.
  const onbg = (!authg && !datag && typeof welcomeDue==='function' && welcomeDue()) ? 'welcome' : null;
  const gate = authg || datag || onbg;

  const prev=app.querySelector('.view'), key=gate?('gate:'+gate):screenKey();
  const same = !!prev && key===lastScreen;
  const keepScroll = same ? prev.scrollTop : 0;
  lastScreen=key;

  let html='', acc;
  if(authg){
    html=authView(authg); acc=C.amber;
  } else if(datag){
    html = datag==='data-error' ? viewDataError() : viewAuthCargando(); acc=C.amber;
  } else if(onbg){
    html=viewWelcome(); acc=C.amber;
  } else {
    // Ajustes es una sub-pantalla de Hoy: se abre con el engranaje, sin ocupar una pestaña.
    if(ui.tab==='hoy') html=(ui.hoySub==='ajustes'?viewAjustes():viewHoy());
    else if(ui.tab==='calendario') html=viewCalendario();
    // Rutinas es una sub-pantalla de Gimnasio: ocupa la pestaña sin ser una pestaña propia.
    else if(ui.tab==='gym') html=(ui.gymSub==='rutinas'?viewRutinas():viewGym());
    else if(ui.tab==='habitos') html=viewHabitos();
    else if(ui.tab==='progreso') html=viewProgreso();
    // El acento de la sección tiñe la nav, el botón + y el glow superior (vars CSS en #app).
    acc=SECT[ui.tab]||C.amber;
    html+=navbar(acc);
    // Tip contextual la primera vez que se visita esta pestaña.
    if(typeof tipDue==='function' && tipDue()) html+=tipCallout();
  }
  app.style.setProperty('--accent', acc);
  app.style.setProperty('--glow', tint(acc,'1F'));
  app.innerHTML = html;
  if(same){
    const view=app.querySelector('.view');
    if(view){ view.classList.add('nofx'); view.scrollTop=keepScroll; }
  }
}

// Barra: píldora de 5 pestañas (activa con label, resto solo ícono) + botón "+" pegado a la
// derecha, del color de la sección. Reemplaza la tabbar + FAB central.
const NAV_ICONS = {
  hoy:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2.6v2M12 19.4v2M4.6 4.6 6 6M18 18l1.4 1.4M2.6 12h2M19.4 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  calendario:'M7.5 3v4M16.5 3v4M3.4 10.5h17.2M6.5 5h11a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 17.5 21h-11A3.5 3.5 0 0 1 3 17.5v-9A3.5 3.5 0 0 1 6.5 5Z',
  gym:'M6.5 8.5v7M3.8 10.5v3M17.5 8.5v7M20.2 10.5v3M6.5 12h11',
  habitos:'M13 2.8c.4 3-1.2 4.4-2.6 5.8C8.8 10.2 7 11.7 7 14.4a5 5 0 0 0 10 0c0-2.3-1.2-3.7-2-4.7-.3 1.2-1.1 1.9-1.8 2.1.6-3-1.5-5.3-.2-9Z',
  progreso:'M4 20h16M7 20v-5.5M12 20V8.5M17 20v-9'
};
function navbar(acc){
  const items=[['hoy','Hoy'],['calendario','Cal'],['gym','Gym'],['habitos','Hábitos'],['progreso','Progreso']];
  const pill=items.map(([k,lb])=>{
    const on=ui.tab===k;
    return `<div class="navitem ${on?'on':''}" style="${on?`background:${tint(acc,'2B')};color:${acc}`:''}" data-act="tab" data-tab="${k}">
      <svg viewBox="0 0 24 24" style="width:21px;height:21px;flex:none" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${NAV_ICONS[k]}"/></svg>
      <span class="nlb">${lb}</span></div>`;
  }).join('');
  return `<div class="nav"><div class="navpill">${pill}</div>
    <div class="navadd" style="background:${acc}" data-act="quick-add">+</div></div>`;
}

/* ============================ events ============================ */
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'); if(!a) return;
  const act=a.dataset.act, id=a.dataset.id;
  // stop bubbling for nested checks/delete inside openable rows
  if(a.dataset.stop) e.stopPropagation();

  // Todo lo de la capa de sesión se resuelve en auth.js.
  if(act.indexOf('auth-')===0){ if(typeof authAction==='function') authAction(act,a); return; }
  // Reintentar la carga de datos tras un error de Firestore.
  if(act==='data-retry'){ if(typeof AUTH!=='undefined' && AUTH.user && typeof dataStart==='function'){ dataStop(); dataStart(AUTH.user.uid); } return; }
  // Onboarding (bienvenida + tips).
  if(act.indexOf('onb-')===0){ if(typeof onbAction==='function') onbAction(act,a); return; }

  switch(act){
    case 'tab': ui.tab=a.dataset.tab; ui.gymExpand=null; ui.habMenu=null; render(); break;

    // ---- Hoy: tira semanal ----
    case 'day-sel': ui.daySel=a.dataset.d; render(); break;
    case 'week-prev': ui.daySel=iso(addDays(parseISO(ui.daySel),-7)); render(); break;
    case 'week-next': ui.daySel=iso(addDays(parseISO(ui.daySel),7)); render(); break;

    // ---- ítems de agenda (tarea / cita / anual) ----
    case 'task-toggle': { const t=itemById(id); if(t && t.kind==='tarea'){ t.done=!t.done;
      // doneAt: el día en que se marcó (el que se está mirando en la tira). La bandeja usa
      // esto para mostrar una pendiente completada solo ese día y no arrastrarla a los demás.
      if(t.done) t.doneAt=ui.daySel; else delete t.doneAt;
      commit(); } break; }

    // tooltip de los gráficos: toca un punto y salta su fecha + valor. No re-renderiza.
    case 'chart-pt': {
      const wrap=a.closest('.chartwrap'), tip=wrap&&wrap.querySelector('.charttip'); if(!tip) break;
      const key=a.dataset.i;
      if(tip.classList.contains('show') && tip.dataset.for===key){ tip.classList.remove('show'); }
      else { tip.textContent=a.dataset.lbl; tip.style.left=a.dataset.xp+'%'; tip.style.top=a.dataset.yp+'%'; tip.dataset.for=key; tip.classList.add('show'); }
      break;
    }
    // task-schedule es el atajo "poner fecha" de la bandeja: mismo form, ya con el datepicker.
    case 'task-open': case 'task-schedule': { const t=itemById(id); if(t) taskModal(t); break; }
    case 'event-open': { const e=itemById(id); if(e) eventModal(e); break; }
    case 'item-delete': {
      const it=itemById(a.dataset.id); if(!it) break;
      const q={ tarea:['¿Eliminar esta tarea?','La tarea se quita de la app.'],
                cita:['¿Eliminar esta cita?','Se quita del calendario.'],
                anual:['¿Eliminar esta fecha anual?','Se quita del calendario y deja de repetirse cada año.'] }[it.kind];
      confirmDelete(q[0],q[1],()=>{ state.items=state.items.filter(x=>x.id!==it.id); closeModal(); commit(); });
      break;
    }

    // ---- botón + de carga rápida ----
    case 'quick-add': quickAddMenu(); break;
    case 'quick-task': closeModal(); taskModal(null, ui.tab==='hoy'?ui.daySel:todayISO()); break;
    case 'quick-event': closeModal(); eventModal(null, ui.tab==='hoy'?ui.daySel:ui.calSel); break;
    case 'quick-habit': closeModal(); habitModal(null); break;
    case 'quick-body': closeModal(); bodyModal(null); break;

    // ---- calendario ----
    case 'cal-prev': { let m=ui.calM-1,y=ui.calY; if(m<0){m=11;y--;} ui.calM=m;ui.calY=y; render(); break; }
    case 'cal-next': { let m=ui.calM+1,y=ui.calY; if(m>11){m=0;y++;} ui.calM=m;ui.calY=y; render(); break; }
    case 'cal-day': ui.calSel=a.dataset.d; render(); break;
    case 'cal-add': calAddMenu(a.dataset.d); break;
    case 'cal-add-task': { const d=a.dataset.d; closeModal(); taskModal(null,d); break; }
    case 'cal-add-event': { const d=a.dataset.d; closeModal(); eventModal(null,d); break; }

    // Atajo desde la barra de entreno de Hoy: abre Gimnasio en la semana de ese día.
    case 'gym-plan-open': {
      const d=a.dataset.d||ui.daySel;
      ui.gymOffset=Math.round((mondayOf(parseISO(d))-mondayOf(todayD()))/6048e5);
      ui.tab='gym'; ui.gymSub=null; ui.gymExpand=null; render(); break;
    }

    case 'gym-prev': ui.gymOffset--; ui.gymExpand=null; render(); break;
    case 'gym-next': ui.gymOffset++; ui.gymExpand=null; render(); break;
    case 'gym-expand': { const i=+a.dataset.i; ui.gymExpand=ui.gymExpand===i?null:i; render(); break; }
    case 'gym-settype': { const i=+a.dataset.i; getWeekPlan(ui.gymOffset)[i].type=a.dataset.type; ui.gymExpand=null; commit(); break; }
    case 'gym-toggle': { const i=+a.dataset.i; const d=getWeekPlan(ui.gymOffset)[i]; d.done=!d.done; commit(); break; }
    case 'gym-managetypes': manageTypesModal(); break;

    // ---- ajustes / backup ----
    case 'ajustes-open': ui.hoySub='ajustes'; render(); break;
    case 'ajustes-back': ui.hoySub=null; render(); break;
    case 'bk-export': doExport(); break;
    case 'bk-import': doImport(); break;
    // Posponer: el aviso vuelve dentro de una semana.
    case 'bk-snooze': bkSet({ snoozeUntil: iso(addDays(todayD(),BACKUP_DAYS)) }); render(); break;

    // ---- progreso (solo lectura: el selector solo cambia el recorte de la vista) ----
    case 'prog-period': ui.progPeriod=a.dataset.p; render(); break;

    case 'const-prev': ui.constEnd-=8; render(); break;
    case 'const-next': ui.constEnd=Math.min(0,ui.constEnd+8); render(); break;

    case 'lift-new': liftModal(null); break;
    case 'lift-open': { const l=state.gym.lifts.find(x=>x.id===id); if(l) liftDetailModal(l); break; }
    case 'lift-log': { const l=state.gym.lifts.find(x=>x.id===id); if(l) liftModal(l); break; }
    case 'lift-rec-edit': { const l=state.gym.lifts.find(x=>x.id===a.dataset.lift); if(l) liftRecModal(l, +a.dataset.i); break; }
    case 'lift-rec-delete': {
      const l=state.gym.lifts.find(x=>x.id===a.dataset.lift); if(!l) break;
      if(l.history.length<=1){ notice('No se puede borrar','Es el único registro del ejercicio. Editalo, o eliminá el ejercicio entero.'); break; }
      const rec=l.history[+a.dataset.i]; if(!rec) break;
      confirmDelete('¿Eliminar este registro?',fmtNum(rec.weight)+' kg del '+fmtDateLong(rec.date)+'. Se quita del historial.',()=>{
        l.history.splice(+a.dataset.i,1); save(); render(); liftDetailModal(l); });
      break;
    }
    case 'lift-delete': { const l=state.gym.lifts.find(x=>x.id===id); if(l) confirmDelete('¿Eliminar "'+l.name+'"?','Se borra el ejercicio y todo su historial de pesos.',()=>{ state.gym.lifts=state.gym.lifts.filter(x=>x.id!==id); closeModal(); commit(); }); break; }

    // ---- rutinas (biblioteca de consulta, sub-pantalla de Gimnasio) ----
    case 'rut-open-lib': ui.gymSub='rutinas'; ui.rutId=null; ui.rutDayId=null; render(); break;
    case 'rut-back':
      if(ui.rutDayId) ui.rutDayId=null;
      else if(ui.rutId) ui.rutId=null;
      else ui.gymSub=null;
      render(); break;
    case 'rut-open': ui.rutId=id; ui.rutDayId=null; render(); break;
    case 'rut-new': rutModal(null); break;
    case 'rut-edit': { const r=rutById(id); if(r) rutModal(r); break; }
    case 'rut-delete': { const r=rutById(id); if(!r) break;
      confirmDelete('¿Eliminar "'+r.name+'"?','Se borra la rutina con todos sus días y ejercicios.',()=>{
        state.gym.routines=state.gym.routines.filter(x=>x.id!==r.id);
        if(ui.rutId===r.id){ ui.rutId=null; ui.rutDayId=null; }
        commit(); }); break; }
    case 'rut-move': { const i=state.gym.routines.findIndex(x=>x.id===id);
      if(moveInArray(state.gym.routines,i,+a.dataset.dir)) commit(); break; }

    case 'rut-day-open': ui.rutDayId=id; render(); break;
    case 'rut-day-new': rutDayModal(null); break;
    case 'rut-day-edit': { const r=rutCur(), d=r&&r.days.find(x=>x.id===id); if(d) rutDayModal(d); break; }
    case 'rut-day-delete': { const r=rutCur(), d=r&&r.days.find(x=>x.id===id); if(!d) break;
      confirmDelete('¿Eliminar "'+d.name+'"?','Se borra el día con todos sus ejercicios.',()=>{
        r.days=r.days.filter(x=>x.id!==d.id);
        if(ui.rutDayId===d.id) ui.rutDayId=null;
        commit(); }); break; }
    case 'rut-day-move': { const r=rutCur(); if(!r) break;
      const i=r.days.findIndex(x=>x.id===id);
      if(moveInArray(r.days,i,+a.dataset.dir)) commit(); break; }

    case 'rut-ex-new': rutExModal(null); break;
    case 'rut-ex-edit': { const d=rutDayCur(), e=d&&d.exercises.find(x=>x.id===id); if(e) rutExModal(e); break; }
    case 'rut-ex-delete': { const d=rutDayCur(), e=d&&d.exercises.find(x=>x.id===id); if(!e) break;
      confirmDelete('¿Eliminar "'+e.name+'"?','Se quita el ejercicio de este día.',()=>{
        d.exercises=d.exercises.filter(x=>x.id!==e.id); commit(); }); break; }
    case 'rut-ex-move': { const d=rutDayCur(); if(!d) break;
      const i=d.exercises.findIndex(x=>x.id===id);
      if(moveInArray(d.exercises,i,+a.dataset.dir)) commit(); break; }

    // ---- peso corporal ----
    case 'body-new': closeModal(); bodyModal(null); break;
    case 'body-manage': bodyManageModal(); break;
    case 'body-edit': { const r=state.gym.bodyWeights.find(x=>x.id===id); if(r){ closeModal(); bodyModal(r); } break; }
    case 'body-delete': { const r=state.gym.bodyWeights.find(x=>x.id===id); if(!r) break;
      confirmDelete('¿Eliminar este registro?',fmtNum(r.kg)+' kg del '+fmtDateLong(r.date)+'. Se quita de la tendencia.',()=>{
        state.gym.bodyWeights=state.gym.bodyWeights.filter(x=>x.id!==r.id); closeModal(); commit(); }); break; }

    case 'type-new': typeCreateModal(null); break;
    case 'type-edit': { const t=state.gym.customTypes.find(x=>x.id===id); if(t) typeCreateModal(t); break; }
    case 'type-delete': { const t=state.gym.customTypes.find(x=>x.id===id); if(t) confirmDelete('¿Eliminar "'+t.name+'"?','Se quitará del selector del plan semanal. Los días ya marcados no se modifican.',()=>{ state.gym.customTypes=state.gym.customTypes.filter(x=>x.id!==id); save(); manageTypesModal(); }); break; }

    // Multi-check: tocar el slot i lo llena hasta i (si estaba lleno, lo baja a i).
    case 'habit-toggle': { const d=a.dataset.date, hb=state.habits.find(x=>x.id===id); if(!hb) break;
      const tpd=hb.timesPerDay||1, slot=a.dataset.slot!=null?+a.dataset.slot:0, cur=habitMarks(id,d);
      const next = slot<cur ? slot : slot+1;
      state.habitLog[d] ||= {};
      if(next<=0) delete state.habitLog[d][id]; else state.habitLog[d][id]=Math.min(next,tpd);
      commit(); break; }
    case 'habit-open': { ui.habMenu=null; const hb=state.habits.find(x=>x.id===id); if(hb) habitModal(hb); break; }
    case 'habit-menu': { const hid=a.dataset.id; ui.habMenu = ui.habMenu===hid?null:hid; render(); break; }
    case 'habit-new': ui.habMenu=null; habitModal(null); break;
    case 'habit-delete': confirmDelete('¿Eliminar este hábito?','Se borra el hábito y su historial de marcas.',()=>{ const hid=a.dataset.id; state.habits=state.habits.filter(x=>x.id!==hid); Object.values(state.habitLog).forEach(day=>delete day[hid]); closeModal(); commit(); }); break;
    case 'habit-day': ui.habitDate=a.dataset.d; ui.habMenu=null; render(); break;
    case 'habit-wk-prev': ui.habitDate=iso(addDays(parseISO(ui.habitDate),-7)); ui.habMenu=null; render(); break;
    case 'habit-wk-next': ui.habitDate=iso(addDays(parseISO(ui.habitDate),7)); ui.habMenu=null; render(); break;

    case 'modal-cancel': closeModal(); break;
    case 'modal-save': if(modalSave) modalSave(); break;
  }
});

// Cierra el tooltip de un gráfico al tocar fuera de cualquier gráfico (en captura, así
// se cierra aunque el click no dispare ninguna acción).
document.addEventListener('click',e=>{
  if(!e.target.closest('.chartwrap')) document.querySelectorAll('.charttip.show').forEach(t=>t.classList.remove('show'));
  // Cerrar el menú de un hábito al tocar fuera de él (y que no sea su propio botón).
  if(ui.habMenu && !e.target.closest('.hmenu') && !e.target.closest('[data-act="habit-menu"]')){ ui.habMenu=null; render(); }
},true);

/* ============================ boot ============================ */
// authInit() se suscribe al estado de sesión y redibuja cuando Firebase contesta. El primer
// render() de acá abajo dibuja mientras tanto la pantalla de "Abriendo tu Daily…".
if(typeof authInit==='function') authInit();
render();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
