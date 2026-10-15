import { CaretRight } from '@phosphor-icons/react';
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

  /* Rediseño Nocturne: antes la hora iba afuera y la tarjeta al lado; ahora es UNA sola
     tarjeta con la hora a la izquierda, un divisor del color del tipo y el título. El
     color del tipo es un dato (cada tipo de cita tiene el suyo), así que el degradé va
     inline. */
  return (
    <div
      className="agrow"
      style={{
        background: `linear-gradient(90deg,${tint(color, '1A')},rgba(35,37,50,.6) 60%)`,
        border: `1px solid ${tint(color, '33')}`,
      }}
      {...clickable(onOpen, { label: item.title })}
    >
      <div className="agtime">
        <span className="h" style={{ color }}>{item.time || '--:--'}</span>
        <span className="k">{item.kind === 'anual' ? 'anual' : 'cita'}</span>
      </div>
      <span className="agdiv" style={{ background: tint(color, '4D') }} />
      <div className="agcard">
        <span className="agtitle">{item.title}</span>
        {item.desc && <span className="agdesc">{item.desc}</span>}
      </div>
      <CaretRight className="agchev" size={14} aria-hidden="true" />
    </div>
  );
}
