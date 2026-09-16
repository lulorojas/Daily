import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { DateField } from '../ui/DatePicker';
import { useData } from '../../hooks/useData';
import { updateLiftRecord } from '../../store/mutations';
import { fmtNum } from '../../lib/dates';
import { parseDecimal } from '../../lib/numberForms';

/* ----------------------------- EDITAR UN REGISTRO -----------------------------
   Port de liftRecModal(). Solo edita (peso + fecha); crear un registro nuevo es
   "Cargar peso", que es LiftModal. Dos formularios de peso, dos comportamientos: acá no
   hay selector de ejercicio, porque el ejercicio ya está elegido — es el mismo motivo por
   el que taskModal y eventModal, siendo parecidos, son componentes separados. */
export function LiftRecordModal({ lift, index, onClose }) {
  const { update } = useData();
  const record = lift.history[index];
  const kgId = useId();
  const kgRef = useRef(null);

  const [kg, setKg] = useState(fmtNum(record.weight));
  const [date, setDate] = useState(record.date);
  const [reps, setReps] = useState(record.reps ? String(record.reps) : '');
  const [errors, setErrors] = useState({});

  const handleSave = () => {
    const parsed = parseDecimal(kg);
    const valido = parsed !== null && parsed > 0;
    const parsedReps = parseDecimal(reps);
    const repsValido = parsedReps === null || (Number.isInteger(parsedReps) && parsedReps > 0);
    const found = {};
    if (!valido) found.kg = kg.trim() === '' ? 'Poné el peso.' : 'Poné un peso válido (mayor a 0).';
    if (!date) found.date = 'Elegí una fecha.';
    if (!repsValido) found.reps = 'Poné un número entero de repeticiones (o dejalo vacío).';
    setErrors(found);
    if (found.kg) { kgRef.current?.focus(); return; }
    if (found.date || found.reps) return;

    update((draft) => updateLiftRecord(draft, lift.id, index, { date, weight: parsed, reps: parsedReps ?? undefined }));
    onClose();
  };

  return (
    <Modal title="Editar registro" accent={lift.color} onSave={handleSave} onClose={onClose}>
      <Field label="Peso" hint={lift.unit || 'kg'} htmlFor={kgId} error={errors.kg}>
        <input
          id={kgId}
          ref={kgRef}
          className={`inp${errors.kg ? ' bad' : ''}`}
          inputMode="decimal"
          placeholder="Ej: 60"
          value={kg}
          onChange={(e) => { setKg(e.target.value); if (errors.kg) setErrors((p) => ({ ...p, kg: undefined })); }}
        />
      </Field>
      <Field label="Repeticiones" hint="opcional" error={errors.reps}>
        <input
          className={`inp${errors.reps ? ' bad' : ''}`}
          inputMode="numeric"
          placeholder="Ej: 5"
          value={reps}
          onChange={(e) => { setReps(e.target.value); if (errors.reps) setErrors((p) => ({ ...p, reps: undefined })); }}
        />
      </Field>
      <Field label="Fecha" error={errors.date}>
        <DateField
          value={date}
          accent={lift.color}
          error={errors.date}
          onChange={(d) => { setDate(d); if (errors.date) setErrors((p) => ({ ...p, date: undefined })); }}
        />
      </Field>
    </Modal>
  );
}
