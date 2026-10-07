import { PROG_PERIODS } from '../../lib/progress';

/* ----------------------------- SELECTOR DE PERÍODO -----------------------------
   Port de progSelector(). Cuatro píldoras — Semana / Mes / Año / Todo — que recortan
   TODA la pantalla de una vez: cambiar acá reacomoda los nueve bloques de abajo.

   El color de la píldora activa era un tinte de C.teal escrito a mano: Progreso es la
   única pantalla que monta este componente, así que su acento SIEMPRE es teal — tan
   constante como cualquier otro color de styles.css. Con el rediseño "Glass + aurora" esa
   fórmula (degradé claro→acento) ya vive en `.period.on`, igual que en la nav; no hace
   falta repetirla en JS. */
export function PeriodSelector({ value, onChange }) {
  return (
    <div className="periods">
      {PROG_PERIODS.map(([key, label]) => {
        const on = value === key;
        return (
          <button
            type="button"
            key={key}
            className={`period${on ? ' on' : ''}`}
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
