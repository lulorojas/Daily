import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { addCoreLogEntry, deleteCoreLogEntry, updateCoreLogEntry } from '../../store/mutations';
import { CORE_CATS, CORE_CAT_LABELS } from '../../lib/gym';
import { C } from '../../lib/theme';
import { addDays, dow, DOW_SHORT, iso, parseISO } from '../../lib/dates';

const ACCENT = C.violet;

/* ----------------------------- REGISTRAR / EDITAR ABS Y MOVILIDAD -----------------------------
   Sin equivalente en la app vanilla (etapa 6). Pedido explícito de Lulo (corregido después
   de la primera entrega): esto tiene que sentirse parte del plan semanal, no una fecha
   suelta con su propio calendario — por eso el día se elige con los mismos chips Lun..Dom
   que ya usa toda la semana, no con un <DateField>. `weekStart` es el lunes de la semana
   que se está mirando en Gimnasio (mismo `weekKey(offset)` que arma el plan de turnos);
   el date que se guarda sale de sumarle el índice del chip elegido.

   `categories` y `movilidad` son independientes: se puede marcar solo movilidad (sin
   ninguna categoría) o al revés. Lo único que no vale es guardar una entrada sin nada
   marcado — no habría qué registrar. */
export function CoreLogModal({ entry, weekStart, defaultDayIndex = 0, onClose }) {
  const { update } = useData();
  const editing = !!entry;

  const [dayIndex, setDayIndex] = useState(editing ? dow(parseISO(entry.date)) : defaultDayIndex);
  const [categories, setCategories] = useState(entry ? entry.categories : []);
  const [movilidad, setMovilidad] = useState(entry ? entry.movilidad : false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const toggleCat = (cat) => {
    setCategories((cs) => (cs.includes(cat) ? cs.filter((c) => c !== cat) : [...cs, cat]));
    setError('');
  };

  const handleSave = () => {
    if (categories.length === 0 && !movilidad) {
      setError('Marcá al menos una categoría de abdominales o movilidad.');
      return;
    }
    const date = iso(addDays(parseISO(weekStart), dayIndex));
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
        <Field label="Día">
          <div className="chips">
            {DOW_SHORT.map((d, i) => (
              <button
                type="button"
                key={d}
                className={`chip${dayIndex === i ? ' on' : ''}`}
                style={dayIndex === i ? { background: ACCENT } : undefined}
                aria-pressed={dayIndex === i}
                onClick={() => setDayIndex(i)}
              >
                {d}
              </button>
            ))}
          </div>
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
          description="Se saca del plan semanal."
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
