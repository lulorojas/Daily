import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { useData } from '../../hooks/useData';
import { addMealOption, updateMealOption } from '../../store/mutations';
import { C } from '../../lib/theme';

/* ----------------------------- NUEVA / EDITAR OPCIÓN -----------------------------
   Un solo campo de texto libre. El `hint` no es decorativo: ese texto es literalmente lo
   que el bot va a buscar adentro de lo que escribas en la bitácora, así que conviene que
   sea corto y parecido a como lo escribís de verdad (ver matchEntry en lib/meals.js). */
export function MealOptionFormModal({ slot, option, onClose, onSaved }) {
  const { update } = useData();
  const editing = !!option;
  const textId = useId();
  const textRef = useRef(null);

  const [text, setText] = useState(option?.text ?? '');
  const [error, setError] = useState(null);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Escribí la opción.');
      textRef.current?.focus();
      return;
    }
    update((draft) => {
      if (editing) updateMealOption(draft, slot.id, option.id, { text: trimmed });
      else addMealOption(draft, slot.id, { text: trimmed });
    });
    onSaved?.();
  };

  return (
    <Modal
      title={editing ? 'Editar opción' : 'Nueva opción'}
      accent={C.violet}
      saveLabel={editing ? 'Guardar' : 'Agregar'}
      onSave={handleSave}
      onClose={onClose}
    >
      <Field label={`Opción de ${slot.name}`} hint="como la escribirías vos" htmlFor={textId} error={error}>
        <input
          id={textId}
          ref={textRef}
          className={`inp${error ? ' bad' : ''}`}
          placeholder="Ej: Milanesa con ensalada"
          value={text}
          onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
        />
      </Field>
    </Modal>
  );
}
