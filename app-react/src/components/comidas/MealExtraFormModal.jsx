import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { SwatchCheckIcon, HabitIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { addMealExtra, nextExtraColor, updateMealExtra } from '../../store/mutations';
import { ICON_KEYS } from '../../lib/icons';
import { C, PALETTE, tint } from '../../lib/theme';

// Las tres calidades que puede tener un extra (pedido explícito: "evitar el alcohol" por
// un lado, "comí algo fuera del plan que no está tan mal" por el otro). Colores fijos
// (no var(--accent)): el modal vive fuera de #app (createPortal) y no puede leer el
// acento de la página — mismo motivo por el que el resto de los campos de este formulario
// ya usa colores explícitos. `undefined` es "neutro", el comportamiento de siempre
// (café, permitidos…) — no se guarda como valor, se guarda AUSENCIA del campo.
const CALIDADES = [
  { value: undefined, label: 'Neutro', color: 'rgba(242,244,248,.4)' },
  { value: 'bueno', label: 'Bueno', color: C.green },
  { value: 'malo', label: 'Evitar', color: C.danger },
];

/* ----------------------------- NUEVO / EDITAR EXTRA -----------------------------
   Calco de HabitFormModal.jsx, sin el campo "veces por día": un extra no se marca N
   veces, se reconoce (o no) en lo que escribís en la bitácora — ver matchEntry() en
   lib/meals.js. El borrado vive en MealExtrasManager.jsx (con su propio ConfirmDialog,
   igual que gimnasio separa TypesManager de TypeCreateModal), así que acá no hay botón
   de eliminar.

   Campo nuevo "Calidad" (pedido explícito, seguimiento de adherencia del plan de
   comidas): "Evitar" es para algo como Alcohol — "Cómo comés" (Progreso) le dedica un
   aviso si aparece en el período. "Bueno" es para algo como "Comida libre" — fuera del
   plan, pero no es un problema, y "Cómo comés" lo cuenta como un aviso informativo en vez
   de dejarlo invisible. Ver comoComes() en lib/meals.js. */
export function MealExtraFormModal({ extra, onClose, onSaved }) {
  const { data, update } = useData();
  const editing = !!extra;
  const nameId = useId();
  const nameRef = useRef(null);

  const [name, setName] = useState(extra?.name ?? '');
  const [color, setColor] = useState(extra?.color ?? nextExtraColor(data));
  const [icon, setIcon] = useState(extra?.icon ?? 'estrella');
  const [quality, setQuality] = useState(extra?.quality);
  const [error, setError] = useState(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Poné un nombre para el extra.');
      nameRef.current?.focus();
      return;
    }
    const fields = { name: trimmed, color, icon, quality };
    update((draft) => {
      if (editing) updateMealExtra(draft, extra.id, fields);
      else addMealExtra(draft, fields);
    });
    onSaved?.();
  };

  return (
    <Modal
      title={editing ? 'Editar extra' : 'Nuevo extra'}
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
          placeholder="Ej: Café, Alcohol, Permitidos"
          value={name}
          onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
        />
      </Field>

      <Field label="Calidad">
        <div className="qualitypick">
          {CALIDADES.map((q) => {
            const on = quality === q.value;
            return (
              <button
                type="button"
                key={q.label}
                className="qbtn"
                style={on ? { background: tint(q.color, '24'), borderColor: q.color, color: q.color } : undefined}
                aria-pressed={on}
                onClick={() => setQuality(q.value)}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Ícono">
        <div className="iconpick">
          {ICON_KEYS.map((k) => {
            const on = icon === k;
            return (
              <button
                type="button"
                key={k}
                className="ibtn"
                style={on ? { background: tint(color, '24'), borderColor: color } : { background: tint(color, '24') }}
                aria-pressed={on}
                aria-label={k}
                onClick={() => setIcon(k)}
              >
                <HabitIcon icon={k} color={color} size={22} />
              </button>
            );
          })}
        </div>
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
