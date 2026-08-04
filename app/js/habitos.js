"use strict";
/* ----------------------------- HABITOS -----------------------------
   Multi-check: cada hábito tiene timesPerDay (default 1) y habitLog guarda la cantidad de
   marcas por día (entero). Un día "cuenta" para la racha si está completo (marcas>=timesPerDay). */

// Marcas de un hábito ese día (entero; legacy true -> 1).
function habitMarks(id,dISO){ const day=state.habitLog[dISO]; if(!day) return 0; const v=day[id]; return v===true?1:(Number(v)||0); }
function habitTPD(hb){ return hb.timesPerDay||1; }
// "Completo": llegó a todas las marcas del día.
function habitDone(id,dISO){ const hb=state.habits.find(x=>x.id===id); if(!hb) return false; return habitMarks(id,dISO)>=habitTPD(hb); }
// Marcas hechas / posibles ese día (sobre los hábitos que existen hoy).
function habitDayMarks(dISO){ return state.habits.reduce((a,h)=>a+Math.min(habitMarks(h.id,dISO),habitTPD(h)),0); }
function habitDayPossible(){ return state.habits.reduce((a,h)=>a+habitTPD(h),0); }
// Cuántos hábitos quedaron completos ese día.
function habitDoneCount(dISO){ return state.habits.filter(h=>habitDone(h.id,dISO)).length; }
// Primer día con alguna marca, o null.
function habitFirstISO(){
  const ds=Object.keys(state.habitLog).filter(d=>{ const day=state.habitLog[d]; return day && Object.keys(day).length; }).sort();
  return ds.length?ds[0]:null;
}
function habitStreak(id,refISO){
  let cur=refISO?parseISO(refISO):todayD();
  if(!habitDone(id,iso(cur))) cur=addDays(cur,-1);
  let n=0; while(habitDone(id,iso(cur))){ n++; cur=addDays(cur,-1); }
  return n;
}
// Racha más larga que llegó a tener el hábito (días completos consecutivos).
function habitBestStreak(id){
  const hb=state.habits.find(x=>x.id===id); if(!hb) return 0;
  const days=Object.keys(state.habitLog).filter(d=>habitDone(id,d)).sort();
  let best=0, run=0, prev=null;
  days.forEach(d=>{ run=(prev && iso(addDays(parseISO(prev),1))===d)?run+1:1; if(run>best)best=run; prev=d; });
  return best;
}

// Fila de slots (checks) de un hábito para un día. editable=false para días futuros.
function habitSlots(hb,dISO,editable){
  const marks=habitMarks(hb.id,dISO), tpd=habitTPD(hb);
  let s='';
  for(let i=0;i<tpd;i++){
    const on=i<marks;
    const act=editable?`data-act="habit-toggle" data-id="${hb.id}" data-date="${dISO}" data-slot="${i}"`:'';
    s+=`<div class="slot ${on?'on':''}" style="color:${hb.color};${on?`background:${hb.color};border-color:${hb.color}`:''};${editable?'':'opacity:.45'}" ${act}>
      <div class="ring"></div>
      <svg viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="display:${on?'block':'none'}"><path class="tk" d="M5 12.5 10 17.5 19 7"/></svg>
    </div>`;
  }
  return s;
}
// Fila completa de un hábito (usada en Hábitos y en Hoy). menu=true muestra el ⋯.
function habitRow(hb,dISO,editable,menu){
  const st=habitStreak(hb.id,dISO);
  const meta = st>0 ? 'Racha de '+st+(st===1?' día':' días') : (hb.detail||'Sin racha activa');
  const open=ui.habMenu===hb.id;
  return `<div class="habrow">
    <div class="iconwrap" style="width:38px;height:38px;background:${tint(hb.color,'24')}">${iconSvg(hb,20)}</div>
    <div style="flex:1;min-width:0" ${menu?'':`data-act="habit-open" data-id="${hb.id}"`}>
      <div class="habname">${esc(hb.name)}</div>
      <div class="habmeta" style="display:flex;align-items:center;gap:6px">
        ${st>0?flame(hb.color,12):''}<span>${esc(meta)}</span></div>
    </div>
    <div class="slots">${habitSlots(hb,dISO,editable)}
      ${menu?`<div class="hmenubtn" data-act="habit-menu" data-id="${hb.id}" data-stop="1">&#8943;</div>`:''}</div>
    ${menu&&open?`<div class="hmenu">
      <div data-act="habit-open" data-id="${hb.id}">Editar hábito</div>
      <div style="color:${C.danger}" data-act="habit-delete" data-id="${hb.id}">Eliminar</div></div>`:''}
  </div>`;
}

function habWeekStrip(dISO){
  const sel=parseISO(dISO), tISO=todayISO(), mon=mondayOf(sel), col=C.green;
  const arrow=dir=>`<div class="nb" data-act="habit-wk-${dir}"><svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${dir==='prev'?'M10 2L2 10l8 8':'M2 2l8 8-8 8'}"/></svg></div>`;
  const days=Array.from({length:7},(_,i)=>{
    const dd=addDays(mon,i), di=iso(dd), isSel=di===dISO, isToday=di===tISO, past=di<tISO;
    const done=state.habits.length && habitDoneCount(di)>0;
    let ring='rgba(255,255,255,.07)', inner=C.bg, fg='rgba(242,244,248,.45)';
    if(isSel){ ring=col; inner=col; fg='#0A0C11'; }
    else if(past){ ring=tint(col,'47'); fg='rgba(242,244,248,.75)'; }
    return `<div class="wcell" data-act="habit-day" data-d="${di}">
      <div class="wdow" style="${isSel||isToday?'color:'+col:''}">${DOW_SHORT[i][0]}</div>
      <div class="wring" style="background:${ring}"><div class="wcirc" style="background:${inner};color:${fg}">${dd.getDate()}</div></div>
      <div class="wdot" style="background:${done?col:'transparent'}"></div></div>`;
  }).join('');
  return `<div class="weekstrip">${arrow('prev')}<div class="wdays">${days}</div>${arrow('next')}</div>`;
}

function viewHabitos(){
  const dISO=ui.habitDate, d=parseISO(dISO), isToday=dISO===todayISO(), isFuture=dISO>todayISO();
  const total=state.habits.length;
  const marks=habitDayMarks(dISO), poss=habitDayPossible();
  const sub= total? (isToday?marks+' de '+poss+' marcados hoy':'Día '+d.getDate()+' · '+marks+' de '+poss) : 'Nada que marcar todavía';
  let best=0,bestName='';
  state.habits.forEach(h=>{const s=habitBestStreak(h.id);if(s>best){best=s;bestName=h.name;}});

  let h=`<div class="view"><div class="head"><div class="htop">
    <div><h1>Hábitos</h1><div class="sub">${sub}</div></div>
    <div style="height:38px;padding:0 14px;border-radius:14px;background:${tint(C.green,'28')};color:${C.green};display:grid;place-items:center;font-size:13px;font-weight:600;cursor:pointer;flex:none" data-act="habit-new">Nuevo</div>
  </div></div><div class="body">`;

  h+=habWeekStrip(dISO);

  if(best>0){
    h+=`<div style="border-radius:26px;background:linear-gradient(150deg,${tint(C.green,'38')},${tint(C.green,'0F')});border:1px solid ${tint(C.green,'3D')};padding:20px;display:flex;align-items:center;gap:16px">
      <div style="width:56px;height:56px;flex:none;border-radius:20px;background:rgba(10,12,17,.32);display:grid;place-items:center">${flame(C.green,28)}</div>
      <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:rgba(242,244,248,.5)">Mejor racha</div>
        <div style="display:flex;align-items:baseline;gap:7px"><span class="fr" style="font-weight:800;font-size:34px;line-height:1;letter-spacing:-1.2px">${best}</span>
          <span style="font-size:14px;color:rgba(242,244,248,.6)">días · ${esc(bestName)}</span></div></div></div>`;
  }

  h+=`<div class="sect"><div class="sectlabel">Mis hábitos <span class="muted">· ${isToday?'hoy':(isFuture?'a futuro':'retroactivo')}</span></div>`;
  if(total){
    h+=state.habits.map(hb=>habitRow(hb,dISO,!isFuture,true)).join('');
    h+=`<div class="dashed" data-act="habit-new" style="margin-top:2px">+ Nuevo hábito</div>`;
  } else {
    h+=`<div class="card" style="padding:26px 18px"><div class="empty">Todavía no hay hábitos.<br>Creá el primero con el botón Nuevo.</div></div>`;
  }
  h+=`</div>`;
  return h+`</div></div>`;
}

/* ---- habit modal ---- */
function habitModal(hab){
  const editing=!!hab;
  const h=hab||{name:'',detail:'',color:PALETTE[state.habits.length%PALETTE.length],icon:'estrella',timesPerDay:1};
  let color=h.color, icon=h.icon, tpd=h.timesPerDay||1;
  const body=`
    <div class="fld"><div class="flabel">NOMBRE</div><input class="inp" id="h-name" placeholder="Nombre del hábito" value="${esc(h.name)}"></div>
    <div class="fld"><div class="flabel">DESCRIPCIÓN <span class="opt">· opcional</span></div><input class="inp" id="h-detail" placeholder="Ej: 8 vasos al día" value="${esc(h.detail||'')}"></div>
    <div class="fld"><div class="flabel">ÍCONO</div><div class="iconpick" id="h-icons">
      ${ICON_KEYS.map(k=>`<div class="ibtn" data-pick="icon" data-v="${k}" style="background:${tint(color,'24')};${icon===k?'border-color:'+color:''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="${color}"><path d="${ICONS[k]}"/></svg></div>`).join('')}
    </div></div>
    <div class="fld"><div class="flabel">COLOR</div><div class="colordots" id="h-colors">
      ${PALETTE.map(c=>`<div class="cdot" data-pick="color" data-v="${c}" style="background:${c};${color===c?'box-shadow:0 0 0 3.5px '+tint(c,'73'):''}">${color===c?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':''}</div>`).join('')}
    </div></div>
    <div class="fld"><div class="flabel">VECES POR DÍA <span class="opt">· cuántos checks tiene</span></div>
      <div class="chips" id="h-tpd">${[1,2,3,4].map(n=>`<span class="chip ${tpd===n?'on':''}" style="${tpd===n?'background:'+color:''}" data-pick="tpd" data-v="${n}">${n}</span>`).join('')}</div></div>
    ${editing?`<div class="delbtn" data-act="habit-delete" data-id="${h.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.danger}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar hábito</div>`:''}`;
  openModal(editing?'Editar hábito':'Nuevo hábito',body,C.green,()=>{
    const name=mq('#h-name').value.trim();
    if(!validateForm([['#h-name', !!name, 'Poné un nombre para el hábito.']])) return;
    const detail=mq('#h-detail').value.trim();
    if(editing){ const o=state.habits.find(x=>x.id===h.id); Object.assign(o,{name,detail,color,icon,timesPerDay:tpd}); }
    else state.habits.push({id:uid(),name,detail,color,icon,timesPerDay:tpd});
    closeModal(); commit();
  });
  function refreshIcons(){ overlay.querySelectorAll('#h-icons .ibtn').forEach(el=>{ el.style.background=tint(color,'24'); el.style.borderColor=el.dataset.v===icon?color:'transparent'; el.querySelector('svg').setAttribute('fill',color); }); }
  function refreshTpd(){ overlay.querySelectorAll('#h-tpd .chip').forEach(el=>{ const on=+el.dataset.v===tpd; el.classList.toggle('on',on); el.style.background=on?color:''; }); }
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk) return;
    if(pk.dataset.pick==='icon'){ icon=pk.dataset.v; refreshIcons(); }
    if(pk.dataset.pick==='tpd'){ tpd=+pk.dataset.v; refreshTpd(); }
    if(pk.dataset.pick==='color'){ color=pk.dataset.v; overlay.querySelectorAll('#h-colors .cdot').forEach(el=>{const on=el.dataset.v===color;el.style.boxShadow=on?'0 0 0 3.5px '+tint(color,'73'):'';el.innerHTML=on?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':'';}); refreshIcons(); refreshTpd(); }
  });
}
