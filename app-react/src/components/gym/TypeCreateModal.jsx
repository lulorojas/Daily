import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { SwatchCheckIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { addCustomType, updateCustomType } from '../../store/mutations';
import { C, PALETTE, tint } from '../../lib/theme';

/* ----------------------------- NUEVO / EDITAR TIPO -----------------------------
   Port de typeCreateModal(). Un nombre y un color de la paleta; el color elegido se pinta
   con un halo (box-shadow) y un tilde adentro, igual que el selector de color de hábitos —
   son la misma idea (SwatchCheckIcon), aunque acá el dato es un tipo de entreno y allá un
   hábito. */
export function TypeCreateModal({ type, onClose, onSaved }) {
  const { update } = useData();
  const editing = !!type;
  const nameId = useId();
  const nameRef = useRef(null);

  const [name, setName] = useState(type?.name ?? '');
  const [color, setColor] = useState(type?.color ?? C.rose);
  const [error, setError] = useState(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Poné un nombre para el tipo de entreno.');
      nameRef.current?.focus();
      return;
    }
    update((draft) => {
      if (editing) updateCustomType(draft, type.id, { name: trimmed, color });
      else addCustomType(draft, { name: trimmed, color });
    });
    onSaved?.();
  };

  return (
    <Modal
      title={editing ? 'Editar tipo' : 'Nuevo tipo'}
      accent={C.rose}
      saveLabel={editing ? 'Guardar' : 'Agregar'}
      onSave={handleSave}
      onClose={onClose}
    >
      <Field label="Nombre" htmlFor={nameId} error={error}>
        <input
          id={nameId}
          ref={nameRef}
          className={`inp${error ? ' bad' : ''}`}
          placeholder="Ej: Espalda y bíceps"
          value={name}
          onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
        />
      </Field>

      <Field label="Color">
        <div className="colordots">
          {PALETTE.map((c) => {
            const on = color === c;
            return (
              <button
                type="button"
                key={c}
                className="cdot"
                style={{ background: c, boxShadow: on ? `0 0 0 3.5px ${tint(c, '73')}` : undefined }}
                aria-pressed={on}
                aria-label={c}
                onClick={() => setColor(c)}
              >
                {on && <SwatchCheckIcon />}
              </button>
            );
          })}
        </div>
      </Field>
    </Modal>
  );
}
