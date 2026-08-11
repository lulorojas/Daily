import { Modal } from '../ui/Modal';
import { MenuRow } from '../ui/MenuRow';
import { CalendarIcon, TaskIcon } from '../ui/Icons';
import { C } from '../../lib/theme';

/* Port de quickAddMenu(): lo que sale al tocar el + de la barra.

   En la app actual tiene cuatro opciones; acá van las dos que existen en esta etapa.
   "Nuevo hábito" y "Registrar peso" abren formularios de las pantallas Hábitos y Gimnasio,
   que llegan en la etapa 3b: cuando existan, se agregan dos <MenuRow> más y listo. */
export function QuickAddMenu({ onClose, onTask, onEvent }) {
  return (
    <Modal title="Agregar" onClose={onClose}>
      <div className="menulist">
        <MenuRow
          color={C.amber}
          title="Nueva tarea"
          sub="Con fecha y hora opcionales"
          icon={<TaskIcon strokeWidth="1.9" />}
          onClick={onTask}
        />
        <MenuRow
          color={C.coral}
          title="Nueva cita"
          sub="Va al calendario"
          icon={<CalendarIcon strokeWidth="1.9" />}
          onClick={onEvent}
        />
      </div>
    </Modal>
  );
}
