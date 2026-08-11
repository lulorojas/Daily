import { clickable } from '../ui/clickable';
import { ITEM_COLOR } from '../../lib/items';
import { tint } from '../../lib/theme';

/* ----------------------------- CITA EN LA LÍNEA DE TIEMPO (HOY) -----------------------------
   La misma cita que el Calendario dibuja como <EventRow> acá se ve distinta: con la hora
   afuera, a la izquierda, y una tarjeta con degradé del color del tipo. Es la "línea de
   tiempo" del día.

   Son dos componentes y no uno con un `variant` porque no comparten casi nada: distinto
   marcado, distintas clases y distinta información visible. Meterlos en el mismo archivo
   con un if adentro haría más difícil leer los dos. */
export function AgendaRow({ item, onOpen }) {
  const color = ITEM_COLOR[item.kind];

  return (
    <div className="agrow" {...clickable(onOpen, { label: item.title })}>
      <div className="agtime">
        <span className="h">{item.time || '--:--'}</span>
        <span className="k">{item.kind === 'anual' ? 'anual' : 'cita'}</span>
      </div>
      <div
        className="agcard"
        style={{
          background: `linear-gradient(135deg,${tint(color, '2E')},${tint(color, '0F')})`,
          border: `1px solid ${tint(color, '3D')}`,
        }}
      >
        <span className="agtitle">{item.title}</span>
        {item.desc && <span className="agdesc">{item.desc}</span>}
      </div>
    </div>
  );
}
