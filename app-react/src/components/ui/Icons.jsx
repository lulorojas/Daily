import { ICONS, DEFAULT_HABIT_ICON } from '../../lib/icons';

/* Los mismos SVG que dibujaba la app vanilla, ahora como componentes.
   Ventaja de tenerlos acá: se escriben una vez, se usan por nombre (<MailIcon />) y si hay
   que corregir un trazo se corrige en un solo lugar. `currentColor` hace que cada ícono
   tome el color del texto que lo rodea, así se tiñen solos con el acento de la pantalla.

   Los tamaños y los grosores de trazo están copiados uno por uno de los template strings
   de la app actual: son parte del diseño, no un detalle. Donde el CSS ya fija el tamaño
   (por ejemplo `.evic svg{width:16px}`), el atributo igual se deja para que el ícono se
   vea bien si alguna vez se usa fuera de ese contenedor. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/* ---------------------------------------------------- flechas */

export function ChevronLeftIcon() {
  return (
    <svg width="8" height="13" viewBox="0 0 12 20" strokeWidth="2.6" {...stroke}>
      <path d="M10 2L2 10l8 8" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg width="8" height="13" viewBox="0 0 12 20" strokeWidth="2.6" {...stroke}>
      <path d="M2 2l8 8-8 8" />
    </svg>
  );
}

// Las del calendario son otras: más grandes y con otro trazo que las de la tira semanal.
export function MonthArrowIcon({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...stroke}>
      <path d={dir === 'prev' ? 'M14.5 5 8 12l6.5 7' : 'M9.5 5 16 12l-6.5 7'} />
    </svg>
  );
}

export function ChevronDownIcon({ className, open }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      strokeWidth="2.6"
      style={open ? { transform: 'rotate(180deg)' } : undefined}
      {...stroke}
      stroke="rgba(244,244,251,0.4)"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* ---------------------------------------------------- sesión (etapa 1) */

export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.2" {...stroke}>
      <path d="M20 6.5 9.5 17 4 11.5" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.2" {...stroke}>
      <path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17ZM12 8v5M12 16.2v.3" />
    </svg>
  );
}

export function FieldErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.4" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.5v.01" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.8" {...stroke}>
      <rect x="2.5" y="5" width="19" height="14" rx="3.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

/* ---------------------------------------------------- app */

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }} strokeWidth="1.9" {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.5 12a7.5 7.5 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.2-1.3L14.5 2h-4l-.4 2.1A7.5 7.5 0 0 0 7.9 5.4L5.6 4.5l-2 3.4 2 1.5A7.6 7.6 0 0 0 5.5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-.9c.7.5 1.4 1 2.2 1.3l.4 2.1h4l.4-2.1c.8-.3 1.6-.8 2.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3Z" />
    </svg>
  );
}

/* El tilde de adentro de un check. El trazo es oscuro fijo (#0A0C11), no `currentColor`:
   el cuadrado se pinta con el color del acento y el tilde tiene que leerse encima. */
export function CheckMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#0A0C11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.5 9 17l10.5-11" />
    </svg>
  );
}

// El tilde más finito de los slots de hábito.
export function HabitCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#0A0C11" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path className="tk" d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

// Calendario "sólido": el de la barra de abajo, el de una cita y el del menú de agregar.
// El grosor del trazo se puede pisar porque en el menú del + va un pelo más fino (1.9),
// igual que en la app actual.
export function CalendarIcon({ strokeWidth = '2' }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={strokeWidth} {...stroke}>
      <path d="M7.5 3v4M16.5 3v4M3.4 10.5h17.2M6.5 5h11a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 17.5 21h-11A3.5 3.5 0 0 1 3 17.5v-9A3.5 3.5 0 0 1 6.5 5Z" />
    </svg>
  );
}

// El del botón "poner fecha" de la bandeja de pendientes: mismo dibujo, otras esquinas.
export function ScheduleIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }} strokeWidth="2" {...stroke}>
      <rect x="3" y="5" width="18" height="16" rx="4" />
      <path d="M8 3v4M16 3v4M3.4 10.5h17.2" />
    </svg>
  );
}

// El del campo "Fecha" de los formularios. Se tiñe con el acento del modal.
export function DateFieldIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function ClockIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3 2" />
    </svg>
  );
}

// Regalo: las fechas anuales (cumpleaños, feriados).
export function GiftIcon({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} strokeWidth={size ? '2.3' : '2'} {...stroke}>
      <path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

// Chinche: una cita ocurre en un lugar y una vez.
export function PinIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.3" {...stroke}>
      <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z" />
    </svg>
  );
}

export function TaskIcon({ size, strokeWidth = '2' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} strokeWidth={strokeWidth} {...stroke}>
      <path d="M4.5 12.5 9 17l10.5-11" />
    </svg>
  );
}

export function DumbbellIcon() {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M6.5 8.5v7M3.8 10.5v3M17.5 8.5v7M20.2 10.5v3M6.5 12h11" />
    </svg>
  );
}

/* La llama de la racha y el ícono de un hábito se pintan con `fill`, no con trazo: son
   siluetas llenas del color del hábito. */
export function FlameIcon({ color, size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 3c.6 3.2 3 4.4 3 7.6a3 3 0 0 1-6 0c0-1 .4-1.9 1-2.6-1.3.4-3.2 1.7-3.2 4.7a5.2 5.2 0 0 0 10.4 0C17.2 8.2 14.2 5.6 12 3z" />
    </svg>
  );
}

export function HabitIcon({ icon, color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={ICONS[icon] || ICONS[DEFAULT_HABIT_ICON]} />
    </svg>
  );
}

/* ---------------------------------------------------- barra de abajo */

// Un ícono por sección, con la misma clave que usa SECTIONS.
const SECTION_PATHS = {
  hoy: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2.6v2M12 19.4v2M4.6 4.6 6 6M18 18l1.4 1.4M2.6 12h2M19.4 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  calendario: 'M7.5 3v4M16.5 3v4M3.4 10.5h17.2M6.5 5h11a3.5 3.5 0 0 1 3.5 3.5v9A3.5 3.5 0 0 1 17.5 21h-11A3.5 3.5 0 0 1 3 17.5v-9A3.5 3.5 0 0 1 6.5 5Z',
  gym: 'M6.5 8.5v7M3.8 10.5v3M17.5 8.5v7M20.2 10.5v3M6.5 12h11',
  habitos: 'M13 2.8c.4 3-1.2 4.4-2.6 5.8C8.8 10.2 7 11.7 7 14.4a5 5 0 0 0 10 0c0-2.3-1.2-3.7-2-4.7-.3 1.2-1.1 1.9-1.8 2.1.6-3-1.5-5.3-.2-9Z',
  progreso: 'M4 20h16M7 20v-5.5M12 20V8.5M17 20v-9',
};

export function SectionIcon({ section, size = '21px' }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, flex: 'none' }} strokeWidth="1.9" {...stroke}>
      <path d={SECTION_PATHS[section]} />
    </svg>
  );
}
