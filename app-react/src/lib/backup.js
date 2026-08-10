/* ----------------------------- BACKUP -----------------------------
   Port de la parte pura de app/js/ajustes.js: armar el JSON de exportación y validar uno
   que llega. Bajar el archivo y abrir el selector son cosas del navegador y llegan con la
   pantalla de Ajustes, en la etapa 3.

   El formato del archivo es parte del contrato con los usuarios: alguien puede tener un
   daily-backup.json exportado con la app vanilla y querer importarlo desde React (o al
   revés). Por eso format sigue siendo 2 y la validación es exactamente la misma. */

export const BACKUP_FORMAT = 2;          // sigue al esquema de datos: daily.v2 → format 2
export const BACKUP_FILE = 'daily-backup.json';
export const BACKUP_DAYS = 7;
export const KEY_BACKUP_META = 'daily.backup';  // metadatos del dispositivo, no del usuario

// El JSON: encabezado + los datos tal cual están en el documento.
export function backupPayload(state, exportedAt) {
  return { app: 'daily', format: BACKUP_FORMAT, exportedAt: exportedAt || new Date().toISOString(), data: state };
}

/* Valida sin tocar nada. Devuelve { ok:true, data, exportedAt } o { ok:false, msg }.
   Los mensajes son los mismos de la app actual, palabra por palabra. */
export function validateBackup(text) {
  let p;
  try { p = JSON.parse(text); }
  catch { return { ok: false, msg: 'El archivo no es un JSON válido. ¿Seguro que es el daily-backup.json?' }; }

  if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, msg: 'El archivo no tiene el formato de un backup de Daily.' };
  if (p.app !== 'daily') return { ok: false, msg: 'Este archivo no es un backup de Daily.' };
  if (p.format == null) return { ok: false, msg: 'Al archivo le falta la versión del formato. No es un backup de Daily.' };
  if (p.format !== BACKUP_FORMAT) return { ok: false, msg: 'El backup es de otra versión de la app (formato ' + p.format + ', esta app usa ' + BACKUP_FORMAT + ').' };

  const d = p.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok: false, msg: 'El backup no trae datos adentro.' };
  if (!Array.isArray(d.items)) return { ok: false, msg: 'El backup está incompleto: le falta la agenda.' };
  if (!Array.isArray(d.habits) || !d.habitLog || typeof d.habitLog !== 'object') return { ok: false, msg: 'El backup está incompleto: le faltan los hábitos.' };
  if (!d.gym || typeof d.gym !== 'object' || Array.isArray(d.gym)) return { ok: false, msg: 'El backup está incompleto: le falta el gimnasio.' };

  return { ok: true, data: d, exportedAt: p.exportedAt };
}

// ¿Hay algo que valga la pena respaldar?
export function backupHasData(state) {
  return state.items.length > 0 || state.habits.length > 0 || state.gym.lifts.length > 0
    || state.gym.bodyWeights.length > 0 || state.gym.routines.length > 0
    || Object.keys(state.habitLog).length > 0;
}

// Días entre una marca de tiempo y hoy. Infinity si no hay marca o es inválida.
export function backupDaysSince(ts, today = new Date()) {
  const d = ts ? new Date(ts) : null;
  if (!d || isNaN(d.getTime())) return Infinity;
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return Math.round((t - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
}
