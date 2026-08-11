import { useState } from 'react';
import { DOW_MINI, MONTHS, fmtDateLong, todayISO } from '../../lib/dates';
import { monthCells, monthOf, shiftMonth } from '../../lib/calendar';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, DateFieldIcon } from './Icons';

/* ----------------------------- SELECTOR DE FECHA -----------------------------
   Port de dpGrid() / dateField() / wireDatePicker() de la app vanilla. Allá eran tres
   funciones sueltas: una escupía HTML, otra lo metía en el modal y la tercera enganchaba
   un listener que volvía a escupir el HTML entero cada vez que se tocaba una flecha
   (`cal.innerHTML = dpGrid(...)`). Acá es un componente y el mes visible es estado suyo:
   cambia el estado, React redibuja las celdas que hagan falta y nada más.

   Vienen dos piezas, porque los dos formularios lo usan distinto:
     <DateGrid>   la grilla pelada — la usa el formulario de tarea, colgada de los chips.
     <DateField>  la fila tocable + la grilla que se despliega — la usa el de cita. */

/* La grilla. El mes que se ve es estado local: mirar diciembre no cambia la fecha elegida,
   así que no tiene por qué molestar a quien nos usa. Arranca parado en el mes de la fecha
   seleccionada (o en el de hoy si todavía no hay ninguna). */
export function DateGrid({ value, accent, onSelect }) {
  const [view, setView] = useState(() => monthOf(value || todayISO()));
  const tISO = todayISO();

  return (
    <>
      <div className="dp-nav">
        <button type="button" className="navbtn" onClick={() => setView(shiftMonth(view, -1))} aria-label="Mes anterior">
          <ChevronLeftIcon />
        </button>
        <span className="fr dp-month">
          {MONTHS[view.m]} <span className="dp-year">{view.y}</span>
        </span>
        <button type="button" className="navbtn" onClick={() => setView(shiftMonth(view, 1))} aria-label="Mes siguiente">
          <ChevronRightIcon />
        </button>
      </div>

      <div className="dp-grid dows">
        {DOW_MINI.map((d, i) => <div className="dow" key={i}>{d}</div>)}
      </div>

      <div className="dp-grid">
        {monthCells(view.y, view.m).map((cell, i) => (
          <div className="dp-cell" key={cell ? cell.dISO : `hueco-${i}`}>
            {cell && (
              <button
                type="button"
                className="dp-day"
                /* Elegido y "hoy" se dibujan distinto y son excluyentes: el elegido pinta
                   el círculo entero, hoy solo lo bordea. Salen del acento del formulario,
                   que es un valor que llega por props, así que van inline. */
                style={
                  cell.dISO === value ? { background: accent, color: '#0E0F22', fontWeight: 700 }
                    : cell.dISO === tISO ? { border: `1.6px solid ${accent}`, color: accent, fontWeight: 700 }
                      : undefined
                }
                aria-pressed={cell.dISO === value}
                onClick={() => onSelect(cell.dISO)}
              >
                {cell.day}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* La fila con la fecha escrita, que al tocarla despliega la grilla.

   `open` es estado del componente y no sale de acá: que el calendario esté desplegado o
   no es cosa de este control, no del formulario que lo contiene. Es el ejemplo más claro
   de "el estado vive lo más abajo posible" — si viviera arriba, el formulario tendría que
   cargar con una variable que no le importa. */
export function DateField({ value, accent, error, errorId, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={`rowinp tappable${error ? ' bad' : ''}`}
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
      >
        <DateFieldIcon color={accent} />
        <span className={`fr rowval date${value ? '' : ' off'}`}>
          {value ? fmtDateLong(value) : 'Elegí una fecha'}
        </span>
        <ChevronDownIcon className="tpick-chev" open={open} />
      </div>

      {/* Siempre dibujado, colapsado por CSS (max-height 0 → 420px). Así la apertura se
          anima igual que en la app actual, en vez de aparecer de golpe. */}
      <div className={`dpick${open ? ' open' : ''}`}>
        <div className="dpick-inner">
          <DateGrid value={value} accent={accent} onSelect={(d) => { onChange(d); setOpen(false); }} />
        </div>
      </div>
    </>
  );
}
