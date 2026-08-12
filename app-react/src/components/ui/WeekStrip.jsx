import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { DOW_SHORT, mondayOf, parseISO, todayISO } from '../../lib/dates';
import { weekDays } from '../../lib/items';

/* ----------------------------- TIRA SEMANAL -----------------------------
   Port de weekStrip() (Hoy) y habWeekStrip() (Hábitos), que en la app vanilla eran dos
   funciones casi idénticas — mismo dibujo, mismo cálculo de anillos, y la única
   diferencia de verdad era QUÉ hace que un día se marque con el punto de abajo (en Hoy,
   que tenga algo agendado; en Hábitos, que se haya completado alguno). Acá es un solo
   componente y esa diferencia entra por `hasMark`, una función que recibe la fecha ISO y
   dice si el punto va encendido.

   No guarda nada: recibe el día elegido y avisa cuál se tocó. Todo lo que muestra sale de
   ese día más lo que calcule `hasMark`. Eso lo hace trivial de testear y significa que la
   tira no puede "desincronizarse" del resto de la pantalla, que es un bug clásico cuando
   cada pedazo se acuerda de su propia versión de la verdad.

   El color es siempre el acento de la página (var(--accent), calculado en App.jsx), así
   que Hoy la pinta de ámbar y Hábitos de verde sin que este componente sepa de ninguno de
   los dos: son estados —elegido, pasado, con marca— y no un color hardcodeado. */
export function WeekStrip({ selected, onSelect, onWeek, hasMark }) {
  const tISO = todayISO();
  const days = weekDays(mondayOf(parseISO(selected)));

  return (
    <div className="weekstrip">
      <button type="button" className="nb" onClick={() => onWeek(-1)} aria-label="Semana anterior">
        <ChevronLeftIcon />
      </button>

      <div className="wdays">
        {days.map((dISO, i) => {
          const isSel = dISO === selected;
          const isToday = dISO === tISO;
          const past = dISO < tISO;
          const has = hasMark(dISO);
          const state = isSel ? ' sel' : past ? ' past' : '';

          return (
            <button
              type="button"
              key={dISO}
              className={`wcell${state}`}
              aria-pressed={isSel}
              aria-label={dISO}
              onClick={() => onSelect(dISO)}
            >
              {/* La inicial del día: "L", "M", "M"… Sale de DOW_SHORT para no tener otra
                  lista de días dando vueltas que se pueda desincronizar. */}
              <div className={`wdow${isSel || isToday ? ' on' : ''}`}>{DOW_SHORT[i][0]}</div>
              {/* El estado va en la celda y el CSS lo baja al anillo y al círculo:
                  .wcell.sel .wring, .wcell.past .wcirc, etc. */}
              <div className="wring">
                <div className="wcirc">{parseISO(dISO).getDate()}</div>
              </div>
              <div className={`wdot${has ? ' on' : ''}`} />
            </button>
          );
        })}
      </div>

      <button type="button" className="nb" onClick={() => onWeek(1)} aria-label="Semana siguiente">
        <ChevronRightIcon />
      </button>
    </div>
  );
}
