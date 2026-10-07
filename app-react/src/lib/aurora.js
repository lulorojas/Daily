import { C } from './theme';

/* ----------------------------- FONDO AURORA -----------------------------
   Rediseño "Glass + aurora": cada sección tiene su propia combinación de 3-4 manchas de
   color difuminadas (coinciden con las de los prototipos .dc.html del handoff), elegida
   por el MISMO acento que ya calculaba App.jsx vía accentForPath(). Así ningún componente
   de pantalla tiene que saber de colores de aurora: alcanza con pasarle el acento que ya
   existía, igual que hace WeekStrip con var(--accent).

   Las posiciones son px fijos (ancladas a los bordes), igual que en los prototipos: están
   pensadas para el ancho de un teléfono y en pantallas anchas simplemente quedan mas
   separadas entre sí, sin romper nada. */
const PRESETS = {
  [C.amber]: [
    { color: C.amber, size: 340, top: -80, left: -90, opacity: 0.25, anim: 'aurora1', dur: '11s' },
    { color: C.violet, size: 300, top: 120, right: -120, opacity: 0.2, anim: 'aurora2', dur: '13s' },
    { color: C.teal, size: 280, top: 480, left: -60, opacity: 0.13, anim: 'aurora2', dur: '15s' },
    { color: C.coral, size: 260, bottom: -60, right: -80, opacity: 0.17, anim: 'aurora1', dur: '12s' },
  ],
  [C.coral]: [
    { color: C.coral, size: 340, top: -90, left: -90, opacity: 0.25, anim: 'aurora1', dur: '11s' },
    { color: C.violet, size: 300, top: 160, right: -130, opacity: 0.2, anim: 'aurora2', dur: '13s' },
    { color: C.amber, size: 280, bottom: 40, left: -80, opacity: 0.14, anim: 'aurora2', dur: '15s' },
  ],
  [C.rose]: [
    { color: C.rose, size: 340, top: -90, left: -90, opacity: 0.22, anim: 'aurora1', dur: '11s' },
    { color: C.violet, size: 300, top: 260, right: -130, opacity: 0.16, anim: 'aurora2', dur: '13s' },
    { color: C.amber, size: 280, bottom: 60, left: -80, opacity: 0.12, anim: 'aurora2', dur: '15s' },
  ],
  [C.green]: [
    { color: C.green, size: 340, top: -90, left: -90, opacity: 0.23, anim: 'aurora1', dur: '11s' },
    { color: C.teal, size: 300, top: 180, right: -130, opacity: 0.18, anim: 'aurora2', dur: '13s' },
    { color: C.violet, size: 280, bottom: 40, left: -80, opacity: 0.14, anim: 'aurora2', dur: '15s' },
  ],
  [C.teal]: [
    { color: C.teal, size: 340, top: -90, left: -90, opacity: 0.22, anim: 'aurora1', dur: '11s' },
    { color: C.violet, size: 300, top: 260, right: -130, opacity: 0.18, anim: 'aurora2', dur: '13s' },
    { color: C.green, size: 280, bottom: 40, left: -80, opacity: 0.12, anim: 'aurora2', dur: '15s' },
  ],
};

export function auroraBlobs(accent) {
  return PRESETS[accent] || PRESETS[C.amber];
}

/* Estrellas: mismo truco que el prototipo (un hash seno determinístico en vez de
   Math.random) para que no "salten" de posición en cada render — con 40 posiciones fijas,
   calculadas una sola vez al cargar el módulo. */
export const STARS = Array.from({ length: 36 }, (_, i) => {
  const r = (n) => {
    const x = Math.sin(i * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };
  return {
    x: `${(r(1) * 100).toFixed(1)}%`,
    y: `${(r(2) * 100).toFixed(1)}%`,
    s: `${(1 + r(3) * 1.8).toFixed(1)}px`,
    dur: `${(2 + r(4) * 4).toFixed(1)}s`,
    del: `${(r(5) * 4).toFixed(1)}s`,
  };
});
