import { useId, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PlusIcon, MinusIcon } from '../ui/Icons';
import { useData } from '../../hooks/useData';
import { addLift, deleteLift, logLift } from '../../store/mutations';
import { C, tint } from '../../lib/theme';
import { fmtNum, todayISO } from '../../lib/dates';

const ACCENT = C.rose;
const STEP = 2.5;

/* ----------------------------- CARGAR PESO -----------------------------
   Port de liftModal(). El formulario más movido de Gimnasio: elegir un ejercicio existente
   (chips) o escribir el nombre de uno nuevo, un peso con slider + botones de paso, y una
   fecha.

   `lastFor(id)` mira el ÚLTIMO registro del ejercicio elegido — no el máximo — para
   mostrar "Última carga: X kg" y calcular la diferencia. Eso es intencional: el usuario
   quiere saber si mejoró respecto de la vez anterior, no respecto de su récord.

   A diferencia de los demás formularios de fecha de la app, este usa un <input type="date">
   nativo en vez del selector propio — así estaba en la app vanilla (dentro de liftModal,
   el único lugar que lo hace) y se replica igual. */
export function LiftModal({ onClose }) {
  const { data, update } = useData();
  const lifts = data.gym.lifts;

  const lastFor = (id) => {
    const l = lifts.find((x) => x.id === id);
    return l ? l.history[l.history.length - 1].weight : null;
  };

  const [selId, setSelId] = useState(lifts[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [weight, setWeight] = useState(selId ? lastFor(selId) : 0);
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const newNameId = useId();
  const newNameRef = useRef(null);

  const last = selId && !newName.trim() ? lastFor(selId) : null;
  const gain = last != null ? +(weight - last).toFixed(1) : 0;
  const smax = Math.max(100, Math.ceil((weight + 20) / STEP) * STEP);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(smax * f));
  const pct = smax > 0 ? (weight / smax) * 100 : 0;

  const pickLift = (id) => {
    setSelId(id);
    setNewName('');
    setWeight(lastFor(id));
  };

  const step = (dir) => setWeight((w) => Math.max(0, +(w + dir * STEP).toFixed(1)));

  const handleSave = () => {
    const trimmed = newName.trim();
    if (!trimmed && !selId) {
      setError('Elegí un ejercicio o creá uno nuevo.');
      newNameRef.current?.focus();
      return;
    }
    update((draft) => {
      if (trimmed) addLift(draft, { name: trimmed, weight, date });
      else logLift(draft, selId, { date, weight });
    });
    onClose();
  };

  const handleDelete = () => {
    update((draft) => deleteLift(draft, selId));
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal title="Cargar peso" accent={ACCENT} onSave={handleSave} onClose={onClose}>
        <Field label="Ejercicio" error={error} errorId={`${newNameId}-err`}>
          <div className="chips">
            {lifts.map((l) => {
              const on = selId === l.id && !newName.trim();
              return (
                <button
                  type="button"
                  key={l.id}
                  className={`chip${on ? ' on' : ''}`}
                  style={on ? { background: ACCENT } : undefined}
                  aria-pressed={on}
                  onClick={() => pickLift(l.id)}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
          <div className={`rowinp newliftrow${error ? ' bad' : ''}`}>
            <PlusIcon size={17} strokeWidth="2.4" color={ACCENT} />
            <input
              id={newNameId}
              ref={newNameRef}
              className="newliftinput"
              style={{ color: ACCENT, fontWeight: 600, fontSize: '14.5px', fontFamily: 'inherit' }}
              placeholder="Crear ejercicio nuevo…"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? `${newNameId}-err` : undefined}
            />
          </div>
        </Field>

        <Field label="Peso levantado">
          <div className="weightbox">
            <div className="weightbox-val">
              <span className="fr" style={{ color: ACCENT }}>{fmtNum(weight)}</span>
              <span className="weightbox-unit">kg</span>
            </div>
            <div className="weightbox-row">
              <button type="button" className="stepbtn dec" onClick={() => step(-1)} aria-label="Restar 2.5 kg">
                <MinusIcon color="#F2F4F8" strokeWidth="2.8" />
              </button>
              <input
                type="range"
                className="wslider"
                min="0"
                max={smax}
                step={STEP}
                value={weight}
                onChange={(e) => setWeight(+e.target.value)}
                style={{ background: `linear-gradient(90deg,${ACCENT} 0%,${ACCENT} ${pct}%,rgba(255,255,255,0.1) ${pct}%,rgba(255,255,255,0.1) 100%)` }}
              />
              <button type="button" className="stepbtn" style={{ background: tint(ACCENT, '2E') }} onClick={() => step(1)} aria-label="Sumar 2.5 kg">
                <PlusIcon color={ACCENT} strokeWidth="2.8" />
              </button>
            </div>
            <div className="wticks">
              {ticks.map((t) => <span key={t}>{t}</span>)}
            </div>
          </div>
          {last != null && (
            <div className="weightbox-gain">
              Última carga: {fmtNum(last)} kg · <span style={{ color: gain < 0 ? C.danger : C.green }}>{gain >= 0 ? '+' : ''}{gain.toFixed(1)} kg</span>
            </div>
          )}
        </Field>

        <Field label="Fecha">
          <div className="rowinp">
            {/* Ícono propio de este formulario: vanilla no usa acá el mismo dibujo que el
                selector de fecha compartido (dateField()), sino uno hecho a mano un poco
                distinto (rx 4, trazo 1.9). */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="4" />
              <path d="M8 3v4M16 3v4M3.4 10.5h17.2" />
            </svg>
            <input type="date" className="nativedate" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
          </div>
        </Field>

        {selId && !newName.trim() && (
          <button type="button" className="delbtn" onClick={() => setConfirming(true)}>Eliminar ejercicio</button>
        )}
      </Modal>

      {confirming && (
        <ConfirmDialog
          title={`¿Eliminar "${lifts.find((l) => l.id === selId)?.name}"?`}
          description="Se borra el ejercicio y todo su historial de pesos."
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
