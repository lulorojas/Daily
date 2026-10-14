import { CrossIcon } from '../ui/Icons';
import { breakdownLabel, itemsBreakdown, optionLabel } from '../../lib/meals';
import { C, tint } from '../../lib/theme';

/* ----------------------------- UNA ENTRADA DE LA BITÁCORA -----------------------------
   Lo que escribiste, la hora, y abajo lo que el bot reconoció: una píldora por cada
   opción del plan que matcheó y una por cada extra, con el color propio de cada extra.
   Si no reconoció nada, la entrada se ve igual — se guardó, solo que no suma a ninguna
   frecuencia (es la decisión explícita de no perder nunca lo que escribiste).

   Una opción CUANTIFICADA (matches.options[].items, ver lib/meals.js) suma además una
   fila de "2/3 Tostadas · 3/3 Huevos" debajo de la píldora — pedido explícito: "quiero
   que las opciones de cada comida y lo que yo comí importe", ver el color por ítem más
   abajo (verde = llegaste o pasaste, ámbar = a medias, gris = no apareció).

   `slotsById`/`extrasById` llegan ya armados desde la página: resolver el nombre de cada
   id acá adentro obligaría a recorrer el plan entero una vez por burbuja. */
function itemColor(got, expected) {
  if (got >= expected) return C.green;
  if (got > 0) return C.amber;
  return 'rgba(242,244,248,.35)';
}

export function MealLogBubble({ entry, slotsById, extrasById, onDelete }) {
  // 24 horas siempre, como el resto de la app (las horas de tareas y citas se guardan y
  // se muestran así); con el default del locale, algunos navegadores dan "02:36 a. m.".
  const hora = new Date(entry.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  const opciones = entry.matches.options
    .map(({ slotId, optionId, items }) => {
      const slot = slotsById[slotId];
      const option = slot?.options.find((o) => o.id === optionId);
      if (!option) return null;
      return {
        key: optionId,
        label: `${slot.name}: ${optionLabel(option)}`,
        detalle: items && option.items?.length ? itemsBreakdown(option, items) : null,
      };
    })
    .filter(Boolean);

  const extras = entry.matches.extras
    .map((id) => extrasById[id])
    .filter(Boolean);

  return (
    <div className="mealbubble">
      <div className="mealbubble-top">
        <span className="mono mealbubble-time">{hora}</span>
        <span className="grow mealbubble-text">{entry.text}</span>
        <button type="button" className="iconcirc" aria-label={`Borrar "${entry.text}"`} onClick={onDelete}>
          <CrossIcon />
        </button>
      </div>

      {(opciones.length > 0 || extras.length > 0 || entry.pesado) && (
        <div className="mealtags">
          {opciones.map((o) => (
            <span className="mealtag mealtag-plan" key={o.key}>{o.label}</span>
          ))}
          {entry.pesado && <span className="mealtag">pesado en balanza</span>}
          {extras.map((ex) => (
            <span
              className="mealtag"
              key={ex.id}
              style={{ background: tint(ex.color, '24'), color: ex.color }}
            >
              {ex.name}
            </span>
          ))}
        </div>
      )}

      {opciones.some((o) => o.detalle) && (
        <div className="mealitems-detalle">
          {opciones.filter((o) => o.detalle).flatMap((o) => o.detalle).map((it) => (
            <span className="mono mealitem-detalle" key={it.id} style={{ color: itemColor(it.got, it.expected) }}>
              {breakdownLabel(it)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
