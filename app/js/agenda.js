"use strict";
/* ----------------------------- AGENDA (formularios de ítems) -----------------------------
   Tareas no tienen vista propia: viven en Hoy (sin fecha + del día) y en Calendario (con fecha).
   Acá quedan los dos formularios que las crean/editan, usados desde Hoy, Calendario y el botón +. */

/* ---- tarea (sin fecha / con fecha + hora opcional) ---- */
function taskModal(task,defDate){
  const editing=!!task;
  const t=task||{title:'',desc:'',time:null,date:defDate===undefined?todayISO():defDate,done:false};
  let selDate = t.date || null;
  const tdp = dpState(selDate);
  const whenKey = ()=> selDate===null?'sin':(selDate===todayISO()?'hoy':(selDate===tomorrowISO()?'manana':'otra'));
  let hasTime = !!t.time;
  const tref = { value: t.time||'08:00' };
  const body=`
    <div class="fld"><div class="flabel">TÍTULO</div>
      <input class="inp" id="t-title" placeholder="¿Qué tenés que hacer?" value="${esc(t.title)}"></div>
    <div class="fld"><div class="flabel">CUÁNDO</div>
      <div class="chips" id="t-when">
        ${[['hoy','Hoy'],['manana','Mañana'],['sin','Sin fecha']].map(([k,lb])=>{const on=whenKey()===k;return `<span class="chip ${on?'on':''}" style="${on?'background:'+C.coral:''}" data-pick="when" data-v="${k}">${lb}</span>`;}).join('')}
        <span class="chip ${whenKey()==='otra'?'on':''}" id="t-otra" style="${whenKey()==='otra'?'background:'+C.coral:''}" data-pick="when" data-v="otra">${whenKey()==='otra'?shortDate(selDate):'Otra fecha'}</span>
      </div>
      <div class="dpick ${whenKey()==='otra'?'open':''}" id="t-dpop"><div class="dpick-inner" id="t-dcal">${dpGrid('t',C.coral,tdp)}</div></div></div>
    <div class="fld"><div class="flabel">HORA <span class="opt">· opcional</span></div>
      ${timeField('t',C.coral,tref.value,hasTime)}</div>
    <div class="fld"><div class="flabel">DESCRIPCIÓN <span class="opt">· opcional</span></div>
      <textarea class="inp" id="t-desc" placeholder="Agregar descripción">${esc(t.desc||'')}</textarea></div>
    ${editing?`<div class="delbtn" data-act="item-delete" data-id="${t.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar tarea</div>`:''}`;
  openModal(editing?'Editar tarea':'Nueva tarea',body,C.coral,()=>{
    const title=mq('#t-title').value.trim();
    if(!validateForm([['#t-title', !!title, 'Poné un título para la tarea.']])) return;
    const date = selDate;
    const time = hasTime?tref.value:null;
    const desc = mq('#t-desc').value.trim();
    if(editing){ Object.assign(itemById(t.id),{title,date,time,desc}); }
    else state.items.push({id:uid(),kind:'tarea',title,desc,date,time,done:false});
    if(date) focusDate(date);
    closeModal(); commit();
  });
  function refreshWhen(){
    const q=whenKey();
    overlay.querySelectorAll('#t-when .chip').forEach(c=>{const on=c.dataset.v===q;c.classList.toggle('on',on);c.style.background=on?C.coral:'';});
    const otra=mq('#t-otra'); if(otra) otra.textContent=q==='otra'?shortDate(selDate):'Otra fecha';
  }
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk||pk.dataset.pick!=='when') return;
    const v=pk.dataset.v, pop=mq('#t-dpop');
    if(v==='otra'){ if(pop) pop.classList.toggle('open'); return; }
    selDate = v==='hoy'?todayISO():(v==='manana'?tomorrowISO():null);
    tdp.sel=selDate;
    if(selDate){ const d=parseISO(selDate); tdp.y=d.getFullYear(); tdp.m=d.getMonth(); }
    const cal=mq('#t-dcal'); if(cal) cal.innerHTML=dpGrid('t',C.coral,tdp);
    if(pop) pop.classList.remove('open');
    refreshWhen();
  });
  onOverlay('click', wireDatePicker('t',C.coral,tdp,()=>{ selDate=tdp.sel; refreshWhen(); }));
  onOverlay('click', wireTimePicker('t',C.coral,()=>tref,v=>hasTime=v,()=>hasTime));
}

/* ---- cita / anual recurrente (no tienen estado: ocurren, no se completan) ---- */
function eventModal(item,defDate){
  const editing=!!item;
  const r=item||{kind:'cita',title:'',date:defDate||ui.calSel||todayISO(),time:null,desc:''};
  let kind=r.kind, hasTime=!!r.time; const tref={ value:r.time||'09:00' };
  const rdp=dpState(r.date);
  const note=()=>kind==='anual'?'Se repite cada año en esta fecha (cumpleaños, feriados).':'Ocurre una sola vez en la fecha elegida.';
  const seg=(k,lb,ic)=>`<div class="rtype" data-pick="kind" data-v="${k}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;${kind===k?'background:'+C.green+';color:#0E0F22':'color:rgba(244,244,251,0.6)'}">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg>${lb}</div>`;
  const body=`
    <div class="fld"><div class="flabel">TIPO</div>
      <div style="display:flex;gap:6px;background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:5px" id="r-kind">
        ${seg('cita','Cita','M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z')}
        ${seg('anual','Anual','M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z')}
      </div>
      <div class="fld" style="margin-top:9px"><div style="font-size:12.5px;font-weight:600;color:rgba(244,244,251,0.4);margin:0 4px" id="r-note">${note()}</div></div></div>
    <div class="fld"><div class="flabel">TÍTULO</div><input class="inp" id="r-title" placeholder="Nombre de la cita" value="${esc(r.title)}"></div>
    <div class="fld"><div class="flabel">FECHA</div>
      ${dateField('r',C.green,rdp)}</div>
    <div class="fld"><div class="flabel">HORA <span class="opt">· opcional</span></div>
      ${timeField('r',C.green,tref.value,hasTime)}</div>
    <div class="fld"><div class="flabel">DESCRIPCIÓN <span class="opt">· opcional</span></div>
      <textarea class="inp" id="r-desc" placeholder="Agregar descripción">${esc(r.desc||'')}</textarea></div>
    ${editing?`<div class="delbtn" data-act="item-delete" data-id="${r.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar</div>`:''}`;
  openModal(editing?'Editar cita':'Nueva cita',body,C.green,()=>{
    const title=mq('#r-title').value.trim();
    // La cita sí necesita fecha: sin ella no tendría dónde ocurrir.
    if(!validateForm([
      ['#r-title', !!title, kind==='anual'?'Poné un título para la fecha anual.':'Poné un título para la cita.'],
      ['#r-drow',  !!rdp.sel, 'Elegí una fecha.'],
    ])) return;
    const date=rdp.sel;
    const time=hasTime?tref.value:null;
    const desc=mq('#r-desc').value.trim();
    if(editing){ const o=itemById(r.id); Object.assign(o,{kind,title,date,time,desc}); delete o.done; }
    else state.items.push({id:uid(),kind,title,desc,date,time});
    focusDate(date);
    closeModal(); commit();
  });
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk||pk.dataset.pick!=='kind') return;
    kind=pk.dataset.v;
    overlay.querySelectorAll('.rtype').forEach(el=>{const on=el.dataset.v===kind;el.style.background=on?C.green:'';el.style.color=on?'#0E0F22':'rgba(244,244,251,0.6)';});
    mq('#r-note').textContent=note();
  });
  onOverlay('click', wireDatePicker('r',C.green,rdp));
  onOverlay('click', wireTimePicker('r',C.green,()=>tref,v=>hasTime=v,()=>hasTime));
}

// Deja el calendario (y el día de Hoy) parados sobre la fecha que se acaba de tocar.
function focusDate(dISO){
  ui.calSel=dISO; const d=parseISO(dISO); ui.calY=d.getFullYear(); ui.calM=d.getMonth();
  if(ui.tab==='hoy') ui.daySel=dISO;
}

/* ---- menú del botón + (carga rápida) ---- */
function quickAddMenu(){
  const opts=[
    ['task','Nueva tarea',C.coral,'M9 6h11M9 12h11M9 18h11M4.5 6l1 1 1.8-2M4.5 12l1 1 1.8-2M4.5 18l1 1 1.8-2'],
    ['event','Nueva cita',C.green,'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4'],
    ['habit','Nuevo hábito',C.purple,'M12 3c.6 3.2 3 4.4 3 7.6a3 3 0 0 1-6 0c0-1 .4-1.9 1-2.6-1.3.4-3.2 1.7-3.2 4.7a5.2 5.2 0 0 0 10.4 0C17.2 8.2 14.2 5.6 12 3z'],
  ];
  const body=`<div style="display:flex;flex-direction:column;gap:10px">`+opts.map(([k,lb,col,ic])=>
    `<div class="softcard evt" data-act="quick-${k}">
      <div style="width:40px;height:40px;border-radius:13px;background:${tint(col,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg></div>
      <div class="fr" style="flex:1;font-weight:600;font-size:15.5px">${lb}</div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.35)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
    </div>`).join('')+`</div>`;
  openModal('Agregar',body,null,null);
}
