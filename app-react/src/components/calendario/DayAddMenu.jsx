import { Modal } from '../ui/Modal';
import { MenuRow } from '../ui/MenuRow';
import { CalendarIcon, TaskIcon } from '../ui/Icons';
import { C } from '../../lib/theme';
import { fmtDateLong } from '../../lib/dates';

/* Port de calAddMenu(): el menú que sale al tocar "Agregar" en el detalle de un día.
   Las dos opciones abren el mismo formulario que el botón + de la barra, pero con la fecha
   de ese día ya puesta — que es toda la diferencia entre los dos menús.

   Es una hoja sin botón de guardar: no hay nada que confirmar, se elige y ya. */
export function DayAddMenu({ day, onClose, onTask, onEvent }) {
  return (
    <Modal title={fmtDateLong(day)} onClose={onClose}>
      <div className="menulist">
        <MenuRow
          variant="cal"
          color={C.amber}
          title="Nueva tarea"
          sub="Con la fecha de este día"
          icon={<TaskIcon />}
          onClick={onTask}
        />
        <MenuRow
          variant="cal"
          color={C.coral}
          title="Nueva cita"
          sub="Cita o fecha anual"
          icon={<CalendarIcon />}
          onClick={onEvent}
        />
      </div>
    </Modal>
  );
}
