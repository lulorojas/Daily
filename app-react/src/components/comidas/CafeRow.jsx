import { Coffee, Minus, Plus } from '@phosphor-icons/react';

/* ----------------------------- CONTADOR DE CAFÉ -----------------------------
   Una fila simple en "Extras": cuántas tazas de café hubo el día que se está mirando, con − y
   + para llevar la cuenta, y cuántas van en la semana. Lo de Progreso ("mini marquita de
   cuánto café vengo tomando") sale de acá: cada + es una entrada del extra "Café" en la
   bitácora (ver sumarCafe en store/mutations.js). */
export function CafeRow({ hoy, semana, esHoy, onMas, onMenos }) {
  return (
    <div className="caferow">
      <span className="extrabtn-ic caferow-ic"><Coffee size={18} aria-hidden="true" /></span>
      <span className="grow">
        <span className="extrabtn-name">Café</span>
        <span className="extrabtn-sub">{hoy} {esHoy ? 'hoy' : 'ese día'} · {semana} esta semana</span>
      </span>
      <button type="button" className="caferow-btn" aria-label="Una taza de café menos" disabled={hoy === 0} onClick={onMenos}>
        <Minus size={14} aria-hidden="true" />
      </button>
      <span className="caferow-n" aria-live="polite">{hoy}</span>
      <button type="button" className="caferow-btn mas" aria-label="Anotar Café" onClick={onMas}>
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
