import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SwatchCheckIcon, TrashIcon, HabitIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { addHabit, deleteHabit, nextHabitColor, updateHabit } from '../../store/mutations';
import { ICON_KEYS } from '../../lib/icons';
import { C, PALETTE, tint } from '../../lib/theme';

const TIMES_PER_DAY = [1, 2, 3, 4];

/* ----------------------------- NUEVO / EDITAR HÁBITO -----------------------------
   Port de habitModal(). Nombre, descripción opcional, ícono, color y cuántas veces por
   día se marca. El ícono y el color están relacionados en la pantalla —cada botón de
   ícono se pinta con el color elegido— pero son dos campos independientes en el
   documento: `icon` es una CLAVE ('agua', 'libro'…) y `color` es un hex, y las dos
   viven en habits[] tal cual las eligió la persona.

   Vanilla revisaba los íconos con `el.style.background=…` cada vez que cambiaba el
   color, uno por uno, en un bucle manual. Acá el color es estado: cambia, React vuelve a
   dibujar los ICON_KEYS.map(...) con el nuevo valor, y no hay ningún bucle que escribir. */
export function HabitFormModal({ habit, onClose }) {
  const { data, update } = useData();
  const editing = !!habit;
  const nameId = useId();
  const detailId = useId();
  const nameRef = useRef(null);

  const [name, setName] = useState(habit?.name ?? '');
  const [detail, setDetail] = useState(habit?.detail ?? '');
  const [color, setColor] = useState(habit?.color ?? nextHabitColor(data));
  const [icon, setIcon] = useState(habit?.icon ?? 'estrella');
  const [tpd, setTpd] = useState(habit?.timesPerDay ?? 1);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Poné un nombre para el hábito.');
      nameRef.current?.focus();
      return;
    }
    const fields = { name: trimmedName, detail: detail.trim(), color, icon, timesPerDay: tpd };
    update((draft) => {
      if (editing) updateHabit(draft, habit.id, fields);
      else addHabit(draft, fields);
    });
    onClose();
  };

  const handleDelete = () => {
    update((draft) => deleteHabit(draft, habit.id));
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal title={editing ? 'Editar hábito' : 'Nuevo hábito'} accent={C.green} onSave={handleSave} onClose={onClose}>
        <Field label="Nombre" htmlFor={nameId} error={error}>
          <input
            id={nameId}
            ref={nameRef}
            className={`inp${error ? ' bad' : ''}`}
            placeholder="Nombre del hábito"
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
          />
        </Field>

        <Field label="Descripción" hint="opcional" htmlFor={detailId}>
          <input
            id={detailId}
            className="inp"
            placeholder="Ej: 8 vasos al día"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
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

        <Field label="Veces por día" hint="cuántos checks tiene">
          <div className="chips">
            {TIMES_PER_DAY.map((n) => {
              const on = tpd === n;
              return (
                <button
                  type="button"
                  key={n}
                  className={`chip${on ? ' on' : ''}`}
                  style={on ? { background: color } : undefined}
                  aria-pressed={on}
                  onClick={() => setTpd(n)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </Field>

        {editing && (
          <button type="button" className="delbtn" onClick={() => setConfirming(true)}>
            <TrashIcon color={C.danger} />
            Eliminar hábito
          </button>
        )}
      </Modal>

      {confirming && (
        <ConfirmDialog
          title="¿Eliminar este hábito?"
          description="Se borra el hábito y su historial de marcas."
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
