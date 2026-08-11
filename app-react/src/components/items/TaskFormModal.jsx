import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { DateGrid } from '../ui/DatePicker';
import { TimeField } from '../ui/TimeField';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { addTask, deleteItem, updateTask } from '../../store/mutations';
import { C } from '../../lib/theme';
import { shortDate } from '../../lib/dates';
import {
  DEFAULT_TASK_TIME, dateForWhen, deleteCopy, taskFormValues, validateTask, whenKey,
} from '../../lib/itemForms';

const ACCENT = C.amber;

// Los tres chips que eligen una fecha derecho. "Otra fecha" es el cuarto y va aparte:
// no elige nada, despliega el calendario.
const CHIPS = [['hoy', 'Hoy'], ['manana', 'Mañana'], ['sin', 'Sin fecha']];

/* ----------------------------- FORMULARIO DE TAREA -----------------------------
   Port de taskModal(). Crea una tarea nueva o edita una que ya existe: es el mismo
   formulario, y lo único que cambia es el título de la hoja, el botón de eliminar y qué
   mutación se llama al guardar.

   TODO el estado del formulario vive acá adentro y muere cuando la hoja se cierra. Eso es
   deliberado: mientras se está escribiendo una tarea, lo tipeado no le importa a nadie más
   de la app. Recién al guardar sale de acá, y sale por una sola puerta — update() del
   store, con una mutación de las de la etapa 2.

   En vanilla esto mismo eran cuatro variables sueltas en el closure (`selDate`, `hasTime`,
   `tref`, `tdp`) y tres funciones (`refreshWhen`, dos `onOverlay`) que se encargaban de
   ir tocando el DOM a mano para que la pantalla reflejara esas variables. Acá esa segunda
   mitad no existe: se cambia el estado y lo que se ve sale solo. */
export function TaskFormModal({ task, defaultDate, onClose, onSaved }) {
  const { update } = useData();
  const editing = !!task;
  const titleId = useId();
  const descId = useId();
  const titleRef = useRef(null);

  const initial = taskFormValues(task, defaultDate);
  const [title, setTitle] = useState(initial.title);
  const [desc, setDesc] = useState(initial.desc);
  const [date, setDate] = useState(initial.date);
  // La hora, partida en dos: si la hay, y cuál. Ver el comentario de TimeField.
  const [hasTime, setHasTime] = useState(!!initial.time);
  const [time, setTime] = useState(initial.time || DEFAULT_TASK_TIME);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  // El calendario arranca abierto si la fecha no es ninguno de los tres chips directos.
  const [calOpen, setCalOpen] = useState(() => whenKey(initial.date) === 'otra');

  const when = whenKey(date);

  const pickChip = (key) => {
    setDate(dateForWhen(key));
    setCalOpen(false);
    setErrors({});
  };

  const handleSave = () => {
    const clean = { title: title.trim(), desc: desc.trim() };
    const found = validateTask(clean);
    setErrors(found);
    if (found.title) {
      // Mismo gesto que validateForm() en vanilla: al campo con problema, foco y a la vista.
      const el = titleRef.current;
      if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }
      return;
    }

    const fields = { title: clean.title, desc: clean.desc, date, time: hasTime ? time : null };
    update((draft) => {
      if (editing) updateTask(draft, task.id, fields);
      else addTask(draft, fields);
    });
    // Una tarea sin fecha no mueve el día que se está mirando: no hay a dónde ir.
    if (date && onSaved) onSaved(date);
    onClose();
  };

  const handleDelete = () => {
    update((draft) => deleteItem(draft, task.id));
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal
        title={editing ? 'Editar tarea' : 'Nueva tarea'}
        accent={ACCENT}
        onSave={handleSave}
        onClose={onClose}
      >
        <Field label="Título" htmlFor={titleId} error={errors.title} errorId={`${titleId}-err`}>
          <input
            id={titleId}
            ref={titleRef}
            className={`inp${errors.title ? ' bad' : ''}`}
            placeholder="¿Qué tenés que hacer?"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              // Al corregir el campo marcado, su aviso desaparece.
              if (errors.title) setErrors({});
            }}
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? `${titleId}-err` : undefined}
          />
        </Field>

        <Field label="Cuándo">
          <div className="chips">
            {CHIPS.map(([key, label]) => {
              const on = when === key;
              return (
                <button
                  type="button"
                  key={key}
                  className={`chip${on ? ' on' : ''}`}
                  style={on ? { background: ACCENT } : undefined}
                  aria-pressed={on}
                  onClick={() => pickChip(key)}
                >
                  {label}
                </button>
              );
            })}
            {/* El cuarto chip muestra la fecha elegida cuando no es hoy ni mañana, y al
                tocarlo despliega el calendario en vez de elegir nada. */}
            <button
              type="button"
              className={`chip${when === 'otra' ? ' on' : ''}`}
              style={when === 'otra' ? { background: ACCENT } : undefined}
              aria-expanded={calOpen}
              onClick={() => setCalOpen((o) => !o)}
            >
              {when === 'otra' ? shortDate(date) : 'Otra fecha'}
            </button>
          </div>
          <div className={`dpick${calOpen ? ' open' : ''}`}>
            <div className="dpick-inner">
              <DateGrid value={date} accent={ACCENT} onSelect={setDate} />
            </div>
          </div>
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
            Eliminar tarea
          </button>
        )}
      </Modal>

      {confirming && (
        <ConfirmDialog
          {...deleteCopy('tarea')}
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
