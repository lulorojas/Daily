import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { PencilIcon, CrossIcon } from '../ui/Icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { deleteBodyWeight } from '../../store/mutations';
import { bodyList } from '../../lib/gym';
import { fmtDateLong, fmtNum } from '../../lib/dates';
import { C, accentedDashedStyle } from '../../lib/theme';

/* ----------------------------- HISTORIAL DE PESO -----------------------------
   Port de bodyManageModal(). Lista completa, del más nuevo al más viejo, con editar y
   borrar por fila. Es una hoja sin botón de guardar: acá no se confirma nada, se elige
   una fila y eso abre el formulario de esa fila (o el de uno nuevo). */
export function BodyManageModal({ onClose, onNew, onEdit }) {
  const { data, update } = useData();
  const [borrando, setBorrando] = useState(null);
  const log = bodyList(data).slice().reverse();

  return (
    <>
      <Modal title="Peso corporal" onClose={onClose}>
        <div className="fld">
          <div className="flabel">Historial de peso</div>
          {log.length === 0 ? (
            <div className="card emptycard"><div className="empty">Todavía no registraste tu peso.</div></div>
          ) : (
            <div className="card managelist">
              {log.map((r) => (
                <div className="managerow" key={r.id}>
                  <span className="fr managerow-kg narrow" style={{ color: C.rose }}>{fmtNum(r.kg)} kg</span>
                  <span className="managerow-date">{fmtDateLong(r.date)}</span>
                  <div className="managerow-actions">
                    <button type="button" className="iconcirc" aria-label="Editar" onClick={() => onEdit(r)}>
                      <PencilIcon />
                    </button>
                    <button type="button" className="iconcirc" aria-label="Eliminar" onClick={() => setBorrando(r)}>
                      <CrossIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="dashed" style={accentedDashedStyle(C.rose)} onClick={onNew}>
          + Registrar peso
        </button>
      </Modal>

      {borrando && (
        <ConfirmDialog
          title="¿Eliminar este registro?"
          description={`${fmtNum(borrando.kg)} kg del ${fmtDateLong(borrando.date)}. Se quita de la tendencia.`}
          okLabel="Eliminar"
          onConfirm={() => { update((draft) => deleteBodyWeight(draft, borrando.id)); setBorrando(null); }}
          onCancel={() => setBorrando(null)}
        />
      )}
    </>
  );
}
