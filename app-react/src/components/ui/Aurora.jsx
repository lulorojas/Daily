import { tint } from '../../lib/theme';

/* ----------------------------- FONDO -----------------------------
   Rediseño Nocturne: el fondo es el gris-azulado plano de la app (#161826) con dos
   capas encima, las mismas que dibuja el diseño detrás de cada pantalla:

     - un resplandor radial del color de la sección, arriba, que se corre despacio
       (dcDrift) — antes eran las manchas y las estrellas de "Glass + aurora";
     - una grilla finita de 28px que se desvanece hacia abajo (máscara) — da textura
       sin competir con las tarjetas.

   Un único <Aurora/> en App.jsx, detrás de TODA la app, `position:fixed` para que no se
   mueva con el scroll de cada pantalla. Se llama Aurora por herencia (las clases y el
   componente ya estaban cableados); lo que dibuja es otra cosa. */
export function Aurora({ accent }) {
  return (
    <div className="aurora" aria-hidden="true">
      <div
        className="aurora-glow"
        style={{ background: `radial-gradient(50% 50% at 50% 50%, ${tint(accent, '38')}, transparent 70%)` }}
      />
      <div className="aurora-grid" />
    </div>
  );
}
