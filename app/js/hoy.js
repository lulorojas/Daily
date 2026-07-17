"use strict";
/* ----------------------------- HOY ----------------------------- */
// Vista de un día: la tira semanal elige qué día se ve (hoy por defecto).
// Ir a días pasados desde acá reemplaza la vieja navegación por flechas de Hábitos.

function weekStrip(dISO){
  const sel=parseISO(dISO), tISO=todayISO(), mon=mondayOf(sel);
  const arrow=dir=>`<div class="nb" data-act="week-${dir}"><svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${dir==='prev'?'M10 2L2 10l8 8':'M2 2l8 8-8 8'}"/></svg></div>`;
  const days=Array.from({length:7},(_,i)=>{
    const d=addDays(mon,i), di=iso(d), isSel=di===dISO, isToday=di===tISO;
    let style='background:rgba(255,255,255,0.05);color:rgba(244,244,251,0.75)';
    if(isSel) style=`background:${C.coral};color:#fff;font-weight:700`;
    else if(isToday) style=`border:1.6px solid ${C.coral};color:${C.coral};font-weight:700`;
    return `<div class="wcell" data-act="day-sel" data-d="${di}">
      <div class="wdow" style="${isSel||isToday?'color:'+C.coral:''}">${DOW_SHORT[i]}</div>
      <div class="wcirc" style="${style}">${d.getDate()}</div></div>`;
  }).join('');
  return `<div class="weekstrip">${arrow('prev')}<div class="wdays">${days}</div>${arrow('next')}</div>`;
}

function viewHoy(){
  const dISO=ui.daySel, d=parseISO(dISO), tISO=todayISO(), isToday=dISO===tISO, isFuture=dISO>tISO;
  const kicker=(DOW_FULL[dow(d)]+' '+d.getDate()+' DE '+MONTHS[d.getMonth()]).toUpperCase();

  // Solo lo cuya fecha es exactamente este día: una tarea vencida no se arrastra hasta acá,
  // se la ve navegando a su fecha original (o en el calendario, ese día).
  const tareas=tareasDe(dISO);
  const citas=agendaDe(dISO), entreno=entrenoDe(dISO), pend=pendientes();

  // Progreso del día: tareas de este día y hábitos de este día.
  const doneT=tareas.filter(x=>x.done).length;
  const doneH=state.habits.filter(h=>habitDone(h.id,dISO)).length;
  const done=doneT+doneH, total=tareas.length+state.habits.length;
  const pct=total?Math.round(done/total*100):0;
  const msg=!total?'No tenés nada agendado para este día.':pct>=100?'¡Completaste todo! Día redondo.':pct>=50?'¡Buen ritmo! Ya casi terminás.':'Arranquemos con lo primero.';

  const pendT=tareas.length-doneT, pendH=state.habits.length-doneH;
  const sub=isToday
    ? `Tenés ${pendT} ${pendT===1?'tarea':'tareas'} y ${pendH} ${pendH===1?'hábito':'hábitos'} para hoy.`
    : (isFuture?'Así viene este día.':'Podés marcar los hábitos de este día.');

  let h=`<div class="view"><div class="head">
    <div class="kicker" style="color:${C.coral}">${kicker}</div>
    <h1>${isToday?saludo():dayTitle(d)}</h1>
    <div class="sub">${sub}</div>
  </div><div class="body">`;

  h+=weekStrip(dISO);

  h+=`<div class="progress"><div class="row"><span class="t">Progreso del día</span><span class="c">${done} de ${total}</span></div>
    <div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="msg">${msg}</div></div>`;

  // tareas del día
  h+=`<div><div class="sectlabel">TAREAS</div>`;
  if(tareas.length){
    h+=`<div class="card pad">`+tareas.map(t=>taskRow(t,C.coral)).join('')+`</div>`;
  } else h+=`<div class="card pad"><div class="empty">Sin tareas para este día 🎉</div></div>`;
  h+=`</div>`;

  // citas + anuales del día
  if(citas.length){
    h+=`<div><div class="sectlabel">CITAS Y FECHAS</div><div style="display:flex;flex-direction:column;gap:10px">`
      +citas.map(eventRow).join('')+`</div></div>`;
  }

  // entreno del día (solo lectura por ahora)
  if(entreno){
    const col=typeColor(entreno.type);
    h+=`<div><div class="sectlabel">ENTRENO</div>
      <div class="softcard evt">
        <div style="width:38px;height:38px;border-radius:12px;background:${tint(col,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11"/></svg></div>
        <div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:700">${esc(entreno.type)}</div>
          <span class="fr" style="font-weight:600;font-size:12.5px;color:rgba(244,244,251,0.5)">${entreno.done?'Entrenado':'Planificado'}</span></div>
        <span class="badge" style="color:${col};background:${tint(col,'24')}">Gimnasio</span>
      </div></div>`;
  }

  // habitos del día (marcables; a futuro no se marcan)
  h+=`<div><div class="sectlabel">HÁBITOS</div><div style="display:flex;flex-direction:column;gap:10px">`;
  if(state.habits.length){
    h+=state.habits.map(hb=>{
      const on=habitDone(hb.id,dISO), st=habitStreak(hb.id,dISO);
      const chk=isFuture
        ? `<div class="check" style="border-color:rgba(244,244,251,0.14);width:30px;height:30px;opacity:0.45"></div>`
        : `<div class="check ${on?'on':''}" style="border-color:${on?hb.color:'rgba(244,244,251,0.28)'};background:${on?hb.color:'transparent'};width:30px;height:30px" data-act="habit-toggle" data-id="${hb.id}" data-date="${dISO}">${CHECK_SVG}</div>`;
      return `<div class="softcard habrow">
        <div class="iconwrap" style="width:36px;height:36px;background:${tint(hb.color,'24')}">${iconSvg(hb,20)}</div>
        <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:15px">${esc(hb.name)}</div>
          <div style="font-size:12px;color:rgba(244,244,251,0.5);margin-top:1px">${esc(hb.detail||'')}</div></div>
        ${st>0?`<div class="streak" style="margin-right:2px">${flame(hb.color,13)}<span class="n" style="color:${hb.color}">${st}</span></div>`:''}
        ${chk}
      </div>`;
    }).join('');
  } else h+=`<div class="empty">Todavía no creaste hábitos.</div>`;
  h+=`</div></div>`;

  // bandeja de pendientes (tareas sin fecha) — siempre visible, no depende del día elegido
  h+=`<div><div class="sectlabel">PENDIENTES <span style="font-weight:500;color:rgba(244,244,251,0.35)">· sin fecha</span></div>`;
  if(pend.length){
    h+=`<div class="card pad">`+pend.map(t=>pendRow(t)).join('')+`</div>`;
  } else h+=`<div class="card pad"><div class="empty">Nada suelto por acá.</div></div>`;
  h+=`</div>`;

  h+=`</div></div>`;
  return h;
}

// Fila de la bandeja: además de completar/editar, permite darle fecha de una.
function pendRow(t){
  const on=t.done, col=C.coral;
  return `<div class="trow" data-act="task-open" data-id="${t.id}">
    <div class="check ${on?'on':''}" style="border-color:${on?col:'rgba(244,244,251,0.28)'};background:${on?col:'transparent'}" data-act="task-toggle" data-id="${t.id}" data-stop="1">${CHECK_SVG}</div>
    <div style="flex:1;min-width:0"><span class="ttext ${on?'done':''}">${esc(t.title)}</span>
      ${t.desc?`<div class="tdesc">${esc(t.desc)}</div>`:''}</div>
    <div class="minibtn" title="Poner fecha" data-act="task-schedule" data-id="${t.id}" data-stop="1">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></div>
  </div>`;
}

function saludo(){ const hh=new Date().getHours(); return hh<6?'Buenas noches':hh<13?'Buenos días':hh<20?'Buenas tardes':'Buenas noches'; }
function dayTitle(d){ const t=todayD(); if(iso(d)===iso(addDays(t,1))) return 'Mañana'; if(iso(d)===iso(addDays(t,-1))) return 'Ayer'; return DOW_FULL[dow(d)]; }
