"use strict";
/* ----------------------------- HOY ----------------------------- */
function viewHoy(){
  const t=todayD();
  const kicker=(DOW_FULL[dow(t)]+' '+t.getDate()+' DE '+MONTHS[t.getMonth()]).toUpperCase();
  const today=state.tasks.filter(x=>x.date && x.date<=todayISO());
  const done=today.filter(x=>x.done).length, total=today.length;
  const pendT=total-done;
  const pendH=state.habits.filter(h=>!habitDone(h.id,todayISO())).length;
  const pct=total?Math.round(done/total*100):0;
  const msg=pct>=100?'¡Completaste todo! Día redondo.':pct>=50?'¡Buen ritmo! Ya casi terminás.':total?'Arranquemos con la primera tarea.':'No tenés tareas para hoy.';
  const reminders=eventsForISO(todayISO()).filter(e=>e.ref==='reminder');

  let h=`<div class="view"><div class="head">
    <div class="kicker" style="color:${C.coral}">${kicker}</div>
    <h1>${saludo()}</h1>
    <div class="sub">Tenés ${pendT} ${pendT===1?'tarea':'tareas'} y ${pendH} ${pendH===1?'hábito':'hábitos'} para hoy.</div>
  </div><div class="body">`;

  h+=`<div class="progress"><div class="row"><span class="t">Progreso de hoy</span><span class="c">${done} de ${total}</span></div>
    <div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="msg">${msg}</div></div>`;

  // tareas de hoy
  h+=`<div><div class="sectlabel">TAREAS DE HOY</div>`;
  if(today.length){
    h+=`<div class="card pad">`+today.map(t=>taskRow(t,C.coral)).join('')+`</div>`;
  } else h+=`<div class="card pad"><div class="empty">Sin tareas para hoy 🎉</div></div>`;
  h+=`</div>`;

  // recordatorios (puntuales + anuales de hoy)
  if(reminders.length){
    h+=`<div><div class="sectlabel">RECORDATORIOS DE HOY</div><div style="display:flex;flex-direction:column;gap:10px">`+
      reminders.map(e=>{
        const annual=e.kind==='anual', col=annual?C.yellow:C.coral;
        const sub=e.time?e.time+' hs':(annual?'Se repite cada año':'Todo el día');
        const badgeIcon=annual?'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z':'M5 4h14v16l-7-4-7 4z';
        return `<div class="softcard evt" data-act="reminder-open" data-id="${e.id}">
          <div style="width:38px;height:38px;border-radius:12px;background:${tint(col,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/></svg></div>
          <div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:700">${esc(e.title)}</div>
            <span class="fr" style="font-weight:600;font-size:12.5px;color:rgba(244,244,251,0.5)">${sub}</span></div>
          <span class="badge" style="color:${col};background:${tint(col,'24')}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${badgeIcon}"/></svg>${annual?'Anual':'Puntual'}</span>
        </div>`;
      }).join('')+`</div></div>`;
  }

  // habitos por marcar
  h+=`<div><div class="sectlabel">HÁBITOS POR MARCAR</div><div style="display:flex;flex-direction:column;gap:10px">`;
  if(state.habits.length){
    h+=state.habits.map(hb=>{
      const on=habitDone(hb.id,todayISO());
      const st=habitStreak(hb.id);
      return `<div class="softcard habrow">
        <div class="iconwrap" style="width:36px;height:36px;background:${tint(hb.color,'24')}">${iconSvg(hb,20)}</div>
        <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:15px">${esc(hb.name)}</div>
          <div style="font-size:12px;color:rgba(244,244,251,0.5);margin-top:1px">${esc(hb.detail||'')}</div></div>
        ${st>0?`<div class="streak" style="margin-right:2px">${flame(hb.color,13)}<span class="n" style="color:${hb.color}">${st}</span></div>`:''}
        <div class="check ${on?'on':''}" style="border-color:${on?hb.color:'rgba(244,244,251,0.28)'};background:${on?hb.color:'transparent'};width:30px;height:30px" data-act="habit-toggle" data-id="${hb.id}" data-date="${todayISO()}">${CHECK_SVG}</div>
      </div>`;
    }).join('');
  } else h+=`<div class="empty">Todavía no creaste hábitos.</div>`;
  h+=`</div></div>`;

  h+=`</div></div>`;
  return h;
}
function saludo(){ const hh=new Date().getHours(); return hh<6?'Buenas noches':hh<13?'Buenos días':hh<20?'Buenas tardes':'Buenas noches'; }

