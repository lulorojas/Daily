/* ----------------------------- TARJETA CON LISTA -----------------------------
   El contenedor que repite el rediseño Nocturne en Hoy (Tareas, Hábitos), Hábitos (Mis
   hábitos) y Gimnasio: una tarjeta con título de 16px a la izquierda, un contador de color
   a la derecha, y abajo las filas separadas por una línea finita. Antes cada fila era su
   propia tarjeta de vidrio flotando sola; ahora van todas dentro de una.

   `accent` tiñe el contador (el color de la sección o del dato, ver HoyPage). `footer` es
   lo que va debajo de la última fila (el botón punteado "+ Nuevo hábito", por ejemplo). */
export function ListCard({ title, count, accent, className = '', children, footer }) {
  return (
    <section className={`card listcard ${className}`}>
      <div className="listcard-head">
        <h2 className="listcard-title">{title}</h2>
        {count != null && <span className="listcard-count" style={accent ? { color: accent } : undefined}>{count}</span>}
      </div>
      <div className="listcard-body">{children}</div>
      {footer}
    </section>
  );
}
