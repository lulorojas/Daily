"use strict";
/* ----------------------------- HABITOS ----------------------------- */
function habitDone(id,dISO){ return !!(state.habitLog[dISO] && state.habitLog[dISO][id]); }
function habitStreak(id,refISO){
  let cur=refISO?parseISO(refISO):todayD();
  if(!habitDone(id,iso(cur))) cur=addDays(cur,-1);
  let n=0; while(habitDone(id,iso(cur))){ n++; cur=addDays(cur,-1); }
  return n;
}
// Cuántos hábitos se marcaron ese día. Solo cuenta los hábitos que existen hoy: habitLog
// puede conservar marcas de hábitos ya borrados.
function habitDoneCount(dISO){
  const day=state.habitLog[dISO];
  return day ? state.habits.filter(h=>day[h.id]).length : 0;
}
// Primer día con alguna marca, o null. Sirve para acotar rangos en Progreso.
function habitFirstISO(){
  const ds=Object.keys(state.habitLog).filter(d=>habitDoneCount(d)>0).sort();
  return ds.length?ds[0]:null;
}
// Racha más larga que llegó a tener el hábito. Se calcula al vuelo recorriendo las marcas
// que ya están en habitLog: no se guarda nada nuevo.
function habitBestStreak(id){
  const days=Object.keys(state.habitLog).filter(d=>state.habitLog[d] && state.habitLog[d][id]).sort();
  let best=0, run=0, prev=null;
  days.forEach(d=>{
    run = (prev && iso(addDays(parseISO(prev),1))===d) ? run+1 : 1;
    if(run>best) best=run;
    prev=d;
  });
  return best;
}
function viewHabitos(){
  const dISO=ui.habitDate, d=parseISO(dISO), isToday=dISO===todayISO();
  const total=state.habits.length;
  const doneN=state.habits.filter(h=>habitDone(h.id,dISO)).length;
  const sub=(isToday?'Hoy · ':'')+doneN+' de '+total+(isToday?' completados':' hechos ese día');
  // best streak
  let best=0,bestName='';
  state.habits.forEach(h=>{const s=habitStreak(h.id);if(s>best){best=s;bestName=h.name;}});
  const dayLabel=(isToday?'Hoy':DOW_FULL[dow(d)])+' '+d.getDate()+' '+MONTHS[d.getMonth()].slice(0,3).toLowerCase();
  const atToday=dISO>=todayISO();

  let h=`<div class="view"><div class="head"><h1>Hábitos</h1><div class="sub">${sub}</div></div><div class="body" style="gap:14px">`;

  h+=`<div class="daynav">
    <div class="nb" data-act="habit-prev"><svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10l8 8"/></svg></div>
    <div style="display:flex;align-items:center;gap:8px">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C.purple}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
      <span class="fr" style="font-weight:600;font-size:15px">${dayLabel}</span>
      ${!isToday?`<span style="font-size:10px;font-weight:800;color:${C.purple};background:${tint(C.purple,'38')};padding:3px 9px;border-radius:99px">retroactivo</span>`:''}
    </div>
    <div class="nb ${atToday?'dis':''}" data-act="habit-next"><svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l8 8-8 8"/></svg></div>
  </div>`;

  if(best>0){
    h+=`<div class="card" style="padding:16px;display:flex;align-items:center;gap:15px">
      <div style="width:52px;height:52px;border-radius:16px;background:${tint(C.purple,'33')};display:flex;align-items:center;justify-content:center;flex-shrink:0">${flame(C.purple,28)}</div>
      <div style="flex:1"><div class="fr" style="font-weight:600;font-size:17px">${best} días de racha</div>
        <div style="font-size:12.5px;color:rgba(244,244,251,0.55);margin-top:2px">Tu mejor hábito es ${esc(bestName)}. ¡Seguí así!</div></div></div>`;
  }

  state.habits.forEach(hb=>{
    const on=habitDone(hb.id,dISO);
    const st=habitStreak(hb.id,dISO);
    // last 7 days ending at dISO
    let fill=0; const dots=[];
    for(let i=6;i>=0;i--){ const di=iso(addDays(d,-i)); const f=habitDone(hb.id,di); if(f)fill++; dots.push(`<div class="wd" style="background:${f?hb.color:'rgba(244,244,251,0.14)'}"></div>`); }
    h+=`<div class="habcard">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="iconwrap" style="width:46px;height:46px;border-radius:14px;background:${tint(hb.color,'24')}">${iconSvg(hb,24)}</div>
        <div style="flex:1;min-width:0" data-act="habit-open" data-id="${hb.id}">
          <div class="fr" style="font-weight:600;font-size:16px">${esc(hb.name)}</div>
          <div style="font-size:12.5px;color:rgba(244,244,251,0.5);margin-top:1px">${esc(hb.detail||'')}</div></div>
        <div class="check ${on?'on':''}" style="width:36px;height:36px;border-color:${on?hb.color:'rgba(244,244,251,0.28)'};background:${on?hb.color:'transparent'}" data-act="habit-toggle" data-id="${hb.id}" data-date="${dISO}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:15px">
        <div style="display:flex;align-items:center;gap:4px">${flame(hb.color,15)}<span class="fr" style="font-weight:600;font-size:13px;color:${hb.color}">${st} ${st===1?'día':'días'}</span></div>
        <div class="weekdots">${dots.join('')}</div></div>
      <div class="bartrack" style="margin-top:13px"><div style="height:100%;border-radius:99px;background:${hb.color};width:${Math.round(fill/7*100)}%"></div></div>
    </div>`;
  });

  h+=`<div class="dashed" style="padding:16px;border-radius:22px;border:1.5px dashed ${tint(C.purple,'80')};background:${tint(C.purple,'14')};color:${C.purple};font-size:15px" data-act="habit-new">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${C.purple}" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Agregar hábito</div>`;
  h+=`</div></div>`;
  return h;
}

/* ---- habit modal ---- */
function habitModal(hab){
  const editing=!!hab;
  const h=hab||{name:'',detail:'',color:PALETTE[state.habits.length%PALETTE.length],icon:'estrella'};
  let color=h.color, icon=h.icon;
  const body=`
    <div class="fld"><div class="flabel">NOMBRE</div><input class="inp" id="h-name" placeholder="Nombre del hábito" value="${esc(h.name)}"></div>
    <div class="fld"><div class="flabel">DESCRIPCIÓN <span class="opt">· opcional</span></div><input class="inp" id="h-detail" placeholder="Ej: 8 vasos al día" value="${esc(h.detail||'')}"></div>
    <div class="fld"><div class="flabel">ÍCONO</div><div class="iconpick" id="h-icons">
      ${ICON_KEYS.map(k=>`<div class="ibtn" data-pick="icon" data-v="${k}" style="background:${tint(color,'24')};${icon===k?'border-color:'+color:''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="${color}"><path d="${ICONS[k]}"/></svg></div>`).join('')}
    </div></div>
    <div class="fld"><div class="flabel">COLOR</div><div class="colordots" id="h-colors">
      ${PALETTE.map(c=>`<div class="cdot" data-pick="color" data-v="${c}" style="background:${c};${color===c?'box-shadow:0 0 0 3.5px '+tint(c,'73'):''}">${color===c?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':''}</div>`).join('')}
    </div></div>
    ${editing?`<div class="delbtn" data-act="habit-delete" data-id="${h.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar hábito</div>`:''}`;
  openModal(editing?'Editar hábito':'Nuevo hábito',body,C.purple,()=>{
    const name=mq('#h-name').value.trim();
    if(!validateForm([['#h-name', !!name, 'Poné un nombre para el hábito.']])) return;
    const detail=mq('#h-detail').value.trim();
    if(editing){ const o=state.habits.find(x=>x.id===h.id); Object.assign(o,{name,detail,color,icon}); }
    else state.habits.push({id:uid(),name,detail,color,icon});
    closeModal(); commit();
  });
  function refreshIcons(){ overlay.querySelectorAll('#h-icons .ibtn').forEach(el=>{ el.style.background=tint(color,'24'); el.style.borderColor=el.dataset.v===icon?color:'transparent'; el.querySelector('path').setAttribute('fill',''); el.querySelector('svg').setAttribute('fill',color); }); }
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk) return;
    if(pk.dataset.pick==='icon'){ icon=pk.dataset.v; refreshIcons(); }
    if(pk.dataset.pick==='color'){ color=pk.dataset.v; overlay.querySelectorAll('#h-colors .cdot').forEach(el=>{const on=el.dataset.v===color;el.style.boxShadow=on?'0 0 0 3.5px '+tint(color,'73'):'';el.innerHTML=on?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':'';}); refreshIcons(); }
  });
}

