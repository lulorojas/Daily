import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { BackPill } from '../../components/ui/BackPill';
import { RutRow } from '../../components/rutinas/RutRow';
import { SimpleNameModal } from '../../components/rutinas/SimpleNameModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyCard } from '../../components/ui/Section';
import { useData } from '../../hooks/useData';
import { addRoutineDay, deleteRoutineDay, moveRoutineDay, updateRoutineDay } from '../../store/mutations';
import { RUT_COVERS, accentedDashedStyle } from '../../lib/theme';

const rutColor = (i) => RUT_COVERS[i % RUT_COVERS.length];

/* ============================================================================
   RUTINAS — nivel 2: los días de una rutina

   Port de viewRutDetail(). Si el id de la URL no corresponde a ninguna rutina (se borró
   en otra pestaña, o alguien escribió la URL a mano), se vuelve a la biblioteca — el
   equivalente del `if(ui.rutId && !rutCur())` que hacía viewRutinas() antes de dibujar.
   ============================================================================ */
export function RutinaDetailPage() {
  const { rutId } = useParams();
  const { data, update } = useData();
  const [modal, setModal] = useState(null);

  const index = data.gym.routines.findIndex((r) => r.id === rutId);
  const routine = data.gym.routines[index];
  if (!routine) return <Navigate to="/gym/rutinas" replace />;

  const col = rutColor(index);
  const days = routine.days;

  return (
    <div className="view" style={{ '--accent': col }}>
      <div className="head">
        <BackPill to="/gym/rutinas" label="Mis rutinas" />
        <div className="kicker" style={{ color: col, marginTop: '10px' }}>Rutina</div>
        <h1 className="rutlist-h1">{routine.name}</h1>
        <div className="sub">{days.length ? `${days.length} ${days.length === 1 ? 'día' : 'días'}` : 'Agregale sus días'}</div>
      </div>

      <div className="body">
        <div className="sect">
          <div className="sectlabel">Días</div>
          {days.length === 0 ? (
            <EmptyCard size="sm">Esta rutina todavía no tiene días.</EmptyCard>
          ) : (
            <div className="card managelist">
              {days.map((d, j) => (
                <RutRow
                  key={d.id}
                  name={d.name}
                  sub={d.exercises.length ? `${d.exercises.length} ${d.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}` : 'Sin ejercicios'}
                  first={j === 0}
                  last={j === days.length - 1}
                  to={d.id}
                  onMove={(dir) => update((draft) => moveRoutineDay(draft, rutId, d.id, dir))}
                  onEdit={() => setModal({ kind: 'edit', day: d })}
                  onDelete={() => setModal({ kind: 'delete', day: d })}
                />
              ))}
            </div>
          )}
          <button type="button" className="dashed" style={accentedDashedStyle(col)} onClick={() => setModal({ kind: 'new' })}>
            + Agregar día
          </button>
        </div>
      </div>

      {(modal?.kind === 'new' || modal?.kind === 'edit') && (
        <SimpleNameModal
          modalTitle="Nuevo día"
          editTitle="Editar día"
          fieldLabel="Nombre del día"
          placeholder="Ej: Pecho"
          errorMessage="Poné un nombre para el día."
          initialName={modal.day?.name ?? ''}
          onClose={() => setModal(null)}
          onSave={(name) => {
            update((draft) => {
              if (modal.kind === 'edit') updateRoutineDay(draft, rutId, modal.day.id, { name });
              else addRoutineDay(draft, rutId, { name });
            });
            setModal(null);
          }}
        />
      )}

      {modal?.kind === 'delete' && (
        <ConfirmDialog
          title={`¿Eliminar "${modal.day.name}"?`}
          description="Se borra el día con todos sus ejercicios."
          okLabel="Eliminar"
          onConfirm={() => { update((draft) => deleteRoutineDay(draft, rutId, modal.day.id)); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
