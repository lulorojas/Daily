"use strict";
/* ----------------------------- CALENDARIO -----------------------------
   Mensual con fechas reales. Tareas con fecha + citas + anuales, con su tag de color.
   Tocar un día abre el detalle y permite agregar ahí. Acento: coral. */

function viewCalendario(){
  const y=ui.calY, m=ui.calM, first=new Date(y,m,1), lead=dow(first), days=new Date(y,m+1,0).getDate(), tISO=todayISO();

  let cells='';
  for(let i=0;i<lead;i++) cells+=`<div class="cell" style="background:none;cursor:default"></div>`;
  for(let d=1;d<=days;d++){
    const dISO=iso(new Date(y,m,d)), items=itemsDe(dISO), isSel=dISO===ui.calSel, isToday=dISO===tISO;
    const bg=isSel?tint(C.coral,'1F'):'transparent', bd=isSel?tint(C.coral,'66'):'rgba(255,255,255,.04)';
    const numBg=isToday?C.coral:'transparent', numFg=isToday?'#0A0C11':C.ink;
    const tags=items.slice(0,2).map(e=>{ const col=ITEM_COLOR[e.kind];
      return `<div class="ctag" style="background:${tint(col,'2B')};color:${col}">${esc(e.title)}</div>`; }).join('');
    const more=items.length>2?`<span class="cmore">+${items.length-2}</span>`:'';
    cells+=`<div class="cell" style="background:${bg};border-color:${bd}" data-act="cal-day" data-d="${dISO}">
      <div class="cnum" style="background:${numBg};color:${numFg}">${d}</div>${tags}${more}</div>`;
  }

  let h=`<div class="view"><div class="cal-head">
    <div><div class="kicker" style="color:rgba(242,244,248,.38)">${y}</div>
      <h1 style="margin-top:4px">${MONTHS[m]}</h1></div>
    <div style="display:flex;gap:8px">
      <div class="navbtn" data-act="cal-prev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5 8 12l6.5 7"/></svg></div>
      <div class="navbtn" data-act="cal-next"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5 16 12l-6.5 7"/></svg></div>
    </div></div>
    <div class="body">
    <div class="legend">
      <div class="li"><span style="background:${C.amber}"></span>Tareas</div>
      <div class="li"><span style="background:${C.coral}"></span>Citas</div>
      <div class="li"><span style="background:${C.violet}"></span>Anuales</div></div>
    <div class="card" style="padding:12px 8px 10px">
      <div class="cal-grid" style="margin-bottom:6px">${DOW_MINI.map(x=>`<div class="dow">${x}</div>`).join('')}</div>
      <div class="cal-grid" style="gap:2px">${cells}</div></div>`;

  // ---- detalle del día seleccionado ----
  const sel=parseISO(ui.calSel), tareas=tareasDe(ui.calSel), eventos=agendaDe(ui.calSel);
  const nItems=tareas.length+eventos.length;
  const selTitle=DOW_FULL[dow(sel)]+' '+sel.getDate();
  h+=`<div class="softcard" style="padding:18px 18px 16px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:baseline;justify-content:space-between">
      <div><div class="fr" style="font-weight:700;font-size:19px;letter-spacing:-.4px">${selTitle}</div>
        <div style="font-size:12.5px;color:rgba(242,244,248,.42);margin-top:2px">${nItems?nItems+' '+(nItems===1?'entrada':'entradas')+' · '+MONTHS[sel.getMonth()].toLowerCase():'Sin entradas este día'}</div></div>
      <span style="font-size:12.5px;font-weight:600;color:${C.coral};cursor:pointer" data-act="cal-add" data-d="${ui.calSel}">Agregar</span>
    </div>`;
  if(nItems){
    h+=`<div style="display:flex;flex-direction:column;gap:9px">`;
    h+=tareas.map(t=>taskRow(t,C.amber)).join('');
    h+=eventos.map(eventRow).join('');
    h+=`</div>`;
  } else {
    h+=`<div class="dashed" data-act="cal-add" data-d="${ui.calSel}">+ Agregar a este día</div>`;
  }
  h+=`</div>`;
  return h+`</div></div>`;
}

/* ---- menú para agregar a un día concreto ---- */
function calAddMenu(dISO){
  const opts=[
    ['task','Nueva tarea','Con la fecha de este día',C.amber,'M4.5 12.5 9 17l10.5-11'],
    ['event','Nueva cita','Cita o fecha anual',C.coral,'M7.5 3v4M16.5 3v4M3.4 10.5h17.2M6.5 5h11a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 17.5 21h-11A3.5 3.5 0 0 1 3 17.5v-9A3.5 3.5 0 0 1 6.5 5Z'],
  ];
  const body=`<div style="display:flex;flex-direction:column;gap:10px">`+opts.map(([k,lb,sub,col,ic])=>
    `<div class="evrow" style="border-left:3px solid ${col}" data-act="cal-add-${k}" data-d="${dISO}">
      <div class="evic" style="width:40px;height:40px;background:${tint(col,'24')};color:${col}"><svg viewBox="0 0 24 24" style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg></div>
      <div style="flex:1;min-width:0"><div class="evname" style="font-size:15.5px">${lb}</div><div class="evsub">${sub}</div></div>
    </div>`).join('')+`</div>`;
  openModal(fmtDateLong(dISO),body,null,null);
}
