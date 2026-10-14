import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { CrossIcon, PlusIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { addMealOption, updateMealOption } from '../../store/mutations';
import { uid } from '../../lib/ids';
import { C } from '../../lib/theme';

// Las dos formas que puede tener una opción (pedido explícito: "quiero que las opciones
// de cada comida y lo que yo comí importe" — un texto suelto no se puede medir, una
// lista de ítems con cantidad sí). `undefined` primero: es el modo de siempre.
const MODOS = [
  { value: 'texto', label: 'Texto libre' },
  { value: 'items', label: 'Con cantidades' },
];

const TIPOS_ITEM = [
  { value: '', label: 'Sin clasificar' },
  { value: 'carbo', label: 'Carbohidrato' },
  { value: 'proteina', label: 'Proteína' },
  { value: 'grasa', label: 'Grasa' },
];

/* ----------------------------- NUEVA / EDITAR OPCIÓN -----------------------------
   Dos modos, nunca los dos a la vez (ver normalizeOptionFields en store/mutations.js):

     texto  — un solo campo libre, como siempre. El `hint` no es decorativo: ese texto es
              literalmente lo que el bot va a buscar adentro de lo que escribas en la
              bitácora (matchEntry, lib/meals.js), así que conviene que sea corto.
     items  — una lista de alimento + cantidad (+ opcionalmente a qué macro aporta). Acá
              el bot no busca el renglón entero: busca cada alimento por separado y la
              cantidad que escribiste al lado ("2 tostadas") — ver matchItems() en
              lib/meals.js. Es lo que permite "comí 2 de las 3 tostadas que pedía el plan"
              en vez de un simple sí/no.

   Cambiar de modo en edición no mezcla datos viejos: el estado local arranca de lo que
   YA tenía la opción (texto o ítems), pero al guardar se manda solo lo del modo activo —
   la mutación borra el campo del otro modo. */
export function MealOptionFormModal({ slot, option, onClose, onSaved }) {
  const { update } = useData();
  const editing = !!option;
  const textId = useId();
  const textRef = useRef(null);

  const [modo, setModo] = useState(option?.items?.length ? 'items' : 'texto');
  const [text, setText] = useState(option?.text ?? '');
  const [items, setItems] = useState(option?.items ?? []);
  const [error, setError] = useState(null);

  const addItem = () => setItems((xs) => [...xs, { id: uid(), name: '', qty: 1, tipo: undefined }]);
  const updateItem = (id, patch) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeItem = (id) => setItems((xs) => xs.filter((x) => x.id !== id));

  const handleSave = () => {
    if (modo === 'texto') {
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
    } else {
      const limpios = items
        .map((it) => ({ ...it, name: it.name.trim() }))
        .filter((it) => it.name && it.qty > 0);
      if (!limpios.length) {
        setError('Agregá al menos un ítem con nombre y cantidad.');
        return;
      }
      update((draft) => {
        if (editing) updateMealOption(draft, slot.id, option.id, { items: limpios });
        else addMealOption(draft, slot.id, { items: limpios });
      });
    }
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
      <Field label={`Opción de ${slot.name}`}>
        <div className="qualitypick">
          {MODOS.map((m) => {
            const on = modo === m.value;
            return (
              <button
                type="button"
                key={m.value}
                className="qbtn"
                style={on ? { background: 'rgba(180,155,232,.24)', borderColor: C.violet, color: C.violet } : undefined}
                aria-pressed={on}
                onClick={() => { setModo(m.value); setError(null); }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </Field>

      {modo === 'texto' ? (
        <Field label="Texto" hint="como la escribirías vos" htmlFor={textId} error={error}>
          <input
            id={textId}
            ref={textRef}
            className={`inp${error ? ' bad' : ''}`}
            placeholder="Ej: Milanesa con ensalada"
            value={text}
            onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
          />
        </Field>
      ) : (
        <Field label="Ítems" hint="el bot va a buscar el número pegado al nombre, ej: &quot;2 tostadas&quot;" error={error}>
          <div className="mealitems-build">
            {items.map((it) => (
              <div className="mealitemrow" key={it.id}>
                <input
                  className="inp mealitem-name"
                  placeholder="Alimento (ej: tostadas)"
                  value={it.name}
                  onChange={(e) => { updateItem(it.id, { name: e.target.value }); if (error) setError(null); }}
                />
                <input
                  className="inp mealitem-qty"
                  type="number"
                  min="0"
                  value={it.qty}
                  onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 0 })}
                />
                <select
                  className="inp mealitem-tipo"
                  value={it.tipo ?? ''}
                  onChange={(e) => updateItem(it.id, { tipo: e.target.value || undefined })}
                >
                  {TIPOS_ITEM.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button type="button" className="iconcirc" aria-label={`Quitar ${it.name || 'ítem'}`} onClick={() => removeItem(it.id)}>
                  <CrossIcon />
                </button>
              </div>
            ))}
            <button type="button" className="dashed" onClick={addItem}>
              <PlusIcon size={16} strokeWidth="2.4" />
              Agregar ítem
            </button>
          </div>
        </Field>
      )}
    </Modal>
  );
}
