import { Modal } from '../ui/Modal';
import { PencilIcon, CrossIcon, PlusIcon, ReorderIcon, DisclosureIcon } from '../ui/Icons';
import { C } from '../../lib/theme';
import { clickable } from '../ui/clickable';

/* ----------------------------- ADMINISTRAR EL PLAN: FRANJAS -----------------------------
   Lista de franjas (Desayuno/Almuerzo/...) con reordenamiento por flechas — mismo patrón
   que RutRow.jsx (rutinas): no se arrastra, se sube/baja con dos botones, el que no tiene
   a dónde ir queda deshabilitado en vez de escondido. Tocar el cuerpo de la fila abre SUS
   opciones (ManageMealOptionsModal); el lápiz edita el nombre de la franja, la cruz la
   borra — las tres acciones de más (mover/editar/borrar) cortan la propagación con
   clickable()/stopPropagation, igual que TaskRow hace con su checkbox: tocar la fila abre
   las opciones, tocar un botón de adentro NO. */
export function ManageMealSlotsModal({ slots, onClose, onNew, onOpenOptions, onEdit, onDelete, onMove, onNewPlan, onLoadTemplate, faltantes = 0, onRestore }) {
  return (
    <Modal title="Plan de comidas" onClose={onClose}>
      <div className="fld">
        <div className="managetypes-head">
          <div className="flabel notopmargin">Franjas</div>
          <button type="button" className="roundadd" style={{ background: C.violet }} onClick={onNew} aria-label="Nueva franja">
            <PlusIcon size={18} strokeWidth="2.6" color="#0A0C11" />
          </button>
        </div>

        {slots.length === 0 ? (
          <div className="empty">No hay franjas todavía. Tocá + para crear la primera (Desayuno, Almuerzo…).</div>
        ) : (
          <div className="card managelist">
            {slots.map((s, i) => (
              <div className="managerow openable" key={s.id} {...clickable(() => onOpenOptions(s), { label: s.name })}>
                <div className="rut-ord">
                  <button
                    type="button"
                    className={`ordbtn${i === 0 ? ' dis' : ''}`}
                    disabled={i === 0}
                    aria-label="Subir"
                    onClick={(e) => { e.stopPropagation(); onMove(s.id, -1); }}
                  >
                    <ReorderIcon dir={-1} />
                  </button>
                  <button
                    type="button"
                    className={`ordbtn${i === slots.length - 1 ? ' dis' : ''}`}
                    disabled={i === slots.length - 1}
                    aria-label="Bajar"
                    onClick={(e) => { e.stopPropagation(); onMove(s.id, 1); }}
                  >
                    <ReorderIcon dir={1} />
                  </button>
                </div>

                <div className="grow">
                  <div className="managerow-title">{s.name}</div>
                  <div className="managerow-sub">{s.options.length} {s.options.length === 1 ? 'opción' : 'opciones'}</div>
                </div>

                <div className="managerow-actions">
                  <button type="button" className="iconcirc" aria-label={`Editar ${s.name}`} onClick={(e) => { e.stopPropagation(); onEdit(s); }}>
                    <PencilIcon />
                  </button>
                  <button type="button" className="iconcirc" aria-label={`Eliminar ${s.name}`} onClick={(e) => { e.stopPropagation(); onDelete(s); }}>
                    <CrossIcon />
                  </button>
                  <DisclosureIcon />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="managetypes-note">
          Cada franja puede tener varias opciones — tocá una franja para administrarlas.
        </div>

        {slots.length > 0 && (
          <button type="button" className="pillbtn comidas comidas-newplan" onClick={onNewPlan}>
            Nuevo plan (el nutricionista me dio uno distinto)
          </button>
        )}
        {faltantes > 0 && onRestore && (
          <button type="button" className="pillbtn comidas comidas-newplan" onClick={onRestore}>
            Agregar lo que falta del plan de la nutricionista ({faltantes})
          </button>
        )}
        {onLoadTemplate && (
          <button type="button" className="pillbtn comidas comidas-newplan" onClick={onLoadTemplate}>
            Cargar el plan de la nutricionista
          </button>
        )}
      </div>
    </Modal>
  );
}
