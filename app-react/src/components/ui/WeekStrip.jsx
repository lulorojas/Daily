import { CaretLeft, CaretRight } from '@phosphor-icons/react';
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
   los dos: son estados —elegido, hoy, pasado, con marca— y no un color hardcodeado.

   Rediseño Nocturne: cada día es una celda de 58px con borde (el elegido se enciende con
   el acento), las tres letras del día arriba, el número y el punto de "tiene algo"; el
   día de hoy lleva la marca HOY encima. */
export function WeekStrip({ selected, onSelect, onWeek, hasMark }) {
  const tISO = todayISO();
  const days = weekDays(mondayOf(parseISO(selected)));

  return (
    <div className="weekstrip">
      <button type="button" className="nb" onClick={() => onWeek(-1)} aria-label="Semana anterior">
        <CaretLeft size={14} aria-hidden="true" />
      </button>

      <div className="wdays">
        {days.map((dISO, i) => {
          const isSel = dISO === selected;
          const isToday = dISO === tISO;
          const past = dISO < tISO;
          const has = hasMark(dISO);
          const state = `${isSel ? ' sel' : ''}${isToday ? ' today' : ''}${past ? ' past' : ''}`;

          return (
            <button
              type="button"
              key={dISO}
              className={`wcell${state}`}
              aria-pressed={isSel}
              aria-label={dISO}
              onClick={() => onSelect(dISO)}
            >
              {/* La marca HOY (pedido del rediseño: en Hoy, Hábitos y Comidas el día de hoy
                  se distingue aunque estés mirando otro). Es decorativa: el estado real
                  ya lo dice aria-label. */}
              {isToday && <span className="whoy" aria-hidden="true">HOY</span>}
              {/* Las tres letras del día: salen de DOW_SHORT para no tener otra lista de
                  días dando vueltas que se pueda desincronizar. */}
              <span className="wdow">{DOW_SHORT[i].toUpperCase()}</span>
              <span className="wnum">{parseISO(dISO).getDate()}</span>
              <span className={`wdot${has ? ' on' : ''}${isToday && has ? ' pulse' : ''}`} />
            </button>
          );
        })}
      </div>

      <button type="button" className="nb" onClick={() => onWeek(1)} aria-label="Semana siguiente">
        <CaretRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
