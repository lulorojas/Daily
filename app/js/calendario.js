"use strict";
/* ----------------------------- CALENDARIO ----------------------------- */
function viewCalendario(){
  const y=ui.calY, m=ui.calM;
  const first=new Date(y,m,1);
  const lead=dow(first);
  const days=new Date(y,m+1,0).getDate();
  const tISO=todayISO();

  let cells='';
  for(let i=0;i<lead;i++) cells+=`<div class="cell"></div>`;
  for(let d=1;d<=days;d++){
    const dISO=iso(new Date(y,m,d));
    const ev=eventsForISO(dISO);
    const isSel=dISO===ui.calSel, isToday=dISO===tISO;
    let style='color:#F4F4FB;font-weight:500';
    if(isSel) style=`background:${C.green};color:#0E0F22;font-weight:700`;
    else if(isToday) style=`border:1.6px solid ${C.green};color:${C.green};font-weight:700`;
    const dots=ev.slice(0,3).map(e=>{
      const col=isSel?'rgba(14,15,34,0.6)':(e.kind==='anual'?C.yellow:C.green);
      return e.kind==='anual'
        ? `<div style="width:6px;height:6px;border-radius:50%;background:transparent;border:1.5px solid ${col};box-sizing:border-box"></div>`
        : `<div style="width:5px;height:5px;border-radius:50%;background:${col}"></div>`;
    }).join('');
    cells+=`<div class="cell"><div class="daynum" style="${style}" data-act="cal-day" data-d="${dISO}">${d}</div><div class="dots">${dots}</div></div>`;
  }

  let h=`<div class="view"><div class="cal-head">
    <div class="fr" style="font-size:31px;font-weight:600;line-height:1.05">${MONTHS[m]} <span style="color:rgba(244,244,251,0.4);font-weight:500">${y}</span></div>
    <div style="display:flex;gap:8px">
      <div class="navbtn" data-act="cal-prev"><svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10l8 8"/></svg></div>
      <div class="navbtn" data-act="cal-next"><svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l8 8-8 8"/></svg></div>
    </div></div>
    <div class="body" style="gap:18px">
    <div class="card" style="padding:14px 12px 16px">
      <div class="cal-grid" style="margin-bottom:6px">${DOW_MINI.map(d=>`<div class="dow">${d}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    </div>
    <div class="legend" style="margin-top:-4px">
      <div class="li"><span style="width:9px;height:9px;border-radius:50%;background:${C.green}"></span>Recordatorio puntual</div>
      <div class="li"><span style="width:9px;height:9px;border-radius:50%;background:transparent;border:2px solid ${C.yellow};box-sizing:border-box"></span>Anual</div>
    </div>`;

  const sel=parseISO(ui.calSel);
  const selLabel=(DOW_FULL[dow(sel)]+' '+sel.getDate()+' DE '+MONTHS[sel.getMonth()]).toUpperCase();
  const events=eventsForISO(ui.calSel);
  h+=`<div><div style="display:flex;align-items:baseline;gap:8px;margin:0 2px 11px">
    <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">RECORDATORIOS</span>
    <span style="font-size:12px;font-weight:700;color:rgba(244,244,251,0.35)">${selLabel}</span></div>`;
  if(events.length){
    h+=`<div style="display:flex;flex-direction:column;gap:10px">`+events.map(e=>{
      const annual=e.kind==='anual', col=annual?C.yellow:C.green;
      const timeText=e.time?e.time+' hs':(annual?'Se repite cada año':'Todo el día');
      const mark=annual
        ? `<div style="width:12px;height:12px;border-radius:50%;background:transparent;border:2.5px solid ${col};box-sizing:border-box;flex-shrink:0"></div>`
        : `<div style="width:12px;height:12px;border-radius:50%;background:${col};flex-shrink:0"></div>`;
      const badgeIcon=annual?'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z':'M5 4h14v16l-7-4-7 4z';
      const fromTask=e.ref==='task';
      return `<div class="softcard evt" data-act="${fromTask?'task-open':'reminder-open'}" data-id="${e.id}">
        ${mark}<div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:700">${esc(e.title)}</div>
        <span class="fr" style="font-weight:600;font-size:12.5px;color:rgba(244,244,251,0.5)">${timeText}${fromTask?' · desde Tareas':''}</span></div>
        <span class="badge" style="color:${col};background:${tint(col,'24')}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${badgeIcon}"/></svg>${annual?'Anual':'Puntual'}</span>
      </div>`;
    }).join('')+`</div>`;
  } else h+=`<div class="empty">Sin recordatorios para este día.</div>`;
  h+=`</div></div></div>`;
  h+=`<div class="fab" style="background:${C.green};box-shadow:0 14px 30px rgba(6,214,160,0.4)" data-act="reminder-new"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0E0F22" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>`;
  return h;
}

/* ---- reminder modal ---- */
function reminderModal(rem){
  const editing=!!rem;
  const r=rem||{type:'puntual',title:'',date:ui.calSel||todayISO(),time:null,desc:''};
  let type=r.type, hasTime=!!r.time; const tref={ value:r.time||'09:00' };
  const rdp=dpState(r.date);
  const typeNote=()=>type==='anual'?'Se repite cada año en esta fecha (cumpleaños, feriados).':'Aparece una sola vez en la fecha elegida.';
  const body=`
    <div class="fld"><div class="flabel">TIPO</div>
      <div style="display:flex;gap:6px;background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:5px" id="r-type">
        <div class="rtype" data-pick="type" data-v="puntual" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;${type==='puntual'?'background:'+C.green+';color:#0E0F22':'color:rgba(244,244,251,0.6)'}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z"/><circle cx="12" cy="11" r="1.5" fill="currentColor"/></svg>Puntual</div>
        <div class="rtype" data-pick="type" data-v="anual" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;${type==='anual'?'background:'+C.green+';color:#0E0F22':'color:rgba(244,244,251,0.6)'}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>Anual</div>
      </div>
      <div class="fld" style="margin-top:9px"><div style="font-size:12.5px;font-weight:600;color:rgba(244,244,251,0.4);margin:0 4px" id="r-note">${typeNote()}</div></div></div>
    <div class="fld"><div class="flabel">TÍTULO</div><input class="inp" id="r-title" placeholder="Nombre del recordatorio" value="${esc(r.title)}"></div>
    <div class="fld"><div class="flabel">FECHA</div>
      ${dateField('r',C.green,rdp)}</div>
    <div class="fld"><div class="flabel">HORA <span class="opt">· opcional</span></div>
      ${timeField('r',C.green,tref.value,hasTime)}</div>
    <div class="fld"><div class="flabel">DESCRIPCIÓN <span class="opt">· opcional</span></div>
      <textarea class="inp" id="r-desc" placeholder="Agregar descripción">${esc(r.desc||'')}</textarea></div>
    ${editing?`<div class="delbtn" data-act="reminder-delete" data-id="${r.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar recordatorio</div>`:''}`;
  openModal(editing?'Editar recordatorio':'Recordatorio',body,C.green,()=>{
    const title=mq('#r-title').value.trim(); if(!title){ mq('#r-title').focus(); return; }
    const date=rdp.sel||todayISO();
    const time=hasTime?tref.value:null;
    const desc=mq('#r-desc').value.trim();
    if(editing){ const o=state.reminders.find(x=>x.id===r.id); Object.assign(o,{type,title,date,time,desc}); }
    else state.reminders.push({id:uid(),type,title,date,time,desc});
    ui.calSel=date; const dd=parseISO(date); ui.calY=dd.getFullYear(); ui.calM=dd.getMonth();
    closeModal(); commit();
  });
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk) return;
    if(pk.dataset.pick==='type'){ type=pk.dataset.v; overlay.querySelectorAll('.rtype').forEach(el=>{const on=el.dataset.v===type;el.style.background=on?C.green:'';el.style.color=on?'#0E0F22':'rgba(244,244,251,0.6)';}); mq('#r-note').textContent=typeNote(); }
  });
  onOverlay('click', wireDatePicker('r',C.green,rdp));
  onOverlay('click', wireTimePicker('r',C.green,()=>tref,v=>hasTime=v,()=>hasTime));
}

