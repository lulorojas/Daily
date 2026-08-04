"use strict";
/* ----------------------------- GYM -----------------------------
   Acento: rosa. Muestra plan semanal, peso corporal, cargas por ejercicio y la entrada a
   Rutinas. El ranking por tipo y la constancia viven ahora en Progreso. */
function weekKey(offset){ return iso(addDays(mondayOf(todayD()), offset*7)); }
function getWeekPlan(offset){
  const k=weekKey(offset);
  if(!state.gym.weekPlans[k]) state.gym.weekPlans[k]=DOW_SHORT.map(()=>({type:REST,done:false}));
  return state.gym.weekPlans[k];
}
// Semana (su lunes) a la que pertenece una fecha. Clave para agrupar por semana.
function weekOf(dISO){ return iso(mondayOf(parseISO(dISO))); }

// Entrenos por semana: {lunesISO: cantidad}. Se le pasa el historial ya filtrado.
function gymWeekCounts(hist){
  const out={};
  hist.forEach(x=>{ const k=weekOf(x.date); out[k]=(out[k]||0)+1; });
  return out;
}

// Racha POR TIPO de entrenamiento (no por semana): cuántas semanas seguidas, contando
// hacia atrás, se hizo ese tipo al menos una vez. Un tipo "está en racha" a partir de 2
// semanas seguidas. La semana en curso no corta la racha.
function gymTypeStreaks(){
  const weeks={};
  gymHistory().forEach(x=>{ (weeks[x.type] ||= new Set()).add(weekOf(x.date)); });
  const curW=iso(mondayOf(todayD()));
  const prevW=w=>iso(addDays(parseISO(w),-7));
  return Object.keys(weeks).map(type=>{
    const set=weeks[type];
    let w=set.has(curW)?curW:prevW(curW), n=0;
    while(set.has(w)){ n++; w=prevW(w); }
    return { type, weeks:n };
  }).filter(x=>x.weeks>0).sort((a,b)=>b.weeks-a.weeks || (a.type<b.type?-1:1));
}

// Mayor avance de carga dentro de una ventana. startISO null = todo el historial.
function liftGains(startISO){
  return state.gym.lifts.map(l=>{
    const h=l.history.filter(p=>!startISO || p.date>=startISO).slice().sort((a,b)=>a.date<b.date?-1:1);
    if(h.length<2) return null;
    const from=h[0].weight, to=h[h.length-1].weight;
    return { id:l.id, name:l.name, color:l.color, unit:l.unit||'kg',
             gain:+(to-from).toFixed(1), from, to, n:h.length };
  }).filter(Boolean).sort((a,b)=>b.gain-a.gain);
}

// Cuántas veces se hizo cada tipo, de más a menos. Lo comparten Gimnasio y Progreso.
function gymRanking(hist){
  const counts={};
  hist.forEach(x=>counts[x.type]=(counts[x.type]||0)+1);
  return Object.keys(counts).map(t=>({type:t,count:counts[t]})).sort((a,b)=>b.count-a.count);
}
// Filas con barra del ranking (usadas por Progreso). Asume ranked.length > 0.
function rankingRows(ranked){
  const max=Math.max(...ranked.map(r=>r.count));
  return ranked.map(r=>{const col=typeColor(r.type);return `<div class="rankrow">
    <div style="display:flex;align-items:baseline;justify-content:space-between">
      <span style="font-size:13.5px;font-weight:600;color:${col}">${esc(r.type)}</span>
      <span style="font-size:12px;color:rgba(242,244,248,.42)">${r.count} ${r.count===1?'sesión':'sesiones'}</span></div>
    <div class="bartrack"><div style="background:${col};width:${Math.round(r.count/max*100)}%"></div></div></div>`;}).join('');
}
function gymHistory(){
  const out=[];
  Object.keys(state.gym.weekPlans).forEach(k=>{
    const mon=parseISO(k);
    state.gym.weekPlans[k].forEach((day,i)=>{
      if(day.done && day.type!==REST) out.push({date:iso(addDays(mon,i)), type:day.type});
    });
  });
  out.sort((a,b)=>a.date<b.date?1:-1);
  return out;
}

function viewGym(){
  const plan=getWeekPlan(ui.gymOffset);
  const trainingDays=plan.filter(d=>d.type!==REST);
  const doneCount=trainingDays.filter(d=>d.done).length;
  const isCur=ui.gymOffset===0;
  const mon=addDays(mondayOf(todayD()),ui.gymOffset*7);
  const range=mon.getDate()+' '+MONTHS[mon.getMonth()].slice(0,3).toLowerCase()+' – '+addDays(mon,6).getDate()+' '+MONTHS[addDays(mon,6).getMonth()].slice(0,3).toLowerCase();
  const weekLabel=isCur?'Esta semana':range;

  let h=`<div class="view"><div class="head"><h1>Gimnasio</h1>
    <div class="sub">${doneCount} de ${trainingDays.length} entrenamientos ${isCur?'esta semana':'· '+range}</div></div><div class="body">`;

  // plan semanal
  const nav=dir=>`<div class="nb" data-act="gym-${dir}"><svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${dir==='prev'?'M10 2L2 10l8 8':'M2 2l8 8-8 8'}"/></svg></div>`;
  h+=`<div class="sect"><div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px">
    <span class="sectlabel">Plan semanal</span>
    <div class="weekstrip" style="gap:8px;flex:none">${nav('prev')}<span style="font-size:12.5px;font-weight:600;color:${C.rose};min-width:80px;text-align:center">${weekLabel}</span>${nav('next')}</div></div>
    <div class="card" style="padding:6px 8px">`;
  plan.forEach((d,i)=>{
    const rest=d.type===REST, col=typeColor(d.type), exp=ui.gymExpand===i, isToday=isCur && dow(todayD())===i;
    h+=`<div style="border-bottom:${i===plan.length-1?'none':'1px solid rgba(255,255,255,.05)'}">
      <div class="gday">
        <span class="gtag" style="color:${isToday?C.rose:'rgba(242,244,248,.38)'}">${DOW_SHORT[i]}</span>
        <div class="gbar" style="background:${rest?'rgba(255,255,255,.1)':col}"></div>
        <span class="gchip" style="background:${rest?'rgba(255,255,255,.05)':tint(col,'24')};color:${rest?'rgba(242,244,248,.5)':col}" data-act="gym-expand" data-i="${i}">${esc(d.type)}
          <svg style="width:12px;height:12px;transform:rotate(${exp?180:0}deg);transition:transform .2s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>
        <div style="flex:1"></div>
        <div class="gcheck ${d.done?'on':''}" style="${d.done?`background:${col};border-color:${col}`:''}" data-act="gym-toggle" data-i="${i}"><svg viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg></div>
      </div>`;
    if(exp){
      h+=`<div class="optchips">`+allTypes().map(t=>{
        const active=t.name===d.type, tc=t.color;
        return `<span class="optchip" style="font-weight:${active?700:600};color:${active?'#0A0C11':tc};background:${active?tc:tint(tc,'20')};border:1.5px solid ${active?'transparent':tint(tc,'55')}" data-act="gym-settype" data-i="${i}" data-type="${esc(t.name)}">${esc(t.name)}</span>`;
      }).join('')+`</div>`;
    }
    h+=`</div>`;
  });
  h+=`</div><div class="dashed" data-act="gym-managetypes" style="margin-top:2px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Administrar tipos</div></div>`;

  // peso corporal
  h+=bodyWeightSection();

  // cargas por ejercicio
  const maxCur=Math.max(1,...state.gym.lifts.map(l=>l.history.slice(-1)[0].weight));
  h+=`<div class="sect"><div style="display:flex;align-items:baseline;justify-content:space-between;margin:0 2px">
    <span class="sectlabel">Cargas por ejercicio</span>
    <span style="font-size:12px;color:rgba(242,244,248,.35)">${state.gym.lifts.length} ejercicios</span></div>`;
  state.gym.lifts.forEach(l=>{ h+=liftCard(l,maxCur); });
  h+=`<div class="dashed" data-act="lift-new">+ Agregar ejercicio</div></div>`;

  // rutinas
  const nRut=state.gym.routines.length, col=C.rose;
  h+=`<div class="sect"><div class="sectlabel">Rutinas</div>
    <div class="agcard" style="background:linear-gradient(135deg,${tint(col,'2E')},${tint(col,'0F')});border:1px solid ${tint(col,'3D')};flex-direction:row;align-items:center;gap:14px;padding:18px" data-act="rut-open-lib">
      <div style="width:44px;height:44px;flex:none;border-radius:15px;background:${col};display:grid;place-items:center"><svg viewBox="0 0 24 24" style="width:22px;height:22px" fill="none" stroke="#0A0C11" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM9 7.5h7M9 11h5"/></svg></div>
      <div style="flex:1;min-width:0"><div style="font-size:16px;font-weight:600;letter-spacing:-.2px">Mis rutinas</div>
        <div style="font-size:12.5px;color:rgba(242,244,248,.5)">${nRut?nRut+(nRut===1?' guardada':' guardadas'):'Todavía no creaste ninguna'}</div></div>
      <span style="font-size:16px;color:rgba(242,244,248,.5)">&#8250;</span></div></div>`;

  return h+`</div></div>`;
}

function liftCard(l,maxCur){
  const data=l.history.map(p=>p.weight), cur=data[data.length-1], gain=+(cur-data[0]).toFixed(1);
  const bar=Math.round(cur/(maxCur||cur)*100);
  const dc = gain<0?C.danger:(gain>0?C.green:'rgba(242,244,248,.35)');
  return `<div class="liftrow" data-act="lift-open" data-id="${l.id}">
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span class="nm">${esc(l.name)}</span>
      <div class="bartrack" style="height:4px"><div style="background:${l.color};width:${bar}%"></div></div></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex:none">
      <span class="kg">${fmtNum(cur)} ${esc(l.unit||'kg')}</span>
      <span class="delta" style="color:${dc}">${data.length>1?(gain>0?'+':'')+(gain===0?'=':fmtNum(gain)):'nuevo'}</span></div>
  </div>`;
}

/* ---- detalle de un ejercicio: gráfico + récord + todos los registros por fecha ---- */
function liftDetailModal(l){
  const col=l.color, unit=l.unit||'kg';
  const asc=l.history.map((p,i)=>({p,i})).sort((a,b)=>a.p.date<b.p.date?-1:1);
  const desc=asc.slice().reverse();
  const data=asc.map(x=>x.p.weight);
  const cur=data[data.length-1], first=data[0], gain=+(cur-first).toFixed(1), pr=Math.max(...data);
  const prRec=asc.find(x=>x.p.weight===pr).p;

  let body=`
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:4px">
      <div style="display:flex;align-items:baseline;gap:5px">
        <span class="fr" style="font-weight:800;font-size:34px;letter-spacing:-1px;color:${col}">${fmtNum(cur)}</span>
        <span style="font-size:14px;font-weight:500;color:rgba(242,244,248,.5)">${esc(unit)}</span>
        ${data.length>1?`<span style="margin-left:4px;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;color:${gain<0?C.danger:C.green};background:${tint(gain<0?C.danger:C.green,'29')}">${gain>=0?'+':''}${fmtNum(gain)} ${esc(unit)}</span>`:''}
      </div>
      <div style="text-align:right"><div style="font-size:11px;font-weight:600;letter-spacing:1px;color:rgba(242,244,248,.4)">RÉCORD</div>
        <div class="fr" style="font-weight:700;font-size:16px;color:${C.amber}">${fmtNum(pr)} ${esc(unit)}</div></div>
    </div>`;

  if(data.length>1){
    body+=`<div class="fld">${lineChart(asc.map(x=>({date:x.p.date,v:x.p.weight})),col,320,96,{unit,style:'width:100%;height:96px'})}
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:rgba(242,244,248,.35);margin-top:5px">
        <span>${shortDate(asc[0].p.date)}</span><span style="color:${C.amber}">récord ${shortDate(prRec.date)}</span><span>${shortDate(asc[asc.length-1].p.date)}</span></div></div>`;
  } else {
    body+=`<div class="fld"><div style="font-size:12.5px;color:rgba(242,244,248,.4)">Cargá otro registro para ver la evolución.</div></div>`;
  }

  body+=`<div class="fld"><div class="flabel">Registros por fecha</div>
    <div class="card" style="overflow:hidden;padding:0">`+desc.map(x=>{
      const esPr=x.p.weight===pr;
      return `<div class="managerow">
        <span class="fr" style="font-weight:700;font-size:15.5px;color:${col};min-width:70px">${fmtNum(x.p.weight)} ${esc(unit)}</span>
        <span style="flex:1;min-width:0;font-size:13px;color:rgba(242,244,248,.5)">${fmtDateLong(x.p.date)}</span>
        ${esPr?`<span style="font-size:10px;font-weight:700;color:${C.amber};background:${tint(C.amber,'24')};padding:2px 7px;border-radius:99px;flex:none">récord</span>`:''}
        <div style="display:flex;gap:8px;flex:none">
          <div class="iconcirc" data-act="lift-rec-edit" data-lift="${l.id}" data-i="${x.i}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>
          <div class="iconcirc" data-act="lift-rec-delete" data-lift="${l.id}" data-i="${x.i}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
        </div></div>`;
    }).join('')+`</div></div>`;

  body+=`<div class="dashed" style="border-color:${tint(col,'80')};background:${tint(col,'14')};color:${col}" data-act="lift-log" data-id="${l.id}">+ Cargar peso</div>`;
  body+=`<div class="delbtn" data-act="lift-delete" data-id="${l.id}">Eliminar ejercicio</div>`;
  openModal(l.name,body,null,null);
}

/* ---- editar un registro puntual de un ejercicio (peso + fecha) ---- */
function liftRecModal(l,idx){
  const rec=l.history[idx]; if(!rec) return;
  const col=l.color, unit=l.unit||'kg';
  const rdp=dpState(rec.date);
  const body=`
    <div class="fld"><div class="flabel">Peso <span class="opt">· ${esc(unit)}</span></div>
      <input class="inp" id="lr-kg" inputmode="decimal" placeholder="Ej: 60" value="${fmtNum(rec.weight)}"></div>
    <div class="fld"><div class="flabel">Fecha</div>${dateField('lr',col,rdp)}</div>`;
  openModal('Editar registro',body,col,()=>{
    const raw=mq('#lr-kg').value.trim().replace(',','.');
    const w=Number(raw);
    if(!validateForm([
      ['#lr-kg',   raw!=='' && Number.isFinite(w) && w>0, raw===''?'Poné el peso.':'Poné un peso válido (mayor a 0).'],
      ['#lr-drow', !!rdp.sel, 'Elegí una fecha.'],
    ])) return;
    l.history[idx]={ date:rdp.sel, weight:+w.toFixed(1) };
    save(); render(); liftDetailModal(l);
  });
  onOverlay('click', wireDatePicker('lr',col,rdp));
}

/* ============================ PESO CORPORAL ============================ */
function bodyList(){ return state.gym.bodyWeights.slice().sort((a,b)=>a.date<b.date?-1:1); }

function bodyWeightSection(){
  const log=bodyList(), col=C.rose;
  let h=`<div class="sect"><div style="display:flex;align-items:baseline;justify-content:space-between;margin:0 2px">
    <span class="sectlabel">Peso corporal ${log.length?`<span class="muted">· ${log.length} ${log.length===1?'registro':'registros'}</span>`:''}</span>
    ${log.length?`<div class="iconcirc" data-act="body-manage"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>`:''}
  </div>`;

  if(log.length){
    const data=log.map(p=>p.kg), cur=data[data.length-1], gain=+(cur-data[0]).toFixed(1), last=log[log.length-1];
    h+=`<div class="bigcard">
      <div style="display:flex;align-items:flex-end;justify-content:space-between">
        <div style="display:flex;align-items:baseline;gap:7px">
          <span class="fr" style="font-weight:800;font-size:44px;line-height:.9;letter-spacing:-2px">${fmtNum(cur)}</span>
          <span style="font-size:15px;font-weight:500;color:rgba(242,244,248,.45)">kg</span></div>
        ${data.length>1?`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span style="padding:5px 10px;border-radius:99px;background:${tint(gain<0?C.green:C.danger,'29')};color:${gain<0?C.green:C.danger};font-size:12px;font-weight:600">${gain>=0?'+':''}${fmtNum(gain)} kg</span>
          <span style="font-size:11.5px;color:rgba(242,244,248,.35)">${shortDate(last.date)}</span></div>`:''}
      </div>
      ${data.length>1?`${lineChart(log.map(p=>({date:p.date,v:p.kg})),col,320,110,{unit:'kg',style:'width:100%;height:110px'})}
      <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:500;color:rgba(242,244,248,.3)">
        <span>${shortDate(log[0].date)}</span><span>tocá un punto</span><span>${shortDate(last.date)}</span></div>`
      :`<div style="font-size:12.5px;color:rgba(242,244,248,.4)">Cargá otro registro para ver la tendencia.</div>`}
    </div>`;
  } else {
    h+=`<div class="card" style="padding:18px 16px"><div class="empty">Todavía no registraste tu peso.</div></div>`;
  }
  h+=`<div class="dashed" style="border-color:${tint(col,'73')};background:${tint(col,'12')};color:${col}" data-act="body-new">+ Registrar peso</div>`;
  return h+`</div>`;
}

/* ---- registrar / editar peso corporal ---- */
function bodyModal(rec){
  const editing=!!rec, r=rec||{kg:'',date:todayISO()}, col=C.rose, bdp=dpState(r.date);
  const body=`
    <div class="fld"><div class="flabel">Peso corporal <span class="opt">· kg</span></div>
      <div style="border-radius:20px;background:rgba(255,255,255,.04);border:1.5px solid ${tint(col,'4D')};padding:18px;display:flex;align-items:baseline;justify-content:center;gap:8px">
        <input class="inp" id="b-kg" inputmode="decimal" placeholder="72,5" value="${r.kg===''?'':fmtNum(r.kg)}" style="background:none;border:none;text-align:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px;letter-spacing:-2px;color:${col};width:auto;padding:0">
        <span style="font-size:17px;font-weight:500;color:rgba(242,244,248,.45)">kg</span></div></div>
    <div class="fld"><div class="flabel">Fecha</div>${dateField('b',col,bdp)}</div>
    ${editing?`<div class="delbtn" data-act="body-delete" data-id="${r.id}">Eliminar registro</div>`:''}`;
  openModal(editing?'Editar registro':'Registrar peso',body,col,()=>{
    const raw=mq('#b-kg').value.trim().replace(',','.'), kg=Number(raw);
    const valido = raw!=='' && Number.isFinite(kg) && kg>0;
    if(!validateForm([
      ['#b-kg',   valido,     raw===''?'Poné cuánto pesás en kg.':'Poné un peso válido en kg (mayor a 0).'],
      ['#b-drow', !!bdp.sel,  'Elegí una fecha.'],
    ])) return;
    const val=+kg.toFixed(1);
    if(editing) Object.assign(state.gym.bodyWeights.find(x=>x.id===r.id),{kg:val,date:bdp.sel});
    else state.gym.bodyWeights.push({id:uid(),kg:val,date:bdp.sel});
    closeModal(); commit();
  });
  onOverlay('click', wireDatePicker('b',col,bdp));
}

/* ---- listado de registros de peso (editar / borrar) ---- */
function bodyManageModal(){
  const log=bodyList().reverse(), col=C.rose;
  let body=`<div class="fld"><div class="flabel">Historial de peso</div>`;
  if(log.length){
    body+=`<div class="card" style="overflow:hidden;padding:0">`+log.map(r=>`
      <div class="managerow">
        <span class="fr" style="font-weight:700;font-size:15.5px;color:${col};min-width:62px">${fmtNum(r.kg)} kg</span>
        <span style="flex:1;font-size:13px;color:rgba(242,244,248,.5)">${fmtDateLong(r.date)}</span>
        <div style="display:flex;gap:8px">
          <div class="iconcirc" data-act="body-edit" data-id="${r.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>
          <div class="iconcirc" data-act="body-delete" data-id="${r.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
        </div></div>`).join('')+`</div>`;
  } else body+=`<div class="empty">Todavía no registraste tu peso.</div>`;
  body+=`</div><div class="dashed" style="border-color:${tint(col,'73')};background:${tint(col,'12')};color:${col}" data-act="body-new">+ Registrar peso</div>`;
  openModal('Peso corporal',body,null,null);
}

/* ---- lift (cargar peso) modal ---- */
function liftModal(existing){
  let lifts=state.gym.lifts, ACC=C.rose;
  let selId = existing? existing.id : (lifts[0]?lifts[0].id:null);
  let newName='';
  let weight = selId ? lifts.find(l=>l.id===selId).history.slice(-1)[0].weight : 0;
  let date=todayISO();
  function lastFor(id){ const l=lifts.find(x=>x.id===id); return l?l.history.slice(-1)[0].weight:0; }
  function bodyHTML(){
    const last=selId?lastFor(selId):null;
    const gain=last!=null?+(weight-last).toFixed(1):0;
    const smax=Math.max(100, Math.ceil((weight+20)/2.5)*2.5);
    const ticks=[0,.25,.5,.75,1].map(f=>Math.round(smax*f));
    return `
    <div class="fld"><div class="flabel">Ejercicio</div>
      <div class="chips" id="l-chips">
        ${lifts.map(l=>`<span class="chip ${selId===l.id?'on':''}" style="${selId===l.id?'background:'+ACC:''}" data-pick="lift" data-v="${l.id}">${esc(l.name)}</span>`).join('')}
      </div>
      <div class="rowinp" style="margin-top:11px;border:1.5px dashed ${tint(ACC,'80')}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${ACC}" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <input id="l-new" placeholder="Crear ejercicio nuevo…" value="${esc(newName)}" style="flex:1;background:none;border:none;color:${ACC};font-weight:600;font-size:14.5px;font-family:inherit;outline:none"></div>
    </div>
    <div class="fld"><div class="flabel">Peso levantado</div>
      <div style="border-radius:20px;background:rgba(255,255,255,.04);border:1.5px solid var(--line);padding:16px">
        <div style="text-align:center;display:flex;align-items:baseline;justify-content:center;gap:6px;margin-bottom:15px">
          <span class="fr" id="l-wval" style="font-weight:800;font-size:44px;letter-spacing:-2px;color:${ACC}">${fmtNum(weight)}</span>
          <span style="font-size:16px;font-weight:500;color:rgba(242,244,248,.5)">kg</span></div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="stepbtn" style="background:rgba(255,255,255,.06)" data-pick="dec"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2F4F8" stroke-width="2.8" stroke-linecap="round"><path d="M5 12h14"/></svg></div>
          <input type="range" class="wslider" id="l-slider" min="0" max="${smax}" step="2.5" value="${weight}">
          <div class="stepbtn" style="background:${tint(ACC,'2E')}" data-pick="inc"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${ACC}" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
        </div>
        <div class="wticks">${ticks.map(t=>`<span>${t}</span>`).join('')}</div>
      </div>
      ${last!=null?`<div id="l-gain" style="font-size:12.5px;font-weight:500;color:rgba(242,244,248,.45);margin:10px 4px 0">Última carga: ${fmtNum(last)} kg · <span style="color:${gain<0?C.danger:C.green}">${gain>=0?'+':''}${gain.toFixed(1)} kg</span></div>`:''}
    </div>
    <div class="fld"><div class="flabel">Fecha</div>
      <div class="rowinp"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${ACC}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="4"/><path d="M8 3v4M16 3v4M3.4 10.5h17.2"/></svg>
        <input type="date" id="l-date" value="${date}"></div></div>
    ${(selId && !newName.trim())?`<div class="delbtn" data-act="lift-delete" data-id="${selId}">Eliminar ejercicio</div>`:''}`;
  }
  function syncWeight(){
    const wv=overlay.querySelector('#l-wval'); if(wv) wv.textContent=fmtNum(weight);
    const sl=overlay.querySelector('#l-slider');
    if(sl){ if(+sl.value!==weight) sl.value=weight; const pct=sl.max>0?weight/(+sl.max)*100:0;
      sl.style.background=`linear-gradient(90deg,${ACC} 0%,${ACC} ${pct}%,rgba(255,255,255,0.1) ${pct}%,rgba(255,255,255,0.1) 100%)`; }
    const g=overlay.querySelector('#l-gain'), last=selId?lastFor(selId):null;
    if(g&&last!=null){ const gain=+(weight-last).toFixed(1);
      g.innerHTML=`Última carga: ${fmtNum(last)} kg · <span style="color:${gain<0?C.danger:C.green}">${gain>=0?'+':''}${gain.toFixed(1)} kg</span>`; }
  }
  function rerender(){ const b=overlay.querySelector('.mbody'); if(b){ b.innerHTML=bodyHTML(); syncWeight(); } }
  openModal('Cargar peso',bodyHTML(),ACC,()=>{
    const nm=overlay.querySelector('#l-new');
    const newN=nm?nm.value.trim():'';
    const dt=overlay.querySelector('#l-date').value||todayISO();
    if(!validateForm([['#l-new', !!(newN||selId), 'Elegí un ejercicio o creá uno nuevo.']])) return;
    if(newN){
      const color=PALETTE[state.gym.lifts.length%PALETTE.length];
      state.gym.lifts.push({id:uid(),name:newN,unit:'kg',color,history:[{date:dt,weight}]});
    } else {
      const l=state.gym.lifts.find(x=>x.id===selId); l.history.push({date:dt,weight});
    }
    closeModal(); commit();
  });
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk) return;
    const nm=overlay.querySelector('#l-new'); if(nm) newName=nm.value;
    const dt=overlay.querySelector('#l-date'); if(dt) date=dt.value;
    if(pk.dataset.pick==='lift'){ selId=pk.dataset.v; newName=''; weight=lastFor(selId); rerender(); }
    if(pk.dataset.pick==='inc'){ weight=+(weight+2.5).toFixed(1); rerender(); }
    if(pk.dataset.pick==='dec'){ weight=Math.max(0,+(weight-2.5).toFixed(1)); rerender(); }
  });
  onOverlay('input',e=>{
    if(e.target.id==='l-new'){ newName=e.target.value; }
    if(e.target.id==='l-slider'){ weight=+e.target.value; syncWeight(); }
  });
  syncWeight();
}

/* ---- gym type create modal ---- */
function typeCreateModal(typeObj){
  const editing=!!typeObj, t=typeObj||{name:'',color:C.rose};
  let color=t.color;
  const body=`
    <div class="fld"><div class="flabel">Nombre</div><input class="inp" id="ty-name" placeholder="Ej: Espalda y bíceps" value="${esc(t.name)}"></div>
    <div class="fld"><div class="flabel">Color</div><div class="colordots" id="ty-colors">
      ${PALETTE.map(c=>`<div class="cdot" data-pick="color" data-v="${c}" style="background:${c};${color===c?'box-shadow:0 0 0 3.5px '+tint(c,'73'):''}">${color===c?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':''}</div>`).join('')}
    </div></div>`;
  openModal(editing?'Editar tipo':'Nuevo tipo',body,C.rose,()=>{
    const name=mq('#ty-name').value.trim();
    if(!validateForm([['#ty-name', !!name, 'Poné un nombre para el tipo de entreno.']])) return;
    if(editing){ const o=state.gym.customTypes.find(x=>x.id===t.id); const old=o.name; o.name=name; o.color=color;
      if(old!==name) Object.values(state.gym.weekPlans).forEach(p=>p.forEach(d=>{if(d.type===old)d.type=name;}));
    }
    else state.gym.customTypes.push({id:uid(),name,color});
    closeModal(); save(); manageTypesModal();
  },editing?'Guardar':'Agregar');
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk||pk.dataset.pick!=='color') return;
    color=pk.dataset.v; overlay.querySelectorAll('#ty-colors .cdot').forEach(el=>{const on=el.dataset.v===color;el.style.boxShadow=on?'0 0 0 3.5px '+tint(color,'73'):'';el.innerHTML=on?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':'';});
  });
}

/* ---- manage types screen ---- */
function manageTypesModal(){
  const custom=state.gym.customTypes;
  let body=`<div class="fld"><div style="display:flex;align-items:center;justify-content:space-between">
      <div class="flabel" style="margin:0">Tipos de entrenamiento</div>
      <div style="width:36px;height:36px;border-radius:12px;background:${C.rose};display:grid;place-items:center;cursor:pointer" data-act="type-new">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
    </div>`;
  if(custom.length){
    body+=`<div class="card" style="overflow:hidden;padding:0">`+custom.map(t=>`
      <div class="managerow">
        <span style="width:11px;height:11px;border-radius:50%;background:${t.color};flex-shrink:0"></span>
        <span style="flex:1;font-weight:600;font-size:15.5px">${esc(t.name)}</span>
        <div style="display:flex;gap:8px">
          <div class="iconcirc" data-act="type-edit" data-id="${t.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>
          <div class="iconcirc" data-act="type-delete" data-id="${t.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
        </div></div>`).join('')+`</div>`;
  } else body+=`<div class="empty">No hay tipos. Tocá + para agregar uno.</div>`;
  body+=`<div style="font-size:12.5px;color:rgba(242,244,248,.42);margin:8px 4px 0;line-height:1.5">"Descanso" siempre está disponible como día libre y no se puede borrar.</div></div>`;
  openModal('Tipos de entrenamiento',body,null,null);
}
