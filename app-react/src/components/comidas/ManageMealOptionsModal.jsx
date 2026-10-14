import { Modal } from '../ui/Modal';
import { PencilIcon, CrossIcon, PlusIcon } from '../ui/Icons';
import { optionLabel } from '../../lib/meals';
import { C } from '../../lib/theme';

/* ----------------------------- ADMINISTRAR EL PLAN: OPCIONES DE UNA FRANJA -----------------------------
   El segundo nivel del plan: las opciones posibles de UNA franja ("Almuerzo" → milanesa
   con ensalada, pollo con arroz, pasta). Son varias a propósito: el pedido fue "la lista
   simple pero con opciones". Cada una es texto libre O una lista de ítems con cantidad
   (ver MealOptionFormModal.jsx) — optionLabel() arma el texto a mostrar sea cual sea el
   modo, así esta lista no distingue entre los dos. En modo texto libre es literalmente
   lo que el bot busca adentro de lo que escribís en la bitácora (matchEntry en
   lib/meals.js) — por eso conviene que sean cortas y parecidas a como las escribís. */
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
            {slot.options.map((o) => {
              const label = optionLabel(o);
              return (
                <div className="managerow" key={o.id}>
                  <span className="managerow-name">{label}</span>
                  <div className="managerow-actions">
                    <button type="button" className="iconcirc" aria-label={`Editar ${label}`} onClick={() => onEdit(o)}>
                      <PencilIcon />
                    </button>
                    <button type="button" className="iconcirc" aria-label={`Eliminar ${label}`} onClick={() => onDelete(o)}>
                      <CrossIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="managetypes-note">
          Cuando escribas algo parecido en la bitácora, se va a reconocer solo.
        </div>
      </div>
    </Modal>
  );
}
