/* Paleta, igual a la de la app vanilla (utils.js `C`). Los mismos hex están también
   como variables CSS en styles.css; esta copia en JS existe para los pocos lugares donde
   el color se calcula en tiempo de ejecución (el degradé de la marca de cada pantalla). */
export const C = {
  amber: '#EAC06A', coral: '#FFA877', rose: '#FF9B93',
  green: '#86D9A0', teal: '#6FD2D2', violet: '#B49BE8',
  danger: '#FF8A80',
  ink: '#E9E9ED', bg: '#161826', surf: '#232532', surf2: '#1A1C2A', surf3: '#232532',
};

// Mismo helper que en vanilla: color + alfa en hex ('#EAC06A' + '1F').
export function tint(color, alpha) {
  return color && color[0] === '#' ? color + alpha : 'rgba(255,255,255,0.07)';
}

/* Variante clara de cada acento, para los degradés "brillo" del rediseño "Glass + aurora"
   (pildora activa de la nav, botón +, avatar del día elegido en la tira semanal). No es un
   tinte con alfa (eso ya lo resuelve tint()): es el MISMO color, más claro, para que el
   degradé vaya de un brillo arriba a la izquierda hacia el acento real — el mismo truco en
   los cinco acentos, así que es una tabla fija, no una cuenta por color. */
const LIGHT = {
  [C.amber]: '#FFE3A8', [C.coral]: '#FFD3B8', [C.rose]: '#FFC2BC',
  [C.green]: '#BDF0CC', [C.teal]: '#B5EDED', [C.violet]: '#D9CCF7',
};
export function lightOf(accent) {
  return LIGHT[accent] || LIGHT[C.amber];
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

/* El botón punteado "+ Agregar…" teñido del acento de la sección (Gimnasio, Rutinas).
   Vanilla repetía esta misma fórmula de tres tintes —borde, fondo, texto— cada vez que
   dibujaba uno de estos botones: `style="border-color:${tint(col,'73')};background:
   ${tint(col,'12')};color:${col}"`. No puede vivir en una clase CSS porque el color no es
   una constante del módulo: es el acento de CADA pantalla (rosa en Gimnasio y en Rutinas,
   pero el de cada rutina cambia según RUT_COVERS). Así que en vez de repetir la fórmula
   seis veces, queda acá una sola vez y cada botón la usa con su color. */
export function accentedDashedStyle(color) {
  return { borderColor: tint(color, '73'), background: tint(color, '12'), color };
}
