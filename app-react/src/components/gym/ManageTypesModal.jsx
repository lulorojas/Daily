import { Modal } from '../ui/Modal';
import { PencilIcon, CrossIcon, PlusIcon } from '../ui/Icons';
import { C } from '../../lib/theme';

/* ----------------------------- ADMINISTRAR TIPOS -----------------------------
   Port de manageTypesModal(). Solo lista y edita los tipos que CREÓ el usuario:
   "Descanso" es el único fijo, no aparece acá y el texto de abajo lo aclara — nunca se
   puede borrar porque no es un dato, es una constante de la app (ver REST en lib/gym.js). */
export function ManageTypesModal({ types, onClose, onNew, onEdit, onDelete }) {
  return (
    <Modal title="Tipos de entrenamiento" onClose={onClose}>
      <div className="fld">
        <div className="managetypes-head">
          <div className="flabel notopmargin">Tipos de entrenamiento</div>
          <button type="button" className="roundadd" style={{ background: C.rose }} onClick={onNew} aria-label="Nuevo tipo">
            <PlusIcon size={18} strokeWidth="2.6" color="#0A0C11" />
          </button>
        </div>

        {types.length === 0 ? (
          <div className="empty">No hay tipos. Tocá + para agregar uno.</div>
        ) : (
          <div className="card managelist">
            {types.map((t) => (
              <div className="managerow" key={t.id}>
                <span className="typedot" style={{ background: t.color }} />
                <span className="managerow-name">{t.name}</span>
                <div className="managerow-actions">
                  <button type="button" className="iconcirc" aria-label={`Editar ${t.name}`} onClick={() => onEdit(t)}>
                    <PencilIcon />
                  </button>
                  <button type="button" className="iconcirc" aria-label={`Eliminar ${t.name}`} onClick={() => onDelete(t)}>
                    <CrossIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="managetypes-note">
          &quot;Descanso&quot; siempre está disponible como día libre y no se puede borrar.
        </div>
      </div>
    </Modal>
  );
}
