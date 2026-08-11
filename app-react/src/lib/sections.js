import { C } from './theme';

/* ----------------------------- LAS CINCO SECCIONES -----------------------------
   En la app vanilla esto vivía repartido: `ui.tab` guardaba cuál estaba abierta, SECT
   tenía el color de cada una y navbar() tenía la lista con sus etiquetas. Acá es una sola
   tabla, y de ella salen tres cosas que antes se escribían por separado:

     - la barra de abajo (recorre SECTIONS y dibuja un ítem por cada una),
     - el acento de la pantalla (el color tiñe la nav, el botón + y el glow de arriba),
     - qué componente se dibuja en cada URL (routes/AppRoutes.jsx).

   `path` reemplaza a `ui.tab`: la sección abierta ya no es una variable que hay que
   acordarse de actualizar, es la URL. Eso trae el botón Atrás y poder compartir /calendario.

   Hoy vive en '/' y no en '/hoy' a propósito: es la pantalla de arranque, y así abrir la
   app sin ninguna ruta cae donde tiene que caer sin un redirect de por medio. */
/* `label` es lo que se ve en la barra, abreviado para que entre; `title` es el nombre
   completo, que va como aria-label del link (un lector de pantalla dice "Calendario", no
   "Cal") y como título de la pantalla en las que todavía no existen. */
export const SECTIONS = [
  { key: 'hoy',        path: '/',           label: 'Hoy',      title: 'Hoy',        accent: C.amber, ready: true },
  { key: 'calendario', path: '/calendario', label: 'Cal',      title: 'Calendario', accent: C.coral, ready: true },
  { key: 'gym',        path: '/gym',        label: 'Gym',      title: 'Gimnasio',   accent: C.rose,  ready: false },
  { key: 'habitos',    path: '/habitos',    label: 'Hábitos',  title: 'Hábitos',    accent: C.green, ready: false },
  { key: 'progreso',   path: '/progreso',   label: 'Progreso', title: 'Progreso',   accent: C.teal,  ready: false },
];

/* Qué sección corresponde a una URL. Las pantallas de sesión no son ninguna y devuelven
   null; quien pregunta decide qué hacer con eso.

   Ajustes cuenta como Hoy: no es una sección propia, es una sub-pantalla a la que se llega
   por el engranaje, así que la barra sigue mostrando "Hoy" marcado y el acento sigue
   siendo el ámbar. Es la misma decisión que en vanilla, donde Ajustes era `ui.hoySub` y
   no un `ui.tab`. */
export function sectionForPath(pathname) {
  if (pathname === '/' || pathname.startsWith('/ajustes')) return SECTIONS[0];
  return SECTIONS.find((s) => s.key !== 'hoy' && pathname.startsWith(s.path)) || null;
}

// El acento que le toca a una URL. Fuera de las secciones manda el ámbar, igual que en
// vanilla (`SECT[ui.tab] || C.amber`), que es el color de las pantallas de sesión.
export function accentForPath(pathname) {
  const section = sectionForPath(pathname);
  return section ? section.accent : C.amber;
}
