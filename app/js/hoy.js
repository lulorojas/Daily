"use strict";
/* ----------------------------- HOY -----------------------------
   Vista de un día: la tira semanal elige qué día se ve (hoy por defecto). */

function weekStrip(dISO){
  const sel=parseISO(dISO), tISO=todayISO(), mon=mondayOf(sel), col=C.amber;
  const arrow=dir=>`<div class="nb" data-act="week-${dir}"><svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${dir==='prev'?'M10 2L2 10l8 8':'M2 2l8 8-8 8'}"/></svg></div>`;
  const days=Array.from({length:7},(_,i)=>{
    const d=addDays(mon,i), di=iso(d), isSel=di===dISO, isToday=di===tISO, past=di<tISO;
    const has=tareasDe(di).length||agendaDe(di).length;
    let ring='rgba(255,255,255,.07)', inner=C.bg, fg='rgba(242,244,248,.45)';
    if(isSel){ ring=col; inner=col; fg='#0A0C11'; }
    else if(past){ ring=tint(col,'47'); fg='rgba(242,244,248,.75)'; }
    return `<div class="wcell" data-act="day-sel" data-d="${di}">
      <div class="wdow" style="${isSel||isToday?'color:'+col:''}">${DOW_SHORT[i][0]}</div>
      <div class="wring" style="background:${ring}"><div class="wcirc" style="background:${inner};color:${fg}">${d.getDate()}</div></div>
      <div class="wdot" style="background:${has?col:'transparent'}"></div></div>`;
  }).join('');
  return `<div class="weekstrip">${arrow('prev')}<div class="wdays">${days}</div>${arrow('next')}</div>`;
}

function viewHoy(){
  const dISO=ui.daySel, d=parseISO(dISO), tISO=todayISO(), isToday=dISO===tISO, isFuture=dISO>tISO;
  const kicker=(DOW_FULL[dow(d)]+' '+d.getDate()+' de '+MONTHS[d.getMonth()]);
  const tareas=tareasDe(dISO), citas=agendaDe(dISO), entreno=entrenoDe(dISO);
  const pend=pendientes().filter(t=>pendVisible(t,dISO));

  // Progreso del día: unidades de hábito (marcas) + tareas.
  const doneUnits=tareas.filter(x=>x.done).length+habitDayMarks(dISO);
  const total=tareas.length+habitDayPossible();
  const pct=total?Math.round(doneUnits/total*100):0;
  const msg=!total?'No tenés nada agendado para este día.':pct>=100?'¡Completaste todo! Día redondo.':pct>=50?'¡Buen ritmo! Ya casi terminás.':'Arranquemos con lo primero.';
  const pendT=tareas.length-tareas.filter(x=>x.done).length, pendH=state.habits.filter(h=>!habitDone(h.id,dISO)).length;
  const sub=isToday?`Tenés ${pendT} ${pendT===1?'tarea':'tareas'} y ${pendH} ${pendH===1?'hábito':'hábitos'} para hoy.`
    :(isFuture?'Así viene este día.':'Podés marcar los hábitos de este día.');

  let h=`<div class="view"><div class="head"><div class="htop">
    <div style="min-width:0"><div class="kicker" style="color:${C.amber}">${kicker}</div>
      <h1>${isToday?saludo():dayTitle(d)}</h1><div class="sub">${sub}</div></div>
    <div class="gear" data-act="ajustes-open" title="Ajustes">
      <svg viewBox="0 0 24 24" style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.5 12a7.5 7.5 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.2-1.3L14.5 2h-4l-.4 2.1A7.5 7.5 0 0 0 7.9 5.4L5.6 4.5l-2 3.4 2 1.5A7.6 7.6 0 0 0 5.5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-.9c.7.5 1.4 1 2.2 1.3l.4 2.1h4l.4-2.1c.8-.3 1.6-.8 2.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3Z"/></svg></div>
  </div></div><div class="body">`;

  h+=bkBanner();
  h+=weekStrip(dISO);

  h+=`<div class="progday"><div class="r"><span class="t">Progreso del día</span><span class="pc">${pct}%</span></div>
    <div class="track"><div class="fill" style="width:${pct}%;background:linear-gradient(90deg,${C.amber},${C.coral})"></div></div>
    <span class="msg">${total?doneUnits+' de '+total+' completados':msg}</span></div>`;

  // Agenda (citas + anuales) como línea de tiempo
  if(citas.length){
    h+=`<div class="sect"><div class="sectlabel">Agenda</div>`+citas.map(e=>{
      const col=ITEM_COLOR[e.kind];
      return `<div class="agrow" data-act="event-open" data-id="${e.id}">
        <div class="agtime"><span class="h">${e.time||'--:--'}</span><span style="font-size:11px;color:rgba(242,244,248,.35)">${e.kind==='anual'?'anual':'cita'}</span></div>
        <div class="agcard" style="background:linear-gradient(135deg,${tint(col,'2E')},${tint(col,'0F')});border:1px solid ${tint(col,'3D')}">
          <span style="font-size:16px;font-weight:600;letter-spacing:-.2px">${esc(e.title)}</span>
          ${e.desc?`<span style="font-size:12.5px;color:rgba(242,244,248,.55)">${esc(e.desc)}</span>`:''}</div></div>`;
    }).join('')+`</div>`;
  }

  // Tareas
  h+=`<div class="sect"><div class="sectlabel">Tareas ${tareas.length?`<span class="muted">· ${tareas.filter(x=>x.done).length}/${tareas.length}</span>`:''}</div>`;
  if(tareas.length){ h+=tareas.map(t=>taskRow(t,C.amber)).join(''); }
  else h+=`<div class="card" style="padding:20px 16px"><div class="empty">El día está limpio por ahora.</div></div>`;
  h+=`</div>`;

  // Entreno del día: acá no se edita, se toca y lleva al plan semanal de Gimnasio
  // (a la semana del día que se está mirando, no siempre a la actual).
  if(entreno){
    const col=typeColor(entreno.type);
    h+=`<div class="sect"><div class="sectlabel">Entreno</div>
      <div class="evrow" style="border-left:3px solid ${col}" data-act="gym-plan-open" data-d="${dISO}">
        <div class="evic" style="background:${tint(col,'24')};color:${col}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 8.5v7M3.8 10.5v3M17.5 8.5v7M20.2 10.5v3M6.5 12h11"/></svg></div>
        <div style="flex:1;min-width:0"><div class="evname">${esc(entreno.type)}</div><div class="evsub">${entreno.done?'Entrenado':'Planificado'}</div></div>
        <span style="font-size:12.5px;font-weight:600;color:${col}">Gym</span>
        <span style="font-size:16px;color:${tint(col,'B3')};flex:none">&#8250;</span></div></div>`;
  }

  // Hábitos del día (marcables; a futuro solo lectura)
  h+=`<div class="sect"><div class="sectlabel">Hábitos</div>`;
  if(state.habits.length){ h+=state.habits.map(hb=>habitRow(hb,dISO,!isFuture,false)).join(''); }
  else h+=`<div class="card" style="padding:20px 16px"><div class="empty">Todavía no creaste hábitos.</div></div>`;
  h+=`</div>`;

  // Sin fecha (backlog)
  h+=`<div class="sect"><div class="sectlabel">Sin fecha ${pend.length?`<span class="muted">· ${pend.length} pendientes</span>`:''}</div>`;
  if(pend.length){ h+=`<div class="tray">`+pend.map(pendRow).join('')+`</div>`; }
  else h+=`<div class="card" style="padding:18px 16px"><div class="empty">Nada suelto por acá.</div></div>`;
  h+=`</div>`;

  return h+`</div></div>`;
}

// Fila de la bandeja: completar/editar + atajo para ponerle fecha.
function pendRow(t){
  const on=t.done, col=C.amber;
  return `<div class="trayrow" data-act="task-open" data-id="${t.id}">
    <div class="traydot" style="${on?`background:${col};border-color:${col}`:''}" data-act="task-toggle" data-id="${t.id}" data-stop="1"></div>
    <span style="flex:1;min-width:0;font-size:14.5px;color:${on?'rgba(242,244,248,.3)':'rgba(242,244,248,.85)'};${on?'text-decoration:line-through':''}">${esc(t.title)}</span>
    <div class="minibtn" title="Poner fecha" data-act="task-schedule" data-id="${t.id}" data-stop="1">
      <svg viewBox="0 0 24 24" style="width:15px;height:15px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="4"/><path d="M8 3v4M16 3v4M3.4 10.5h17.2"/></svg></div>
  </div>`;
}

function saludo(){ const hh=new Date().getHours(); return hh<6?'Buenas noches':hh<13?'Buenos días':hh<20?'Buenas tardes':'Buenas noches'; }
function dayTitle(d){ const t=todayD(); if(iso(d)===iso(addDays(t,1))) return 'Mañana'; if(iso(d)===iso(addDays(t,-1))) return 'Ayer'; return DOW_FULL[dow(d)]; }
