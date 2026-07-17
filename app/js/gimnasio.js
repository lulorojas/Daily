"use strict";
/* ----------------------------- GYM ----------------------------- */
function weekKey(offset){ return iso(addDays(mondayOf(todayD()), offset*7)); }
function getWeekPlan(offset){
  const k=weekKey(offset);
  if(!state.gym.weekPlans[k]) state.gym.weekPlans[k]=DOW_SHORT.map(()=>({type:REST,done:false}));
  return state.gym.weekPlans[k];
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
  const weekText=isCur?'esta semana':range;

  let h=`<div class="view"><div class="head"><h1>Gimnasio</h1>
    <div class="sub">${doneCount} de ${trainingDays.length} entrenamientos · ${weekText}</div></div><div class="body">`;

  // plan semanal
  h+=`<div><div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px 10px">
    <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">PLAN SEMANAL</span>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="navbtn" style="width:30px;height:30px" data-act="gym-prev"><svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10l8 8"/></svg></div>
      <span class="fr" style="font-weight:600;font-size:13px;color:${C.yellow};min-width:84px;text-align:center">${weekLabel}</span>
      <div class="navbtn" style="width:30px;height:30px" data-act="gym-next"><svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l8 8-8 8"/></svg></div>
    </div></div>
    <div class="card" style="padding:4px 6px">`;
  plan.forEach((d,i)=>{
    const rest=d.type===REST, col=typeColor(d.type);
    const exp=ui.gymExpand===i;
    const doneBg=d.done?(rest?'rgba(255,255,255,0.06)':tint(col,'1A')):'transparent';
    h+=`<div><div class="wrow" style="background:${doneBg}">
      <span class="daytag">${DOW_SHORT[i]}</span>
      <div class="pill" style="background:${exp?tint(col,'28'):tint(col,'18')};border:1.5px solid ${tint(col,'55')}" data-act="gym-expand" data-i="${i}">
        <span style="width:9px;height:9px;border-radius:50%;background:${col};flex-shrink:0"></span>
        <span class="pt" style="color:${d.done&&!rest?col:(rest?'rgba(244,244,251,0.5)':'#F4F4FB')}">${esc(d.type)}</span>
        <svg style="transform:rotate(${exp?180:0}deg);transition:transform .2s;flex-shrink:0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.4)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="gcheck ${d.done?'on':''}" style="border:${d.done?'none':'2px solid rgba(244,244,251,0.18)'};background:${d.done?col:'rgba(255,255,255,0.04)'}" data-act="gym-toggle" data-i="${i}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg></div>
    </div>`;
    if(exp){
      h+=`<div class="optchips">`+allTypes().map(t=>{
        const active=t.name===d.type, tc=t.color;
        return `<span class="optchip" style="font-weight:${active?800:600};color:${active?'#0E0F22':tc};background:${active?tc:tint(tc,'20')};border:1.5px solid ${active?'transparent':tint(tc,'55')}" data-act="gym-settype" data-i="${i}" data-type="${esc(t.name)}">${esc(t.name)}</span>`;
      }).join('')+`</div>`;
    }
    h+=`</div>`;
  });
  h+=`</div>
    <div style="margin-top:10px"><div class="dashed" style="border:1.5px dashed ${tint(C.green,'73')};background:${tint(C.green,'12')};color:${C.green}" data-act="gym-managetypes">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${C.green}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Administrar tipos</div></div>
  </div>`;

  // entrada a la biblioteca de rutinas (sub-pantalla)
  const nRut=state.gym.routines.length;
  h+=`<div><div class="sectlabel">RUTINAS</div>
    <div class="softcard evt" data-act="rut-open-lib">
      <div style="width:38px;height:38px;border-radius:12px;background:${tint(C.purple,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${C.purple}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM9 7.5h7M9 11h5"/></svg></div>
      <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:15px">Mis rutinas</div>
        <div style="font-size:12.5px;color:rgba(244,244,251,0.5);margin-top:1px">${nRut?nRut+(nRut===1?' rutina guardada':' rutinas guardadas'):'Todavía no creaste ninguna'}</div></div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.35)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
    </div></div>`;

  // seguimiento de pesos
  h+=`<div><div class="sectlabel">SEGUIMIENTO DE PESOS</div><div style="display:flex;flex-direction:column;gap:10px">`;
  state.gym.lifts.forEach(l=>{ h+=liftCard(l); });
  h+=`<div class="dashed" style="border:1.5px dashed ${tint(C.green,'73')};background:${tint(C.green,'12')};color:${C.green}" data-act="lift-new">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${C.green}" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Agregar ejercicio</div>`;
  h+=`</div></div>`;

  // peso corporal
  h+=bodyWeightSection();

  // constancia (mapa de días entrenados — con navegación por meses)
  const hist=gymHistory();
  const WEEKS=16;
  const doneByDate={}; hist.forEach(x=>{ if(!doneByDate[x.date]) doneByDate[x.date]=x.type; });
  const curMon=mondayOf(todayD());
  let minEnd=0;
  if(hist.length){ const firstMon=mondayOf(parseISO(hist[hist.length-1].date));
    minEnd=Math.min(0, Math.round((firstMon-curMon)/(7*86400000))+(WEEKS-1)); }
  if(ui.constEnd<minEnd) ui.constEnd=minEnd;
  if(ui.constEnd>0) ui.constEnd=0;
  const endMon=addDays(curMon,ui.constEnd*7), startMon=addDays(endMon,-(WEEKS-1)*7), tISO2=todayISO();
  const yTag=dd=>dd.getFullYear()!==todayD().getFullYear()?" '"+String(dd.getFullYear()).slice(2):'';
  const rangeLabel=MONTHS[startMon.getMonth()].slice(0,3)+yTag(startMon)+' – '+MONTHS[endMon.getMonth()].slice(0,3)+yTag(endMon);
  const arrowSvg=dir=>`<svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${dir==='prev'?'M10 2L2 10l8 8':'M2 2l8 8-8 8'}"/></svg>`;
  h+=`<div><div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px 11px">
    <div style="display:flex;align-items:baseline;gap:8px">
      <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">CONSTANCIA</span>
      <span style="font-size:12px;font-weight:700;color:rgba(244,244,251,0.35)">${hist.length} ${hist.length===1?'entrenamiento':'entrenamientos'}</span></div>
    ${hist.length?`<div style="display:flex;align-items:center;gap:8px">
      <div class="navbtn" style="width:30px;height:30px;${ui.constEnd<=minEnd?'opacity:.3;pointer-events:none':''}" data-act="const-prev">${arrowSvg('prev')}</div>
      <span class="fr" style="font-weight:600;font-size:12.5px;color:${C.yellow};min-width:88px;text-align:center">${rangeLabel}</span>
      <div class="navbtn" style="width:30px;height:30px;${ui.constEnd>=0?'opacity:.3;pointer-events:none':''}" data-act="const-next">${arrowSvg('next')}</div>
    </div>`:''}</div>`;
  if(hist.length){
    let months='',lastMo=-1;
    for(let w=0;w<WEEKS;w++){ const mo=addDays(startMon,w*7).getMonth(), show=mo!==lastMo; lastMo=mo;
      months+=`<div style="font-size:8.5px;font-weight:700;color:rgba(244,244,251,0.32);white-space:nowrap;overflow:hidden">${show?MONTHS[mo].slice(0,3):''}</div>`; }
    let rows='';
    for(let d=0;d<7;d++){ let cells='';
      for(let w=0;w<WEEKS;w++){ const cISO=iso(addDays(startMon,w*7+d));
        let bg='rgba(255,255,255,0.05)',extra='';
        if(cISO>tISO2) bg='transparent';
        else if(doneByDate[cISO]) bg=typeColor(doneByDate[cISO]);
        if(cISO===tISO2) extra='box-shadow:inset 0 0 0 1.5px rgba(244,244,251,0.55)';
        cells+=`<div style="height:13px;border-radius:4px;background:${bg};${extra}"></div>`; }
      rows+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <span style="width:12px;font-family:'Fredoka',sans-serif;font-size:9px;font-weight:600;color:rgba(244,244,251,0.4);text-align:center;flex-shrink:0">${DOW_MINI[d]}</span>
        <div style="flex:1;display:grid;grid-template-columns:repeat(${WEEKS},1fr);gap:3px">${cells}</div></div>`; }
    h+=`<div class="card" style="padding:14px 15px 13px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="width:12px;flex-shrink:0"></span>
        <div style="flex:1;display:grid;grid-template-columns:repeat(${WEEKS},1fr);gap:3px">${months}</div></div>
      ${rows}
      <div style="font-size:11px;font-weight:600;color:rgba(244,244,251,0.4);margin-top:11px;line-height:1.4">Cada día entrenado toma el color de su tipo · el recuadro marca hoy.</div>
    </div>`;
  } else h+=`<div class="card" style="padding:6px 16px"><div class="empty">Marcá un entrenamiento como hecho para verlo acá.</div></div>`;
  h+=`</div>`;

  // ranking
  const counts={};
  hist.forEach(x=>counts[x.type]=(counts[x.type]||0)+1);
  const ranked=Object.keys(counts).map(t=>({type:t,count:counts[t]})).sort((a,b)=>b.count-a.count);
  if(ranked.length){
    const max=Math.max(...ranked.map(r=>r.count));
    h+=`<div><div class="sectlabel">RANKING POR TIPO</div><div class="card" style="padding:16px 16px 8px">`+
      ranked.map((r,i)=>{const col=typeColor(r.type);return `<div class="rankrow">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:7px">
          <span class="ranknum" style="color:${col};background:${tint(col,'24')}">${i+1}</span>
          <span class="fr" style="flex:1;font-weight:600;font-size:14px">${esc(r.type)}</span>
          <span class="fr" style="font-weight:600;font-size:13px;color:${col}">${r.count} ${r.count===1?'vez':'veces'}</span></div>
        <div class="bartrack"><div style="height:100%;border-radius:99px;background:${col};width:${Math.round(r.count/max*100)}%"></div></div></div>`;}).join('')+
      `</div></div>`;
  }

  h+=`</div></div>`;
  return h;
}
function liftCard(l){
  const data=l.history.map(p=>p.weight);
  const cur=data[data.length-1], gain=cur-data[0];
  return `<div class="lift softcard" data-act="lift-open" data-id="${l.id}">
    <div style="display:flex;align-items:center;gap:13px">
      <div style="flex:1;min-width:0"><div class="nm">${esc(l.name)}</div>
        <div style="display:flex;align-items:baseline;gap:5px;margin-top:2px">
          <span class="wt" style="color:${l.color}">${fmtNum(cur)}</span>
          <span style="font-size:12px;color:rgba(244,244,251,0.5)">${esc(l.unit||'kg')}</span>
          ${data.length>1?`<span class="delta" style="color:${gain<0?C.coral:C.green};background:${gain<0?tint(C.coral,'29'):'rgba(6,214,160,0.16)'}">${gain>=0?'+':''}${fmtNum(gain)} kg</span>`:''}
        </div></div>
      ${sparkline(data,l.color,118,44,{style:'flex-shrink:0'})}
    </div>
    <div class="delx" data-act="lift-delete" data-id="${l.id}" data-stop="1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.4)" stroke-width="2.8" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
  </div>`;
}

/* ============================ PESO CORPORAL ============================
   Métrica propia, separada del peso que se levanta en cada ejercicio (state.gym.lifts).
   Cada registro es { id, date, kg }. Se listan siempre ordenados por fecha. */
function bodyList(){ return state.gym.bodyWeights.slice().sort((a,b)=>a.date<b.date?-1:1); }

function bodyWeightSection(){
  const log=bodyList(), col=C.cyan;
  let h=`<div><div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px 10px">
    <div style="display:flex;align-items:baseline;gap:8px">
      <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">PESO CORPORAL</span>
      ${log.length?`<span style="font-size:12px;font-weight:700;color:rgba(244,244,251,0.35)">${log.length} ${log.length===1?'registro':'registros'}</span>`:''}</div>
    ${log.length?`<div class="iconcirc" data-act="body-manage"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>`:''}
  </div>`;

  if(log.length){
    const data=log.map(p=>p.kg), cur=data[data.length-1], gain=+(cur-data[0]).toFixed(1);
    const last=log[log.length-1];
    h+=`<div class="card" style="padding:16px">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
        <div><div style="display:flex;align-items:baseline;gap:5px">
          <span class="fr" style="font-weight:700;font-size:34px;color:${col}">${fmtNum(cur)}</span>
          <span style="font-size:14px;font-weight:700;color:rgba(244,244,251,0.5)">kg</span>
          ${data.length>1?`<span class="delta" style="color:${gain<0?C.coral:C.green};background:${gain<0?tint(C.coral,'29'):'rgba(6,214,160,0.16)'}">${gain>=0?'+':''}${fmtNum(gain)} kg</span>`:''}
        </div>
        <div style="font-size:12px;font-weight:600;color:rgba(244,244,251,0.45);margin-top:3px">Último registro · ${shortDate(last.date)}</div></div>
      </div>
      ${data.length>1?`<div style="margin-top:14px">${sparkline(data,col,300,86,{padX:6,padY:10,style:'width:100%;height:86px',r:3.6})}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:rgba(244,244,251,0.35);margin-top:6px">
        <span>${shortDate(log[0].date)}</span><span>${shortDate(last.date)}</span></div>`
      :`<div style="font-size:12px;font-weight:600;color:rgba(244,244,251,0.4);margin-top:10px">Cargá otro registro para ver la tendencia.</div>`}
    </div>`;
  } else {
    h+=`<div class="card" style="padding:6px 16px"><div class="empty">Todavía no registraste tu peso.</div></div>`;
  }
  h+=`<div style="margin-top:10px"><div class="dashed" style="border:1.5px dashed ${tint(col,'73')};background:${tint(col,'12')};color:${col}" data-act="body-new">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>Registrar peso</div></div>`;
  return h+`</div>`;
}

/* ---- registrar / editar peso corporal ---- */
function bodyModal(rec){
  const editing=!!rec;
  const r=rec||{kg:'',date:todayISO()};
  const col=C.cyan;
  const bdp=dpState(r.date);
  const body=`
    <div class="fld"><div class="flabel">PESO <span class="opt">· kg</span></div>
      <input class="inp" id="b-kg" inputmode="decimal" placeholder="Ej: 72.5" value="${r.kg===''?'':fmtNum(r.kg)}"></div>
    <div class="fld"><div class="flabel">FECHA</div>
      ${dateField('b',col,bdp)}</div>
    ${editing?`<div class="delbtn" data-act="body-delete" data-id="${r.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar registro</div>`:''}`;
  openModal(editing?'Editar registro':'Registrar peso',body,col,()=>{
    const raw=mq('#b-kg').value.trim().replace(',','.');
    const kg=Number(raw);
    // Tiene que ser un número real y positivo: un peso vacío, con letras o <= 0 no es un peso.
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
  const log=bodyList().reverse(); // más recientes primero
  let body=`
    <div class="fld"><div style="display:flex;align-items:center;justify-content:space-between">
      <div><div class="fr" style="font-size:24px;font-weight:600">Mis registros</div>
      <div style="font-size:14px;color:rgba(244,244,251,0.55);margin-top:4px">${log.length} ${log.length===1?'registro':'registros'} · tocá para editar o borrar</div></div>
      <div style="width:40px;height:40px;border-radius:14px;background:${C.cyan};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(34,195,230,0.35)" data-act="body-new">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E0F22" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
    </div></div>`;
  body+=`<div class="fld"><div class="flabel">HISTORIAL DE PESO</div>`;
  if(log.length){
    body+=`<div class="card" style="overflow:hidden;padding:0">`+log.map(r=>`
      <div class="managerow">
        <span class="fr" style="font-weight:700;font-size:15.5px;color:${C.cyan};min-width:62px">${fmtNum(r.kg)} kg</span>
        <span style="flex:1;font-size:13px;color:rgba(244,244,251,0.5)">${fmtDateLong(r.date)}</span>
        <div style="display:flex;gap:8px">
          <div class="iconcirc" data-act="body-edit" data-id="${r.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>
          <div class="iconcirc" data-act="body-delete" data-id="${r.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
        </div></div>`).join('')+`</div>`;
  } else body+=`<div class="empty">Todavía no registraste tu peso.</div>`;
  body+=`</div>`;
  openModal('Peso corporal',body,null,null);
}

/* ---- lift (cargar peso) modal ---- */
function liftModal(existing){
  // existing = lift to default-select (or null)
  let lifts=state.gym.lifts;
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
    <div class="fld"><div class="flabel">EJERCICIO</div>
      <div class="chips" id="l-chips">
        ${lifts.map(l=>`<span class="chip ${selId===l.id?'on':''}" style="${selId===l.id?'background:'+C.yellow:''}" data-pick="lift" data-v="${l.id}">${esc(l.name)}</span>`).join('')}
      </div>
      <div class="rowinp" style="margin-top:11px;border:1.5px dashed ${tint(C.yellow,'80')}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${C.yellow}" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <input id="l-new" placeholder="Crear ejercicio nuevo…" value="${esc(newName)}" style="flex:1;background:none;border:none;color:${C.yellow};font-weight:600;font-size:14.5px;font-family:inherit;outline:none"></div>
    </div>
    <div class="fld"><div class="flabel">PESO</div>
      <div style="background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:16px 16px 14px">
        <div style="text-align:center;display:flex;align-items:baseline;justify-content:center;gap:6px;margin-bottom:15px">
          <span class="fr" id="l-wval" style="font-weight:700;font-size:40px;color:${C.yellow}">${fmtNum(weight)}</span>
          <span style="font-size:16px;font-weight:700;color:rgba(244,244,251,0.5)">kg</span></div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="stepbtn" style="background:rgba(255,255,255,0.06)" data-pick="dec"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4F4FB" stroke-width="2.8" stroke-linecap="round"><path d="M5 12h14"/></svg></div>
          <input type="range" class="wslider" id="l-slider" min="0" max="${smax}" step="2.5" value="${weight}">
          <div class="stepbtn" style="background:${tint(C.yellow,'2E')}" data-pick="inc"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.yellow}" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
        </div>
        <div class="wticks">${ticks.map(t=>`<span>${t}</span>`).join('')}</div>
        <div style="text-align:center;font-size:11px;font-weight:700;color:rgba(244,244,251,0.35);margin-top:9px">Arrastrá la barra · cada paso 2.5 kg</div>
      </div>
      ${last!=null?`<div id="l-gain" style="font-size:12.5px;font-weight:700;color:rgba(244,244,251,0.45);margin:10px 4px 0">Último registro: ${fmtNum(last)} kg · <span style="color:${gain<0?C.coral:C.green}">${gain>=0?'+':''}${gain.toFixed(1)} kg</span></div>`:''}
    </div>
    <div class="fld"><div class="flabel">FECHA</div>
      <div class="rowinp"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${C.yellow}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
        <input type="date" id="l-date" value="${date}"></div></div>
    ${(selId && !newName.trim())?`<div class="delbtn" data-act="lift-delete" data-id="${selId}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>Eliminar ejercicio</div>`:''}`;
  }
  function syncWeight(){
    const wv=overlay.querySelector('#l-wval'); if(wv) wv.textContent=fmtNum(weight);
    const sl=overlay.querySelector('#l-slider');
    if(sl){ if(+sl.value!==weight) sl.value=weight; const pct=sl.max>0?weight/(+sl.max)*100:0;
      sl.style.background=`linear-gradient(90deg,${C.yellow} 0%,${C.yellow} ${pct}%,rgba(255,255,255,0.1) ${pct}%,rgba(255,255,255,0.1) 100%)`; }
    const g=overlay.querySelector('#l-gain'), last=selId?lastFor(selId):null;
    if(g&&last!=null){ const gain=+(weight-last).toFixed(1);
      g.innerHTML=`Último registro: ${fmtNum(last)} kg · <span style="color:${gain<0?C.coral:C.green}">${gain>=0?'+':''}${gain.toFixed(1)} kg</span>`; }
  }
  function rerender(){ const b=overlay.querySelector('.mbody'); if(b){ b.innerHTML=bodyHTML(); syncWeight(); } }
  openModal('Cargar peso',bodyHTML(),C.yellow,()=>{
    const nm=overlay.querySelector('#l-new');
    const newN=nm?nm.value.trim():'';
    const dt=overlay.querySelector('#l-date').value||todayISO();
    // Sin ejercicio elegido ni nombre nuevo no hay a qué cargarle el peso.
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
    // preserve typed values before rerender
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
  const editing=!!typeObj;
  const t=typeObj||{name:'',color:C.blue};
  let color=t.color;
  const body=`
    <div class="fld"><div class="flabel">NOMBRE</div><input class="inp" id="ty-name" placeholder="Ej: Espalda y bíceps" value="${esc(t.name)}"></div>
    <div class="fld"><div class="flabel">COLOR</div><div class="colordots" id="ty-colors">
      ${PALETTE.map(c=>`<div class="cdot" data-pick="color" data-v="${c}" style="background:${c};${color===c?'box-shadow:0 0 0 3.5px '+tint(c,'73'):''}">${color===c?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':''}</div>`).join('')}
    </div></div>`;
  openModal(editing?'Editar tipo':'Nuevo tipo',body,C.green,()=>{
    const name=mq('#ty-name').value.trim();
    if(!validateForm([['#ty-name', !!name, 'Poné un nombre para el tipo de entreno.']])) return;
    if(editing){ const o=state.gym.customTypes.find(x=>x.id===t.id); const old=o.name; o.name=name; o.color=color;
      // keep references in plans pointing to renamed type
      if(old!==name) Object.values(state.gym.weekPlans).forEach(p=>p.forEach(d=>{if(d.type===old)d.type=name;}));
    }
    else state.gym.customTypes.push({id:uid(),name,color});
    closeModal(); save(); manageTypesModal();
  },editing?'Guardar':'Agregar');
  onOverlay('click',e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk||pk.dataset.pick!=='color') return;
    color=pk.dataset.v; overlay.querySelectorAll('#ty-colors .cdot').forEach(el=>{const on=el.dataset.v===color;el.style.boxShadow=on?'0 0 0 3.5px '+tint(color,'73'):'';el.innerHTML=on?'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>':'';});
  });
}

/* ---- manage types screen ---- */
function manageTypesModal(){
  const custom=state.gym.customTypes;
  let body=`
    <div class="fld"><div style="display:flex;align-items:center;justify-content:space-between">
      <div><div class="fr" style="font-size:24px;font-weight:600">Mis tipos</div>
      <div style="font-size:14px;color:rgba(244,244,251,0.55);margin-top:4px">${custom.length} ${custom.length===1?'tipo':'tipos'} · tocá para editar o borrar</div></div>
      <div style="width:40px;height:40px;border-radius:14px;background:${C.green};display:flex;align-items:center;justify-content:center;box-shadow:0 8px 18px rgba(6,214,160,0.35)" data-act="type-new">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E0F22" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
    </div></div>`;
  body+=`<div class="fld"><div class="flabel">TIPOS DE ENTRENAMIENTO</div>`;
  if(custom.length){
    body+=`<div class="card" style="overflow:hidden;padding:0">`+custom.map(t=>`
      <div class="managerow">
        <span style="width:11px;height:11px;border-radius:50%;background:${t.color};flex-shrink:0"></span>
        <span class="fr" style="flex:1;font-weight:600;font-size:15.5px">${esc(t.name)}</span>
        <div style="display:flex;gap:8px">
          <div class="iconcirc" data-act="type-edit" data-id="${t.id}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div>
          <div class="iconcirc" data-act="type-delete" data-id="${t.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
        </div></div>`).join('')+`</div>`;
  } else body+=`<div class="empty">No hay tipos. Tocá + para agregar uno.</div>`;
  body+=`</div>`;
  body+=`<div class="fld"><div style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:rgba(244,244,251,0.42);margin:0 4px;line-height:1.5">
    <span style="width:10px;height:10px;border-radius:50%;background:rgba(244,244,251,0.4);flex-shrink:0"></span>
    "Descanso" siempre está disponible como día libre y no se puede borrar.</div></div>`;
  openModal('Tipos de entrenamiento',body,null,null);
}

