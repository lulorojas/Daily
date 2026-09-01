import { useBackup } from '../../hooks/useBackup';

/* Port de bkBanner() de app/js/ajustes.js. Se dibuja en dos pantallas (Hoy y Ajustes,
   igual que en vanilla) — por eso vive en su propio componente en vez de escrito a mano
   en cada una. */
export function BackupBanner() {
  const { shouldWarn, warnText, exportNow, snoozeAWeek } = useBackup();
  if (!shouldWarn) return null;

  return (
    <div className="noticecard amber">
      <div className="noticecard-ic">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM12 8v5M12 16.2v.3" />
        </svg>
      </div>
      <div className="noticecard-body">
        <div className="noticecard-title">{warnText}</div>
        <div className="noticecard-sub">Guardá una copia por las dudas.</div>
      </div>
      <button type="button" className="noticecard-action" onClick={exportNow}>Exportar</button>
      <button type="button" className="iconcirc noticecard-dismiss" title="Recordarme en una semana" aria-label="Recordarme en una semana" onClick={snoozeAWeek}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
