import { Modal } from '../ui/Modal';
import { PencilIcon, CrossIcon, PlusIcon, HabitIcon } from '../ui/Icons';
import { C } from '../../lib/theme';

/* ----------------------------- ADMINISTRAR EXTRAS -----------------------------
   Calco de ManageTypesModal.jsx (gimnasio), con un ícono en vez de un simple punto de
   color — mismo HabitIcon que ya usa Hábitos, porque un extra tiene ícono igual que un
   hábito (café, copa, lo que el usuario elija). */
export function ManageMealExtrasModal({ extras, onClose, onNew, onEdit, onDelete }) {
  return (
    <Modal title="Extras de comidas" onClose={onClose}>
      <div className="fld">
        <div className="managetypes-head">
          <div className="flabel notopmargin">Extras de comidas</div>
          <button type="button" className="roundadd" style={{ background: C.violet }} onClick={onNew} aria-label="Nuevo extra">
            <PlusIcon size={18} strokeWidth="2.6" color="#0A0C11" />
          </button>
        </div>

        {extras.length === 0 ? (
          <div className="empty">No hay extras todavía. Tocá + para agregar uno (café, alcohol, permitidos…).</div>
        ) : (
          <div className="card managelist">
            {extras.map((e) => (
              <div className="managerow" key={e.id}>
                <HabitIcon icon={e.icon} color={e.color} size={20} />
                <span className="managerow-name">{e.name}</span>
                <div className="managerow-actions">
                  <button type="button" className="iconcirc" aria-label={`Editar ${e.name}`} onClick={() => onEdit(e)}>
                    <PencilIcon />
                  </button>
                  <button type="button" className="iconcirc" aria-label={`Eliminar ${e.name}`} onClick={() => onDelete(e)}>
                    <CrossIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="managetypes-note">
          Un extra es cualquier cosa que quieras seguir fuera del plan: café, alcohol, un permitido… Cuando lo mencionás en la bitácora, se reconoce solo.
        </div>
      </div>
    </Modal>
  );
}
