import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { DateField } from '../ui/DatePicker';
import { TimeField } from '../ui/TimeField';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { GiftIcon, PinIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { addEvent, deleteItem, updateEvent } from '../../store/mutations';
import { C } from '../../lib/theme';
import {
  DEFAULT_EVENT_TIME, deleteCopy, eventFormValues, eventKindNote, validateEvent,
} from '../../lib/itemForms';

const ACCENT = C.coral;

/* ----------------------------- FORMULARIO DE CITA / FECHA ANUAL -----------------------------
   Port de eventModal(). Las dos entidades comparten formulario porque comparten forma: lo
   único que cambia es `kind`, y con él la aclaración de abajo del selector y el texto del
   error del título.

   Diferencia con la tarea: acá la fecha es obligatoria. Una cita sin fecha no es nada; una
   tarea sin fecha es una pendiente, que es un caso legítimo. */
export function EventFormModal({ item, defaultDate, onClose, onSaved }) {
  const { update } = useData();
  const editing = !!item;
  const titleId = useId();
  const descId = useId();
  const dateId = useId();
  const titleRef = useRef(null);

  const initial = eventFormValues(item, defaultDate);
  const [kind, setKind] = useState(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [desc, setDesc] = useState(initial.desc);
  const [date, setDate] = useState(initial.date);
  const [hasTime, setHasTime] = useState(!!initial.time);
  const [time, setTime] = useState(initial.time || DEFAULT_EVENT_TIME);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  const handleSave = () => {
    const clean = { title: title.trim(), desc: desc.trim() };
    const found = validateEvent({ ...clean, date, kind });
    setErrors(found);
    if (found.title || found.date) {
      if (found.title && titleRef.current) {
        titleRef.current.focus();
        if (titleRef.current.scrollIntoView) titleRef.current.scrollIntoView({ block: 'center' });
      }
      return;
    }

    const fields = { kind, title: clean.title, desc: clean.desc, date, time: hasTime ? time : null };
    update((draft) => {
      if (editing) updateEvent(draft, item.id, fields);
      else addEvent(draft, fields);
    });
    if (onSaved) onSaved(date);
    onClose();
  };

  const handleDelete = () => {
    update((draft) => deleteItem(draft, item.id));
    setConfirming(false);
    onClose();
  };

  // Los dos botones del selector de tipo. El activo se pinta con el acento; el otro solo
  // cambia de color de texto. Es el único lugar del formulario con estilo dinámico.
  const typeButton = (value, label, icon) => {
    const on = kind === value;
    return (
      <button
        type="button"
        className="rtype"
        style={on ? { background: ACCENT, color: '#0A0C11' } : undefined}
        aria-pressed={on}
        onClick={() => setKind(value)}
      >
        {icon}{label}
      </button>
    );
  };

  return (
    <>
      <Modal
        title={editing ? 'Editar cita' : 'Nueva cita'}
        accent={ACCENT}
        onSave={handleSave}
        onClose={onClose}
      >
        <Field label="Tipo">
          <div className="seg">
            {typeButton('cita', 'Cita', <PinIcon />)}
            {typeButton('anual', 'Anual', <GiftIcon size={15} />)}
          </div>
          <div className="seg-note">{eventKindNote(kind)}</div>
        </Field>

        <Field label="Título" htmlFor={titleId} error={errors.title} errorId={`${titleId}-err`}>
          <input
            id={titleId}
            ref={titleRef}
            className={`inp${errors.title ? ' bad' : ''}`}
            placeholder="Nombre de la cita"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? `${titleId}-err` : undefined}
          />
        </Field>

        <Field label="Fecha" error={errors.date} errorId={`${dateId}-err`}>
          <DateField
            value={date}
            accent={ACCENT}
            error={errors.date}
            errorId={`${dateId}-err`}
            onChange={(d) => {
              setDate(d);
              if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
            }}
          />
        </Field>

        <Field label="Hora" hint="opcional">
          <TimeField
            value={time}
            enabled={hasTime}
            accent={ACCENT}
            onChange={setTime}
            onToggle={setHasTime}
          />
        </Field>

        <Field label="Descripción" hint="opcional" htmlFor={descId}>
          <textarea
            id={descId}
            className="inp"
            placeholder="Agregar descripción"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Field>

        {editing && (
          <button type="button" className="delbtn" onClick={() => setConfirming(true)}>
            Eliminar
          </button>
        )}
      </Modal>

      {confirming && (
        <ConfirmDialog
          {...deleteCopy(item.kind)}
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
