"use strict";
/* ----------------------------- PROGRESO -----------------------------
   Tablero de solo lectura: consolida métricas que ya viven en Gimnasio y Hábitos.
   No guarda nada ni agrega colecciones a daily.v2 — todo se calcula al vuelo sobre
   lo que esas secciones ya persisten. Para editar algo, se va a su sección. */

// Ventana móvil hacia atrás desde hoy: "semana" son los últimos 7 días (hoy incluido),
// así la métrica no se desploma los lunes ni los días 1 de cada mes.
const PROG_PERIODS = [['semana','Semana',7],['mes','Mes',30],['ano','Año',365],['todo','Todo',null]];
// Devuelve el primer día del período, o null para "todo" (sin recorte).
function progStart(key){
  const p=PROG_PERIODS.find(x=>x[0]===key)||PROG_PERIODS[1];
  return p[2]==null ? null : iso(addDays(todayD(),-(p[2]-1)));
}
function progLabel(key){ const p=PROG_PERIODS.find(x=>x[0]===key)||PROG_PERIODS[1]; return p[1]; }
function inPeriod(dISO,startISO){ return !startISO || dISO>=startISO; }
// Texto para los estados vacíos, que cambia según si el recorte es el culpable.
function progPeriodNote(key){
  return { semana:'en los últimos 7 días', mes:'en los últimos 30 días', ano:'en el último año', todo:'todavía' }[key]||'';
}

/* ---- ventana de semanas para el heatmap y la frecuencia ----
   Sigue al período, pero nunca baja de 8 semanas (para que se lea como mapa y no como una
   tira de una columna) ni pasa de 26 (para que las celdas no se vuelvan invisibles).
   `dates` son las fechas con datos de esa visualización: sirven para acotar "todo". */
const PROG_WMIN=8, PROG_WMAX=26;
function progWeekWindow(per,dates){
  const curMon=mondayOf(todayD());
  const wks=from=>Math.round((curMon-mondayOf(parseISO(from)))/(7*86400000))+1;
  let n;
  const start=progStart(per);
  if(start) n=wks(start);
  else {
    const first=(dates||[]).filter(Boolean).sort()[0];   // "todo" arranca en el primer dato
    n=first?wks(first):PROG_WMIN;
  }
  n=Math.max(PROG_WMIN,Math.min(PROG_WMAX,n||PROG_WMIN));
  return { from:addDays(curMon,-(n-1)*7), weeks:n };
}

/* ---- buckets de tiempo para las barras de hábitos ----
   Semana y Mes: una barra por día. Año: una por semana. Todo: una por mes desde el primer
   dato. Los días futuros nunca entran: no son un 0%, todavía no pasaron. */
function progHabitBuckets(per){
  const t=todayD(), tISO=todayISO();
  const dayList=(from,n)=>{ const out=[]; for(let i=0;i<n;i++){ const d=iso(addDays(from,i)); if(d<=tISO) out.push(d); } return out; };
  if(per==='semana'||per==='mes'){
    const n=per==='semana'?7:30;
    return Array.from({length:n},(_,i)=>{ const d=addDays(t,-(n-1-i));
      return { label:String(d.getDate()), days:[iso(d)] }; });
  }
  if(per==='ano'){
    const curMon=mondayOf(t);
    return Array.from({length:52},(_,i)=>{ const m=addDays(curMon,-(51-i)*7);
      return { label:m.getDate()+'/'+(m.getMonth()+1), days:dayList(m,7) }; });
  }
  // todo: por mes, desde el primer dato que exista
  const first=habitFirstISO();
  if(!first) return [];
  const f=parseISO(first);
  const out=[];
  let y=f.getFullYear(), m=f.getMonth();
  while(y<t.getFullYear() || (y===t.getFullYear() && m<=t.getMonth())){
    const days=new Date(y,m+1,0).getDate();
    out.push({ label:MONTHS[m].slice(0,3), days:dayList(new Date(y,m,1),days) });
    m++; if(m>11){ m=0; y++; }
  }
  return out;
}
// % de hábitos cumplidos en un bucket: marcas / (hábitos × días transcurridos).
function bucketPct(days){
  const n=state.habits.length;
  if(!n || !days.length) return null;                  // null = sin base para calcular
  const marks=days.reduce((a,d)=>a+habitDoneCount(d),0);
  return marks/(n*days.length);
}

function progSelector(sel){
  return `<div class="chips" id="prog-periods">`+PROG_PERIODS.map(([k,lb])=>{
    const on=sel===k;
    return `<span class="chip ${on?'on':''}" style="${on?'background:'+C.cyan:''}" data-act="prog-period" data-p="${k}">${lb}</span>`;
  }).join('')+`</div>`;
}
function progEmpty(msg){ return `<div class="card" style="padding:6px 16px"><div class="empty">${esc(msg)}</div></div>`; }

function viewProgreso(){
  const per=ui.progPeriod, start=progStart(per);

  let h=`<div class="view"><div class="head"><h1>Progreso</h1>
    <div class="sub">Tu evolución, en un solo lugar.</div>
    <div style="margin-top:16px">${progSelector(per)}</div>
  </div><div class="body">`;

  h+=progResumen(per,start);
  h+=progBodyWeight(per,start);
  h+=progFrecuencia(per,start);
  h+=progBalance(per,start);
  h+=progCargas(per,start);
  h+=progGymStreaks();
  h+=progRanking(per,start);
  h+=progCumplimiento(per);
  h+=progHeatmap(per);
  h+=progStreaks();

  return h+`</div></div>`;
}

/* ---- resumen: números sueltos ---- */
function progResumen(per,start){
  // Las tareas hechas se cuentan sobre el total: el modelo no guarda cuándo se completaron,
  // así que este número no puede recortarse por período (y no se toca el modelo para eso).
  const tareas=state.items.filter(x=>x.kind==='tarea' && x.done).length;
  const entrenos=gymHistory().filter(x=>inPeriod(x.date,start)).length;
  const hoyTot=state.habits.length, hoyOk=habitDoneCount(todayISO());
  const tile=(val,lb,col,note)=>`<div class="card" style="flex:1;min-width:0;padding:14px 12px;text-align:center">
    <div class="fr" style="font-weight:700;font-size:26px;color:${col}">${val}</div>
    <div style="font-size:11.5px;font-weight:700;color:rgba(244,244,251,0.5);margin-top:3px">${lb}</div>
    <div style="font-size:10px;font-weight:600;color:rgba(244,244,251,0.3);margin-top:2px">${note}</div></div>`;
  return `<div><div class="sectlabel">RESUMEN</div>
    <div style="display:flex;gap:10px">
      ${tile(tareas,'Tareas hechas',C.coral,'en total')}
      ${tile(entrenos,'Entrenos',C.yellow,progLabel(per).toLowerCase())}
      ${tile(hoyTot?hoyOk+'/'+hoyTot:'—','Hábitos hoy',C.purple,'de hoy')}
    </div></div>`;
}

/* ---- frecuencia: entrenos por semana ---- */
function progFrecuencia(per,start){
  const hist=gymHistory();
  let h=`<div><div class="sectlabel">FRECUENCIA <span style="font-weight:500;color:rgba(244,244,251,0.35)">· entrenos por semana</span></div>`;
  if(!hist.length) return h+progEmpty('Marcá entrenamientos para ver tu frecuencia.')+`</div>`;

  const win=progWeekWindow(per,[hist[hist.length-1].date]);
  const counts=gymWeekCounts(hist.filter(x=>inPeriod(x.date,start)));
  const bars=Array.from({length:win.weeks},(_,i)=>{
    const wk=iso(addDays(win.from,i*7));
    return { wk, n:counts[wk]||0, mon:addDays(win.from,i*7) };
  });
  const max=Math.max(1,...bars.map(b=>b.n));
  const tot=bars.reduce((a,b)=>a+b.n,0);
  if(!tot) return h+progEmpty('No marcaste entrenamientos '+progPeriodNote(per)+'.')+`</div>`;
  const prom=(tot/win.weeks).toFixed(1).replace('.0','');

  h+=`<div class="card" style="padding:14px 14px 12px">
    <div style="font-size:12.5px;font-weight:700;color:rgba(244,244,251,0.45);margin-bottom:12px">
      ${tot} ${tot===1?'entreno':'entrenos'} · promedio ${prom} por semana</div>
    <div class="progbars">`+bars.map(b=>{
      const pct=b.n?Math.max(9,Math.round(b.n/max*100)):0;
      return `<div class="progbar" title="${b.n} el ${shortDate(b.wk)}">
        <div class="pbfill" style="height:${pct}%;background:${b.n?C.yellow:'transparent'}"></div></div>`;
    }).join('')+`</div>
    <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:700;color:rgba(244,244,251,0.35);margin-top:7px">
      <span>${shortDate(iso(win.from))}</span><span>máx ${max}</span><span>${shortDate(iso(addDays(win.from,(win.weeks-1)*7)))}</span></div>
  </div></div>`;
  return h;
}

/* ---- balance muscular: distribución por tipo ---- */
function progBalance(per,start){
  const hist=gymHistory().filter(x=>inPeriod(x.date,start));
  const ranked=gymRanking(hist);                       // ya viene ordenado por cantidad
  let h=`<div><div class="sectlabel">BALANCE MUSCULAR</div>`;
  if(!ranked.length) return h+progEmpty('No marcaste entrenamientos '+progPeriodNote(per)+'.')+`</div>`;

  const total=hist.length;
  const slices=ranked.map(r=>({ value:r.count, color:typeColor(r.type) }));  // respeta el color del tipo
  h+=`<div class="card" style="padding:16px;display:flex;align-items:center;gap:16px">
    <div style="position:relative;flex-shrink:0">${donut(slices,104,17)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <span class="fr" style="font-weight:700;font-size:20px">${total}</span>
        <span style="font-size:9.5px;font-weight:700;color:rgba(244,244,251,0.4)">${total===1?'SESIÓN':'SESIONES'}</span></div></div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px">`+ranked.map(r=>{
      const col=typeColor(r.type), pct=Math.round(r.count/total*100);
      return `<div style="display:flex;align-items:center;gap:8px">
        <span style="width:9px;height:9px;border-radius:50%;background:${col};flex-shrink:0"></span>
        <span class="fr" style="flex:1;min-width:0;font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.type)}</span>
        <span class="fr" style="font-weight:700;font-size:12.5px;color:${col}">${pct}%</span></div>`;
    }).join('')+`</div></div></div>`;
  return h;
}

/* ---- progreso de cargas destacado ---- */
function progCargas(per,start){
  const gains=liftGains(start);
  let h=`<div><div class="sectlabel">PROGRESO DE CARGAS</div>`;
  if(!state.gym.lifts.length) return h+progEmpty('Agregá ejercicios en Gimnasio para seguir tus cargas.')+`</div>`;
  if(!gains.length) return h+progEmpty('Necesitás al menos dos registros de un ejercicio '+progPeriodNote(per)+' para comparar.')+`</div>`;

  const top=gains[0], col=top.color;
  const signo=n=>(n>=0?'+':'')+fmtNum(n);
  h+=`<div class="card" style="padding:16px">
    <div style="display:flex;align-items:center;gap:13px">
      <div style="width:44px;height:44px;border-radius:14px;background:${tint(col,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11"/></svg></div>
      <div style="flex:1;min-width:0">
        <div class="fr" style="font-weight:600;font-size:16px">${esc(top.name)}</div>
        <div style="font-size:12.5px;color:rgba(244,244,251,0.5);margin-top:2px">${fmtNum(top.from)} → ${fmtNum(top.to)} ${esc(top.unit)} · ${progLabel(per).toLowerCase()}</div></div>
      <span class="fr" style="font-weight:700;font-size:19px;color:${top.gain<0?C.coral:C.green};flex-shrink:0">${signo(top.gain)} ${esc(top.unit)}</span>
    </div>`;
  const resto=gains.slice(1,4);
  if(resto.length){
    h+=`<div style="margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:8px">`+
      resto.map(g=>`<div style="display:flex;align-items:center;gap:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${g.color};flex-shrink:0"></span>
        <span class="fr" style="flex:1;min-width:0;font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.name)}</span>
        <span class="fr" style="font-weight:700;font-size:12.5px;color:${g.gain<0?C.coral:(g.gain>0?C.green:'rgba(244,244,251,0.4)')}">${signo(g.gain)} ${esc(g.unit)}</span>
      </div>`).join('')+`</div>`;
  }
  return h+`</div></div>`;
}

/* ---- rachas de entrenamiento, por tipo ---- */
function progGymStreaks(){
  const st=gymTypeStreaks();
  let h=`<div><div style="display:flex;align-items:baseline;gap:8px;margin:0 2px 10px">
    <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">RACHAS DE ENTRENAMIENTO</span>
    <span style="font-size:12px;font-weight:700;color:rgba(244,244,251,0.35)">estado actual</span></div>`;
  if(!st.length) return h+progEmpty('Repetí un tipo de entreno dos semanas seguidas para arrancar una racha.')+`</div>`;

  h+=`<div class="card" style="overflow:hidden;padding:0">`+st.map(s=>{
    const col=typeColor(s.type), enRacha=s.weeks>=2;   // una racha arranca a las 2 semanas
    return `<div class="managerow">
      <span style="width:11px;height:11px;border-radius:50%;background:${col};flex-shrink:0"></span>
      <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:15px">${esc(s.type)}</div>
        <div style="font-size:12.5px;color:rgba(244,244,251,0.5);margin-top:2px">
          ${s.weeks} ${s.weeks===1?'semana seguida':'semanas seguidas'}${enRacha?'':' · una más y arranca la racha'}</div></div>
      ${enRacha?`<div class="streak" style="flex-shrink:0">${flame(col,13)}<span class="n" style="color:${col}">${s.weeks}</span></div>`:''}
    </div>`;
  }).join('')+`</div>`;
  return h+`</div>`;
}

/* ---- cumplimiento de hábitos por período ---- */
function progCumplimiento(per){
  let h=`<div><div class="sectlabel">CUMPLIMIENTO DE HÁBITOS</div>`;
  if(!state.habits.length) return h+progEmpty('Todavía no creaste hábitos.')+`</div>`;

  const buckets=progHabitBuckets(per).map(b=>({ ...b, pct:bucketPct(b.days) }));
  const conDatos=buckets.filter(b=>b.pct!=null);
  if(!conDatos.length) return h+progEmpty('Marcá hábitos para ver tu cumplimiento.')+`</div>`;

  const prom=Math.round(conDatos.reduce((a,b)=>a+b.pct,0)/conDatos.length*100);
  const unidad={ semana:'por día', mes:'por día', ano:'por semana', todo:'por mes' }[per];
  h+=`<div class="card" style="padding:14px 14px 12px">
    <div style="font-size:12.5px;font-weight:700;color:rgba(244,244,251,0.45);margin-bottom:12px">
      Promedio ${prom}% · ${unidad}</div>
    <div class="progbars">`+buckets.map(b=>{
      const p=b.pct==null?0:Math.round(b.pct*100);
      return `<div class="progbar" title="${b.label}: ${p}%">
        <div class="pbfill" style="height:${p?Math.max(6,p):0}%;background:${p?C.purple:'transparent'}"></div></div>`;
    }).join('')+`</div>
    <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:700;color:rgba(244,244,251,0.35);margin-top:7px">
      <span>${esc(buckets[0].label)}</span><span>${esc(buckets[buckets.length-1].label)}</span></div>
  </div></div>`;
  return h;
}

/* ---- heatmap de hábitos, tipo contribuciones ---- */
function progHeatmap(per){
  let h=`<div><div class="sectlabel">MAPA DE HÁBITOS</div>`;
  const tot=state.habits.length;
  if(!tot) return h+progEmpty('Todavía no creaste hábitos.')+`</div>`;

  const win=progWeekWindow(per,[habitFirstISO()]);
  const tISO=todayISO();
  let rows='';
  for(let d=0;d<7;d++){
    let cells='';
    for(let w=0;w<win.weeks;w++){
      const cISO=iso(addDays(win.from,w*7+d));
      let bg='rgba(255,255,255,0.05)', extra='';
      if(cISO>tISO) bg='transparent';                       // el futuro no es un día fallado
      else {
        const n=habitDoneCount(cISO);
        // La intensidad sale de cuántos hábitos se cumplieron sobre el total de ese día.
        if(n>0) bg=tint(C.purple, ['4D','80','B3','E6','FF'][Math.min(4,Math.ceil(n/tot*5)-1)]);
      }
      if(cISO===tISO) extra='box-shadow:inset 0 0 0 1.5px rgba(244,244,251,0.55)';
      cells+=`<div style="height:13px;border-radius:4px;background:${bg};${extra}"></div>`;
    }
    rows+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
      <span style="width:12px;font-family:'Fredoka',sans-serif;font-size:9px;font-weight:600;color:rgba(244,244,251,0.4);text-align:center;flex-shrink:0">${DOW_MINI[d]}</span>
      <div style="flex:1;display:grid;grid-template-columns:repeat(${win.weeks},1fr);gap:3px">${cells}</div></div>`;
  }
  h+=`<div class="card" style="padding:14px 15px 13px">${rows}
    <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:rgba(244,244,251,0.4);margin-top:11px">
      <span>Menos</span>
      ${['4D','80','B3','E6','FF'].map(a=>`<span style="width:10px;height:10px;border-radius:3px;background:${tint(C.purple,a)}"></span>`).join('')}
      <span>Más</span>
      <span style="flex:1"></span><span>${win.weeks} semanas</span></div>
  </div></div>`;
  return h;
}

/* ---- peso corporal: tendencia en el período ---- */
function progBodyWeight(per,start){
  const col=C.cyan, log=bodyList();                 // ya viene ordenado por fecha
  let h=`<div><div class="sectlabel">PESO CORPORAL</div>`;
  if(!log.length) return h+progEmpty('Cargá tu peso para ver la tendencia.')+`</div>`;

  const win=log.filter(r=>inPeriod(r.date,start));
  const cur=log[log.length-1];                      // el último de todos, aunque quede fuera del período
  const hayTend=win.length>1;
  const gain=hayTend?+(win[win.length-1].kg-win[0].kg).toFixed(1):0;

  h+=`<div class="card" style="padding:16px">
    <div style="display:flex;align-items:baseline;gap:5px">
      <span class="fr" style="font-weight:700;font-size:34px;color:${col}">${fmtNum(cur.kg)}</span>
      <span style="font-size:14px;font-weight:700;color:rgba(244,244,251,0.5)">kg</span>
      ${hayTend?`<span class="delta" style="color:${gain<0?C.coral:C.green};background:${gain<0?tint(C.coral,'29'):'rgba(6,214,160,0.16)'}">${gain>=0?'+':''}${fmtNum(gain)} kg</span>`:''}
    </div>
    <div style="font-size:12px;font-weight:600;color:rgba(244,244,251,0.45);margin-top:3px">
      Último registro · ${shortDate(cur.date)}${hayTend?' · variación en '+progLabel(per).toLowerCase():''}</div>`;
  if(hayTend){
    h+=`<div style="margin-top:14px">${sparkline(win.map(r=>r.kg),col,300,86,{padX:6,padY:10,style:'width:100%;height:86px',r:3.6})}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:rgba(244,244,251,0.35);margin-top:6px">
        <span>${shortDate(win[0].date)}</span><span>${shortDate(win[win.length-1].date)}</span></div>`;
  } else {
    // Hay peso cargado, pero no alcanza para dibujar una línea en este recorte.
    h+=`<div style="font-size:12.5px;font-weight:600;color:rgba(244,244,251,0.4);margin-top:12px;line-height:1.5">
      ${win.length?'Un solo registro':'Sin registros'} ${progPeriodNote(per)}. Cargá otro para ver la tendencia.</div>`;
  }
  return h+`</div></div>`;
}

/* ---- gimnasio: ranking por tipo en el período ---- */
function progRanking(per,start){
  const hist=gymHistory().filter(x=>inPeriod(x.date,start));
  const ranked=gymRanking(hist);
  const total=hist.length;
  let h=`<div><div style="display:flex;align-items:baseline;gap:8px;margin:0 2px 10px">
    <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">ENTRENAMIENTOS</span>
    ${total?`<span style="font-size:12px;font-weight:700;color:rgba(244,244,251,0.35)">${total} ${total===1?'sesión':'sesiones'} · ${progLabel(per).toLowerCase()}</span>`:''}</div>`;
  if(!ranked.length){
    return h+progEmpty('No marcaste entrenamientos '+progPeriodNote(per)+'.')+`</div>`;
  }
  return h+`<div class="card" style="padding:16px 16px 8px">`+rankingRows(ranked)+`</div></div>`;
}

/* ---- hábitos: racha actual y récord (estado actual, no depende del período) ---- */
function progStreaks(){
  let h=`<div><div style="display:flex;align-items:baseline;gap:8px;margin:0 2px 10px">
    <span class="fr" style="font-size:13.5px;font-weight:600;color:rgba(244,244,251,0.5);letter-spacing:0.3px">RACHAS</span>
    <span style="font-size:12px;font-weight:700;color:rgba(244,244,251,0.35)">estado actual</span></div>`;
  if(!state.habits.length) return h+progEmpty('Todavía no creaste hábitos.')+`</div>`;

  h+=`<div class="card" style="overflow:hidden;padding:0">`+state.habits.map(hb=>{
    const cur=habitStreak(hb.id), best=habitBestStreak(hb.id);
    const dias=n=>n+' '+(n===1?'día':'días');
    return `<div class="managerow">
      <div class="iconwrap" style="width:36px;height:36px;background:${tint(hb.color,'24')};flex-shrink:0">${iconSvg(hb,20)}</div>
      <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:15px">${esc(hb.name)}</div>
        <div style="font-size:12.5px;color:rgba(244,244,251,0.5);margin-top:2px">
          ${cur>0?'Racha de '+dias(cur):'Sin racha activa'} · récord ${dias(best)}</div></div>
      ${cur>0?`<div class="streak" style="flex-shrink:0">${flame(hb.color,13)}<span class="n" style="color:${hb.color}">${cur}</span></div>`:''}
    </div>`;
  }).join('')+`</div>`;
  return h+`</div>`;
}
