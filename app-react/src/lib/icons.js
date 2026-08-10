/* Íconos de los hábitos. El dibujo (el path SVG) es cosa de la pantalla, pero la CLAVE
   ('agua', 'libro', …) se guarda en el documento, en habits[].icon. Por eso vive en lib/
   y se copia tal cual de app/js/utils.js: si acá faltara una clave, un hábito guardado
   con ese ícono se dibujaría mal (la app cae a 'estrella' cuando no encuentra la clave). */
export const ICONS = {
  agua:     'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
  libro:    'M3 4h8v16H5a2 2 0 0 1-2-2zm18 0h-8v16h6a2 2 0 0 0 2-2z',
  pesa:     'M3 9h2V7h2v10H5v-2H3zm18 0h-2V7h-2v10h2v-2h2zM7 11h10v2H7z',
  meditar:  'M5 19c0-8 6-14 14-14 0 8-6 14-14 14z',
  estrella: 'M12 3l2.5 5.6 6.1.6-4.6 4.1 1.4 6L12 16.9 6.1 19.9l1.4-6L2.9 9.8l6.1-.6z',
  llama:    'M12 3c.6 3.2 3 4.4 3 7.6a3 3 0 0 1-6 0c0-1 .4-1.9 1-2.6-1.3.4-3.2 1.7-3.2 4.7a5.2 5.2 0 0 0 10.4 0C17.2 8.2 14.2 5.6 12 3z',
  corazon:  'M12 21s-7-4.5-9.5-9C1 8.5 2.5 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.5 0 5 3.5 3.5 7-2.5 4.5-9.5 9-9.5 9z',
};

export const ICON_KEYS = Object.keys(ICONS);

// El que recibe un hábito nuevo si no se elige otro.
export const DEFAULT_HABIT_ICON = 'estrella';
