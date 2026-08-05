"use strict";
/* ----------------------------- PROGRESO -----------------------------
   Tablero de solo lectura: consolida métricas que ya viven en Gimnasio y Hábitos.
   No guarda nada ni agrega colecciones a daily.v2. Acento: turquesa. */

const PROG_PERIODS = [['semana','Semana',7],['mes','Mes',30],['ano','Año',365],['todo','Todo',null]];
function progStart(key){ const p=PROG_PERIODS.find(x=>x[0]===key)||PROG_PERIODS[1]; return p[2]==null?null:iso(addDays(todayD(),-(p[2]-1))); }
function progLabel(key){ const p=PROG_PERIODS.find(x=>x[0]===key)||PROG_PERIODS[1]; return p[1]; }
function inPeriod(dISO,startISO){ return !startISO || dISO>=startISO; }
function progPeriodNote(key){ return { semana:'en los últimos 7 días', mes:'en los últimos 30 días', ano:'en el último año', todo:'todavía' }[key]||''; }

const PROG_WMIN=8, PROG_WMAX=26;
function progWeekWindow(per,dates){
  const curMon=mondayOf(todayD());
  const wks=from=>Math.round((curMon-mondayOf(parseISO(from)))/(7*86400000))+1;
  let n; const start=progStart(per);
  if(start) n=wks(start);
  else { const first=(dates||[]).filter(Boolean).sort()[0]; n=first?wks(first):PROG_WMIN; }
  n=Math.max(PROG_WMIN,Math.min(PROG_WMAX,n||PROG_WMIN));
  return { from:addDays(curMon,-(n-1)*7), weeks:n };
}

function progHabitBuckets(per){
  const t=todayD(), tISO=todayISO();
  const dayList=(from,n)=>{ const out=[]; for(let i=0;i<n;i++){ const d=iso(addDays(from,i)); if(d<=tISO) out.push(d); } return out; };
  if(per==='semana'||per==='mes'){
    const n=per==='semana'?7:30;
    return Array.from({length:n},(_,i)=>{ const d=addDays(t,-(n-1-i)); return { label:String(d.getDate()), days:[iso(d)] }; });
  }
  if(per==='ano'){
    const curMon=mondayOf(t);
    return Array.from({length:52},(_,i)=>{ const m=addDays(curMon,-(51-i)*7); return { label:m.getDate()+'/'+(m.getMonth()+1), days:dayList(m,7) }; });
  }
  const first=habitFirstISO(); if(!first) return [];
  const f=parseISO(first); const out=[]; let y=f.getFullYear(), m=f.getMonth();
  while(y<t.getFullYear() || (y===t.getFullYear() && m<=t.getMonth())){
    const days=new Date(y,m+1,0).getDate();
    out.push({ label:MONTHS[m].slice(0,3), days:dayList(new Date(y,m,1),days) });
    m++; if(m>11){ m=0; y++; }
  }
  return out;
}
// % de cumplimiento en un bucket: marcas hechas / marcas posibles (multi-check).
function bucketPct(days){
  const poss=habitDayPossible();
  if(!poss || !days.length) return null;
  const marks=days.reduce((a,d)=>a+habitDayMarks(d),0);
  return marks/(poss*days.length);
}

function progSelector(sel){
  return `<div class="periods" id="prog-periods">`+PROG_PERIODS.map(([k,lb])=>{
    const on=sel===k;
    return `<div class="period" style="${on?`background:${tint(C.teal,'2E')};color:${C.teal}`:''}" data-act="prog-period" data-p="${k}">${lb}</div>`;
  }).join('')+`</div>`;
}
function progEmpty(msg){ return `<div class="card" style="padding:16px"><div class="empty">${esc(msg)}</div></div>`; }

function viewProgreso(){
  const per=ui.progPeriod, start=progStart(per);
  let h=`<div class="view"><div class="head"><h1>Progreso</h1>
    <div class="sub">Tu evolución, en un solo lugar.</div>
    <div style="margin-top:16px">${progSelector(per)}</div></div><div class="body prog2">`;
  h+=progResumen(per,start);
  h+=progBodyWeight(per,start);
  h+=progRanking(per,start);
  h+=progBalance(per,start);
  h+=progFrecuencia(per,start);
  h+=progCargas(per,start);
  h+=progGymStreaks();
  h+=progCumplimiento(per);
  h+=progHeatmap(per);
  h+=progStreaks();
  return h+`</div></div>`;
}

/* ---- resumen: stat tiles ---- */
function progResumen(per,start){
  const tareas=state.items.filter(x=>x.kind==='tarea' && x.done).length;
  const entrenos=gymHistory().filter(x=>inPeriod(x.date,start)).length;
  const hoyTot=habitDayPossible(), hoyOk=habitDayMarks(todayISO());
  const tile=(ic,val,lb,col)=>`<div class="tile"><div class="ic" style="background:${tint(col,'24')};color:${col}">
    <svg viewBox="0 0 24 24" style="width:15px;height:15px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic}"/></svg></div>
    <span class="v">${val}</span><span class="l">${lb}</span></div>`;
  return `<div class="sect"><div class="sectlabel">Resumen</div>
    <div class="tiles">
      ${tile('M6.5 8.5v7M3.8 10.5v3M17.5 8.5v7M20.2 10.5v3M6.5 12h11',entrenos,'Entrenamientos',C.rose)}
      ${tile('M4.5 12.5 9 17l10.5-11',tareas,'Tareas hechas',C.amber)}
      ${tile('M13 2.8c.4 3-1.2 4.4-2.6 5.8C8.8 10.2 7 11.7 7 14.4a5 5 0 0 0 10 0c0-2.3-1.2-3.7-2-4.7-.3 1.2-1.1 1.9-1.8 2.1.6-3-1.5-5.3-.2-9Z',hoyTot?hoyOk+'/'+hoyTot:'—','Hábitos hoy',C.green)}
    </div></div>`;
}

/* ---- peso corporal: tendencia en el período ---- */
function progBodyWeight(per,start){
  const col=C.rose, log=bodyList();
  let h=`<div class="sect"><div class="sectlabel">Peso corporal</div>`;
  if(!log.length) return h+progEmpty('Cargá tu peso para ver la tendencia.')+`</div>`;
  const win=log.filter(r=>inPeriod(r.date,start));
  const cur=log[log.length-1], hayTend=win.length>1;
  const gain=hayTend?+(win[win.length-1].kg-win[0].kg).toFixed(1):0;
  h+=`<div class="bigcard">
    <div style="display:flex;align-items:flex-end;justify-content:space-between">
      <div style="display:flex;align-items:baseline;gap:7px">
        <span class="fr" style="font-weight:800;font-size:44px;line-height:.9;letter-spacing:-2px">${fmtNum(cur.kg)}</span>
        <span style="font-size:15px;font-weight:500;color:rgba(242,244,248,.45)">kg</span></div>
      ${hayTend?`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span style="padding:5px 10px;border-radius:99px;background:${tint(gain<0?C.green:C.danger,'29')};color:${gain<0?C.green:C.danger};font-size:12px;font-weight:600">${gain>=0?'+':''}${fmtNum(gain)} kg</span>
        <span style="font-size:11.5px;color:rgba(242,244,248,.35)">${progLabel(per).toLowerCase()}</span></div>`:''}
    </div>`;
  if(hayTend){
    h+=`${lineChart(win.map(r=>({date:r.date,v:r.kg})),col,320,110,{unit:'kg',style:'width:100%;height:110px'})}
      <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:500;color:rgba(242,244,248,.3)">
        <span>${shortDate(win[0].date)}</span><span>tocá un punto</span><span>${shortDate(win[win.length-1].date)}</span></div>`;
  } else {
    h+=`<div style="font-size:12.5px;color:rgba(242,244,248,.4);line-height:1.5">${win.length?'Un solo registro':'Sin registros'} ${progPeriodNote(per)}. Cargá otro para ver la tendencia.</div>`;
  }
  return h+`</div></div>`;
}

/* ---- entrenamientos por tipo (ranking) ---- */
function progRanking(per,start){
  const hist=gymHistory().filter(x=>inPeriod(x.date,start)), ranked=gymRanking(hist), total=hist.length;
  let h=`<div class="sect"><div style="display:flex;align-items:baseline;justify-content:space-between;margin:0 2px">
    <span class="sectlabel">Entrenamientos por tipo</span>
    ${total?`<span style="font-size:12px;color:rgba(242,244,248,.35)">${total} ${total===1?'sesión':'sesiones'} · ${progLabel(per).toLowerCase()}</span>`:''}</div>`;
  if(!ranked.length) return h+progEmpty('No marcaste entrenamientos '+progPeriodNote(per)+'.')+`</div>`;
  return h+`<div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:14px">`+rankingRows(ranked)+`</div></div>`;
}

/* ---- balance muscular: dona ---- */
function progBalance(per,start){
  const hist=gymHistory().filter(x=>inPeriod(x.date,start)), ranked=gymRanking(hist);
  let h=`<div class="sect"><div class="sectlabel">Balance muscular</div>`;
  if(!ranked.length) return h+progEmpty('No marcaste entrenamientos '+progPeriodNote(per)+'.')+`</div>`;
  const total=hist.length, slices=ranked.map(r=>({ value:r.count, color:typeColor(r.type) }));
  h+=`<div class="card" style="padding:18px;display:flex;align-items:center;gap:18px">
    <div style="position:relative;width:124px;height:124px;flex:none">${donut(slices,124,14)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <span class="fr" style="font-weight:800;font-size:25px;letter-spacing:-.8px;line-height:1">${total}</span>
        <span style="font-size:10.5px;color:rgba(242,244,248,.4)">${total===1?'sesión':'sesiones'}</span></div></div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:9px">`+ranked.map(r=>{
      const col=typeColor(r.type), pct=Math.round(r.count/total*100);
      return `<div style="display:flex;align-items:center;gap:8px">
        <span style="width:9px;height:9px;border-radius:3px;background:${col};flex:none"></span>
        <span style="flex:1;min-width:0;font-size:12.5px;color:rgba(242,244,248,.62);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.type)}</span>
        <span style="font-size:12.5px;font-weight:600">${pct}%</span></div>`;
    }).join('')+`</div></div></div>`;
  return h;
}

/* ---- frecuencia: entrenos por semana ---- */
function progFrecuencia(per,start){
  const hist=gymHistory();
  let h=`<div class="sect"><div class="sectlabel">Frecuencia de entrenamiento</div>`;
  if(!hist.length) return h+progEmpty('Marcá entrenamientos para ver tu frecuencia.')+`</div>`;
  const win=progWeekWindow(per,[hist[hist.length-1].date]);
  const counts=gymWeekCounts(hist.filter(x=>inPeriod(x.date,start)));
  const bars=Array.from({length:win.weeks},(_,i)=>{ const wk=iso(addDays(win.from,i*7)); return { wk, n:counts[wk]||0 }; });
  const max=Math.max(1,...bars.map(b=>b.n)), tot=bars.reduce((a,b)=>a+b.n,0);
  if(!tot) return h+progEmpty('No marcaste entrenamientos '+progPeriodNote(per)+'.')+`</div>`;
  const prom=(tot/win.weeks).toFixed(1).replace('.0','');
  h+=`<div class="card" style="padding:18px">
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:14px">
      <span class="fr" style="font-weight:800;font-size:26px;letter-spacing:-.9px;line-height:1">${prom}</span>
      <span style="font-size:13px;color:rgba(242,244,248,.45)">sesiones por semana</span></div>
    <div class="progbars">`+bars.map(b=>{
      const pct=b.n?Math.max(9,Math.round(b.n/max*100)):0;
      const col=b.n>=5?C.teal:(b.n>=3?tint(C.teal,'8C'):tint(C.teal,'40'));
      return `<div class="progbar" title="${b.n} · ${shortDate(b.wk)}"><div class="pbfill" style="height:${pct}%;background:${b.n?col:'transparent'}"></div></div>`;
    }).join('')+`</div></div></div>`;
  return h;
}

/* ---- progreso de cargas destacado ---- */
function progCargas(per,start){
  const gains=liftGains(start);
  let h=`<div class="sect"><div class="sectlabel">Progreso de carga</div>`;
  if(!state.gym.lifts.length) return h+progEmpty('Agregá ejercicios en Gimnasio para seguir tus cargas.')+`</div>`;
  if(!gains.length) return h+progEmpty('Necesitás al menos dos registros de un ejercicio '+progPeriodNote(per)+' para comparar.')+`</div>`;
  const top=gains[0], col=C.rose, signo=n=>(n>=0?'+':'')+fmtNum(n);
  h+=`<div class="agcard" style="background:linear-gradient(135deg,${tint(col,'2B')},${tint(col,'0A')});border:1px solid ${tint(col,'33')};padding:18px;gap:14px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between">
      <div style="display:flex;flex-direction:column;gap:3px"><span style="font-size:15px;font-weight:600">${esc(top.name)}</span>
        <span style="font-size:12px;color:rgba(242,244,248,.45)">Mejor progreso del período</span></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
        <span class="fr" style="font-weight:800;font-size:24px;letter-spacing:-.8px;line-height:1">${fmtNum(top.to)} ${esc(top.unit)}</span>
        <span style="font-size:12px;font-weight:600;color:${top.gain<0?C.danger:C.green}">${signo(top.gain)} ${esc(top.unit)}</span></div>
    </div>`;
  const resto=gains.slice(1,4);
  if(resto.length){
    h+=`<div style="padding-top:13px;border-top:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:8px">`+
      resto.map(g=>`<div style="display:flex;align-items:center;gap:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${g.color};flex:none"></span>
        <span style="flex:1;min-width:0;font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.name)}</span>
        <span style="font-weight:600;font-size:12.5px;color:${g.gain<0?C.danger:(g.gain>0?C.green:'rgba(242,244,248,.4)')}">${signo(g.gain)} ${esc(g.unit)}</span></div>`).join('')+`</div>`;
  }
  return h+`</div>`;
}

/* ---- rachas de entrenamiento, por tipo ---- */
function progGymStreaks(){
  const st=gymTypeStreaks();
  let h=`<div class="sect"><div style="display:flex;align-items:baseline;gap:8px;margin:0 2px"><span class="sectlabel">Rachas de entrenamiento</span><span style="font-size:12px;color:rgba(242,244,248,.35)">estado actual</span></div>`;
  if(!st.length) return h+progEmpty('Repetí un tipo de entreno dos semanas seguidas para arrancar una racha.')+`</div>`;
  h+=`<div class="card" style="overflow:hidden;padding:0">`+st.map(s=>{
    const col=typeColor(s.type), enRacha=s.weeks>=2;
    return `<div class="managerow">
      <span style="width:11px;height:11px;border-radius:50%;background:${col};flex:none"></span>
      <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px">${esc(s.type)}</div>
        <div style="font-size:12.5px;color:rgba(242,244,248,.5);margin-top:2px">${s.weeks} ${s.weeks===1?'semana seguida':'semanas seguidas'}${enRacha?'':' · una más y arranca la racha'}</div></div>
      ${enRacha?`<div class="streak" style="flex:none">${flame(col,13)}<span class="n" style="color:${col}">${s.weeks}</span></div>`:''}
    </div>`;
  }).join('')+`</div></div>`;
  return h;
}

/* ---- cumplimiento de hábitos por período ---- */
function progCumplimiento(per){
  let h=`<div class="sect"><div class="sectlabel">Cumplimiento de hábitos</div>`;
  if(!state.habits.length) return h+progEmpty('Todavía no creaste hábitos.')+`</div>`;
  const buckets=progHabitBuckets(per).map(b=>({ ...b, pct:bucketPct(b.days) }));
  const conDatos=buckets.filter(b=>b.pct!=null);
  if(!conDatos.length) return h+progEmpty('Marcá hábitos para ver tu cumplimiento.')+`</div>`;
  const prom=Math.round(conDatos.reduce((a,b)=>a+b.pct,0)/conDatos.length*100);
  const unidad={ semana:'por día', mes:'por día', ano:'por semana', todo:'por mes' }[per];
  h+=`<div class="card" style="padding:18px">
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:14px">
      <span class="fr" style="font-weight:800;font-size:26px;letter-spacing:-.9px;line-height:1;color:${C.green}">${prom}%</span>
      <span style="font-size:13px;color:rgba(242,244,248,.45)">promedio · ${unidad}</span></div>
    <div class="progbars">`+buckets.map(b=>{
      const p=b.pct==null?0:Math.round(b.pct*100);
      return `<div class="progbar" title="${b.label}: ${p}%"><div class="pbfill" style="height:${p?Math.max(6,p):0}%;background:${p?C.green:'transparent'}"></div></div>`;
    }).join('')+`</div></div></div>`;
  return h;
}

/* ---- heatmap de hábitos ---- */
function progHeatmap(per){
  let h=`<div class="sect"><div class="sectlabel">Mapa de hábitos</div>`;
  if(!state.habits.length) return h+progEmpty('Todavía no creaste hábitos.')+`</div>`;
  const win=progWeekWindow(per,[habitFirstISO()]), tISO=todayISO(), poss=habitDayPossible();
  const steps=['4D','80','B3','E6','FF'];
  let rows='';
  for(let d=0;d<7;d++){
    let cells='';
    for(let w=0;w<win.weeks;w++){
      const cISO=iso(addDays(win.from,w*7+d));
      let bg='rgba(255,255,255,.05)', extra='';
      if(cISO>tISO) bg='transparent';
      else if(poss){ const frac=habitDayMarks(cISO)/poss; if(frac>0) bg=tint(C.green, steps[Math.min(4,Math.ceil(frac*5)-1)]); }
      if(cISO===tISO) extra='box-shadow:inset 0 0 0 1.5px rgba(242,244,248,.55)';
      cells+=`<div style="height:15px;border-radius:4px;background:${bg};${extra}"></div>`;
    }
    rows+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
      <span style="width:12px;font-size:8.5px;font-weight:600;color:rgba(242,244,248,.3);text-align:center;flex:none">${DOW_MINI[d]}</span>
      <div style="flex:1;display:grid;grid-template-columns:repeat(${win.weeks},minmax(0,1fr));gap:3px">${cells}</div></div>`;
  }
  h+=`<div class="card" style="padding:16px 16px 14px">${rows}
    <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:500;color:rgba(242,244,248,.3);margin-top:10px">
      <span>menos</span>${steps.map(a=>`<span style="width:9px;height:9px;border-radius:2px;background:${tint(C.green,a)}"></span>`).join('')}<span>más</span>
      <span style="flex:1"></span><span>${win.weeks} semanas</span></div></div></div>`;
  return h;
}

/* ---- rachas de cada hábito (estado actual) ---- */
function progStreaks(){
  let h=`<div class="sect"><div style="display:flex;align-items:baseline;gap:8px;margin:0 2px"><span class="sectlabel">Rachas</span><span style="font-size:12px;color:rgba(242,244,248,.35)">estado actual</span></div>`;
  if(!state.habits.length) return h+progEmpty('Todavía no creaste hábitos.')+`</div>`;
  h+=`<div class="card" style="overflow:hidden;padding:0">`+state.habits.map(hb=>{
    const cur=habitStreak(hb.id), best=habitBestStreak(hb.id), dias=n=>n+' '+(n===1?'día':'días');
    return `<div class="managerow">
      <div class="iconwrap" style="width:36px;height:36px;background:${tint(hb.color,'24')};flex:none">${iconSvg(hb,20)}</div>
      <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px">${esc(hb.name)}</div>
        <div style="font-size:12.5px;color:rgba(242,244,248,.5);margin-top:2px">${cur>0?'Racha de '+dias(cur):'Sin racha activa'} · récord ${dias(best)}</div></div>
      ${cur>0?`<div class="streak" style="flex:none">${flame(hb.color,13)}<span class="n" style="color:${hb.color}">${cur}</span></div>`:''}
    </div>`;
  }).join('')+`</div></div>`;
  return h;
}
