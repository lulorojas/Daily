import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { BackPill } from '../../components/ui/BackPill';
import { RutRow } from '../../components/rutinas/RutRow';
import { ExerciseFormModal } from '../../components/rutinas/ExerciseFormModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyCard } from '../../components/ui/Section';
import { useData } from '../../hooks/useData';
import { addExercise, deleteExercise, moveExercise, updateExercise } from '../../store/mutations';
import { RUT_COVERS, accentedDashedStyle } from '../../lib/theme';

const rutColor = (i) => RUT_COVERS[i % RUT_COVERS.length];

/* ============================================================================
   RUTINAS — nivel 3: los ejercicios de un día

   Port de viewRutDay(). Última parada de la biblioteca: acá no hay nada más adentro de
   qué entrar, así que las filas de ejercicio no llevan `to` y RutRow no dibuja la
   flechita de "esto abre algo".
   ============================================================================ */
export function RutinaDayPage() {
  const { rutId, dayId } = useParams();
  const { data, update } = useData();
  const [modal, setModal] = useState(null);

  const index = data.gym.routines.findIndex((r) => r.id === rutId);
  const routine = data.gym.routines[index];
  if (!routine) return <Navigate to="/gym/rutinas" replace />;

  const day = routine.days.find((d) => d.id === dayId);
  if (!day) return <Navigate to={`/gym/rutinas/${rutId}`} replace />;

  const col = rutColor(index);
  const exercises = day.exercises;

  return (
    <div className="view" style={{ '--accent': col }}>
      <div className="head">
        <BackPill to={`/gym/rutinas/${rutId}`} label={routine.name} />
        <div className="kicker" style={{ color: col, marginTop: '10px' }}>{routine.name}</div>
        <h1 className="rutlist-h1">{day.name}</h1>
        <div className="sub">{exercises.length ? `${exercises.length} ${exercises.length === 1 ? 'ejercicio' : 'ejercicios'}` : 'sin ejercicios'}</div>
      </div>

      <div className="body">
        <div className="sect">
          <div className="sectlabel">Ejercicios</div>
          {exercises.length === 0 ? (
            <EmptyCard size="sm">Este día todavía no tiene ejercicios.</EmptyCard>
          ) : (
            <div className="card managelist">
              {exercises.map((ex, j) => (
                <RutRow
                  key={ex.id}
                  name={ex.name}
                  sub={ex.detail}
                  first={j === 0}
                  last={j === exercises.length - 1}
                  onMove={(dir) => update((draft) => moveExercise(draft, rutId, dayId, ex.id, dir))}
                  onEdit={() => setModal({ kind: 'edit', exercise: ex })}
                  onDelete={() => setModal({ kind: 'delete', exercise: ex })}
                />
              ))}
            </div>
          )}
          <button type="button" className="dashed" style={accentedDashedStyle(col)} onClick={() => setModal({ kind: 'new' })}>
            + Agregar ejercicio
          </button>
        </div>
      </div>

      {(modal?.kind === 'new' || modal?.kind === 'edit') && (
        <ExerciseFormModal
          exercise={modal.exercise}
          onClose={() => setModal(null)}
          onSave={(fields) => {
            update((draft) => {
              if (modal.kind === 'edit') updateExercise(draft, rutId, dayId, modal.exercise.id, fields);
              else addExercise(draft, rutId, dayId, fields);
            });
            setModal(null);
          }}
        />
      )}

      {modal?.kind === 'delete' && (
        <ConfirmDialog
          title={`¿Eliminar "${modal.exercise.name}"?`}
          description="Se quita el ejercicio de este día."
          okLabel="Eliminar"
          onConfirm={() => { update((draft) => deleteExercise(draft, rutId, dayId, modal.exercise.id)); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
