"use strict";
/* ============================ render ============================ */
const app=document.getElementById('app');
function render(){
  let html='';
  if(ui.tab==='hoy') html=viewHoy();
  else if(ui.tab==='calendario') html=viewCalendario();
  // Rutinas es una sub-pantalla de Gimnasio: ocupa la pestaña sin ser una pestaña propia.
  else if(ui.tab==='gym') html=(ui.gymSub==='rutinas'?viewRutinas():viewGym());
  else if(ui.tab==='habitos') html=viewHabitos();
  else if(ui.tab==='progreso') html=viewProgreso();
  app.innerHTML = html + quickAddBtn() + tabbar();
}

// Botón + central de carga rápida (flota sobre la barra).
function quickAddBtn(){
  return `<div class="fab fab-center" style="background:${C.coral};box-shadow:0 14px 30px rgba(255,107,107,0.45)" data-act="quick-add">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>`;
}

function tabbar(){
  const items=[['hoy','Hoy',C.coral,'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
    ['calendario','Calendario',C.green,'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
    ['gym','Gimnasio',C.yellow,'<path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11"/>'],
    ['habitos','Hábitos',C.purple,'<path d="M12 3c.6 3.2 3 4.4 3 7.6a3 3 0 0 1-6 0c0-1 .4-1.9 1-2.6-1.3.4-3.2 1.7-3.2 4.7a5.2 5.2 0 0 0 10.4 0C17.2 8.2 14.2 5.6 12 3z"/>'],
    ['progreso','Progreso',C.cyan,'<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9M21 20V5"/>']];
  return '<div class="tabbar">'+items.map(([k,lb,col,ic])=>{
    const on=ui.tab===k;
    const c=on?col:'rgba(244,244,251,0.42)';
    const bg=on?tint(col,'24'):'transparent';
    return `<div class="tab" data-act="tab" data-tab="${k}">
      <div class="ic" style="color:${c};background:${bg}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic}</svg></div>
      <span class="lb" style="color:${c}">${lb}</span></div>`;
  }).join('')+'</div>';
}

/* ============================ events ============================ */
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'); if(!a) return;
  const act=a.dataset.act, id=a.dataset.id;
  // stop bubbling for nested checks/delete inside openable rows
  if(a.dataset.stop) e.stopPropagation();

  switch(act){
    case 'tab': ui.tab=a.dataset.tab; ui.gymExpand=null; render(); break;

    // ---- Hoy: tira semanal ----
    case 'day-sel': ui.daySel=a.dataset.d; render(); break;
    case 'week-prev': ui.daySel=iso(addDays(parseISO(ui.daySel),-7)); render(); break;
    case 'week-next': ui.daySel=iso(addDays(parseISO(ui.daySel),7)); render(); break;

    // ---- ítems de agenda (tarea / cita / anual) ----
    case 'task-toggle': { const t=itemById(id); if(t && t.kind==='tarea'){ t.done=!t.done; commit(); } break; }
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

    case 'gym-prev': ui.gymOffset--; ui.gymExpand=null; render(); break;
    case 'gym-next': ui.gymOffset++; ui.gymExpand=null; render(); break;
    case 'gym-expand': { const i=+a.dataset.i; ui.gymExpand=ui.gymExpand===i?null:i; render(); break; }
    case 'gym-settype': { const i=+a.dataset.i; getWeekPlan(ui.gymOffset)[i].type=a.dataset.type; ui.gymExpand=null; commit(); break; }
    case 'gym-toggle': { const i=+a.dataset.i; const d=getWeekPlan(ui.gymOffset)[i]; d.done=!d.done; commit(); break; }
    case 'gym-managetypes': manageTypesModal(); break;

    case 'const-prev': ui.constEnd-=8; render(); break;
    case 'const-next': ui.constEnd=Math.min(0,ui.constEnd+8); render(); break;

    case 'lift-new': liftModal(null); break;
    case 'lift-open': { const l=state.gym.lifts.find(x=>x.id===id); if(l) liftModal(l); break; }
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

    case 'habit-toggle': { const d=a.dataset.date; state.habitLog[d] ||= {}; if(state.habitLog[d][id]) delete state.habitLog[d][id]; else state.habitLog[d][id]=true; commit(); break; }
    case 'habit-open': { const hb=state.habits.find(x=>x.id===id); if(hb) habitModal(hb); break; }
    case 'habit-new': habitModal(null); break;
    case 'habit-delete': confirmDelete('¿Eliminar este hábito?','Se borra el hábito y su historial de marcas.',()=>{ const hid=a.dataset.id; state.habits=state.habits.filter(x=>x.id!==hid); Object.values(state.habitLog).forEach(day=>delete day[hid]); closeModal(); commit(); }); break;
    case 'habit-prev': ui.habitDate=iso(addDays(parseISO(ui.habitDate),-1)); render(); break;
    case 'habit-next': if(ui.habitDate<todayISO()){ ui.habitDate=iso(addDays(parseISO(ui.habitDate),1)); render(); } break;

    case 'modal-cancel': closeModal(); break;
    case 'modal-save': if(modalSave) modalSave(); break;
  }
});

/* ============================ boot ============================ */
render();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
