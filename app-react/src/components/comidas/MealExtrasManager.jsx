import { useState } from 'react';
import { ManageMealExtrasModal } from './ManageMealExtrasModal';
import { MealExtraFormModal } from './MealExtraFormModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { deleteMealExtra } from '../../store/mutations';

/* ----------------------------- FLUJO DE "ADMINISTRAR EXTRAS" -----------------------------
   Calco exacto del flujo de TypesManager.jsx (gimnasio): una máquina de estados chiquita
   —lista o formulario, nunca los dos— que siempre vuelve a la lista al terminar. Acá el
   dato es un extra de Comidas (café, alcohol, permitidos…) en vez de un tipo de entreno,
   pero el patrón de administración es idéntico. */
export function MealExtrasManager({ onClose }) {
  const { data, update } = useData();
  const [paso, setPaso] = useState({ vista: 'lista' });
  const [borrando, setBorrando] = useState(null);

  const extras = data.meals?.extras ?? [];

  const handleDelete = () => {
    update((draft) => deleteMealExtra(draft, borrando.id));
    setBorrando(null);
  };

  return (
    <>
      {paso.vista === 'lista' && (
        <ManageMealExtrasModal
          extras={extras}
          onClose={onClose}
          onNew={() => setPaso({ vista: 'form', extra: null })}
          onEdit={(e) => setPaso({ vista: 'form', extra: e })}
          onDelete={(e) => setBorrando(e)}
        />
      )}

      {paso.vista === 'form' && (
        <MealExtraFormModal
          extra={paso.extra}
          onClose={() => setPaso({ vista: 'lista' })}
          onSaved={() => setPaso({ vista: 'lista' })}
        />
      )}

      {borrando && (
        <ConfirmDialog
          title={`¿Eliminar "${borrando.name}"?`}
          description="Las entradas de la bitácora que ya lo habían reconocido no se modifican."
          okLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setBorrando(null)}
        />
      )}
    </>
  );
}
