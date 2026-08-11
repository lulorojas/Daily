import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { DOW_SHORT, mondayOf, parseISO, todayISO } from '../../lib/dates';
import { agendaDe, tareasDe } from '../../lib/agenda';
import { weekDays } from '../../lib/items';

/* ----------------------------- TIRA SEMANAL -----------------------------
   Port de weekStrip(). Siete círculos de lunes a domingo y dos flechas para cambiar de
   semana. El punto de abajo se enciende si ese día tiene algo.

   No guarda nada: recibe el día elegido y avisa cuál se tocó. Todo lo que muestra sale de
   ese día más el documento. Eso lo hace trivial de testear y significa que la tira no
   puede "desincronizarse" del resto de la pantalla, que es un bug clásico cuando cada
   pedazo se acuerda de su propia versión de la verdad.

   Los colores acá son fijos (el ámbar de Hoy), no dependen de ningún dato: por eso los
   estados —elegido, pasado, con cosas— son clases y no estilos inline, al revés de lo que
   pasa con las filas de ítems, donde el color sale del tipo. */
export function WeekStrip({ data, selected, onSelect, onWeek }) {
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
          const has = tareasDe(data, dISO).length || agendaDe(data, dISO).length;
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
