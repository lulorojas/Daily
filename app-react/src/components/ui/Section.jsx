/* Un bloque de la pantalla: el rótulo chico en mayúsculas y lo que va abajo.
   Es el `<div class="sect"><div class="sectlabel">…` que en la app vanilla se repetía a
   mano en cada sección de cada vista, con el riesgo de que a una se le escapara una clase.

   `note` es la aclaración gris al lado del título ("· 1/3", "· 3 pendientes"). */
export function Section({ label, note, children }) {
  return (
    <div className="sect">
      <div className="sectlabel">
        {label}{note && <>{' '}<span className="muted">· {note}</span></>}
      </div>
      {children}
    </div>
  );
}

/* La tarjeta de "acá no hay nada". Vanilla la escribía como <div class="card"
   style="padding:20px 16px">, con dos paddings distintos según la sección; los dos
   pasaron a clases. */
export function EmptyCard({ small = false, children }) {
  return (
    <div className={`card emptycard${small ? ' sm' : ''}`}>
      <div className="empty">{children}</div>
    </div>
  );
}
