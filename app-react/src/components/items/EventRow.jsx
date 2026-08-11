import { CalendarIcon, GiftIcon } from '../ui/Icons';
import { clickable } from '../ui/clickable';
import { ITEM_COLOR, ITEM_LABEL } from '../../lib/items';
import { tint } from '../../lib/theme';

/* ----------------------------- FILA DE CITA / FECHA ANUAL -----------------------------
   Port de eventRow(). Sin check: una cita ocurre, no se completa. La barra de color de la
   izquierda y el ícono dicen de qué tipo es.

   El color sale del tipo del ítem (ITEM_COLOR), así que va inline: depende del dato. Lo
   que era estático en el template string de vanilla —tamaños de letra, pesos— pasó a
   clases (.evtime, .evrow, .evname, .evsub).

   Nota de port: vanilla calculaba acá una variable `sub` ('19:00 hs' / 'Se repite cada
   año' / 'Todo el día') que después NO usaba: la línea de abajo terminaba mostrando la
   etiqueta del tipo. Se replica lo que se veía, no la variable muerta. */
export function EventRow({ item, onOpen }) {
  const color = ITEM_COLOR[item.kind];
  const annual = item.kind === 'anual';

  return (
    <div
      className="evrow"
      style={{ borderLeft: `3px solid ${color}` }}
      {...clickable(onOpen, { label: item.title })}
    >
      <div className="evic" style={{ background: tint(color, '24'), color }}>
        {annual ? <GiftIcon /> : <CalendarIcon />}
      </div>
      <div className="grow">
        <div className="evname">{item.title}</div>
        <div className="evsub">
          {ITEM_LABEL[item.kind]}{annual && ' · se repite cada año'}
        </div>
      </div>
      <span className="evtime" style={{ color }}>{item.time || ''}</span>
    </div>
  );
}
