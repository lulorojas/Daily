import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { C } from '../../lib/theme';

/* ----------------------------- EJERCICIO (RUTINA) -----------------------------
   Port de rutExModal(). Nombre + un detalle de texto libre ("4x8-12 · 80 kg"): a
   diferencia de las cargas de Gimnasio, acá no hay número que validar ni historial que
   llevar — es material de consulta, no un registro de sesiones. */
export function ExerciseFormModal({ exercise, onSave, onClose }) {
  const editing = !!exercise;
  const nameId = useId();
  const detailId = useId();
  const nameRef = useRef(null);
  const [name, setName] = useState(exercise?.name ?? '');
  const [detail, setDetail] = useState(exercise?.detail ?? '');
  const [error, setError] = useState(null);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Poné un nombre para el ejercicio.');
      nameRef.current?.focus();
      return;
    }
    onSave({ name: trimmedName, detail: detail.trim() });
  };

  return (
    <Modal title={editing ? 'Editar ejercicio' : 'Nuevo ejercicio'} accent={C.rose} onSave={handleSave} onClose={onClose}>
      <Field label="Ejercicio" htmlFor={nameId} error={error}>
        <input
          id={nameId}
          ref={nameRef}
          className={`inp${error ? ' bad' : ''}`}
          placeholder="Ej: Press banca"
          value={name}
          onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
        />
      </Field>
      <Field label="Detalle" hint="opcional" htmlFor={detailId}>
        <textarea
          id={detailId}
          className="inp"
          placeholder="Ej: 4x8-12 · 80 kg"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        <div className="fieldhint">Series, repeticiones, carga o lo que quieras recordar.</div>
      </Field>
    </Modal>
  );
}
