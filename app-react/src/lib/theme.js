/* Paleta, igual a la de la app vanilla (utils.js `C`). Los mismos hex están también
   como variables CSS en styles.css; esta copia en JS existe para los pocos lugares donde
   el color se calcula en tiempo de ejecución (el degradé de la marca de cada pantalla). */
export const C = {
  amber: '#EAC06A', coral: '#FFA877', rose: '#FF9B93',
  green: '#86D9A0', teal: '#6FD2D2', violet: '#B49BE8',
  danger: '#FF8A80',
  ink: '#F2F4F8', bg: '#0B0E14', surf: '#13161D', surf2: '#12151C', surf3: '#161A22',
};

// Mismo helper que en vanilla: color + alfa en hex ('#EAC06A' + '1F').
export function tint(color, alpha) {
  return color && color[0] === '#' ? color + alpha : 'rgba(255,255,255,0.07)';
}

// Acento de cada sección.
export const SECT = { hoy: C.amber, calendario: C.coral, gym: C.rose, habitos: C.green, progreso: C.teal };

/* La paleta que se le ofrece al usuario para hábitos, tipos de entreno y ejercicios.
   NO es solo estética: el color elegido se GUARDA en el documento, y el color por defecto
   de algo nuevo sale de acá por posición (PALETTE[cantidad % PALETTE.length]).
   Cambiar el orden cambiaría qué color recibe el próximo hábito que alguien cree. */
export const PALETTE = [C.green, C.teal, C.violet, C.coral, C.amber, C.rose];

// Colores de portada de las rutinas, por posición en la lista (no se guardan).
export const RUT_COVERS = [C.rose, C.amber, C.teal, C.coral, C.violet, C.green];
