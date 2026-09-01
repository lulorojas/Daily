import { useData } from './useData';
import { useBackupMeta } from './useBackupMeta';
import { backupPayload, validateBackup, backupShouldWarn, backupWarnText, BACKUP_FILE } from '../lib/backup';
import { downloadText } from '../lib/download';
import { todayISO } from '../lib/dates';

/* ----------------------------- BACKUP: exportar / importar / avisar -----------------------------
   Junta los datos de la cuenta (useData), los metadatos de este dispositivo (useBackupMeta)
   y las acciones que hacían falta portar de app/js/ajustes.js (doExport/doImport/
   importFromText), en un solo lugar — lo usan tanto BackupBanner (el aviso, en Hoy y en
   Ajustes) como la sección propia de Ajustes, y las dos necesitan exactamente lo mismo. */
export function useBackup() {
  const { data, replaceAll } = useData();
  const { meta, markExported, snoozeAWeek } = useBackupMeta();

  const shouldWarn = data ? backupShouldWarn(data, meta, todayISO()) : false;
  const warnText = backupWarnText(meta, todayISO());

  // Devuelve { ok:true } o { ok:false, msg }, igual que validateBackup — así el llamador
  // no tiene que distinguir "no se pudo escribir el archivo" de "el archivo no servía".
  function exportNow() {
    if (!data) return { ok: false, msg: 'Todavía no hay datos para exportar.' };
    const exportedAt = new Date().toISOString();
    try {
      downloadText(BACKUP_FILE, JSON.stringify(backupPayload(data, exportedAt), null, 2));
    } catch {
      return { ok: false, msg: 'No se pudo exportar. Probá de nuevo en un momento.' };
    }
    markExported(exportedAt); // reinicia el contador del aviso semanal
    return { ok: true };
  }

  // Valida sin tocar nada; quien llama decide cuándo confirmar y recién ahí llama a applyImport.
  function readImport(text) {
    return validateBackup(text);
  }

  // Reemplaza TODO el documento (no fusiona) y sincroniza el contador de backup con la
  // fecha del archivo importado, tal como hacía applyBackup() en vanilla.
  function applyImport(importedData, exportedAt) {
    replaceAll(importedData);
    if (exportedAt && !Number.isNaN(new Date(exportedAt).getTime())) markExported(exportedAt);
  }

  return { data, meta, shouldWarn, warnText, exportNow, readImport, applyImport, snoozeAWeek };
}
