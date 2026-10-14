import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { CrossIcon, PlusIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { addMealOption, updateMealOption } from '../../store/mutations';
import { uid } from '../../lib/ids';
import { C } from '../../lib/theme';

const UNIDADES = [
  { value: 'u', label: 'unidades' },
  { value: 'gr', label: 'gramos' },
];

const TIPOS_ITEM = [
  { value: '', label: 'Sin macro' },
  { value: 'carbo', label: 'Carbohidrato' },
  { value: 'proteina', label: 'Proteína' },
  { value: 'grasa', label: 'Grasa' },
];

/* ----------------------------- NUEVA / EDITAR OPCIÓN -----------------------------
   Toda opción tiene un nombre ("Tortita de banana") — es lo que se ve al registrar y lo
   que el bot busca si lo escribís en la bitácora. Abajo, opcional, "Qué lleva": la lista
   de alimentos con su cantidad del plan, en unidades o en gramos (pedido explícito: "no
   solo cantidades, a veces pueden ser pesos"), y a qué macro aporta cada uno. Con esa
   lista, registrar la comida permite decir "comí 2 de los 3 panes" y Daily lo mide (ver
   RegisterMealModal.jsx y comoComes() en lib/meals.js). Sin lista, la opción se cuenta
   como hecha o no hecha, sin medir. */
export function MealOptionFormModal({ slot, option, onClose, onSaved }) {
  const { update } = useData();
  const editing = !!option;
  const textId = useId();
  const textRef = useRef(null);

  const [text, setText] = useState(option?.text ?? '');
  const [items, setItems] = useState(option?.items ?? []);
  const [error, setError] = useState(null);

  const addItem = () => setItems((xs) => [...xs, { id: uid(), name: '', qty: 1, unit: 'u' }]);
  const updateItem = (id, patch) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeItem = (id) => setItems((xs) => xs.filter((x) => x.id !== id));

  const handleSave = () => {
    const nombre = text.trim();
    if (!nombre) {
      setError('Poné un nombre para la opción.');
      textRef.current?.focus();
      return;
    }
    const limpios = items
      .map((it) => ({ ...it, name: it.name.trim() }))
      .filter((it) => it.name && it.qty > 0);
    const fields = { text: nombre, items: limpios };
    update((draft) => {
      if (editing) updateMealOption(draft, slot.id, option.id, fields);
      else addMealOption(draft, slot.id, fields);
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
      <Field label={`Opción de ${slot.name}`} htmlFor={textId} error={error}>
        <input
          id={textId}
          ref={textRef}
          className={`inp${error ? ' bad' : ''}`}
          placeholder="Ej: Tortita de banana"
          value={text}
          onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
        />
      </Field>

      <Field label="Qué lleva" hint="opcional — para medir cuánto comiste">
        <div className="mealitems-build">
          {items.map((it) => (
            <div className="mealitemrow" key={it.id}>
              <div className="mealitemrow-top">
                <input
                  className="inp mealitem-name"
                  placeholder="Alimento (ej: huevo)"
                  aria-label="Alimento"
                  value={it.name}
                  onChange={(e) => updateItem(it.id, { name: e.target.value })}
                />
                <button type="button" className="iconcirc" aria-label={`Quitar ${it.name || 'alimento'}`} onClick={() => removeItem(it.id)}>
                  <CrossIcon />
                </button>
              </div>
              <div className="mealitemrow-bottom">
                <input
                  className="inp mealitem-qty"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  aria-label="Cantidad del plan"
                  value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 0 })}
                />
                <select
                  className="inp mealitem-unit"
                  aria-label="Unidad"
                  value={it.unit ?? 'u'}
                  onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                >
                  {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
                <select
                  className="inp mealitem-tipo"
                  aria-label="Macro"
                  value={it.tipo ?? ''}
                  onChange={(e) => updateItem(it.id, { tipo: e.target.value || undefined })}
                >
                  {TIPOS_ITEM.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button type="button" className="dashed" onClick={addItem}>
            <PlusIcon size={16} strokeWidth="2.4" />
            Agregar alimento
          </button>
        </div>
      </Field>
    </Modal>
  );
}
