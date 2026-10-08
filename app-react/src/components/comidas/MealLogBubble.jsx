import { CrossIcon } from '../ui/Icons';
import { tint } from '../../lib/theme';

/* ----------------------------- UNA ENTRADA DE LA BITÁCORA -----------------------------
   Lo que escribiste, la hora, y abajo lo que el bot reconoció: una píldora por cada
   opción del plan que matcheó y una por cada extra, con el color propio de cada extra.
   Si no reconoció nada, la entrada se ve igual — se guardó, solo que no suma a ninguna
   frecuencia (es la decisión explícita de no perder nunca lo que escribiste).

   `slotsById`/`extrasById` llegan ya armados desde la página: resolver el nombre de cada
   id acá adentro obligaría a recorrer el plan entero una vez por burbuja. */
export function MealLogBubble({ entry, slotsById, extrasById, onDelete }) {
  // 24 horas siempre, como el resto de la app (las horas de tareas y citas se guardan y
  // se muestran así); con el default del locale, algunos navegadores dan "02:36 a. m.".
  const hora = new Date(entry.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  const opciones = entry.matches.options
    .map(({ slotId, optionId }) => {
      const slot = slotsById[slotId];
      const option = slot?.options.find((o) => o.id === optionId);
      return option ? { key: optionId, label: `${slot.name}: ${option.text}` } : null;
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

      {(opciones.length > 0 || extras.length > 0) && (
        <div className="mealtags">
          {opciones.map((o) => (
            <span className="mealtag mealtag-plan" key={o.key}>{o.label}</span>
          ))}
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
    </div>
  );
}
