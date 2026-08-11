import { useState } from 'react';
import { MonthGrid } from '../components/calendario/MonthGrid';
import { DayDetail } from '../components/calendario/DayDetail';
import { DayAddMenu } from '../components/calendario/DayAddMenu';
import { MonthArrowIcon } from '../components/ui/Icons';
import { useData } from '../hooks/useData';
import { useItemForms } from '../hooks/useItemForms';
import { useSelectedDay } from '../hooks/useSelectedDay';
import { monthOf, shiftMonth } from '../lib/calendar';
import { MONTHS } from '../lib/dates';
import { C } from '../lib/theme';
import { toggleTaskDone } from '../store/mutations';

/* ============================================================================
   CALENDARIO

   Port de viewCalendario(). Arriba el mes con sus fechas reales; abajo, el detalle del día
   elegido con todo lo que hay ese día y un atajo para agregar.

   Dos estados distintos que conviene no confundir:

     - el DÍA ELEGIDO vive en la URL (?d=…), porque lo comparte con Hoy: guardar una tarea
       con fecha en Hoy deja parado al Calendario en esa fecha, igual que hacía focusDate()
       en la app vanilla;
     - el MES QUE SE VE es estado de esta pantalla y nada más. Pasear por diciembre no
       cambia el día elegido — mientras no toques ningún casillero, el detalle de abajo
       sigue mostrando el mismo día.
   ============================================================================ */
export function CalendarioPage() {
  const { data, update } = useData();
  const [day, setDay] = useSelectedDay();
  const { openTask, openEvent } = useItemForms();
  const [adding, setAdding] = useState(false);

  const [view, setView] = useState(() => monthOf(day));

  /* Si el día elegido se va a otro mes (porque se guardó algo con fecha, o porque se entró
     por un link con ?d=), el mes que se ve lo sigue.

     Esto se ajusta DURANTE el render, no en un useEffect. Es el patrón que recomienda la
     documentación de React para "acomodar el estado cuando cambia una prop": React corta
     este render y rehace el componente con el valor nuevo antes de tocar la pantalla. Con
     un efecto, en cambio, se llegaría a dibujar un cuadro con el mes viejo y recién después
     el bueno — un parpadeo. */
  const [lastDay, setLastDay] = useState(day);
  if (day !== lastDay) {
    setLastDay(day);
    const target = monthOf(day);
    if (target.y !== view.y || target.m !== view.m) setView(target);
  }

  return (
    <div className="view">
      <div className="cal-head">
        <div>
          <div className="kicker">{view.y}</div>
          <h1>{MONTHS[view.m]}</h1>
        </div>
        <div className="cal-nav">
          <button type="button" className="navbtn" onClick={() => setView(shiftMonth(view, -1))} aria-label="Mes anterior">
            <MonthArrowIcon dir="prev" />
          </button>
          <button type="button" className="navbtn" onClick={() => setView(shiftMonth(view, 1))} aria-label="Mes siguiente">
            <MonthArrowIcon dir="next" />
          </button>
        </div>
      </div>

      <div className="body">
        <div className="legend">
          <div className="li"><span style={{ background: C.amber }} />Tareas</div>
          <div className="li"><span style={{ background: C.coral }} />Citas</div>
          <div className="li"><span style={{ background: C.violet }} />Anuales</div>
        </div>

        <MonthGrid data={data} view={view} selected={day} onSelect={setDay} />

        <DayDetail
          data={data}
          day={day}
          onOpenTask={(t) => openTask(t)}
          onOpenEvent={(e) => openEvent(e)}
          onToggleTask={(id) => update((draft) => toggleTaskDone(draft, id, day))}
          onAdd={() => setAdding(true)}
        />
      </div>

      {/* El menú de agregar es de esta pantalla, así que su "estoy abierto" vive acá y no
          en un contexto: nadie más lo abre. Lo que sí es compartido son los formularios que
          termina abriendo, y eso lo resuelve useItemForms(). */}
      {adding && (
        <DayAddMenu
          day={day}
          onClose={() => setAdding(false)}
          onTask={() => { setAdding(false); openTask(null, day); }}
          onEvent={() => { setAdding(false); openEvent(null, day); }}
        />
      )}
    </div>
  );
}
