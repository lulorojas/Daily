import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { DateField } from '../ui/DatePicker';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { addCoreLogEntry, deleteCoreLogEntry, updateCoreLogEntry } from '../../store/mutations';
import { CORE_CATS, CORE_CAT_LABELS } from '../../lib/gym';
import { C } from '../../lib/theme';
import { todayISO } from '../../lib/dates';

const ACCENT = C.violet;

/* ----------------------------- REGISTRAR / EDITAR ABS Y MOVILIDAD -----------------------------
   Sin equivalente en la app vanilla (etapa 6): no hay un modal viejo del que portar el
   marcado, así que este sigue el mismo patrón que BodyWeightModal (campo + Field + chips +
   borrar al editar), no una traducción de otra cosa.

   `categories` y `movilidad` son independientes: se puede marcar solo movilidad (sin
   ninguna categoría) o al revés. Lo único que no vale es guardar una entrada sin nada
   marcado — no habría qué registrar. */
export function CoreLogModal({ entry, onClose }) {
  const { update } = useData();
  const editing = !!entry;

  const [date, setDate] = useState(entry ? entry.date : todayISO());
  const [categories, setCategories] = useState(entry ? entry.categories : []);
  const [movilidad, setMovilidad] = useState(entry ? entry.movilidad : false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const toggleCat = (cat) => {
    setCategories((cs) => (cs.includes(cat) ? cs.filter((c) => c !== cat) : [...cs, cat]));
    setError('');
  };

  const handleSave = () => {
    if (!date) { setError('Elegí una fecha.'); return; }
    if (categories.length === 0 && !movilidad) {
      setError('Marcá al menos una categoría de abdominales o movilidad.');
      return;
    }
    update((draft) => {
      if (editing) updateCoreLogEntry(draft, entry.id, { date, categories, movilidad });
      else addCoreLogEntry(draft, { date, categories, movilidad });
    });
    onClose();
  };

  const handleDelete = () => {
    update((draft) => deleteCoreLogEntry(draft, entry.id));
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal title={editing ? 'Editar registro' : 'Abs y movilidad'} accent={ACCENT} onSave={handleSave} onClose={onClose}>
        <Field label="Fecha">
          <DateField value={date} accent={ACCENT} onChange={setDate} />
        </Field>

        <Field label="Abdominales" hint="opcional">
          <div className="chips">
            {CORE_CATS.map((cat) => {
              const on = categories.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  className={`chip${on ? ' on' : ''}`}
                  style={on ? { background: ACCENT } : undefined}
                  aria-pressed={on}
                  onClick={() => toggleCat(cat)}
                >
                  {CORE_CAT_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Movilidad" error={error}>
          <div className="chips">
            <button
              type="button"
              className={`chip${movilidad ? ' on' : ''}`}
              style={movilidad ? { background: ACCENT } : undefined}
              aria-pressed={movilidad}
              onClick={() => { setMovilidad((m) => !m); setError(''); }}
            >
              Hice movilidad
            </button>
          </div>
        </Field>

        {editing && (
          <button type="button" className="delbtn" onClick={() => setConfirming(true)}>Eliminar registro</button>
        )}
      </Modal>

      {confirming && (
        <ConfirmDialog
          title="¿Eliminar este registro?"
          description="Se saca del historial de abs y movilidad."
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
