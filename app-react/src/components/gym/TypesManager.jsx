import { useState } from 'react';
import { ManageTypesModal } from './ManageTypesModal';
import { TypeCreateModal } from './TypeCreateModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { deleteCustomType } from '../../store/mutations';

/* ----------------------------- FLUJO DE "ADMINISTRAR TIPOS" -----------------------------
   En vanilla, cada acción de este flujo llamaba a manageTypesModal() de nuevo al terminar
   (`closeModal(); save(); manageTypesModal();`), pisando el modal anterior con el mismo
   HTML recalculado. Es el mismo resultado que acá: crear, editar o borrar un tipo vuelve
   siempre a la lista, sin salir del todo.

   La diferencia es cómo se logra. Este componente es una máquina de estados chiquita —
   qué pantalla del flujo se ve— en vez de una pila de `openModal()` sucesivos. `paso`
   nunca es más de un nivel porque el flujo de vanilla tampoco lo era: administrar tipos no
   se anida (no hay "crear tipo desde el editor de otro tipo"). */
export function TypesManager({ onClose }) {
  const { data, update } = useData();
  const [paso, setPaso] = useState({ vista: 'lista' });
  const [borrando, setBorrando] = useState(null);

  const types = data.gym.customTypes;

  const handleDelete = () => {
    update((draft) => deleteCustomType(draft, borrando.id));
    setBorrando(null);
  };

  return (
    <>
      {paso.vista === 'lista' && (
        <ManageTypesModal
          types={types}
          onClose={onClose}
          onNew={() => setPaso({ vista: 'form', type: null })}
          onEdit={(t) => setPaso({ vista: 'form', type: t })}
          onDelete={(t) => setBorrando(t)}
        />
      )}

      {paso.vista === 'form' && (
        <TypeCreateModal
          type={paso.type}
          onClose={() => setPaso({ vista: 'lista' })}
          onSaved={() => setPaso({ vista: 'lista' })}
        />
      )}

      {borrando && (
        <ConfirmDialog
          title={`¿Eliminar "${borrando.name}"?`}
          description="Se quitará del selector del plan semanal. Los días ya marcados no se modifican."
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setBorrando(null)}
        />
      )}
    </>
  );
}
