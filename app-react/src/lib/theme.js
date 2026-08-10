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
