"use strict";
/* ----------------------------- PROGRESO ----------------------------- */
// Placeholder: se completa en una etapa posterior.
function viewProgreso(){
  return `<div class="view"><div class="head"><h1>Progreso</h1>
    <div class="sub">Tu evolución, en un solo lugar.</div></div>
    <div class="body">
      <div class="card" style="padding:30px 22px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px">
        <div style="width:64px;height:64px;border-radius:20px;background:${tint(C.cyan,'24')};display:flex;align-items:center;justify-content:center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${C.cyan}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M6 20v-6M11 20V8M16 20v-9M21 20V5"/></svg></div>
        <div><div class="fr" style="font-weight:600;font-size:18px">Próximamente</div>
          <div style="font-size:13.5px;color:rgba(244,244,251,0.5);margin-top:6px;line-height:1.5">Acá vas a ver tus rachas, tu constancia y tu evolución en el gimnasio.</div></div>
      </div>
    </div></div>`;
}
