import { Modal } from '../ui/Modal';
import { PencilIcon, CrossIcon, PlusIcon } from '../ui/Icons';
import { C } from '../../lib/theme';

/* ----------------------------- ADMINISTRAR EL PLAN: OPCIONES DE UNA FRANJA -----------------------------
   El segundo nivel del plan: las opciones posibles de UNA franja ("Almuerzo" → milanesa
   con ensalada, pollo con arroz, pasta). Son varias a propósito: el pedido fue "la lista
   simple pero con opciones". Cada una es texto libre, y es ese mismo texto el que después
   el bot busca adentro de lo que escribís en la bitácora (ver matchEntry en lib/meals.js)
   — por eso conviene que sean cortas y parecidas a como las escribís de verdad. */
export function ManageMealOptionsModal({ slot, onClose, onNew, onEdit, onDelete }) {
  return (
    <Modal title={slot.name} onClose={onClose}>
      <div className="fld">
        <div className="managetypes-head">
          <div className="flabel notopmargin">Opciones</div>
          <button type="button" className="roundadd" style={{ background: C.violet }} onClick={onNew} aria-label="Nueva opción">
            <PlusIcon size={18} strokeWidth="2.6" color="#0A0C11" />
          </button>
        </div>

        {slot.options.length === 0 ? (
          <div className="empty">Esta franja no tiene opciones todavía. Tocá + para agregar una.</div>
        ) : (
          <div className="card managelist">
            {slot.options.map((o) => (
              <div className="managerow" key={o.id}>
                <span className="managerow-name">{o.text}</span>
                <div className="managerow-actions">
                  <button type="button" className="iconcirc" aria-label={`Editar ${o.text}`} onClick={() => onEdit(o)}>
                    <PencilIcon />
                  </button>
                  <button type="button" className="iconcirc" aria-label={`Eliminar ${o.text}`} onClick={() => onDelete(o)}>
                    <CrossIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="managetypes-note">
          Cuando escribas algo parecido en la bitácora, se va a reconocer solo.
        </div>
      </div>
    </Modal>
  );
}
