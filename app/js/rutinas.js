"use strict";
/* ----------------------------- RUTINAS -----------------------------
   Biblioteca de consulta, independiente del plan semanal y del historial: acá no se
   marca nada ni se registran sesiones, solo se lee y se edita.
   Tres niveles: rutina → días → ejercicios (nombre + detalle libre, ej "4x8-12").
   Es una sub-pantalla de Gimnasio; ui.rutId / ui.rutDayId dicen en qué nivel estamos. */

const RUT_COL = C.purple;

function rutById(id){ return state.gym.routines.find(r=>r.id===id); }
function rutCur(){ return ui.rutId?rutById(ui.rutId):null; }
function rutDayCur(){ const r=rutCur(); return r&&ui.rutDayId?r.days.find(d=>d.id===ui.rutDayId):null; }
// Reordenar in-place. Devuelve true si se movió (los extremos no se mueven).
function moveInArray(arr,idx,dir){
  const to=idx+dir;
  if(idx<0||to<0||to>=arr.length) return false;
  arr.splice(to,0,arr.splice(idx,1)[0]);
  return true;
}

/* ---- chrome compartido de la sub-pantalla ---- */
function rutHead(title,sub){
  return `<div class="head">
    <div class="rut-back" data-act="rut-back">
      <svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10l8 8"/></svg>
      <span>Atrás</span></div>
    <h1>${esc(title)}</h1>
    <div class="sub">${esc(sub)}</div></div>`;
}
// Fila con nombre, subtítulo, flechas de reordenar y botones de editar/borrar.
function rutRow(o){
  const arrows=`<div class="rut-ord">
    <div class="ordbtn ${o.first?'dis':''}" data-act="${o.moveAct}" data-id="${o.id}" data-dir="-1" data-stop="1"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg></div>
    <div class="ordbtn ${o.last?'dis':''}" data-act="${o.moveAct}" data-id="${o.id}" data-dir="1" data-stop="1"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg></div>
  </div>`;
  return `<div class="managerow" ${o.openAct?`data-act="${o.openAct}" data-id="${o.id}"`:''}>
    ${arrows}
    <div style="flex:1;min-width:0">
      <div class="fr" style="font-weight:600;font-size:15.5px">${esc(o.name)}</div>
      ${o.sub?`<div style="font-size:12.5px;color:rgba(244,244,251,0.5);margin-top:2px;white-space:pre-wrap">${esc(o.sub)}</div>`:''}</div>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <div class="iconcirc" data-act="${o.editAct}" data-id="${o.id}" data-stop="1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>
      <div class="iconcirc" data-act="${o.delAct}" data-id="${o.id}" data-stop="1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
      ${o.openAct?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.3)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="align-self:center"><path d="M9 6l6 6-6 6"/></svg>`:''}
    </div></div>`;
}
function rutAddBtn(act,label){
  return `<div class="dashed" style="border:1.5px dashed ${tint(RUT_COL,'73')};background:${tint(RUT_COL,'12')};color:${RUT_COL}" data-act="${act}">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${RUT_COL}" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>${label}</div>`;
}

/* ---- despacho de la sub-pantalla ---- */
function viewRutinas(){
  // Si el ítem abierto se borró, se vuelve al nivel de arriba en vez de romper.
  if(ui.rutId && !rutCur()){ ui.rutId=null; ui.rutDayId=null; }
  if(ui.rutDayId && !rutDayCur()) ui.rutDayId=null;
  if(rutDayCur()) return viewRutDay();
  if(rutCur()) return viewRutDetail();
  return viewRutList();
}

/* ---- nivel 1: lista de rutinas ---- */
function viewRutList(){
  const rs=state.gym.routines;
  let h=`<div class="view">${rutHead('Mis rutinas', rs.length?rs.length+(rs.length===1?' rutina':' rutinas'):'Creá tu primera rutina')}<div class="body">`;
  h+=`<div>`;
  if(rs.length){
    h+=`<div class="card" style="overflow:hidden;padding:0">`+rs.map((r,i)=>{
      const nd=r.days.length, nEx=r.days.reduce((a,d)=>a+d.exercises.length,0);
      return rutRow({ id:r.id, name:r.name, first:i===0, last:i===rs.length-1,
        sub:(nd?nd+(nd===1?' día':' días'):'Sin días')+(nEx?' · '+nEx+(nEx===1?' ejercicio':' ejercicios'):''),
        openAct:'rut-open', editAct:'rut-edit', delAct:'rut-delete', moveAct:'rut-move' });
    }).join('')+`</div>`;
  } else {
    h+=`<div class="card" style="padding:26px 18px"><div class="empty" style="padding:0;line-height:1.5">
      Acá vas a tener tus rutinas para consultar cuando entrenás.<br>Creá la primera y agregale sus días y ejercicios.</div></div>`;
  }
  h+=`<div style="margin-top:10px">${rutAddBtn('rut-new','Nueva rutina')}</div></div>`;
  return h+`</div></div>`;
}

/* ---- nivel 2: días de una rutina ---- */
function viewRutDetail(){
  const r=rutCur(), ds=r.days;
  let h=`<div class="view">${rutHead(r.name, ds.length?ds.length+(ds.length===1?' día':' días'):'Agregale sus días')}<div class="body">`;
  h+=`<div><div class="sectlabel">DÍAS</div>`;
  if(ds.length){
    h+=`<div class="card" style="overflow:hidden;padding:0">`+ds.map((d,i)=>{
      const n=d.exercises.length;
      return rutRow({ id:d.id, name:d.name, first:i===0, last:i===ds.length-1,
        sub:n?n+(n===1?' ejercicio':' ejercicios'):'Sin ejercicios',
        openAct:'rut-day-open', editAct:'rut-day-edit', delAct:'rut-day-delete', moveAct:'rut-day-move' });
    }).join('')+`</div>`;
  } else {
    h+=`<div class="card" style="padding:6px 16px"><div class="empty">Esta rutina todavía no tiene días.</div></div>`;
  }
  h+=`<div style="margin-top:10px">${rutAddBtn('rut-day-new','Agregar día')}</div></div>`;
  return h+`</div></div>`;
}

/* ---- nivel 3: ejercicios de un día ---- */
function viewRutDay(){
  const r=rutCur(), d=rutDayCur(), ex=d.exercises;
  let h=`<div class="view">${rutHead(d.name, r.name+' · '+(ex.length?ex.length+(ex.length===1?' ejercicio':' ejercicios'):'sin ejercicios'))}<div class="body">`;
  h+=`<div><div class="sectlabel">EJERCICIOS</div>`;
  if(ex.length){
    h+=`<div class="card" style="overflow:hidden;padding:0">`+ex.map((e,i)=>
      rutRow({ id:e.id, name:e.name, sub:e.detail||'', first:i===0, last:i===ex.length-1,
        editAct:'rut-ex-edit', delAct:'rut-ex-delete', moveAct:'rut-ex-move' })
    ).join('')+`</div>`;
  } else {
    h+=`<div class="card" style="padding:6px 16px"><div class="empty">Este día todavía no tiene ejercicios.</div></div>`;
  }
  h+=`<div style="margin-top:10px">${rutAddBtn('rut-ex-new','Agregar ejercicio')}</div></div>`;
  return h+`</div></div>`;
}

/* ---- formularios ---- */
function rutModal(rut){
  const editing=!!rut, r=rut||{name:''};
  const body=`<div class="fld"><div class="flabel">NOMBRE</div>
    <input class="inp" id="ru-name" placeholder="Ej: Rutina 1" value="${esc(r.name)}"></div>`;
  openModal(editing?'Editar rutina':'Nueva rutina',body,RUT_COL,()=>{
    const name=mq('#ru-name').value.trim();
    if(!validateForm([['#ru-name', !!name, 'Poné un nombre para la rutina.']])) return;
    if(editing) rutById(r.id).name=name;
    else state.gym.routines.push({id:uid(),name,days:[]});
    closeModal(); commit();
  });
}
function rutDayModal(day){
  const editing=!!day, d=day||{name:''};
  const body=`<div class="fld"><div class="flabel">NOMBRE DEL DÍA</div>
    <input class="inp" id="rd-name" placeholder="Ej: Pecho" value="${esc(d.name)}"></div>`;
  openModal(editing?'Editar día':'Nuevo día',body,RUT_COL,()=>{
    const name=mq('#rd-name').value.trim();
    if(!validateForm([['#rd-name', !!name, 'Poné un nombre para el día.']])) return;
    const r=rutCur(); if(!r){ closeModal(); return; }
    if(editing) r.days.find(x=>x.id===d.id).name=name;
    else r.days.push({id:uid(),name,exercises:[]});
    closeModal(); commit();
  });
}
function rutExModal(ex){
  const editing=!!ex, e=ex||{name:'',detail:''};
  const body=`
    <div class="fld"><div class="flabel">EJERCICIO</div>
      <input class="inp" id="re-name" placeholder="Ej: Press banca" value="${esc(e.name)}"></div>
    <div class="fld"><div class="flabel">DETALLE <span class="opt">· opcional</span></div>
      <textarea class="inp" id="re-detail" placeholder="Ej: 4x8-12">${esc(e.detail||'')}</textarea>
      <div style="font-size:12px;font-weight:600;color:rgba(244,244,251,0.35);margin:8px 4px 0">Series, repeticiones o lo que quieras recordar.</div></div>`;
  openModal(editing?'Editar ejercicio':'Nuevo ejercicio',body,RUT_COL,()=>{
    const name=mq('#re-name').value.trim();
    if(!validateForm([['#re-name', !!name, 'Poné un nombre para el ejercicio.']])) return;
    const detail=mq('#re-detail').value.trim();
    const d=rutDayCur(); if(!d){ closeModal(); return; }
    if(editing) Object.assign(d.exercises.find(x=>x.id===e.id),{name,detail});
    else d.exercises.push({id:uid(),name,detail});
    closeModal(); commit();
  });
}
