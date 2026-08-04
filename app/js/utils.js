"use strict";
/* ============================ constants ============================ */
// Paleta del rediseño (Claude Design): cinco acentos de la misma luminosidad + violeta y
// peligro. Los datos van siempre en la fuente display. Fondo azul-negro, superficies apenas
// más claras. Los hex viejos guardados en datos siguen siendo válidos, solo cambia lo nuevo.
const C = {
  amber:'#EAC06A', coral:'#FFA877', rose:'#FF9B93', green:'#86D9A0', teal:'#6FD2D2', violet:'#B49BE8',
  danger:'#FF8A80',
  ink:'#F2F4F8', bg:'#0B0E14', surf:'#13161D', surf2:'#12151C', surf3:'#161A22',
};
// Acento de cada sección: tiñe la nav, el botón +, el glow superior y los detalles.
const SECT = { hoy:C.amber, calendario:C.coral, gym:C.rose, habitos:C.green, progreso:C.teal };
const REST = 'Descanso';
// Training types are all user-editable now (pre-seeded via defaultTypes()); only REST is fixed.
const PALETTE = [C.green,C.teal,C.violet,C.coral,C.amber,C.rose];
const ICONS = {
  agua:    'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  libro:   'M3 4h8v16H5a2 2 0 0 1-2-2zm18 0h-8v16h6a2 2 0 0 0 2-2z',
  pesa:    'M3 9h2V7h2v10H5v-2H3zm18 0h-2V7h-2v10h2v-2h2zM7 11h10v2H7z',
  meditar: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14z',
  estrella:'M12 3l2.5 5.6 6.1.6-4.6 4.1 1.4 6L12 16.9 6.1 19.9l1.4-6L2.9 9.8l6.1-.6z',
  llama:   'M12 3c.6 3.2 3 4.4 3 7.6a3 3 0 0 1-6 0c0-1 .4-1.9 1-2.6-1.3.4-3.2 1.7-3.2 4.7a5.2 5.2 0 0 0 10.4 0C17.2 8.2 14.2 5.6 12 3z',
  corazon: 'M12 21s-7-4.5-9.5-9C1 8.5 2.5 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.5 0 5 3.5 3.5 7-2.5 4.5-9.5 9-9.5 9z',
};
const ICON_KEYS = Object.keys(ICONS);
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW_FULL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const DOW_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DOW_MINI = ['L','M','M','J','V','S','D'];
const CHECK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4 10-12"/></svg>';

/* ============================ date utils ============================ */
function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function parseISO(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(d,n){ const x=new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()+n); return x; }
function todayD(){ const x=new Date(); x.setHours(0,0,0,0); return x; }
function todayISO(){ return iso(todayD()); }
function dow(d){ return (d.getDay()+6)%7; } // 0=Mon
function mondayOf(d){ return addDays(d, -dow(d)); }
function shortDate(s){ const d=parseISO(s); return DOW_SHORT[dow(d)]+' '+d.getDate()+'/'+(d.getMonth()+1); }
function fmtDateLong(s){ const d=parseISO(s); const base=DOW_FULL[dow(d)]+' '+d.getDate()+' de '+MONTHS[d.getMonth()].toLowerCase(); return d.getFullYear()!==todayD().getFullYear()?base+' de '+d.getFullYear():base; }
function tomorrowISO(){ return iso(addDays(todayD(),1)); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ============================ state ============================ */
// v2 vive en su propia clave. daily.v1 nunca se escribe ni se borra: queda
// como backup automático para poder volver atrás.
const KEY='daily.v2';
const KEY_V1='daily.v1';
let state = load();
// habitDate lo sigue usando la pestaña Hábitos, que en esta etapa queda como está.
// gymSub/rutId/rutDayId: nivel abierto en la sub-pantalla de Rutinas (null = Gimnasio normal).
const ui = { tab:'hoy', daySel:todayISO(), calY:todayD().getFullYear(), calM:todayD().getMonth(), calSel:todayISO(),
             gymOffset:0, constEnd:0, habitDate:todayISO(), gymSub:null, rutId:null, rutDayId:null,
             progPeriod:'mes', hoySub:null, habMenu:null };

function load(){
  try{ const s=JSON.parse(localStorage.getItem(KEY)); if(s) return normalize(s); }catch(e){}
  try{
    const old=JSON.parse(localStorage.getItem(KEY_V1));
    if(old){ const s=normalize(migrateV1(old)); persist(s); return s; }  // daily.v1 queda intacta
  }catch(e){}
  return normalize(seed());
}
function persist(s){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }

/* ---- migración v1 → v2 (determinista, no descarta nada) ----
   tarea vieja sin fecha       → item tarea con date:null
   tarea vieja con fecha/hora  → item tarea con date (+time), preservando `done`
   recordatorio puntual        → cita (fecha + hora opcional; sin estado)
   recordatorio anual          → anual recurrente (se repite por mes+día)
   Cualquier otro recordatorio → cita (ante la duda, se conserva). */
function migrateV1(o){
  const items=[];
  (o.tasks||[]).forEach(t=>{
    items.push({ id:t.id||uid(), kind:'tarea', title:t.text||t.title||'', desc:t.desc||'',
                 date:t.date||null, time:t.time||null, done:!!t.done });
  });
  (o.reminders||[]).forEach(r=>{
    items.push({ id:r.id||uid(), kind:r.type==='anual'?'anual':'cita', title:r.title||'', desc:r.desc||'',
                 date:r.date||todayISO(), time:r.time||null });
  });
  const clone=x=>x?JSON.parse(JSON.stringify(x)):x;
  return { v:2, items, gym:clone(o.gym)||{}, habits:clone(o.habits)||[], habitLog:clone(o.habitLog)||{},
           migratedFrom:KEY_V1, migratedAt:new Date().toISOString() };
}

function normalize(s){
  s.v=2; s.items ||= []; s.habits ||= []; s.habitLog ||= {};
  // Multi-check: cada hábito puede marcarse varias veces por día. timesPerDay default 1, y las
  // marcas de habitLog pasan de boolean a entero (legacy true -> 1). Determinista, aditivo.
  s.habits.forEach(h=>{ if(!(h.timesPerDay>=1)) h.timesPerDay=1; });
  Object.keys(s.habitLog).forEach(d=>{ const day=s.habitLog[d]; if(day&&typeof day==='object')
    Object.keys(day).forEach(id=>{ const v=day[id]; day[id]= v===true?1:(Number(v)||0); if(!day[id]) delete day[id]; }); });
  s.gym ||= {}; s.gym.customTypes ||= []; s.gym.weekPlans ||= {}; s.gym.lifts ||= [];
  // Etapa 2. Nada que migrar: quien ya tenía datos arranca con estas dos colecciones vacías.
  // routines: biblioteca de consulta, independiente del plan semanal y del historial.
  // bodyWeights: peso corporal, métrica aparte del peso que se levanta por ejercicio.
  s.gym.routines ||= []; s.gym.bodyWeights ||= [];
  let changed=false;
  // One-time: seed the default training types as editable/removable custom types.
  if(!s.gym.typesSeeded){
    const have=new Set(s.gym.customTypes.map(t=>t.name));
    defaultTypes().forEach(t=>{ if(!have.has(t.name)) s.gym.customTypes.push(t); });
    s.gym.typesSeeded = true; changed=true;
  }
  // One-time: give the gym some predetermined content so it isn't blank.
  if(!s.gym.seeded){
    if(!s.gym.lifts.length) s.gym.lifts = defaultLifts();
    const wk=iso(mondayOf(todayD())), cur=s.gym.weekPlans[wk];
    if(!cur || cur.every(d=>d.type===REST)) s.gym.weekPlans[wk] = defaultPlanDays();
    s.gym.seeded = true; changed=true;
  }
  if(changed) persist(s);
  return s;
}
// Predetermined gym content (editable/removable by the user afterwards).
// Inlined (not a module const) so it's safe to call during the initial load().
function defaultPlanDays(){ return ['Pecho','Espalda','Cuádriceps','Isquio y glúteo','Brazo','Cardio',REST].map(type=>({type,done:false})); }
function defaultLifts(){
  const t=todayISO();
  return [
    { id:uid(), name:'Sentadilla',  unit:'kg', color:C.rose,  history:[{date:t,weight:60}] },
    { id:uid(), name:'Press banca', unit:'kg', color:C.teal,  history:[{date:t,weight:40}] },
    { id:uid(), name:'Peso muerto', unit:'kg', color:C.amber, history:[{date:t,weight:80}] },
  ];
}
function defaultTypes(){
  return [
    { id:uid(), name:'Cuádriceps',      color:C.amber  },
    { id:uid(), name:'Isquio y glúteo', color:C.coral  },
    { id:uid(), name:'Espalda',         color:C.teal   },
    { id:uid(), name:'Pecho',           color:C.rose   },
    { id:uid(), name:'Brazo',           color:C.violet },
    { id:uid(), name:'Cardio',          color:C.green  },
  ];
}
function seed(){
  // First run: pre-loaded with a starter week plan + sample exercises so nothing is blank.
  return {
    v:2,
    items:[
      { id:uid(), kind:'tarea', title:'Probar mi nueva app', desc:'Tocá el check para completar', date:todayISO(), time:null, done:false },
    ],
    // routines y bodyWeights arrancan vacías a propósito: sin datos de arranque inventados.
    gym:{ customTypes:defaultTypes(), weekPlans:{ [iso(mondayOf(todayD()))]: defaultPlanDays() }, lifts:defaultLifts(), routines:[], bodyWeights:[], seeded:true, typesSeeded:true },
    habits:[
      { id:uid(), name:'Tomar agua', detail:'8 vasos al día', color:C.green, icon:'agua' },
    ],
    habitLog:{},
  };
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function commit(){ save(); render(); }

/* ============================ helpers ============================ */
function tint(c,a){ return c && c[0]==='#' ? c+a : 'rgba(255,255,255,0.07)'; }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function allTypes(){ return state.gym.customTypes.map(t=>({name:t.name,color:t.color,id:t.id,custom:true})).concat([{name:REST,color:'rgba(244,244,251,0.4)',rest:true}]); }
function typeColor(name){ const t=allTypes().find(x=>x.name===name); return t?t.color:C.rose; }
function fmtNum(n){ return n%1===0?String(n):n.toFixed(1); }

/* ============================ agenda items ============================ */
/* Tres tipos, todos en state.items:
   tarea → title, desc?, date (null = sin fecha), time?, done
   cita  → title, desc?, date, time?            (no tiene estado: ocurre, no se completa)
   anual → title, desc?, date, time?            (se repite por mes+día cada año) */
const ITEM_COLOR = { tarea:C.amber, cita:C.coral, anual:C.violet };
const ITEM_LABEL = { tarea:'Tarea', cita:'Cita', anual:'Anual' };

function itemById(id){ return state.items.find(x=>x.id===id); }
function byTime(a,b){ return (a.time||'99')<(b.time||'99')?-1:1; }
function sameMonthDay(dISO,eISO){ const a=parseISO(dISO), b=parseISO(eISO); return a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

function pendientes(){ return state.items.filter(x=>x.kind==='tarea' && !x.date); }
// En la bandeja, una pendiente completada solo se muestra en el día en que se marcó: si mirás
// cualquier otro día (con la tira de días) o pasa el tiempo, ya no aparece, ni como completada.
// Las no completadas se ven siempre (son el backlog). dISO = día que se está mirando.
function pendVisible(t,dISO){ return !t.done || t.doneAt===dISO; }
// Una tarea con fecha se muestra SOLO en su fecha, aunque haya vencido: no se arrastra
// ni se mueve nunca. Vencida sin completar queda en su día (calendario / tira semanal).
function tareasDe(dISO){ return state.items.filter(x=>x.kind==='tarea' && x.date===dISO).sort(byTime); }
// Todo lo que "ocurre" ese día: citas de la fecha + anuales que caen en ese mes+día.
function agendaDe(dISO){
  return state.items.filter(x=>(x.kind==='cita' && x.date===dISO) || (x.kind==='anual' && sameMonthDay(dISO,x.date))).sort(byTime);
}
// Todo lo que el calendario muestra en un día (tareas con fecha + citas + anuales).
function itemsDe(dISO){ return tareasDe(dISO).concat(agendaDe(dISO)).sort(byTime); }
// Entreno planificado para una fecha (solo lectura; el plan lo maneja Gimnasio).
function entrenoDe(dISO){
  const d=parseISO(dISO), plan=state.gym.weekPlans[iso(mondayOf(d))];
  const day=plan && plan[dow(d)];
  return day && day.type!==REST ? day : null;
}

// Check redondeado del rediseño: cuadrado 24px, se rellena con el acento y tick oscuro.
function checkBox(on,color,dataAct,id){
  return `<div class="chk ${on?'on':''}" style="${on?`background:${color};border-color:${color}`:''}" data-act="${dataAct}" data-id="${id}" data-stop="1">
    <svg viewBox="0 0 24 24" fill="none" stroke="#0A0C11" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9 17l10.5-11"/></svg></div>`;
}
function taskRow(t,color,showDate){
  const on=t.done;
  const pill = showDate && t.date ? shortDate(t.date)+(t.time?' '+t.time:'') : (t.time||'');
  return `<div class="trow" data-act="task-open" data-id="${t.id}">
    ${checkBox(on,color,'task-toggle',t.id)}
    <div style="flex:1;min-width:0"><span class="ttext ${on?'done':''}">${esc(t.title)}</span>
      ${t.desc?`<div class="tdesc">${esc(t.desc)}</div>`:''}</div>
    ${pill?`<span class="tpill">${pill}</span>`:''}
  </div>`;
}

// Fila de cita/anual: sin check, porque no se completan. Barra de color a la izquierda.
function eventRow(e){
  const col=ITEM_COLOR[e.kind], annual=e.kind==='anual';
  const sub=e.time?e.time+' hs':(annual?'Se repite cada año':'Todo el día');
  const icon=annual
    ? 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'
    : 'M7.5 3v4M16.5 3v4M3.4 10.5h17.2M6.5 5h11a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 17.5 21h-11A3.5 3.5 0 0 1 3 17.5v-9A3.5 3.5 0 0 1 6.5 5Z';
  return `<div class="evrow" style="border-left:3px solid ${col}" data-act="event-open" data-id="${e.id}">
    <div class="evic" style="background:${tint(col,'24')};color:${col}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg></div>
    <div style="flex:1;min-width:0"><div class="evname">${esc(e.title)}</div>
      <div class="evsub">${esc(ITEM_LABEL[e.kind])}${annual?' · se repite cada año':''}</div></div>
    <span style="font-size:12.5px;font-weight:600;color:${col}">${e.time||''}</span>
  </div>`;
}

/* ---- curva suave (Catmull-Rom -> Bezier), como el diseño ---- */
function smoothPath(cpts){
  if(!cpts.length) return '';
  if(cpts.length===1) return 'M'+cpts[0][0].toFixed(1)+','+cpts[0][1].toFixed(1);
  let d='M'+cpts[0][0].toFixed(1)+','+cpts[0][1].toFixed(1);
  for(let i=0;i<cpts.length-1;i++){
    const p0=cpts[i-1]||cpts[i], p1=cpts[i], p2=cpts[i+1], p3=cpts[i+2]||p2;
    const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
    const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
    d+='C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
  }
  return d;
}
let _gid=0;
function nextGid(){ return 'g'+(++_gid); }

/* ---- gráfico de línea de tendencia (compacto, no interactivo) ----
   Lo usa la mini-ficha de cargas. `data` son los valores ya ordenados por fecha. */
function sparkline(data,color,W,H,opt){
  const o=opt||{}, padX=o.padX!=null?o.padX:4, padY=o.padY!=null?o.padY:7, n=data.length;
  if(!n) return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg>`;
  const min=Math.min(...data), max=Math.max(...data), range=(max-min)||1;
  const X=i=>n>1?padX+(i/(n-1))*(W-padX*2):W/2;
  const Y=v=>padY+(1-(v-min)/range)*(H-padY*2);
  const cpts=data.map((v,i)=>[X(i),Y(v)]);
  const line=smoothPath(cpts);
  const lastX=X(n-1).toFixed(1), lastY=Y(data[n-1]).toFixed(1);
  const area=line+' L'+lastX+','+(H-padY)+' L'+X(0).toFixed(1)+','+(H-padY)+' Z';
  const gid=nextGid();
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${o.style?`style="${o.style}"`:''}>
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="${o.sw||2.5}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="${o.r||3.2}" fill="${color}"/>
  </svg>`;
}

/* ---- gráfico de línea interactivo ----
   Curva suave con relleno degradé que se dibuja sola, un punto por registro y tooltip al
   tocarlo (fecha + valor). `pts` = [{date, v}] ordenados. La interacción la maneja el handler
   global (data-act="chart-pt"), sin re-render. */
function lineChart(pts,color,W,H,opt){
  const o=opt||{}, padX=o.padX!=null?o.padX:8, padY=o.padY!=null?o.padY:14, n=pts.length;
  const wrap=inner=>`<div class="chartwrap" style="${o.wrapStyle||''}">${inner}<div class="charttip"></div></div>`;
  if(!n) return wrap(`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"></svg>`);
  const vals=pts.map(p=>p.v), min=Math.min(...vals), max=Math.max(...vals), range=(max-min)||1;
  const X=i=>n>1?padX+(i/(n-1))*(W-padX*2):W/2;
  const Y=v=>padY+(1-(v-min)/range)*(H-padY*2);
  const co=pts.map((p,i)=>({x:X(i),y:Y(p.v),p,i}));
  const line=smoothPath(co.map(c=>[c.x,c.y]));
  const area=line+' L'+co[n-1].x.toFixed(1)+','+(H-padY)+' L'+co[0].x.toFixed(1)+','+(H-padY)+' Z';
  const unit=o.unit?(' '+o.unit):'';
  const gid=nextGid();
  const lx=co[n-1].x.toFixed(1), ly=co[n-1].y.toFixed(1);
  const dots=co.map(c=>{
    const lbl=shortDate(c.p.date)+'  '+fmtNum(c.p.v)+unit;
    const xp=(c.x/W*100).toFixed(2), yp=(c.y/H*100).toFixed(2);
    return `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="11" fill="transparent" style="cursor:pointer" data-act="chart-pt" data-stop="1" data-i="${c.i}" data-lbl="${esc(lbl)}" data-xp="${xp}" data-yp="${yp}"/>`;
  }).join('');
  return wrap(`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${o.style?`style="${o.style}"`:''} preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".32"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#${gid})" class="sparkArea"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="${o.sw||2.6}" stroke-linecap="round" stroke-linejoin="round" class="spark"/>
    <circle cx="${lx}" cy="${ly}" r="9" fill="${color}" opacity=".2" class="sparkArea"/>
    <circle cx="${lx}" cy="${ly}" r="4" fill="${color}" stroke="${C.surf2}" stroke-width="2.2" class="sparkArea"/>
    ${dots}
  </svg>`);
}

/* ---- dona de distribución ----
   slices: [{value,color}] en el orden en que se dibujan. Devuelve el anillo como SVG.
   Con total 0 devuelve '' — quien llama decide qué mostrar en su lugar. */
function donut(slices,size,thick){
  const total=slices.reduce((a,s)=>a+s.value,0);
  if(!total) return '';
  const R=size/2, rad=R-thick/2, CIRC=2*Math.PI*rad;
  let acc=0;
  const rings=slices.map(s=>{
    const len=s.value/total*CIRC;
    const el=`<circle cx="${R}" cy="${R}" r="${rad.toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="${thick}"
      stroke-dasharray="${len.toFixed(2)} ${(CIRC-len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"
      transform="rotate(-90 ${R} ${R})"/>`;
    acc+=len;
    return el;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">${rings}</svg>`;
}

/* ---- small svg builders ---- */
function iconSvg(hb,sz){ const p=ICONS[hb.icon]||ICONS.estrella; return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="${hb.color}"><path d="${p}"/></svg>`; }
function flame(c,sz){ return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="${c}"><path d="M12 3c.6 3.2 3 4.4 3 7.6a3 3 0 0 1-6 0c0-1 .4-1.9 1-2.6-1.3.4-3.2 1.7-3.2 4.7a5.2 5.2 0 0 0 10.4 0C17.2 8.2 14.2 5.6 12 3z"/></svg>`; }

/* ============================ MODALS ============================ */
const overlay=document.getElementById('overlay');
let modalSave=null;
let modalHandlers=[];
function onOverlay(type,fn){ overlay.addEventListener(type,fn); modalHandlers.push([type,fn]); }
function clearModalHandlers(){ modalHandlers.forEach(([t,f])=>overlay.removeEventListener(t,f)); modalHandlers=[]; }
function openModal(title,bodyHTML,saveColor,onSave,saveLabel){
  clearModalHandlers();
  modalSave=onSave;
  overlay.innerHTML=`<div class="scrim" data-act="modal-cancel"></div><div class="sheet">
    <div class="mhead"><div class="grab"></div><div class="mhrow">
      <span class="cancel" data-act="modal-cancel">Cancelar</span>
      <span class="title">${esc(title)}</span>
      ${onSave?`<span class="save" style="color:${saveColor||C.amber}" data-act="modal-save">${saveLabel||'Guardar'}</span>`:`<span style="width:56px"></span>`}</div></div>
    <div class="mbody">${bodyHTML}</div></div>`;
  overlay.classList.add('show');
  // Al corregir un campo marcado, su aviso desaparece.
  onOverlay('input',e=>{
    const f=e.target.closest('.bad'); if(!f) return;
    f.classList.remove('bad');
    const host=f.closest('.fld')||f.parentElement, er=host&&host.querySelector('.ferr');
    if(er) er.remove();
  });
}
function closeModal(){ overlay.classList.remove('show'); overlay.innerHTML=''; modalSave=null; clearModalHandlers(); }
function mq(sel){ return overlay.querySelector(sel); }

/* ---- validación de formularios ----
   Nada se guarda a medias ni falla en silencio: se marca el campo y se explica qué falta. */
// `root` es dónde buscar los campos. Por defecto el modal abierto, que es de donde salen
// casi todos los formularios; las pantallas de sesión (auth.js) viven en #app y lo pasan.
function clearFieldErrors(root){
  const R=root||overlay;
  R.querySelectorAll('.ferr').forEach(n=>n.remove());
  R.querySelectorAll('.bad').forEach(n=>n.classList.remove('bad'));
}
function markFieldError(sel,msg,root){
  const el=(root||overlay).querySelector(sel); if(!el) return;
  // El borde va en la caja visible: si el input vive dentro de una .rowinp, se marca la fila.
  (el.closest('.rowinp')||el).classList.add('bad');
  const host=el.closest('.fld')||el.parentElement;
  host.insertAdjacentHTML('beforeend',
    `<div class="ferr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5v.01"/></svg><span>${esc(msg)}</span></div>`);
}
// checks: [[selector, condiciónOK, mensaje], ...] → true si está todo bien.
// Si algo falla, marca TODOS los campos con problema y lleva el foco al primero.
function validateForm(checks,root){
  const R=root||overlay;
  clearFieldErrors(R);
  const bad=checks.filter(c=>!c[1]);
  bad.forEach(([sel,,msg])=>markFieldError(sel,msg,R));
  if(bad.length){
    const first=R.querySelector(bad[0][0]);
    if(first){ if(first.focus) first.focus(); if(first.scrollIntoView) first.scrollIntoView({block:'center'}); }
  }
  return bad.length===0;
}

/* ---- reusable custom time picker ---- */
const TP_MINS=[0,5,10,15,20,25,30,35,40,45,50,55];
function tpItems(which,sel,color){
  const arr = which==='h' ? Array.from({length:24},(_,i)=>i) : TP_MINS;
  return arr.map(n=>{ const v=String(n).padStart(2,'0'), on=v===sel;
    return `<div class="tpick-itm ${on?'on':''}" style="${on?'background:'+color:''}" data-pick="tp-${which}" data-v="${v}">${v}</div>`;
  }).join('');
}
function timeField(pfx,color,timeVal,hasTime){
  const [hh,mm]=timeVal.split(':');
  return `
    <div class="rowinp" id="${pfx}-row" data-pick="tp-toggle" style="cursor:pointer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/></svg>
      <span class="fr" id="${pfx}-val" style="flex:1;font-size:18px;font-weight:700;color:${hasTime?'#F4F4FB':'rgba(244,244,251,0.4)'}">${timeVal}</span>
      <svg class="tpick-chev" id="${pfx}-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.4)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      <div class="switch ${hasTime?'on':''}" id="${pfx}-sw" style="${hasTime?'background:'+color:''}" data-pick="tp-sw"><div class="knob"></div></div>
    </div>
    <div class="tpick" id="${pfx}-pop">
      <div class="tpick-inner">
        <div style="flex:1;min-width:0"><div class="tpick-lbl">HORA</div><div class="tpick-col" id="${pfx}-h">${tpItems('h',hh,color)}</div></div>
        <div style="flex:1;min-width:0"><div class="tpick-lbl">MINUTOS</div><div class="tpick-col" id="${pfx}-m">${tpItems('m',mm,color)}</div></div>
      </div>
    </div>`;
}
function tpCenter(pfx,which){
  const col=mq('#'+pfx+'-'+which), on=col&&col.querySelector('.tpick-itm.on');
  if(col&&on) col.scrollTop = on.offsetTop - col.clientHeight/2 + on.clientHeight/2;
}
// Wires a time picker into the current modal. `get`/`set` read & write the closure time value.
function wireTimePicker(pfx,color,getTime,setEnabled,isEnabled){
  return e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk) return;
    const kind=pk.dataset.pick;
    if(kind==='tp-sw'){
      const on=!isEnabled(); setEnabled(on);
      const sw=mq('#'+pfx+'-sw'), val=mq('#'+pfx+'-val'), pop=mq('#'+pfx+'-pop'), chev=mq('#'+pfx+'-chev');
      sw.classList.toggle('on',on); sw.style.background=on?color:'';
      val.style.color=on?'#F4F4FB':'rgba(244,244,251,0.4)';
      if(on){ pop.classList.add('open'); if(chev)chev.style.transform='rotate(180deg)'; tpCenter(pfx,'h'); tpCenter(pfx,'m'); }
      else { pop.classList.remove('open'); if(chev)chev.style.transform=''; }
      return;
    }
    if(kind==='tp-toggle'){
      if(!isEnabled()) return;
      const pop=mq('#'+pfx+'-pop'), chev=mq('#'+pfx+'-chev'), open=pop.classList.toggle('open');
      if(chev) chev.style.transform=open?'rotate(180deg)':'';
      if(open){ tpCenter(pfx,'h'); tpCenter(pfx,'m'); }
      return;
    }
    if(kind==='tp-h'||kind==='tp-m'){
      const which=kind==='tp-h'?'h':'m', v=pk.dataset.v;
      let [h,m]=getTime().value.split(':');
      if(which==='h') h=v; else m=v;
      getTime().value=h+':'+m;
      mq('#'+pfx+'-val').textContent=h+':'+m;
      overlay.querySelectorAll('#'+pfx+'-'+which+' .tpick-itm').forEach(el=>{const on=el.dataset.v===v;el.classList.toggle('on',on);el.style.background=on?color:'';});
    }
  };
}

/* ---- reusable custom date picker (matches app aesthetic) ---- */
function dpState(dISO){ const d=dISO?parseISO(dISO):todayD(); return { y:d.getFullYear(), m:d.getMonth(), sel:dISO||null }; }
function dpGrid(pfx,color,st){
  const {y,m,sel}=st;
  const first=new Date(y,m,1), lead=dow(first), days=new Date(y,m+1,0).getDate(), tISO=todayISO();
  let cells='';
  for(let i=0;i<lead;i++) cells+='<div class="dp-cell"></div>';
  for(let d=1;d<=days;d++){
    const dISO=iso(new Date(y,m,d)), isSel=dISO===sel, isToday=dISO===tISO;
    let style='';
    if(isSel) style=`background:${color};color:#0E0F22;font-weight:700`;
    else if(isToday) style=`border:1.6px solid ${color};color:${color};font-weight:700`;
    cells+=`<div class="dp-cell"><div class="dp-day" style="${style}" data-pick="dp-day" data-d="${dISO}">${d}</div></div>`;
  }
  const arrow=dir=>`<div class="navbtn" style="width:30px;height:30px;background:rgba(255,255,255,0.06)" data-pick="dp-${dir}"><svg width="8" height="13" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${dir==='prev'?'M10 2L2 10l8 8':'M2 2l8 8-8 8'}"/></svg></div>`;
  return `<div class="dp-nav">${arrow('prev')}
      <span class="fr" style="font-weight:600;font-size:15.5px">${MONTHS[m]} <span style="color:rgba(244,244,251,0.4);font-weight:500">${y}</span></span>
      ${arrow('next')}</div>
    <div class="dp-grid" style="margin-bottom:4px">${DOW_MINI.map(d=>`<div class="dow">${d}</div>`).join('')}</div>
    <div class="dp-grid">${cells}</div>`;
}
function dateField(pfx,color,st,ph){
  const has=!!st.sel;
  return `
    <div class="rowinp" id="${pfx}-drow" data-pick="dp-toggle" style="cursor:pointer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
      <span class="fr" id="${pfx}-dval" style="flex:1;font-size:16px;font-weight:700;color:${has?'#F4F4FB':'rgba(244,244,251,0.4)'}">${has?fmtDateLong(st.sel):(ph||'Elegí una fecha')}</span>
      <svg class="tpick-chev" id="${pfx}-dchev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.4)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="dpick" id="${pfx}-dpop"><div class="dpick-inner" id="${pfx}-dcal">${dpGrid(pfx,color,st)}</div></div>`;
}
function dpSelect(pfx,color,st,dISO,onChange){
  st.sel=dISO; const d=parseISO(dISO); st.y=d.getFullYear(); st.m=d.getMonth();
  const cal=mq('#'+pfx+'-dcal'); if(cal) cal.innerHTML=dpGrid(pfx,color,st);
  const val=mq('#'+pfx+'-dval'); if(val){ val.textContent=fmtDateLong(dISO); val.style.color='#F4F4FB'; }
  if(onChange) onChange(dISO);
}
// Wires the date picker into the current modal. `st` is a dpState() object.
function wireDatePicker(pfx,color,st,onChange){
  return e=>{
    const pk=e.target.closest('[data-pick]'); if(!pk) return;
    const kind=pk.dataset.pick;
    if(kind==='dp-toggle'){
      const pop=mq('#'+pfx+'-dpop'), chev=mq('#'+pfx+'-dchev'), open=pop.classList.toggle('open');
      if(chev) chev.style.transform=open?'rotate(180deg)':''; return;
    }
    if(kind==='dp-prev'||kind==='dp-next'){
      st.m+=kind==='dp-next'?1:-1; if(st.m<0){st.m=11;st.y--;} if(st.m>11){st.m=0;st.y++;}
      const cal=mq('#'+pfx+'-dcal'); if(cal) cal.innerHTML=dpGrid(pfx,color,st); return;
    }
    if(kind==='dp-day') dpSelect(pfx,color,st,pk.dataset.d,onChange);
  };
}

/* ---- confirm / aviso (cartel chico sobre lo que haya abierto) ---- */
// Capa suelta, por encima del modal abierto si lo hay. La comparten el confirm y el aviso.
function noticeLayer(bodyHTML){
  const layer=document.createElement('div');
  layer.style.cssText='position:fixed;inset:0;z-index:200;display:flex;align-items:center;padding:20px;background:rgba(0,0,0,0.55)';
  layer.innerHTML=`<div style="width:100%;max-width:480px;margin:0 auto">${bodyHTML}</div>`;
  const sheet=overlay.querySelector('.sheet');
  (sheet||document.body).appendChild(layer);
  return layer;
}
// Confirmación genérica. okLabel es el texto del botón que confirma.
function confirmAction(titleQ,desc,okLabel,onYes){
  const body=`<div class="confirm"><div class="ct">${esc(titleQ)}</div><div class="cd">${esc(desc)}</div>
    <div class="row"><div class="b" style="background:rgba(255,255,255,0.07);color:rgba(244,244,251,0.7)" data-act="confirm-no">Cancelar</div>
    <div class="b" style="background:${C.danger};color:#0A0C11;font-weight:600" data-act="confirm-yes">${esc(okLabel)}</div></div></div>`;
  const layer=noticeLayer(body);
  layer.addEventListener('click',e=>{
    if(e.target.closest('[data-act="confirm-no"]')||e.target===layer){ layer.remove(); }
    else if(e.target.closest('[data-act="confirm-yes"]')){ layer.remove(); onYes(); }
  });
}
function confirmDelete(titleQ,desc,onYes){ confirmAction(titleQ,desc,'Eliminar',onYes); }
// Aviso de un solo botón: algo salió mal y no hay nada que confirmar.
function notice(title,desc){
  const body=`<div class="confirm"><div class="ct">${esc(title)}</div><div class="cd">${esc(desc)}</div>
    <div class="row"><div class="b" style="background:${C.teal};color:#0A0C11;font-weight:600" data-act="notice-ok">Entendido</div></div></div>`;
  const layer=noticeLayer(body);
  layer.addEventListener('click',e=>{ if(e.target.closest('[data-act="notice-ok"]')||e.target===layer) layer.remove(); });
}

