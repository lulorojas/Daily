import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackPill } from '../../components/ui/BackPill';
import { SimpleNameModal } from '../../components/rutinas/SimpleNameModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ReorderIcon, PencilIcon, CrossIcon } from '../../components/ui/Icons';
import { EmptyCard } from '../../components/ui/Section';
import { useData } from '../../hooks/useData';
import { addRoutine, deleteRoutine, moveRoutine, updateRoutine } from '../../store/mutations';
import { C, RUT_COVERS, accentedDashedStyle } from '../../lib/theme';

const rutColor = (i) => RUT_COVERS[i % RUT_COVERS.length];

/* ============================================================================
   RUTINAS — nivel 1: biblioteca

   Port de viewRutList(). Grilla de tarjetas con portada de color (que se repite por
   posición, no se guarda: RUT_COVERS[i % 6]) y, debajo, el nombre con sus flechas de
   reordenar y sus dos acciones.

   Es la única de las tres pantallas de Rutinas con una URL fija (/gym/rutinas); las otras
   dos llevan el id en la URL (`:rutId`, `:rutId/:dayId`), así que abrir una rutina o un
   día es literalmente navegar — con su botón Atrás y su link compartible, que es la razón
   por la que esto se hizo con rutas y no con el ui.rutId/ui.rutDayId de la app vanilla.
   ============================================================================ */
export function RutinasListPage() {
  const { data, update } = useData();
  const [modal, setModal] = useState(null);
  const routines = data.gym.routines;

  return (
    <div className="view">
      <div className="head">
        <BackPill to="/gym" label="Gimnasio" />
        <div className="kicker" style={{ color: 'rgba(242,244,248,.38)', marginTop: '10px' }}>Biblioteca</div>
        <h1 className="rutlist-h1">Mis rutinas</h1>
        <div className="sub">{routines.length ? `${routines.length} ${routines.length === 1 ? 'guardada' : 'guardadas'}` : 'Creá tu primera rutina'}</div>
      </div>

      <div className="body">
        {routines.length === 0 ? (
          <EmptyCard size="lg">
            Acá vas a tener tus rutinas para consultar cuando entrenás.<br />
            Creá la primera y agregale sus días y ejercicios.
          </EmptyCard>
        ) : (
          routines.map((r, i) => {
            const col = rutColor(i);
            const nd = r.days.length;
            const nEx = r.days.reduce((a, d) => a + d.exercises.length, 0);
            return (
              <div className="rcard" key={r.id}>
                <Link className="rcover" style={{ background: col }} to={r.id}>
                  <div className="stripes" />
                  <span className="rnum">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rtag">{nd ? `${nd} ${nd === 1 ? 'día' : 'días'}` : 'Vacía'}</span>
                </Link>
                <div className="rcard-body">
                  <Link className="grow" to={r.id}>
                    <div className="fr rcard-name">{r.name}</div>
                    <div className="rcard-sub">
                      {nd ? `${nd} ${nd === 1 ? 'día' : 'días'}` : 'Sin días'}
                      {nEx ? ` · ${nEx} ${nEx === 1 ? 'ejercicio' : 'ejercicios'}` : ''}
                    </div>
                  </Link>
                  <div className="rut-ord">
                    <button type="button" className={`ordbtn${i === 0 ? ' dis' : ''}`} disabled={i === 0} aria-label="Subir" onClick={() => update((d) => moveRoutine(d, r.id, -1))}>
                      <ReorderIcon dir={-1} />
                    </button>
                    <button type="button" className={`ordbtn${i === routines.length - 1 ? ' dis' : ''}`} disabled={i === routines.length - 1} aria-label="Bajar" onClick={() => update((d) => moveRoutine(d, r.id, 1))}>
                      <ReorderIcon dir={1} />
                    </button>
                  </div>
                  <button type="button" className="iconcirc" aria-label={`Editar ${r.name}`} onClick={() => setModal({ kind: 'edit', routine: r })}>
                    <PencilIcon />
                  </button>
                  <button type="button" className="iconcirc" aria-label={`Eliminar ${r.name}`} onClick={() => setModal({ kind: 'delete', routine: r })}>
                    <CrossIcon />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <button type="button" className="dashed" style={accentedDashedStyle(C.rose)} onClick={() => setModal({ kind: 'new' })}>
          + Crear rutina
        </button>
      </div>

      {(modal?.kind === 'new' || modal?.kind === 'edit') && (
        <SimpleNameModal
          modalTitle="Nueva rutina"
          editTitle="Editar rutina"
          fieldLabel="Nombre"
          placeholder="Ej: Rutina 1"
          errorMessage="Poné un nombre para la rutina."
          initialName={modal.routine?.name ?? ''}
          onClose={() => setModal(null)}
          onSave={(name) => {
            update((d) => {
              if (modal.kind === 'edit') updateRoutine(d, modal.routine.id, { name });
              else addRoutine(d, { name });
            });
            setModal(null);
          }}
        />
      )}

      {modal?.kind === 'delete' && (
        <ConfirmDialog
          title={`¿Eliminar "${modal.routine.name}"?`}
          description="Se borra la rutina con todos sus días y ejercicios."
          okLabel="Eliminar"
          onConfirm={() => { update((d) => deleteRoutine(d, modal.routine.id)); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
