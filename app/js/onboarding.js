"use strict";
/* ----------------------------- ONBOARDING (v3) -----------------------------
   Un solo tour guiado, no dos mecanismos sueltos:
     1) La primera vez (state.onboarding.seen === false) un modal pregunta "¿Es tu primera
        vez en Daily?". La respuesta se guarda en state.onboarding.seen (Firestore) para no
        volver a preguntar, viaje a donde viaje la cuenta.
     2) Si elige el tour, ui.tour lo recorre paso a paso: un par de pasos informativos
        (qué es / cómo instalar) + las 5 secciones EN ORDEN (la navegación cambia de pestaña
        sola y muestra un tip corto encima de la sección real) + un cierre.
   El estado del tour es efímero (ui.tour); lo único persistido es `seen`.
   "Ver el tutorial de nuevo" (Ajustes) relanza el tour directo, sin volver a preguntar. */

// ¿Toca el modal de "primera vez"? Solo con sesión + datos cargados, sin haber respondido y
// sin un tour en curso. Atado a DATA.uid: en los tests de datos puros no aplica.
function onbAskDue(){
  return typeof DATA!=='undefined' && DATA.uid && state && state.onboarding &&
    state.onboarding.seen===false && !tourActive();
}
function tourActive(){ return !!ui.tour; }

/* ---- pasos del tour ----
   kind:'info'    -> tarjeta centrada sobre fondo atenuado (qué es / instalar / cierre).
   kind:'section' -> el tour salta a esa pestaña y muestra un tip abajo, sobre la sección real. */
const TOUR = [
  { kind:'info', key:'que-es', mark:'D', title:'Bienvenido a Daily',
    body:'Es una web app instalable: tus datos viven en tu cuenta (la nube), pero también funciona sin internet y sincroniza sola al reconectar.' },
  { kind:'info', key:'instalar', install:true, title:'Instalá Daily',
    body:'Agregala a tu pantalla de inicio y ábrela como una app más.' },
  { kind:'section', tab:'hoy',        title:'Hoy',        tip:'Tu día completo: tareas, citas y hábitos. Movete entre los días con los círculos de arriba.' },
  { kind:'section', tab:'calendario', title:'Calendario', tip:'Todo lo que tiene fecha, mes a mes. Tocá cualquier día para ver o agregar algo.' },
  { kind:'section', tab:'gym',        title:'Gimnasio',   tip:'Tu plan, tus cargas y tu peso. En "Mis rutinas" armás tu biblioteca de entrenamientos.' },
  { kind:'section', tab:'habitos',    title:'Hábitos',    tip:'Marcá tu hábito cada día y sostené la racha.' },
  { kind:'section', tab:'progreso',   title:'Progreso',   tip:'Tu evolución en gráficos. Cambiá el período de arriba (Semana / Mes / Año / Todo).' },
  { kind:'info', key:'mas-uso', mark:'+', title:'El botón +',
    body:'Con el + de la barra cargás lo que sea (tarea, cita, hábito o tu peso). Toma el color de la sección en la que estás.' },
  { kind:'info', key:'cierre', check:true, title:'¡Listo!',
    body:'Eso es todo. Podés volver a ver este tutorial cuando quieras desde Ajustes.' },
];

/* ---- modal de "primera vez" ---- */
function onbAskView(){
  return `<div class="onbscrim"><div class="onbcard" style="text-align:center">
      <div class="authmark" style="width:64px;height:64px;border-radius:22px;font-size:30px;background:linear-gradient(140deg,${C.amber},${C.coral});margin:0 auto 14px">D</div>
      <h2>¿Es tu primera vez en Daily?</h2>
      <div class="sub" style="margin:8px auto 20px;max-width:280px">Te hacemos un tour de 30 segundos, o entrás directo si ya la conocés.</div>
      <div class="abtn primary" data-act="onb-yes">Sí, mostrame cómo funciona</div>
      <div class="onbghost" data-act="onb-no">Ya la conozco</div>
    </div></div>`;
}

/* ---- tour ---- */
function tourStep(){ return ui.tour ? TOUR[ui.tour.step] : null; }
function tourDots(){
  const cur=ui.tour?ui.tour.step:0;
  return `<div class="onbdots">${TOUR.map((_,j)=>
    `<span class="onbdot ${j===cur?'on':''}"></span>`).join('')}</div>`;
}
function tourView(){
  const st=tourStep(); if(!st) return '';
  return st.kind==='section' ? tourSectionView(st) : tourInfoView(st);
}
// Bloque de instalación: iPhone y Android juntos, siempre correcto (sin detección que falle).
function installBlock(){
  const card=(name,steps)=>`<div class="onbinst">
    <div class="onbinst-t">${name}</div><div class="onbinst-s">${steps}</div></div>`;
  return `<div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;text-align:left">
    ${card('iPhone · Safari','Tocá Compartir (el cuadrito con la flecha ↑) y elegí "Agregar a inicio".')}
    ${card('Android · Chrome','Abrí el menú (⋮) y elegí "Instalar app" o "Agregar a pantalla de inicio".')}
  </div>`;
}
function tourInfoView(st){
  const last = ui.tour.step===TOUR.length-1;
  let icon='';
  if(st.mark) icon=`<div class="authmark" style="width:60px;height:60px;border-radius:20px;font-size:30px;background:${st.mark==='+'?C.amber:`linear-gradient(140deg,${C.amber},${C.coral})`};color:#0A0C11;margin:0 auto 12px">${st.mark}</div>`;
  else if(st.install) icon=`<div class="onbicon" style="background:${tint(C.amber,'24')};color:${C.amber}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11M8 10l4 4 4-4M5 20h14"/></svg></div>`;
  else if(st.check) icon=`<div class="onbicon" style="background:${tint(C.green,'24')};color:${C.green}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 10 18l9.5-11"/></svg></div>`;
  return `<div class="onbscrim">
    <div class="onbtop"><span class="cancel" data-act="onb-skip">Omitir</span></div>
    <div class="onbcard" style="text-align:center">
      ${icon}
      <h2>${esc(st.title)}</h2>
      <div class="sub" style="margin:8px auto 0;max-width:300px">${esc(st.body)}</div>
      ${st.install?installBlock():''}
      ${tourDots()}
      <div class="abtn primary" style="margin-top:6px" data-act="${last?'onb-finish':'onb-next'}">${last?'Empezar a usar Daily':'Siguiente'}</div>
    </div></div>`;
}
function tourSectionView(st){
  const col=SECT[st.tab]||C.amber, n=ui.tour.step+1;
  return `<div class="onbtop onbtop-float"><span class="cancel" data-act="onb-skip">Omitir</span></div>
    <div class="onbtip"><div class="onbtip-card" style="border-color:${tint(col,'55')}">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:9px">
        <div style="width:32px;height:32px;flex:none;border-radius:11px;background:${tint(col,'24')};color:${col};display:grid;place-items:center">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${NAV_ICONS[st.tab]}"/></svg></div>
        <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15.5px">${esc(st.title)}</div>
          <div style="font-size:11px;font-weight:600;letter-spacing:.4px;color:rgba(242,244,248,.4)">PASO ${n} DE ${TOUR.length}</div></div>
      </div>
      <div style="font-size:13.5px;line-height:1.5;color:rgba(242,244,248,.82)">${esc(st.tip)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px">
        ${tourDots()}
        <div class="abtn primary" style="width:auto;height:38px;padding:0 20px;font-size:13.5px;margin:0;background:${col}" data-act="onb-next">Siguiente</div>
      </div>
    </div></div>`;
}

/* ---- navegación del tour ---- */
// Al entrar a un paso de sección, el tour cambia de pestaña solo (el usuario no elige).
function syncTourTab(){
  const st=tourStep();
  if(st && st.kind==='section'){ ui.tab=st.tab; ui.hoySub=null; ui.gymSub=null; ui.gymExpand=null; }
}
function tourGo(i){
  if(!ui.tour) return;
  if(i>=TOUR.length){ endTour(true); return; }
  ui.tour.step=i; syncTourTab(); render();
}
function startTour(){ ui.tour={ step:0 }; ui.hoySub=null; syncTourTab(); }
// goHome=true (terminó bien): vuelve a Hoy. En "Omitir" se queda donde está, menos brusco.
function endTour(goHome){ ui.tour=null; if(goHome){ ui.tab='hoy'; ui.hoySub=null; } render(); }

/* ---- acciones ---- */
function onbAction(act){
  if(!state) return;
  state.onboarding = state.onboarding || { seen:false };
  if(act==='onb-no'){ state.onboarding.seen=true; ui.tour=null; commit(); return; }       // ya la conozco
  if(act==='onb-yes'){ state.onboarding.seen=true; startTour(); commit(); return; }        // arranca el tour (persiste seen)
  if(act==='onb-next'){ tourGo((ui.tour?ui.tour.step:0)+1); return; }
  if(act==='onb-skip'){ endTour(false); return; }
  if(act==='onb-finish'){ endTour(true); return; }
  // Desde Ajustes: relanza el tour directo (seen ya es true, no hace falta preguntar de nuevo).
  if(act==='onb-reset'){ startTour(); render(); return; }
}
