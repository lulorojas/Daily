import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, ClockIcon } from './Icons';

/* ----------------------------- SELECTOR DE HORA -----------------------------
   Port de timeField() + wireTimePicker(). Dos columnas que se scrollean, un interruptor
   que enciende o apaga la hora, y la hora escrita grande en la fila.

   La hora es OPCIONAL en las dos entidades: una tarea o una cita pueden no tenerla. Por
   eso el control maneja dos cosas a la vez — si hay hora (el interruptor) y cuál es (las
   columnas) — y las avisa por separado con onToggle y onChange.

   Detalle heredado a propósito: apagar el interruptor NO borra la hora elegida, solo deja
   de usarla. Si se vuelve a encender, vuelve la misma. Lo que se guarda en el documento es
   `hasTime ? value : null`, que es exactamente lo que hacía la app vanilla. */

// Los minutos van de cinco en cinco. Las horas, las 24.
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const pad = (n) => String(n).padStart(2, '0');

// Deja la opción elegida en el medio de su columna, como hacía tpCenter().
function centerOn(col) {
  if (!col) return;
  const on = col.querySelector('.tpick-itm.on');
  if (on) col.scrollTop = on.offsetTop - col.clientHeight / 2 + on.clientHeight / 2;
}

function TimeColumn({ label, values, selected, accent, onPick, colRef }) {
  return (
    <div className="grow">
      <div className="tpick-lbl">{label}</div>
      <div className="tpick-col" ref={colRef}>
        {values.map((n) => {
          const v = pad(n);
          const on = v === selected;
          return (
            <button
              type="button"
              key={v}
              className={`tpick-itm${on ? ' on' : ''}`}
              style={on ? { background: accent } : undefined}
              aria-pressed={on}
              onClick={() => onPick(v)}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimeField({ value, enabled, accent, onChange, onToggle }) {
  const [open, setOpen] = useState(false);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const [hh, mm] = value.split(':');

  /* Cuando se despliega, cada columna se scrollea hasta su valor. Va en un efecto y no en
     el manejador del click porque el scroll se le hace a un nodo REAL: hay que esperar a
     que React lo haya dibujado. Los efectos corren justo después de eso. */
  useEffect(() => {
    if (!open) return;
    centerOn(hoursRef.current);
    centerOn(minutesRef.current);
  }, [open]);

  const setPart = (which, v) => onChange(which === 'h' ? `${v}:${mm}` : `${hh}:${v}`);

  /* El interruptor: enciende la hora y despliega el selector de una, que es el gesto
     natural (la encendiste porque querés elegirla). Apagarlo lo cierra. */
  const toggle = (e) => {
    e.stopPropagation();   // si no, el click sigue hasta la fila y la vuelve a abrir
    const on = !enabled;
    onToggle(on);
    setOpen(on);
  };

  return (
    <>
      <div
        className="rowinp tappable"
        onClick={() => { if (enabled) setOpen((o) => !o); }}
      >
        <ClockIcon color={accent} />
        <span className={`fr rowval time${enabled ? '' : ' off'}`}>{value}</span>
        <ChevronDownIcon className="tpick-chev" open={open} />
        <button
          type="button"
          className={`switch${enabled ? ' on' : ''}`}
          style={enabled ? { background: accent } : undefined}
          role="switch"
          aria-checked={enabled}
          aria-label="Con hora"
          onClick={toggle}
        >
          <div className="knob" />
        </button>
      </div>

      <div className={`tpick${open ? ' open' : ''}`}>
        <div className="tpick-inner">
          <TimeColumn label="HORA" values={HOURS} selected={hh} accent={accent} onPick={(v) => setPart('h', v)} colRef={hoursRef} />
          <TimeColumn label="MINUTOS" values={MINUTES} selected={mm} accent={accent} onPick={(v) => setPart('m', v)} colRef={minutesRef} />
        </div>
      </div>
    </>
  );
}
