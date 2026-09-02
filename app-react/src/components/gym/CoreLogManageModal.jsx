import { Modal } from '../ui/Modal';
import { PencilIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { coreLogList, describeCoreLogEntry } from '../../lib/gym';
import { fmtDateLong } from '../../lib/dates';
import { accentedDashedStyle, C } from '../../lib/theme';

const ACCENT = C.violet;

/* ----------------------------- HISTORIAL DE ABS Y MOVILIDAD -----------------------------
   Sin equivalente en vanilla (etapa 6), mismo patrón que BodyManageModal: lista completa
   del más nuevo al más viejo, sin botón de guardar — tocar una fila abre su edición, que
   es donde vive el borrado (ver CoreLogModal). */
export function CoreLogManageModal({ onClose, onNew, onEdit }) {
  const { data } = useData();
  const log = coreLogList(data).slice().reverse();

  return (
    <Modal title="Abs y movilidad" onClose={onClose}>
      <div className="fld">
        <div className="flabel">Historial</div>
        {log.length === 0 ? (
          <div className="card emptycard"><div className="empty">Todavía no registraste abs ni movilidad.</div></div>
        ) : (
          <div className="card managelist">
            {log.map((e) => (
              <div className="managerow" key={e.id}>
                <span className="managerow-name">{describeCoreLogEntry(e)}</span>
                <span className="managerow-date">{fmtDateLong(e.date)}</span>
                <div className="managerow-actions">
                  <button type="button" className="iconcirc" aria-label="Editar" onClick={() => onEdit(e)}>
                    <PencilIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="dashed" style={accentedDashedStyle(ACCENT)} onClick={onNew}>
        + Registrar
      </button>
    </Modal>
  );
}
