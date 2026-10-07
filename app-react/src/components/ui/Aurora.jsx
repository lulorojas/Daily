import { useMemo } from 'react';
import { auroraBlobs, STARS } from '../../lib/aurora';

/* ----------------------------- FONDO AURORA -----------------------------
   Nuevo en el rediseño "Glass + aurora" (sin precedente en vanilla ni en las etapas
   anteriores). Un único <Aurora/> montado en App.jsx, detrás de TODA la app — por eso es
   `position:fixed` en vez de vivir adentro de cada pantalla: así ninguna página tiene que
   acordarse de incluirlo, y las tarjetas de vidrio (backdrop-filter:blur) que flotan
   arriba lo ven igual sin importar cuánto scrolleaste.

   Las manchas de color cambian con el acento de cada sección (ver lib/aurora.js), el
   mismo que ya pintaba la nav y el glow de la cabecera — por eso solo necesita esa única
   prop. pointer-events:none en todo el árbol para que nunca robe un click. */
export function Aurora({ accent }) {
  const blobs = useMemo(() => auroraBlobs(accent), [accent]);

  return (
    <div className="aurora" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="aurora-blob"
          style={{
            width: b.size, height: b.size,
            top: b.top, bottom: b.bottom, left: b.left, right: b.right,
            background: b.color, opacity: b.opacity,
            animation: `${b.anim} ${b.dur} ease-in-out infinite`,
          }}
        />
      ))}
      {STARS.map((s, i) => (
        <div
          key={i}
          className="aurora-star"
          style={{
            left: s.x, top: s.y, width: s.s, height: s.s,
            animation: `twinkle ${s.dur} ease-in-out ${s.del} infinite`,
          }}
        />
      ))}
    </div>
  );
}
