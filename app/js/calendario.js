"use strict";
/* ----------------------------- CALENDARIO ----------------------------- */
// Mensual con fechas reales. Muestra tareas con fecha + citas + anuales recurrentes,
// diferenciados por color e ícono. Tocar un día abre su detalle y permite agregar ahí.

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
    const items=itemsDe(dISO);
    const isSel=dISO===ui.calSel, isToday=dISO===tISO;
    let style='color:#F4F4FB;font-weight:500';
    if(isSel) style=`background:${C.green};color:#0E0F22;font-weight:700`;
    else if(isToday) style=`border:1.6px solid ${C.green};color:${C.green};font-weight:700`;
    // Un punto por tipo presente ese día (no uno por ítem): indicador limpio.
    const kinds=['tarea','cita','anual'].filter(k=>items.some(x=>x.kind===k));
    const dots=kinds.map(k=>{
      const col=isSel?'rgba(14,15,34,0.6)':ITEM_COLOR[k];
      return k==='anual'
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
      <div class="li"><span style="width:9px;height:9px;border-radius:50%;background:${C.coral}"></span>Tarea</div>
      <div class="li"><span style="width:9px;height:9px;border-radius:50%;background:${C.green}"></span>Cita</div>
      <div class="li"><span style="width:9px;height:9px;border-radius:50%;background:transparent;border:2px solid ${C.yellow};box-sizing:border-box"></span>Anual</div>
    </div>`;

  // ---- detalle del día seleccionado ----
  const sel=parseISO(ui.calSel);
  const selLabel=(DOW_FULL[dow(sel)]+' '+sel.getDate()+' DE '+MONTHS[sel.getMonth()]).toUpperCase();
  const tareas=tareasDe(ui.calSel), eventos=agendaDe(ui.calSel);
  h+=`<div><div style="display:flex;align-items:baseline;gap:8px;margin:0 2px 11px">
    <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">ESTE DÍA</span>
    <span style="font-size:12px;font-weight:700;color:rgba(244,244,251,0.35)">${selLabel}</span></div>`;

  if(tareas.length) h+=`<div class="card pad" style="margin-bottom:10px">`+tareas.map(t=>taskRow(t,C.coral)).join('')+`</div>`;
  if(eventos.length) h+=`<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px">`+eventos.map(eventRow).join('')+`</div>`;
  if(!tareas.length && !eventos.length) h+=`<div class="empty">Sin nada agendado para este día.</div>`;

  h+=`<div class="dashed" style="margin-top:4px;border:1.5px dashed ${tint(C.green,'80')};background:${tint(C.green,'14')};color:${C.green}" data-act="cal-add" data-d="${ui.calSel}">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${C.green}" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Agregar a este día</div>`;
  h+=`</div></div></div>`;
  return h;
}

/* ---- menú para agregar a un día concreto del calendario ---- */
function calAddMenu(dISO){
  const opts=[
    ['task','Nueva tarea','Con la fecha de este día',C.coral,'M9 6h11M9 12h11M9 18h11M4.5 6l1 1 1.8-2M4.5 12l1 1 1.8-2M4.5 18l1 1 1.8-2'],
    ['event','Nueva cita','Cita o fecha anual',C.green,'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4'],
  ];
  const body=`<div style="display:flex;flex-direction:column;gap:10px">`+opts.map(([k,lb,sub,col,ic])=>
    `<div class="softcard evt" data-act="cal-add-${k}" data-d="${dISO}">
      <div style="width:40px;height:40px;border-radius:13px;background:${tint(col,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg></div>
      <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:15.5px">${lb}</div>
        <div style="font-size:12.5px;color:rgba(244,244,251,0.5)">${sub}</div></div>
    </div>`).join('')+`</div>`;
  openModal(fmtDateLong(dISO),body,null,null);
}
