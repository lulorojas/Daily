import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { DateField } from '../ui/DatePicker';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { addBodyWeight, deleteBodyWeight, updateBodyWeight } from '../../store/mutations';
import { C, tint } from '../../lib/theme';
import { fmtNum, todayISO } from '../../lib/dates';
import { parseDecimal } from '../../lib/numberForms';

const ACCENT = C.rose;

/* ----------------------------- REGISTRAR / EDITAR PESO -----------------------------
   Port de bodyModal(). El campo de peso acepta coma o punto decimal (parseDecimal, que
   es el mismo truco de replace(',','.') que hacía vanilla) porque el teclado numérico del
   teléfono en español pone una coma. */
export function BodyWeightModal({ record, onClose }) {
  const { update } = useData();
  const editing = !!record;
  const kgId = useId();
  const kgRef = useRef(null);

  const [kg, setKg] = useState(record ? fmtNum(record.kg) : '');
  const [date, setDate] = useState(record ? record.date : todayISO());
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  const handleSave = () => {
    const parsed = parseDecimal(kg);
    const valido = parsed !== null && parsed > 0;
    const found = {};
    if (!valido) found.kg = kg.trim() === '' ? 'Poné cuánto pesás en kg.' : 'Poné un peso válido en kg (mayor a 0).';
    if (!date) found.date = 'Elegí una fecha.';
    setErrors(found);
    if (found.kg) { kgRef.current?.focus(); return; }
    if (found.date) return;

    update((draft) => {
      if (editing) updateBodyWeight(draft, record.id, { kg: parsed, date });
      else addBodyWeight(draft, { kg: parsed, date });
    });
    onClose();
  };

  const handleDelete = () => {
    update((draft) => deleteBodyWeight(draft, record.id));
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal title={editing ? 'Editar registro' : 'Registrar peso'} accent={ACCENT} onSave={handleSave} onClose={onClose}>
        <Field label="Peso corporal" hint="kg" htmlFor={kgId} error={errors.kg} errorId={`${kgId}-err`}>
          {/* El acento (ACCENT) se pasa siempre explícito acá adentro: el modal vive fuera
              de #app (createPortal), así que var(--accent) leería el ámbar de :root en vez
              del rosa de Gimnasio. Ver la nota en ui/Modal.jsx. */}
          <div className="kginput" style={{ borderColor: tint(ACCENT, '4D') }}>
            <input
              id={kgId}
              ref={kgRef}
              className="inp kgfield"
              style={{ color: ACCENT }}
              inputMode="decimal"
              placeholder="72,5"
              value={kg}
              onChange={(e) => { setKg(e.target.value); if (errors.kg) setErrors((p) => ({ ...p, kg: undefined })); }}
              aria-invalid={errors.kg ? 'true' : undefined}
              aria-describedby={errors.kg ? `${kgId}-err` : undefined}
            />
            <span className="kgunit">kg</span>
          </div>
        </Field>

        <Field label="Fecha" error={errors.date}>
          <DateField
            value={date}
            accent={ACCENT}
            error={errors.date}
            onChange={(d) => { setDate(d); if (errors.date) setErrors((p) => ({ ...p, date: undefined })); }}
          />
        </Field>

        {editing && (
          <button type="button" className="delbtn" onClick={() => setConfirming(true)}>Eliminar registro</button>
        )}
      </Modal>

      {confirming && (
        <ConfirmDialog
          title="¿Eliminar este registro?"
          description={`${fmtNum(record.kg)} kg. Se quita de la tendencia.`}
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
