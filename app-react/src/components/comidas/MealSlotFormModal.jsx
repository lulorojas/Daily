import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { useData } from '../../hooks/useData';
import { addMealSlot, updateMealSlot } from '../../store/mutations';
import { C } from '../../lib/theme';

/* ----------------------------- NUEVA / EDITAR FRANJA -----------------------------
   Calco de TypeCreateModal.jsx (gimnasio) pero sin color: una franja no tiene acento
   propio, solo un nombre ("Desayuno", "Almuerzo"…) que el usuario elige libremente. */
export function MealSlotFormModal({ slot, onClose, onSaved }) {
  const { update } = useData();
  const editing = !!slot;
  const nameId = useId();
  const nameRef = useRef(null);

  const [name, setName] = useState(slot?.name ?? '');
  const [error, setError] = useState(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Poné un nombre para la franja.');
      nameRef.current?.focus();
      return;
    }
    update((draft) => {
      if (editing) updateMealSlot(draft, slot.id, { name: trimmed });
      else addMealSlot(draft, { name: trimmed });
    });
    onSaved?.();
  };

  return (
    <Modal
      title={editing ? 'Editar franja' : 'Nueva franja'}
      accent={C.violet}
      saveLabel={editing ? 'Guardar' : 'Agregar'}
      onSave={handleSave}
      onClose={onClose}
    >
      <Field label="Nombre" htmlFor={nameId} error={error}>
        <input
          id={nameId}
          ref={nameRef}
          className={`inp${error ? ' bad' : ''}`}
          placeholder="Ej: Desayuno, Almuerzo, Merienda, Cena"
          value={name}
          onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
        />
      </Field>
    </Modal>
  );
}
