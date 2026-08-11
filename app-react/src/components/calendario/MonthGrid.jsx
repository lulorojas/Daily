import { clickable } from '../ui/clickable';
import { DOW_MINI, todayISO } from '../../lib/dates';
import { monthCells } from '../../lib/calendar';
import { itemsDe } from '../../lib/agenda';
import { ITEM_COLOR } from '../../lib/items';
import { tint } from '../../lib/theme';

// Cuántas etiquetas entran en un casillero antes de pasar a "+N".
const MAX_TAGS = 2;

/* ----------------------------- GRILLA DEL MES -----------------------------
   Port del primer tramo de viewCalendario(). Fechas reales (no una grilla de 5x7 fija),
   con los huecos del principio que hagan falta según en qué día caiga el 1.

   Cada casillero muestra hasta dos entradas como etiquetas de color y, si hay más, un
   "+N". El color dice de qué tipo es cada una: tarea ámbar, cita coral, anual violeta —
   los mismos tres de la leyenda de arriba.

   itemsDe() es el que resuelve lo importante: junta las tareas con fecha de ese día, las
   citas de ese día y las fechas anuales que caen en ese mes+día de CUALQUIER año. Por eso
   un cumpleaños cargado en 1990 aparece todos los agostos. */
export function MonthGrid({ data, view, selected, onSelect }) {
  const tISO = todayISO();

  return (
    <div className="card calcard">
      <div className="cal-grid dows">
        {DOW_MINI.map((d, i) => <div className="dow" key={i}>{d}</div>)}
      </div>

      <div className="cal-grid cells">
        {monthCells(view.y, view.m).map((cell, i) => {
          // Los huecos antes del día 1: mismo tamaño, sin fondo y sin nada que tocar.
          if (!cell) return <div className="cell blank" key={`hueco-${i}`} />;

          const items = itemsDe(data, cell.dISO);
          const extra = items.length - MAX_TAGS;

          return (
            <div
              key={cell.dISO}
              className={`cell${cell.dISO === selected ? ' sel' : ''}`}
              {...clickable(() => onSelect(cell.dISO), { label: cell.dISO })}
            >
              <div className={`cnum${cell.dISO === tISO ? ' today' : ''}`}>{cell.day}</div>
              {items.slice(0, MAX_TAGS).map((e) => (
                <div
                  key={e.id}
                  className="ctag"
                  style={{ background: tint(ITEM_COLOR[e.kind], '2B'), color: ITEM_COLOR[e.kind] }}
                >
                  {e.title}
                </div>
              ))}
              {extra > 0 && <span className="cmore">+{extra}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
