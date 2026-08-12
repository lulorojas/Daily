import { PROG_PERIODS } from '../../lib/progress';
import { C, tint } from '../../lib/theme';

/* ----------------------------- SELECTOR DE PERÍODO -----------------------------
   Port de progSelector(). Cuatro píldoras — Semana / Mes / Año / Todo — que recortan
   TODA la pantalla de una vez: cambiar acá reacomoda los nueve bloques de abajo. */
export function PeriodSelector({ value, onChange }) {
  return (
    <div className="periods">
      {PROG_PERIODS.map(([key, label]) => {
        const on = value === key;
        return (
          <button
            type="button"
            key={key}
            className="period"
            style={on ? { background: tint(C.teal, '2E'), color: C.teal } : undefined}
            aria-pressed={on}
            onClick={() => onChange(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
