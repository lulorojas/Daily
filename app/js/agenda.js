"use strict";
/* ----------------------------- AGENDA (formularios de ítems) -----------------------------
   Tareas no tienen vista propia: viven en Hoy (sin fecha + del día) y en Calendario (con fecha).
   Acá quedan los dos formularios que las crean/editan. Tarea = ámbar, cita = coral. */

/* ---- tarea (sin fecha / con fecha + hora opcional) ---- */
function taskModal(task,defDate){
  const editing=!!task, ACC=C.amber;
  const t=task||{title:'',desc:'',time:null,date:defDate===undefined?todayISO():defDate,done:false};
  let selDate = t.date || null;
  const tdp = dpState(selDate);
  const whenKey = ()=> selDate===null?'sin':(selDate===todayISO()?'hoy':(selDate===tomorrowISO()?'manana':'otra'));
  let hasTime = !!t.time;
  const tref = { value: t.time||'08:00' };
  const body=`
    <div class="fld"><div class="flabel">Título</div>
      <input class="inp" id="t-title" placeholder="¿Qué tenés que hacer?" value="${esc(t.title)}"></div>
    <div class="fld"><div class="flabel">Cuándo</div>
      <div class="chips" id="t-when">
        ${[['hoy','Hoy'],['manana','Mañana'],['sin','Sin fecha']].map(([k,lb])=>{const on=whenKey()===k;return `<span class="chip ${on?'on':''}" style="${on?'background:'+ACC:''}" data-pick="when" data-v="${k}">${lb}</span>`;}).join('')}
        <span class="chip ${whenKey()==='otra'?'on':''}" id="t-otra" style="${whenKey()==='otra'?'background:'+ACC:''}" data-pick="when" data-v="otra">${whenKey()==='otra'?shortDate(selDate):'Otra fecha'}</span>
      </div>
      <div class="dpick ${whenKey()==='otra'?'open':''}" id="t-dpop"><div class="dpick-inner" id="t-dcal">${dpGrid('t',ACC,tdp)}</div></div></div>
    <div class="fld"><div class="flabel">Hora <span class="opt">· opcional</span></div>
      ${timeField('t',ACC,tref.value,hasTime)}</div>
    <div class="fld"><div class="flabel">Descripción <span class="opt">· opcional</span></div>
      <textarea class="inp" id="t-desc" placeholder="Agregar descripción">${esc(t.desc||'')}</textarea></div>
    ${editing?`<div class="delbtn" data-act="item-delete" data-id="${t.id}">Eliminar tarea</div>`:''}`;
  openModal(editing?'Editar tarea':'Nueva tarea',body,ACC,()=>{
    const title=mq('#t-title').value.trim();
    if(!validateForm([['#t-title', !!title, 'Poné un título para la tarea.']])) return;
    const date = selDate, time = hasTime?tref.value:null, desc = mq('#t-desc').value.trim();
    if(editing){ Object.assign(itemById(t.id),{title,date,time,desc}); }
    else state.items.push({id:uid(),kind:'tarea',title,desc,date,time,done:false});
    if(date) focusDate(date);
    closeModal(); commit();
  });
  function refreshWhen(){
    const q=whenKey();
    overlay.querySelectorAll('#t-when .chip').forEach(c=>{const on=c.dataset.v===q;c.classList.toggle('on',on);c.style.background=on?ACC:'';});
    const otra=mq('#t-otra'); if(otra) otra.textContent=q==='otra'?shortDate(selDate):'Otra fecha';
  }
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk||pk.dataset.pick!=='when') return;
    const v=pk.dataset.v, pop=mq('#t-dpop');
    if(v==='otra'){ if(pop) pop.classList.toggle('open'); return; }
    selDate = v==='hoy'?todayISO():(v==='manana'?tomorrowISO():null);
    tdp.sel=selDate;
    if(selDate){ const d=parseISO(selDate); tdp.y=d.getFullYear(); tdp.m=d.getMonth(); }
    const cal=mq('#t-dcal'); if(cal) cal.innerHTML=dpGrid('t',ACC,tdp);
    if(pop) pop.classList.remove('open');
    refreshWhen();
  });
  onOverlay('click', wireDatePicker('t',ACC,tdp,()=>{ selDate=tdp.sel; refreshWhen(); }));
  onOverlay('click', wireTimePicker('t',ACC,()=>tref,v=>hasTime=v,()=>hasTime));
}

/* ---- cita / anual recurrente ---- */
function eventModal(item,defDate){
  const editing=!!item, ACC=C.coral;
  const r=item||{kind:'cita',title:'',date:defDate||ui.calSel||todayISO(),time:null,desc:''};
  let kind=r.kind, hasTime=!!r.time; const tref={ value:r.time||'09:00' };
  const rdp=dpState(r.date);
  const note=()=>kind==='anual'?'Se repite cada año en esta fecha (cumpleaños, feriados).':'Ocurre una sola vez en la fecha elegida.';
  const seg=(k,lb,ic)=>`<div class="rtype" data-pick="kind" data-v="${k}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;font-weight:600;font-size:14px;${kind===k?'background:'+ACC+';color:#0A0C11':'color:rgba(242,244,248,.6)'}">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg>${lb}</div>`;
  const body=`
    <div class="fld"><div class="flabel">Tipo</div>
      <div style="display:flex;gap:6px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:16px;padding:5px" id="r-kind">
        ${seg('cita','Cita','M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z')}
        ${seg('anual','Anual','M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z')}
      </div>
      <div style="font-size:12.5px;color:rgba(242,244,248,.4);margin:9px 4px 0" id="r-note">${note()}</div></div>
    <div class="fld"><div class="flabel">Título</div><input class="inp" id="r-title" placeholder="Nombre de la cita" value="${esc(r.title)}"></div>
    <div class="fld"><div class="flabel">Fecha</div>${dateField('r',ACC,rdp)}</div>
    <div class="fld"><div class="flabel">Hora <span class="opt">· opcional</span></div>${timeField('r',ACC,tref.value,hasTime)}</div>
    <div class="fld"><div class="flabel">Descripción <span class="opt">· opcional</span></div>
      <textarea class="inp" id="r-desc" placeholder="Agregar descripción">${esc(r.desc||'')}</textarea></div>
    ${editing?`<div class="delbtn" data-act="item-delete" data-id="${r.id}">Eliminar</div>`:''}`;
  openModal(editing?'Editar cita':'Nueva cita',body,ACC,()=>{
    const title=mq('#r-title').value.trim();
    if(!validateForm([
      ['#r-title', !!title, kind==='anual'?'Poné un título para la fecha anual.':'Poné un título para la cita.'],
      ['#r-drow',  !!rdp.sel, 'Elegí una fecha.'],
    ])) return;
    const date=rdp.sel, time=hasTime?tref.value:null, desc=mq('#r-desc').value.trim();
    if(editing){ const o=itemById(r.id); Object.assign(o,{kind,title,date,time,desc}); delete o.done; }
    else state.items.push({id:uid(),kind,title,desc,date,time});
    focusDate(date);
    closeModal(); commit();
  });
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk||pk.dataset.pick!=='kind') return;
    kind=pk.dataset.v;
    overlay.querySelectorAll('.rtype').forEach(el=>{const on=el.dataset.v===kind;el.style.background=on?ACC:'';el.style.color=on?'#0A0C11':'rgba(242,244,248,.6)';});
    mq('#r-note').textContent=note();
  });
  onOverlay('click', wireDatePicker('r',ACC,rdp));
  onOverlay('click', wireTimePicker('r',ACC,()=>tref,v=>hasTime=v,()=>hasTime));
}

// Deja el calendario (y el día de Hoy) parados sobre la fecha que se acaba de tocar.
function focusDate(dISO){
  ui.calSel=dISO; const d=parseISO(dISO); ui.calY=d.getFullYear(); ui.calM=d.getMonth();
  if(ui.tab==='hoy') ui.daySel=dISO;
}

/* ---- menú del botón + (carga rápida) ---- */
function quickAddMenu(){
  const opts=[
    ['task','Nueva tarea','Con fecha y hora opcionales',C.amber,'M4.5 12.5 9 17l10.5-11'],
    ['event','Nueva cita','Va al calendario',C.coral,'M7.5 3v4M16.5 3v4M3.4 10.5h17.2M6.5 5h11a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 17.5 21h-11A3.5 3.5 0 0 1 3 17.5v-9A3.5 3.5 0 0 1 6.5 5Z'],
    ['habit','Nuevo hábito','Ícono, color y veces por día',C.green,'M12 3.4c3.1 3.7 5.1 6.3 5.1 8.8a5.1 5.1 0 0 1-10.2 0c0-2.5 2-5.1 5.1-8.8Z'],
    ['body','Registrar peso','Peso corporal de hoy',C.rose,'M4 20V9M20 20V9M4 14.5h16M12 4.5v15'],
  ];
  const body=`<div style="display:flex;flex-direction:column;gap:10px">`+opts.map(([k,lb,sub,col,ic])=>
    `<div class="evrow" style="background:var(--surf);border:1px solid var(--line)" data-act="quick-${k}">
      <div class="evic" style="width:42px;height:42px;background:${tint(col,'24')};color:${col}"><svg viewBox="0 0 24 24" style="width:21px;height:21px" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg></div>
      <div style="flex:1;min-width:0"><div class="evname" style="font-size:15.5px">${lb}</div><div class="evsub">${sub}</div></div>
    </div>`).join('')+`</div>`;
  openModal('Agregar',body,null,null);
}
