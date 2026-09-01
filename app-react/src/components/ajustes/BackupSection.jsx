import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { NoticeDialog } from '../ui/NoticeDialog';
import { useBackup } from '../../hooks/useBackup';
import { backupDaysSince, BACKUP_FILE } from '../../lib/backup';
import { fmtDateLong, iso, todayISO } from '../../lib/dates';
import { C, tint } from '../../lib/theme';

/* Port de la sección "Backup" de viewAjustes() + doExport()/doImport()/importFromText()
   de app/js/ajustes.js. Import REEMPLAZA todo (replaceAll, no merge) y siempre pide
   confirmación primero; un archivo inválido avisa y no toca nada — se valida ANTES de
   preguntar nada. */
export function BackupSection() {
  const { meta, exportNow, readImport, applyImport } = useBackup();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [notice, setNotice] = useState(null); // { title, description } | null
  const [pending, setPending] = useState(null); // { data, exportedAt, fecha } | null

  const handleExport = () => {
    const r = exportNow();
    if (!r.ok) setNotice({ title: 'No se pudo exportar', description: r.msg });
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // si vuelve a elegir el mismo archivo, que dispare onChange igual
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = readImport(String(reader.result));
      if (!r.ok) { setNotice({ title: 'No se pudo importar', description: r.msg }); return; }
      const fecha = r.exportedAt && !Number.isNaN(new Date(r.exportedAt).getTime())
        ? ` (del ${fmtDateLong(iso(new Date(r.exportedAt)))})` : '';
      setPending({ data: r.data, exportedAt: r.exportedAt, fecha });
    };
    reader.onerror = () => setNotice({ title: 'No se pudo leer el archivo', description: 'Probá elegirlo de nuevo.' });
    reader.readAsText(file);
  };

  const confirmImport = () => {
    applyImport(pending.data, pending.exportedAt);
    setPending(null);
    navigate({ pathname: '/', search: `?d=${todayISO()}` }); // volver a Hoy con los datos restaurados
  };

  const ultimo = meta.lastExport
    ? `${fmtDateLong(iso(new Date(meta.lastExport)))} · hace ${backupDaysSince(meta.lastExport)} días`
    : 'Todavía no exportaste nunca';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        <button type="button" className="evrow ajrow" onClick={handleExport}>
          <div className="evic lg" style={{ background: tint(C.teal, '24'), color: C.teal }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15.5V4M8 11.5l4 4 4-4M4.5 19.5h15" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="evname">Exportar backup</div>
            <div className="evsub">Descarga {BACKUP_FILE}</div>
          </div>
          <span style={{ fontSize: '15px', color: 'rgba(242,244,248,.35)' }}>&#8250;</span>
        </button>

        <button type="button" className="evrow ajrow" onClick={handleImportClick}>
          <div className="evic lg" style={{ background: tint(C.violet, '24'), color: C.violet }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11.5M8 8l4-4 4 4M4.5 19.5h15" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="evname">Importar backup</div>
            <div className="evsub">Reemplaza los datos actuales</div>
          </div>
          <span style={{ fontSize: '15px', color: 'rgba(242,244,248,.35)' }}>&#8250;</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleFile} />

      <div style={{ fontSize: '12px', color: 'rgba(242,244,248,.4)', margin: '12px 4px 0', lineHeight: 1.5 }}>
        Último backup: {ultimo}. El archivo siempre se llama igual, así reemplaza al anterior en Drive o Archivos.
      </div>

      {pending && (
        <ConfirmDialog
          title="¿Reemplazar todos tus datos?"
          description={`Esto va a reemplazar todos tus datos actuales por los del backup${pending.fecha}. Lo que tengas ahora se pierde.`}
          okLabel="Reemplazar"
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        />
      )}

      {notice && <NoticeDialog title={notice.title} description={notice.description} onClose={() => setNotice(null)} />}
    </>
  );
}
