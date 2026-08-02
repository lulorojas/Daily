"use strict";
/* ----------------------------- AJUSTES / DATOS -----------------------------
   Sub-pantalla de Hoy (el engranaje del header). Backup manual: exportar todo a un JSON
   e importarlo para restaurar. El import REEMPLAZA todo, no fusiona.
   daily.v1 sigue sin tocarse. */

/* ---- metadatos del backup ----
   Van en su propia clave, no en daily.v2: son de este dispositivo, no datos del usuario.
   Así no viajan dentro del archivo exportado ni se pisan al restaurar. */
const KEY_BK='daily.backup';
const BACKUP_FORMAT=2;          // sigue al esquema de datos: daily.v2 → format 2
const BACKUP_FILE='daily-backup.json';
const BACKUP_DAYS=7;

function bkMeta(){
  let m=null;
  try{ m=JSON.parse(localStorage.getItem(KEY_BK)); }catch(e){}
  if(!m || typeof m!=='object') m={};
  // firstSeen marca desde cuándo se puede empezar a pedir backup a quien nunca exportó.
  if(!m.firstSeen){ m.firstSeen=new Date().toISOString(); bkSave(m); }
  return m;
}
function bkSave(m){ try{ localStorage.setItem(KEY_BK, JSON.stringify(m)); }catch(e){} }
function bkSet(patch){ const m=bkMeta(); Object.assign(m,patch); bkSave(m); return m; }

function bkDaysSince(ts){
  const d=ts?new Date(ts):null;
  if(!d || isNaN(d.getTime())) return Infinity;
  return Math.round((todayD()-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/86400000);
}
// ¿Hay algo que valga la pena respaldar?
function bkHasData(){
  return state.items.length>0 || state.habits.length>0 || state.gym.lifts.length>0 ||
         state.gym.bodyWeights.length>0 || state.gym.routines.length>0 ||
         Object.keys(state.habitLog).length>0;
}
// El aviso sale si hay datos y hace BACKUP_DAYS o más que no se exporta. A quien nunca
// exportó se le cuenta desde firstSeen: estrenar la app no es motivo para pedirle un backup.
function bkShouldWarn(){
  if(!bkHasData()) return false;
  const m=bkMeta();
  if(m.snoozeUntil && todayISO()<m.snoozeUntil) return false;
  return bkDaysSince(m.lastExport || m.firstSeen) >= BACKUP_DAYS;
}
function bkWarnText(){
  const m=bkMeta();
  if(!m.lastExport) return 'Todavía no hiciste ningún backup de tus datos.';
  return 'Hace '+bkDaysSince(m.lastExport)+' días que no hacés backup.';
}

/* ---- banner del aviso (se dibuja en Hoy) ---- */
function bkBanner(){
  if(!bkShouldWarn()) return '';
  const col=C.yellow;
  return `<div class="card" style="padding:13px 14px;display:flex;align-items:center;gap:12px;border:1px solid ${tint(col,'3D')}">
    <div style="width:34px;height:34px;border-radius:11px;background:${tint(col,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></div>
    <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:13.5px">${bkWarnText()}</div>
      <div style="font-size:11.5px;color:rgba(244,244,251,0.5);margin-top:1px">Guardá una copia por las dudas.</div></div>
    <div class="fr" style="font-size:12.5px;font-weight:700;color:#0E0F22;background:${col};padding:7px 12px;border-radius:99px;cursor:pointer;flex-shrink:0" data-act="bk-export">Exportar</div>
    <div class="iconcirc" data-act="bk-snooze" title="Recordarme en una semana"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.5)" stroke-width="2.8" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
  </div>`;
}

/* ---- exportar ---- */
// El JSON: encabezado con app/format/exportedAt + los datos tal cual están en daily.v2.
function backupPayload(){
  return { app:'daily', format:BACKUP_FORMAT, exportedAt:new Date().toISOString(), data:state };
}
function doExport(){
  const json=JSON.stringify(backupPayload(),null,2);
  try{
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=BACKUP_FILE;              // nombre fijo: reemplaza limpio al anterior
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){ notice('No se pudo exportar','Probá de nuevo en un momento.'); return false; }
  bkSet({ lastExport:new Date().toISOString(), snoozeUntil:null });   // reinicia el contador
  render();
  return true;
}

/* ---- importar ---- */
// Valida sin tocar nada. Devuelve {ok:true,data,exportedAt} o {ok:false,msg}.
function validateBackup(text){
  let p;
  try{ p=JSON.parse(text); }
  catch(e){ return { ok:false, msg:'El archivo no es un JSON válido. ¿Seguro que es el daily-backup.json?' }; }
  if(!p || typeof p!=='object' || Array.isArray(p)) return { ok:false, msg:'El archivo no tiene el formato de un backup de Daily.' };
  if(p.app!=='daily') return { ok:false, msg:'Este archivo no es un backup de Daily.' };
  if(p.format==null) return { ok:false, msg:'Al archivo le falta la versión del formato. No es un backup de Daily.' };
  if(p.format!==BACKUP_FORMAT) return { ok:false, msg:'El backup es de otra versión de la app (formato '+p.format+', esta app usa '+BACKUP_FORMAT+').' };
  const d=p.data;
  if(!d || typeof d!=='object' || Array.isArray(d)) return { ok:false, msg:'El backup no trae datos adentro.' };
  if(!Array.isArray(d.items)) return { ok:false, msg:'El backup está incompleto: le falta la agenda.' };
  if(!Array.isArray(d.habits) || !d.habitLog || typeof d.habitLog!=='object') return { ok:false, msg:'El backup está incompleto: le faltan los hábitos.' };
  if(!d.gym || typeof d.gym!=='object' || Array.isArray(d.gym)) return { ok:false, msg:'El backup está incompleto: le falta el gimnasio.' };
  return { ok:true, data:d, exportedAt:p.exportedAt };
}
// Reemplaza todo. Solo se llama con datos ya validados.
function applyBackup(data,exportedAt){
  state=normalize(data);
  save();
  // Los datos ahora son exactamente los del archivo, así que su fecha es la del último backup.
  if(exportedAt && !isNaN(new Date(exportedAt).getTime())) bkSet({ lastExport:exportedAt, snoozeUntil:null });
  ui.hoySub=null;                 // volver a Hoy para que se vean los datos restaurados
  render();
}
// Valida → confirma → reemplaza. Si algo falla, avisa y no toca nada.
function importFromText(text){
  const r=validateBackup(text);
  if(!r.ok){ notice('No se pudo importar', r.msg); return false; }
  const fecha=r.exportedAt&&!isNaN(new Date(r.exportedAt).getTime())
    ? ' (del '+fmtDateLong(iso(new Date(r.exportedAt)))+')' : '';
  confirmAction('¿Reemplazar todos tus datos?',
    'Esto va a reemplazar todos tus datos actuales por los del backup'+fecha+'. Lo que tengas ahora se pierde.',
    'Reemplazar', ()=>applyBackup(r.data, r.exportedAt));
  return true;
}
function doImport(){
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='application/json,.json';
  inp.style.display='none';
  inp.addEventListener('change',()=>{
    const f=inp.files && inp.files[0];
    if(f){
      const rd=new FileReader();
      rd.onload=()=>importFromText(String(rd.result));
      rd.onerror=()=>notice('No se pudo leer el archivo','Probá elegirlo de nuevo.');
      rd.readAsText(f);
    }
    inp.remove();
  });
  document.body.appendChild(inp);
  inp.click();
}

/* ---- pantalla de ajustes ---- */
function viewAjustes(){
  const m=bkMeta();
  const ultimo=m.lastExport
    ? fmtDateLong(iso(new Date(m.lastExport)))+' · hace '+bkDaysSince(m.lastExport)+' días'
    : 'Todavía no exportaste nunca';
  const row=(act,col,title,sub,icon)=>`<div class="softcard evt" data-act="${act}">
    <div style="width:38px;height:38px;border-radius:12px;background:${tint(col,'24')};display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg></div>
    <div style="flex:1;min-width:0"><div class="fr" style="font-weight:600;font-size:15px">${title}</div>
      <div style="font-size:12.5px;color:rgba(244,244,251,0.5);margin-top:1px">${sub}</div></div>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(244,244,251,0.35)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
  </div>`;

  let h=`<div class="view"><div class="head">
    <div class="rut-back" data-act="ajustes-back">
      <svg width="9" height="15" viewBox="0 0 12 20" fill="none" stroke="rgba(244,244,251,0.7)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10l8 8"/></svg>
      <span>Atrás</span></div>
    <h1>Ajustes</h1><div class="sub">Tus datos y tus copias de seguridad.</div></div><div class="body">`;

  h+=`<div><div class="sectlabel">COPIA DE SEGURIDAD</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${row('bk-export',C.green,'Exportar','Descarga '+BACKUP_FILE,'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3')}
      ${row('bk-import',C.blue,'Importar','Restaurar desde un backup','M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12')}
    </div>
    <div style="font-size:12px;font-weight:600;color:rgba(244,244,251,0.4);margin:12px 4px 0;line-height:1.5">
      Último backup: ${esc(ultimo)}</div>
    <div style="font-size:12px;font-weight:600;color:rgba(244,244,251,0.3);margin:6px 4px 0;line-height:1.5">
      El archivo siempre se llama igual, así reemplaza al anterior en Drive o Archivos.
      Importar reemplaza todo lo que tengas ahora: no mezcla.</div>
  </div>`;

  h+=`<div><div class="sectlabel">QUÉ SE GUARDA</div>
    <div class="card" style="padding:14px 16px">
      <div style="font-size:12.5px;color:rgba(244,244,251,0.5);line-height:1.7">
        Tareas, citas y fechas anuales · Hábitos y sus marcas · Plan del gimnasio e historial ·
        Ejercicios y sus cargas · Peso corporal · Rutinas</div></div></div>`;

  return h+`</div></div>`;
}
