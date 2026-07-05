"use strict";
/* ============================ render ============================ */
const app=document.getElementById('app');
function render(){
  let html='';
  if(ui.tab==='hoy') html=viewHoy();
  else if(ui.tab==='tareas') html=viewTareas();
  else if(ui.tab==='calendario') html=viewCalendario();
  else if(ui.tab==='gym') html=viewGym();
  else if(ui.tab==='habitos') html=viewHabitos();
  app.innerHTML = html + tabbar();
}

function tabbar(){
  const items=[['hoy','Hoy',C.coral,'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
    ['tareas','Tareas',C.blue,'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6l1 1 1.8-2M4.5 12l1 1 1.8-2M4.5 18l1 1 1.8-2"/>'],
    ['calendario','Calendario',C.green,'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
    ['gym','Gimnasio',C.yellow,'<path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11"/>'],
    ['habitos','Hábitos',C.purple,'<path d="M12 3c.6 3.2 3 4.4 3 7.6a3 3 0 0 1-6 0c0-1 .4-1.9 1-2.6-1.3.4-3.2 1.7-3.2 4.7a5.2 5.2 0 0 0 10.4 0C17.2 8.2 14.2 5.6 12 3z"/>']];
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

    case 'task-toggle': { const t=state.tasks.find(x=>x.id===id); if(t){t.done=!t.done; commit();} break; }
    case 'task-open': { const t=state.tasks.find(x=>x.id===id); if(t) taskModal(t); break; }
    case 'task-new': taskModal(null); break;
    case 'task-delete': confirmDelete('¿Eliminar esta tarea?','La tarea y su recordatorio asociado se quitan de la app.',()=>{ state.tasks=state.tasks.filter(x=>x.id!==a.dataset.id); closeModal(); commit(); }); break;
    case 'task-filter': ui.taskFilter=a.dataset.f; render(); break;

    case 'cal-prev': { let m=ui.calM-1,y=ui.calY; if(m<0){m=11;y--;} ui.calM=m;ui.calY=y; render(); break; }
    case 'cal-next': { let m=ui.calM+1,y=ui.calY; if(m>11){m=0;y++;} ui.calM=m;ui.calY=y; render(); break; }
    case 'cal-day': ui.calSel=a.dataset.d; render(); break;
    case 'reminder-new': reminderModal(null); break;
    case 'reminder-open': { const r=state.reminders.find(x=>x.id===id); if(r) reminderModal(r); break; }
    case 'reminder-delete': confirmDelete('¿Eliminar este recordatorio?','Se quita del calendario. Si es anual, deja de repetirse.',()=>{ state.reminders=state.reminders.filter(x=>x.id!==a.dataset.id); closeModal(); commit(); }); break;

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
