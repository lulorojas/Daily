"use strict";
/* ----------------------------- ONBOARDING (v3, etapa 4) -----------------------------
   Bienvenida (unos slides antes de entrar la primera vez) + tips contextuales (la primera
   vez que se visita cada pestaña). El estado vive en state.onboarding, así que viaja en el
   documento del usuario en Firestore y es consistente entre dispositivos:
     onboarding = { welcomeSeen:bool, tips:{ [tab]:true } }
   Está atado a una sesión con datos (DATA.uid): en los tests de datos puros no aplica. */

const ONB_TABS = ['hoy','calendario','gym','habitos','progreso'];
function onbState(){ return (state && state.onboarding) || { welcomeSeen:false, tips:{} }; }
// ¿Toca mostrar la bienvenida? Solo con sesión + datos cargados y sin haberla visto.
function welcomeDue(){
  return typeof DATA!=='undefined' && DATA.uid && state && state.onboarding && !state.onboarding.welcomeSeen;
}

/* ---- bienvenida (slides) ---- */
const ONB_SLIDES = ['intro','secciones','mas'];

function viewWelcome(){
  const i = Math.min(ui.onbSlide||0, ONB_SLIDES.length-1), last = i===ONB_SLIDES.length-1;
  const dots = ONB_SLIDES.map((_,j)=>`<span style="width:${j===i?18:7}px;height:7px;border-radius:99px;background:${j===i?C.amber:'rgba(242,244,248,.2)'};transition:all .2s"></span>`).join('');
  let body='';
  if(i===0){
    body = `<div class="authmark" style="width:72px;height:72px;border-radius:24px;font-size:34px;background:linear-gradient(140deg,${C.amber},${C.coral});margin:0 auto 6px">D</div>
      <h1 style="text-align:center">Bienvenido a Daily</h1>
      <div class="sub" style="text-align:center;max-width:300px;margin:8px auto 0">Tu día, tu gimnasio y tus hábitos en un solo lugar. Te lo mostramos en 10 segundos.</div>`;
  } else if(i===1){
    const rows = [
      ['hoy','Hoy','Tu día: tareas, citas, hábitos y lo pendiente.'],
      ['calendario','Calendario','Todo lo que tiene fecha, mes a mes.'],
      ['gym','Gimnasio','Tu plan, tus cargas, tu peso y tus rutinas.'],
      ['habitos','Hábitos','Marcá cada día y sostené la racha.'],
      ['progreso','Progreso','Tu evolución, en gráficos.'],
    ].map(([k,n,d])=>{ const col=SECT[k];
      return `<div style="display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:18px;background:var(--surf);border:1px solid var(--line)">
        <div style="width:38px;height:38px;flex:none;border-radius:12px;background:${tint(col,'24')};color:${col};display:grid;place-items:center">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${NAV_ICONS[k]}"/></svg></div>
        <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px">${n}</div>
          <div style="font-size:12.5px;color:rgba(242,244,248,.5)">${d}</div></div></div>`;
    }).join('');
    body = `<h1 style="text-align:center;margin-bottom:2px">Cinco secciones</h1>
      <div class="sub" style="text-align:center;margin-bottom:16px">Cada una con su color.</div>
      <div style="display:flex;flex-direction:column;gap:9px">${rows}</div>`;
  } else {
    body = `<div style="width:64px;height:64px;border-radius:24px;background:${C.amber};color:#0A0C11;display:grid;place-items:center;font-size:34px;font-weight:600;margin:0 auto 6px;line-height:0">+</div>
      <h1 style="text-align:center">El botón +</h1>
      <div class="sub" style="text-align:center;max-width:300px;margin:8px auto 0">Con el <b style="color:${C.amber}">+</b> de la barra cargás lo que sea: una tarea, una cita, un hábito o tu peso. Toma el color de la sección en la que estás.</div>`;
  }
  return `<div class="view auth" style="--accent:${C.amber}"><div class="head" style="display:flex;justify-content:flex-end;padding-bottom:0">
      <span class="cancel" style="cursor:pointer" data-act="onb-skip">Saltear</span></div>
    <div class="body onbwrap">
      <div class="onbslide">${body}</div>
      <div style="display:flex;justify-content:center;align-items:center;gap:7px;margin-top:24px">${dots}</div>
      <div class="abtn primary" style="margin-top:10px" data-act="${last?'onb-finish':'onb-next'}">${last?'Empezar':'Siguiente'}</div>
    </div></div>`;
}

/* ---- tips contextuales ---- */
const ONB_TIPS = {
  hoy:        'Tocá los círculos de arriba para moverte entre los días de la semana.',
  calendario: 'Tocá cualquier día para ver lo que tenés y agregar algo a esa fecha.',
  gym:        'En "Mis rutinas" armás tu biblioteca de entrenamientos para consultar.',
  habitos:    'Marcá tu hábito cada día y mantené viva la racha.',
  progreso:   'Cambiá el período de arriba (Semana / Mes / Año / Todo) para ver tu evolución.',
};
// ¿Toca un tip para la pestaña actual? Tras la bienvenida, primera visita, no en sub-pantallas.
function tipDue(){
  if(typeof DATA==='undefined' || !DATA.uid) return false;
  const ob=onbState();
  if(!ob.welcomeSeen || ui.hoySub || ui.gymSub) return false;
  return ONB_TABS.indexOf(ui.tab)>=0 && !ob.tips[ui.tab] && !!ONB_TIPS[ui.tab];
}
function tipCallout(){
  const t=ONB_TIPS[ui.tab]; if(!t) return '';
  const col=SECT[ui.tab]||C.amber;
  return `<div class="onbtip"><div class="onbtip-card" style="border-color:${tint(col,'55')}">
    <div style="display:flex;align-items:flex-start;gap:11px">
      <div style="width:30px;height:30px;flex:none;border-radius:10px;background:${tint(col,'24')};color:${col};display:grid;place-items:center">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM12 16.2v.3M12 8v5"/></svg></div>
      <div style="flex:1;font-size:13px;line-height:1.5;color:rgba(242,244,248,.82)">${esc(t)}</div></div>
    <div class="abtn primary" style="height:40px;font-size:13.5px;margin-top:12px;background:${col}" data-act="onb-tip-ok">Entendido</div>
  </div></div>`;
}

/* ---- acciones ---- */
function onbAction(act){
  if(!state) return;
  state.onboarding = state.onboarding || { welcomeSeen:false, tips:{} };
  if(act==='onb-next'){ ui.onbSlide=(ui.onbSlide||0)+1; render(); return; }
  if(act==='onb-skip' || act==='onb-finish'){ ui.onbSlide=0; state.onboarding.welcomeSeen=true; commit(); return; }
  if(act==='onb-tip-ok'){ state.onboarding.tips[ui.tab]=true; commit(); return; }
  // Desde Ajustes: "Ver tutorial de nuevo" reinicia bienvenida + tips.
  if(act==='onb-reset'){ ui.onbSlide=0; ui.hoySub=null; state.onboarding={ welcomeSeen:false, tips:{} }; commit(); return; }
}
