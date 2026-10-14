import { useState } from 'react';
import { C, tint } from '../../lib/theme';

/* ----------------------------- ALGO FUERA DEL PLAN -----------------------------
   Qué fue + de qué tipo (pedido explícito: "las que pueden estar bien son las comidas
   distintas del plan pero que no son insalubres", y "un permitido... está mal y es como
   una comida pifiada"). Lo usa RegisterMealModal (en lugar de una comida) y ComidasPage
   (un permitido suelto, "un alfajor a la tarde"). El tipo elegido llega a
   addMealLogLibre en store/mutations.js.

   Colores explícitos: vive dentro de modales, que no leen var(--accent). */
const TIPOS = {
  sana: { label: 'Distinta, pero sana', nota: 'Cuenta como bien.', color: C.teal },
  permitido: { label: 'Permitido', nota: 'Cuenta como comida pifiada.', color: C.coral },
};

export function OffPlanForm({ placeholder, tipos = ['sana', 'permitido'], onAnotar }) {
  const [que, setQue] = useState('');
  const [tipo, setTipo] = useState(tipos[0]);

  return (
    <div className="offplan">
      <input
        className="inp"
        placeholder={placeholder}
        aria-label="Qué comiste fuera del plan"
        value={que}
        onChange={(e) => setQue(e.target.value)}
      />
      {tipos.length > 1 && (
        <div className="qualitypick">
          {tipos.map((t) => {
            const on = tipo === t;
            const c = TIPOS[t].color;
            return (
              <button
                type="button"
                key={t}
                className="qbtn"
                style={on ? { background: tint(c, '24'), borderColor: c, color: c } : undefined}
                aria-pressed={on}
                onClick={() => setTipo(t)}
              >
                {TIPOS[t].label}
              </button>
            );
          })}
        </div>
      )}
      <div className="offplan-foot">
        <span className="managetypes-note offplan-nota">{TIPOS[tipo].nota}</span>
        <button
          type="button"
          className="pillbtn comidas"
          aria-label="Anotar fuera del plan"
          disabled={!que.trim()}
          onClick={() => onAnotar(que.trim(), tipo)}
        >
          Anotar
        </button>
      </div>
    </div>
  );
}
