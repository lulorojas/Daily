import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from './Icons';

/* La píldora "‹ Volver a…" de arriba de una pantalla anidada. Ya se usaba en Ajustes
   (con un solo lugar al que volver, Hoy) y en la app vanilla existía como backPill() en
   rutinas.js y backPillAjustes() en ajustes.js — dos funciones para el mismo dibujo. Acá
   es un componente y basta con uno: rutinas la usa tres veces, una por nivel. */
export function BackPill({ to, label }) {
  return (
    <Link className="rut-back" to={to}>
      <ChevronLeftIcon />
      <span>{label}</span>
    </Link>
  );
}
