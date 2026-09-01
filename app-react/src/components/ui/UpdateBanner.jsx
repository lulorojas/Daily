import { useSWUpdate } from '../../hooks/useSWUpdate';

/* Nuevo en esta etapa (ver useSWUpdate.js: no hay banner de actualización en vanilla).
   Vive en AppLayout, no en una pantalla puntual: una versión nueva puede quedar en espera
   estés donde estés, así que el aviso tiene que poder aparecer arriba de cualquier cosa. */
export function UpdateBanner() {
  const { needRefresh, updateNow } = useSWUpdate();
  if (!needRefresh) return null;

  return (
    <div className="updatebanner-wrap">
      <div className="noticecard teal">
        <div className="noticecard-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12a8 8 0 1 1-2.35-5.65M20 3.5V8h-4.5" />
          </svg>
        </div>
        <div className="noticecard-body">
          <div className="noticecard-title">Hay una actualización disponible</div>
          <div className="noticecard-sub">Actualizá para tener la última versión de Daily.</div>
        </div>
        <button type="button" className="noticecard-action" onClick={updateNow}>Actualizar ahora</button>
      </div>
    </div>
  );
}
