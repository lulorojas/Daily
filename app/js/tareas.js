"use strict";
/* ----------------------------- TAREAS ----------------------------- */
function viewTareas(){
  if(!ui.taskFilter) ui.taskFilter='todas';
  const pend=state.tasks.filter(t=>!t.done).length, comp=state.tasks.filter(t=>t.done).length;
  const filt=ui.taskFilter;
  let h=`<div class="view"><div class="head"><h1>Tareas</h1>
    <div class="sub">${pend} pendientes · ${comp} completadas</div>
    <div class="chips" style="margin-top:16px">
      ${['todas','hoy','sin'].map(f=>{const lb={todas:'Todas',hoy:'Hoy',sin:'Sin fecha'}[f];const on=filt===f;return `<span class="chip ${on?'on':''}" style="${on?'background:'+C.blue:''}" data-act="task-filter" data-f="${f}">${lb}</span>`;}).join('')}
    </div></div><div class="body">`;

  const tISO=todayISO(), tmw=tomorrowISO();
  const groups=[];
  if(filt==='todas'||filt==='hoy') groups.push(['HOY', state.tasks.filter(t=>t.date && t.date<=tISO), false]);
  if(filt==='todas'){
    groups.push(['MAÑANA', state.tasks.filter(t=>t.date===tmw), false]);
    groups.push(['PRÓXIMAS', state.tasks.filter(t=>t.date && t.date>tmw).sort((a,b)=>a.date<b.date?-1:1), true]);
  }
  if(filt==='todas'||filt==='sin') groups.push(['SIN FECHA', state.tasks.filter(t=>!t.date), false]);

  let any=false;
  groups.forEach(([label,items,showDate])=>{
    if(!items.length) return; any=true;
    h+=`<div><div class="sectlabel">${label}</div><div class="card pad">`+items.map(t=>taskRow(t,C.blue,showDate)).join('')+`</div></div>`;
  });
  if(!any) h+=`<div class="empty">No hay tareas en esta vista.<br>Tocá el botón + para crear una.</div>`;
  h+=`</div></div>`;
  h+=`<div class="fab" style="background:${C.blue};box-shadow:0 14px 30px rgba(77,150,255,0.45)" data-act="task-new"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>`;
  return h;
}

/* ---- task modal ---- */
function taskModal(task){
  const editing=!!task;
  const t=task||{text:'',desc:'',time:null,date:todayISO(),done:false};
  let selDate = t.date || null;
  const tdp = dpState(selDate);
  const whenKey = ()=> selDate===null?'sin':(selDate===todayISO()?'hoy':(selDate===tomorrowISO()?'manana':'otra'));
  let hasTime = !!t.time;
  const tref = { value: t.time||'08:00' };
  const body=`
    <div class="fld"><div class="flabel">TÍTULO</div>
      <input class="inp" id="t-title" placeholder="¿Qué tenés que hacer?" value="${esc(t.text)}"></div>
    <div class="fld"><div class="flabel">CUÁNDO</div>
      <div class="chips" id="t-when">
        ${[['hoy','Hoy'],['manana','Mañana'],['sin','Sin fecha']].map(([k,lb])=>{const on=whenKey()===k;return `<span class="chip ${on?'on':''}" style="${on?'background:'+C.blue:''}" data-pick="when" data-v="${k}">${lb}</span>`;}).join('')}
        <span class="chip ${whenKey()==='otra'?'on':''}" id="t-otra" style="${whenKey()==='otra'?'background:'+C.blue:''}" data-pick="when" data-v="otra">${whenKey()==='otra'?shortDate(selDate):'Otra fecha'}</span>
      </div>
      <div class="dpick ${whenKey()==='otra'?'open':''}" id="t-dpop"><div class="dpick-inner" id="t-dcal">${dpGrid('t',C.blue,tdp)}</div></div></div>
    <div class="fld"><div class="flabel">HORA <span class="opt">· opcional</span></div>
      ${timeField('t',C.blue,tref.value,hasTime)}</div>
    <div class="fld"><div class="flabel">DESCRIPCIÓN <span class="opt">· opcional</span></div>
      <textarea class="inp" id="t-desc" placeholder="Agregar descripción">${esc(t.desc||'')}</textarea></div>
    ${editing?`<div class="delbtn" data-act="task-delete" data-id="${t.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar tarea</div>`:''}`;
  openModal(editing?'Editar tarea':'Nueva tarea',body,C.blue,()=>{
    const text=mq('#t-title').value.trim(); if(!text){ mq('#t-title').focus(); return; }
    const date = selDate;
    const time = hasTime?tref.value:null;
    const desc = mq('#t-desc').value.trim();
    if(editing){ const o=state.tasks.find(x=>x.id===t.id); Object.assign(o,{text,date,time,desc}); }
    else state.tasks.push({id:uid(),text,date,time,desc,done:false});
    closeModal(); commit();
  });
  // local interactions
  function refreshWhen(){
    const q=whenKey();
    overlay.querySelectorAll('#t-when .chip').forEach(c=>{const on=c.dataset.v===q;c.classList.toggle('on',on);c.style.background=on?C.blue:'';});
    const otra=mq('#t-otra'); if(otra) otra.textContent=q==='otra'?shortDate(selDate):'Otra fecha';
  }
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk||pk.dataset.pick!=='when') return;
    const v=pk.dataset.v, pop=mq('#t-dpop');
    if(v==='otra'){ if(pop) pop.classList.toggle('open'); return; }
    selDate = v==='hoy'?todayISO():(v==='manana'?tomorrowISO():null);
    tdp.sel=selDate;
    if(selDate){ const d=parseISO(selDate); tdp.y=d.getFullYear(); tdp.m=d.getMonth(); }
    const cal=mq('#t-dcal'); if(cal) cal.innerHTML=dpGrid('t',C.blue,tdp);
    if(pop) pop.classList.remove('open');
    refreshWhen();
  });
  onOverlay('click', wireDatePicker('t',C.blue,tdp,()=>{ selDate=tdp.sel; refreshWhen(); }));
  onOverlay('click', wireTimePicker('t',C.blue,()=>tref,v=>hasTime=v,()=>hasTime));
}

