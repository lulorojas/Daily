/* Los mismos SVG que dibujaba la app vanilla, ahora como componentes.
   Ventaja de tenerlos acá: se escriben una vez, se usan por nombre (<MailIcon />) y si hay
   que corregir un trazo se corrige en un solo lugar. `currentColor` hace que cada ícono
   tome el color del texto que lo rodea, así se tiñen solos con el acento de la pantalla. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function ChevronLeftIcon() {
  return (
    <svg width="8" height="13" viewBox="0 0 12 20" strokeWidth="2.6" {...stroke}>
      <path d="M10 2L2 10l8 8" />
    </svg>
  );
}

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
