import { Link } from 'react-router-dom';
import { PencilIcon, CrossIcon, ReorderIcon, DisclosureIcon } from '../ui/Icons';

/* ----------------------------- FILA DE RUTINAS (DÍA O EJERCICIO) -----------------------------
   Port de rutRow(). La misma fila sirve para un día dentro de una rutina y para un
   ejercicio dentro de un día — son los dos niveles "de lista" de la biblioteca (el nivel 1,
   la grilla de rutinas, tiene su propia tarjeta con portada de color, más abajo).

   Reordenar es con flechas, no arrastrando: el pedido lo dice explícito ("no drag"), y
   además con datos que pueden mirarse desde el celular es lo que más previsible se toca.
   `first`/`last` deshabilitan la flecha que no tiene a dónde ir, en vez de ocultarla —
   así la fila no cambia de ancho según la posición. */
export function RutRow({ name, sub, first, last, to, onMove, onEdit, onDelete }) {
  const Wrapper = to ? Link : 'div';
  const wrapperProps = to ? { to, className: 'managerow openable' } : { className: 'managerow' };

  return (
    <Wrapper {...wrapperProps}>
      <div className="rut-ord">
        <button
          type="button"
          className={`ordbtn${first ? ' dis' : ''}`}
          disabled={first}
          aria-label="Subir"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMove(-1); }}
        >
          <ReorderIcon dir={-1} />
        </button>
        <button
          type="button"
          className={`ordbtn${last ? ' dis' : ''}`}
          disabled={last}
          aria-label="Bajar"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMove(1); }}
        >
          <ReorderIcon dir={1} />
        </button>
      </div>

      <div className="grow">
        <div className="managerow-title">{name}</div>
        {sub && <div className="managerow-sub">{sub}</div>}
      </div>

      <div className="managerow-actions">
        <button type="button" className="iconcirc" aria-label={`Editar ${name}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}>
          <PencilIcon />
        </button>
        <button type="button" className="iconcirc" aria-label={`Eliminar ${name}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}>
          <CrossIcon />
        </button>
        {to && <DisclosureIcon />}
      </div>
    </Wrapper>
  );
}
