import {
  ArrowDown, ArrowUp, Barbell, BookOpen, CalendarBlank, CaretDown, CaretLeft, CaretRight, Check, CheckCircle, CheckSquare, ChartLineUp,
  Clock, DownloadSimple, EnvelopeSimple, Flame, ForkKnife, GearSix, Gift, Heart, Leaf, MapPin, Minus, Drop, PencilSimple, Plus,
  Star, Sun, Trash, WarningCircle, X,
} from '@phosphor-icons/react';
import { DEFAULT_HABIT_ICON } from '../../lib/icons';

/* Los íconos de la app, ahora Phosphor (rediseño Nocturne: "usá Phosphor icons").

   Se mantienen los MISMOS nombres y props que tenían los SVG a mano de la app vanilla, así
   ninguno de los archivos que los importan cambió: se escriben por nombre (<MailIcon />),
   toman el color del texto que los rodea (Phosphor usa `currentColor` por defecto) y donde
   el CSS ya fija el tamaño (`.evic svg{width:16px}`) ese tamaño sigue mandando. El grosor
   viejo (`strokeWidth`) pasa a ser el "peso" de Phosphor: de 2.5 para arriba, bold; el resto,
   regular.

   Los íconos de hábito guardan en el documento una CLAVE ('agua', 'libro'…), no un dibujo:
   la clave sigue siendo la misma (lib/icons.js) y acá se mapea a su equivalente Phosphor. */

const peso = (strokeWidth) => (Number(strokeWidth) >= 2.5 ? 'bold' : 'regular');

// El color del fondo de la app: el tilde de un check lleno de acento tiene que leerse encima.
const TINTA = '#161826';

/* ---------------------------------------------------- flechas */

export function ChevronLeftIcon() { return <CaretLeft size={14} weight="bold" aria-hidden="true" />; }
export function ChevronRightIcon() { return <CaretRight size={14} weight="bold" aria-hidden="true" />; }

// Las del calendario: un poco más grandes que las de la tira semanal.
export function MonthArrowIcon({ dir }) {
  const Flecha = dir === 'prev' ? CaretLeft : CaretRight;
  return <Flecha size={16} aria-hidden="true" />;
}

export function ChevronDownIcon({ className, open }) {
  return (
    <CaretDown
      className={className}
      size={13}
      weight="bold"
      color="rgba(244,244,251,0.4)"
      style={open ? { transform: 'rotate(180deg)' } : undefined}
      aria-hidden="true"
    />
  );
}

/* ---------------------------------------------------- sesión */

export function CheckIcon() { return <Check size={16} weight="bold" aria-hidden="true" />; }
export function AlertIcon() { return <WarningCircle size={16} aria-hidden="true" />; }
export function FieldErrorIcon() { return <WarningCircle size={14} aria-hidden="true" />; }
export function MailIcon() { return <EnvelopeSimple size={26} aria-hidden="true" />; }

/* ---------------------------------------------------- app */

export function GearIcon() { return <GearSix size={19} aria-hidden="true" />; }

// El tilde de adentro de un check, y el de los slots de hábito.
export function CheckMarkIcon() { return <Check size={14} weight="bold" color={TINTA} aria-hidden="true" />; }
export function HabitCheckIcon() { return <Check size={14} weight="bold" color={TINTA} aria-hidden="true" />; }

// Calendario: el de una cita y el del menú de agregar.
export function CalendarIcon({ strokeWidth = '2' }) { return <CalendarBlank size="1em" weight={peso(strokeWidth)} aria-hidden="true" />; }

// El del botón "poner fecha" de la bandeja de pendientes.
export function ScheduleIcon() { return <CalendarBlank size={15} aria-hidden="true" />; }

// Los de los campos "Fecha" y "Hora" de los formularios. Se tiñen con el acento del modal.
export function DateFieldIcon({ color }) { return <CalendarBlank size={18} color={color} aria-hidden="true" />; }
export function ClockIcon({ color }) { return <Clock size={18} color={color} aria-hidden="true" />; }

// Regalo: las fechas anuales (cumpleaños, feriados).
export function GiftIcon({ size }) { return <Gift size={size ?? '1em'} aria-hidden="true" />; }

// Chinche: una cita ocurre en un lugar y una vez.
export function PinIcon({ size = 15 }) { return <MapPin size={size} aria-hidden="true" />; }

export function TaskIcon({ size, strokeWidth = '2' }) { return <CheckSquare size={size ?? '1em'} weight={peso(strokeWidth)} aria-hidden="true" />; }

export function DumbbellIcon({ size } = {}) { return <Barbell size={size ?? '1em'} aria-hidden="true" />; }

// La llama de la racha, llena del color del hábito.
export function FlameIcon({ color, size = 12 }) { return <Flame size={size} weight="fill" color={color} aria-hidden="true" />; }

const ICONOS_HABITO = { agua: Drop, libro: BookOpen, pesa: Barbell, meditar: Leaf, estrella: Star, llama: Flame, corazon: Heart };
export function HabitIcon({ icon, color, size = 20 }) {
  const Icono = ICONOS_HABITO[icon] || ICONOS_HABITO[DEFAULT_HABIT_ICON];
  return <Icono size={size} color={color} weight="fill" aria-hidden="true" />;
}

/* ---------------------------------------------------- barra de abajo */

// Un ícono por sección, con la misma clave que usa SECTIONS.
const ICONOS_SECCION = { hoy: Sun, calendario: CalendarBlank, gym: Barbell, comidas: ForkKnife, habitos: CheckCircle, progreso: ChartLineUp };
export function SectionIcon({ section, size = '21px' }) {
  const Icono = ICONOS_SECCION[section];
  return <Icono size={size} style={{ flex: 'none' }} aria-hidden="true" />;
}

/* ---------------------------------------------------- gimnasio / rutinas / hábitos / progreso */

export function PencilIcon({ size = 13, strokeWidth = '2' }) { return <PencilSimple size={size} weight={peso(strokeWidth)} aria-hidden="true" />; }

// La cruz de borrar (no confundir con el tacho de Eliminar hábito, que es TrashIcon).
export function CrossIcon({ size = 12, strokeWidth = '2.4' }) { return <X size={size} weight={peso(strokeWidth)} aria-hidden="true" />; }

export function TrashIcon({ color = 'currentColor', size = 16 }) { return <Trash size={size} color={color} aria-hidden="true" />; }

export function PlusIcon({ size = 16, strokeWidth = '2', color = 'currentColor' }) { return <Plus size={size} color={color} weight={peso(strokeWidth)} aria-hidden="true" />; }

export function MinusIcon({ size = 16, strokeWidth = '2.8', color = 'currentColor' }) { return <Minus size={size} color={color} weight={peso(strokeWidth)} aria-hidden="true" />; }

// El tilde del punto de color elegido (selector de color de tipos y de hábitos).
export function SwatchCheckIcon() { return <Check size={17} weight="bold" color={TINTA} aria-hidden="true" />; }

// La flechita que indica que una fila abre algo (una rutina, un día).
export function DisclosureIcon() { return <CaretRight size={13} weight="bold" color="rgba(242,244,248,.3)" style={{ alignSelf: 'center' }} aria-hidden="true" />; }

// El chevron del selector de tipo del plan semanal: toma el color de lo que lo rodea.
export function ChipChevronIcon({ open }) {
  return <CaretDown size={12} weight="bold" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} aria-hidden="true" />;
}

// Reordenar (rutinas): sube o baja un lugar. `dir` es -1 o 1, igual que en las mutaciones.
export function ReorderIcon({ dir }) {
  const Flecha = dir < 0 ? ArrowUp : ArrowDown;
  return <Flecha size={10} weight="bold" aria-hidden="true" />;
}

// El glifo de "hábitos" suelto (la ficha de "Hábitos hoy" del resumen de Progreso).
export function HabitGlyphIcon({ size = 15 }) { return <Flame size={size} aria-hidden="true" />; }

// El librito de "Mis rutinas", en la entrada desde Gimnasio.
export function BookIcon({ size = 22 }) { return <BookOpen size={size} color={TINTA} aria-hidden="true" />; }

// El paso "Instalá Daily" del tour de onboarding.
export function InstallIcon() { return <DownloadSimple aria-hidden="true" />; }

// El tilde grande del paso de cierre del tour ("¡Listo!").
export function BigCheckIcon() { return <Check weight="bold" aria-hidden="true" />; }
