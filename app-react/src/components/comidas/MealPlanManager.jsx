import { useState } from 'react';
import { ManageMealSlotsModal } from './ManageMealSlotsModal';
import { MealSlotFormModal } from './MealSlotFormModal';
import { ManageMealOptionsModal } from './ManageMealOptionsModal';
import { MealOptionFormModal } from './MealOptionFormModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useData } from '../../hooks/useData';
import { activePlan, optionLabel } from '../../lib/meals';
import { deleteMealOption, deleteMealSlot, moveMealSlot, startNewMealPlan } from '../../store/mutations';

/* ----------------------------- FLUJO DE "ADMINISTRAR EL PLAN" -----------------------------
   Misma máquina de estados que TypesManager.jsx (gimnasio), con un nivel más: el plan
   tiene franjas, y cada franja tiene opciones. Cuatro vistas, nunca dos a la vez:

     franjas      → la lista de franjas (Desayuno, Almuerzo…)
     franja-form  → crear/renombrar una franja
     opciones     → las opciones de UNA franja
     opcion-form  → crear/editar una opción de esa franja

   `paso.slot` se vuelve a leer del documento en cada render (no se guarda el objeto
   entero en el estado) porque después de agregar una opción el `slot` del estado sería
   el de antes — una copia vieja, sin la opción nueva. Guardar el id y re-buscar es lo
   mismo que hace GymPage con `modal.liftId`.

   Todo esto opera sobre activePlan(data) (lib/meals.js), la versión VIGENTE del plan —
   pedido explícito, historial de planes: el nutricionista actualiza el plan de vez en
   cuando y Lulo quiere guardar las versiones viejas, no pisarlas. "Nuevo plan" (botón al
   pie de ManageMealSlotsModal) archiva la activa y arranca otra; nada de lo de acá arriba
   —franja-form/opciones/opcion-form— crea una versión nueva, solo edita la vigente. */
export function MealPlanManager({ onClose }) {
  const { data, update } = useData();
  const [paso, setPaso] = useState({ vista: 'franjas' });
  const [borrandoSlot, setBorrandoSlot] = useState(null);
  const [borrandoOpcion, setBorrandoOpcion] = useState(null);
  const [nuevoPlan, setNuevoPlan] = useState(false);

  const slots = activePlan(data)?.slots ?? [];
  const slotActual = paso.slotId ? slots.find((s) => s.id === paso.slotId) : null;

  const handleDeleteSlot = () => {
    update((draft) => deleteMealSlot(draft, borrandoSlot.id));
    setBorrandoSlot(null);
  };

  const handleDeleteOpcion = () => {
    update((draft) => deleteMealOption(draft, slotActual.id, borrandoOpcion.id));
    setBorrandoOpcion(null);
  };

  const handleNuevoPlan = () => {
    update((draft) => startNewMealPlan(draft));
    setNuevoPlan(false);
  };

  return (
    <>
      {paso.vista === 'franjas' && (
        <ManageMealSlotsModal
          slots={slots}
          onClose={onClose}
          onNew={() => setPaso({ vista: 'franja-form', slotId: null })}
          onOpenOptions={(s) => setPaso({ vista: 'opciones', slotId: s.id })}
          onEdit={(s) => setPaso({ vista: 'franja-form', slotId: s.id })}
          onDelete={(s) => setBorrandoSlot(s)}
          onMove={(id, dir) => update((draft) => moveMealSlot(draft, id, dir))}
          onNewPlan={() => setNuevoPlan(true)}
        />
      )}

      {paso.vista === 'franja-form' && (
        <MealSlotFormModal
          slot={slotActual}
          onClose={() => setPaso({ vista: 'franjas' })}
          onSaved={() => setPaso({ vista: 'franjas' })}
        />
      )}

      {paso.vista === 'opciones' && slotActual && (
        <ManageMealOptionsModal
          slot={slotActual}
          onClose={() => setPaso({ vista: 'franjas' })}
          onNew={() => setPaso({ vista: 'opcion-form', slotId: slotActual.id, optionId: null })}
          onEdit={(o) => setPaso({ vista: 'opcion-form', slotId: slotActual.id, optionId: o.id })}
          onDelete={(o) => setBorrandoOpcion(o)}
        />
      )}

      {paso.vista === 'opcion-form' && slotActual && (
        <MealOptionFormModal
          slot={slotActual}
          option={paso.optionId ? slotActual.options.find((o) => o.id === paso.optionId) : null}
          onClose={() => setPaso({ vista: 'opciones', slotId: slotActual.id })}
          onSaved={() => setPaso({ vista: 'opciones', slotId: slotActual.id })}
        />
      )}

      {borrandoSlot && (
        <ConfirmDialog
          title={`¿Eliminar "${borrandoSlot.name}"?`}
          description="Se borra la franja con todas sus opciones. La bitácora ya escrita no se modifica."
          okLabel="Eliminar"
          onConfirm={handleDeleteSlot}
          onCancel={() => setBorrandoSlot(null)}
        />
      )}

      {borrandoOpcion && (
        <ConfirmDialog
          title={`¿Eliminar "${optionLabel(borrandoOpcion)}"?`}
          description="Deja de reconocerse en la bitácora de ahora en adelante; lo ya escrito no se modifica."
          okLabel="Eliminar"
          onConfirm={handleDeleteOpcion}
          onCancel={() => setBorrandoOpcion(null)}
        />
      )}

      {nuevoPlan && (
        <ConfirmDialog
          title="¿Empezar un plan nuevo?"
          description="El plan actual queda archivado (con su historial) y arranca uno con las mismas franjas, sin opciones — las vas a cargar de nuevo. La bitácora ya escrita no se modifica."
          okLabel="Empezar"
          onConfirm={handleNuevoPlan}
          onCancel={() => setNuevoPlan(false)}
        />
      )}
    </>
  );
}
