import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { C } from '../../lib/theme';

/* ----------------------------- NOMBRE, NADA MÁS -----------------------------
   Port de rutModal() y rutDayModal(). Son dos funciones casi idénticas en la app vanilla
   —mismo único campo, misma validación— que solo cambian los textos. Acá es un componente
   parametrizado en vez de dos casi iguales: si mañana hay que agregarle algo a uno de los
   dos (por ejemplo, una descripción a la rutina), ahí sí se separan; hasta que eso pase,
   mantenerlos juntos evita que se desincronicen sin querer. */
export function SimpleNameModal({
  modalTitle, editTitle, fieldLabel, placeholder, errorMessage, initialName = '', onSave, onClose,
}) {
  const editing = initialName !== '';
  const nameId = useId();
  const nameRef = useRef(null);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(errorMessage);
      nameRef.current?.focus();
      return;
    }
    onSave(trimmed);
  };

  return (
    <Modal title={editing ? editTitle : modalTitle} accent={C.rose} onSave={handleSave} onClose={onClose}>
      <Field label={fieldLabel} htmlFor={nameId} error={error}>
        <input
          id={nameId}
          ref={nameRef}
          className={`inp${error ? ' bad' : ''}`}
          placeholder={placeholder}
          value={name}
          onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
        />
      </Field>
    </Modal>
  );
}
