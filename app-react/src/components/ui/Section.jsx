/* Un bloque de la pantalla: el rótulo chico en mayúsculas y lo que va abajo.
   Es el `<div class="sect"><div class="sectlabel">…` que en la app vanilla se repetía a
   mano en cada sección de cada vista, con el riesgo de que a una se le escapara una clase.

   `note` es la aclaración gris PEGADA al título con un "· " (Hoy: "Tareas · 1/3").
   `action` es algo en la punta derecha de la fila, empujado con space-between (el lápiz de
   "administrar registros", el conteo de ejercicios, la navegación de semana).
   `inlineNote` es un texto suelto al lado del título, SIN "·" y sin ir a la punta derecha
   (Progreso: "Rachas de entrenamiento" + "estado actual") — parecido a `note` pero sin el
   separador y a `action` pero sin empujarlo al otro extremo. Son tres variantes del mismo
   renglón porque la app vanilla las mezclaba a mano cada vez, sin ningún patrón único.

   Importante: cuando hay `action` o `inlineNote`, vanilla NUNCA le pone la clase
   "sectlabel" a la fila entera — se la pone solo al span del título, y el resto de la fila
   (el conteo, el ícono) queda afuera de ese span, como hermano. Si "sectlabel" quedara en el
   contenedor entero, el conteo heredaría el mayúsculas/letter-spacing del título y se vería
   distinto ("3 EJERCICIOS" en vez de "3 ejercicios"). Por eso acá también el título vive en
   su propio <span class="sectlabel"> adentro de una fila sin esa clase. */
export function Section({ label, note, action, inlineNote, children }) {
  const titulo = <>{label}{note && <>{' '}<span className="muted">· {note}</span></>}</>;

  /* `action !== undefined` (no "if (action)") a propósito: en Peso corporal y en el
     ranking de Progreso, vanilla envuelve el título en la MISMA fila con flex exista o
     no el lápiz/conteo — lo que cambia es si ese costado derecho tiene algo adentro o
     queda vacío, no si la fila existe. Un caller que hace `action={cond && <X/>}` pasa
     `false` cuando cond no se cumple, y esa fila tiene que seguir siendo de dos costados
     (si no, el título pierde el margen del span interno y se corre 2px a la izquierda). */
  if (action !== undefined) {
    return (
      <div className="sect">
        <div className="sectrow-baseline">
          <span className="sectlabel">{titulo}</span>
          {action}
        </div>
        {children}
      </div>
    );
  }

  if (inlineNote) {
    return (
      <div className="sect">
        <div className="sectrow-baseline-inline">
          <span className="sectlabel">{titulo}</span>
          <span className="sectlabel-note">{inlineNote}</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="sect">
      <div className="sectlabel">{titulo}</div>
      {children}
    </div>
  );
}

/* La tarjeta de "acá no hay nada". Vanilla la escribía cada vez como <div class="card"
   style="padding:...">, con CUATRO paddings distintos según la sección (nunca el mismo
   padding dos veces por casualidad, así que los cuatro pasaron a clases en vez de
   adivinar uno solo):
     (default) 20px 16px  — Hoy: agenda y hábitos vacíos.
     sm        18px 16px  — Hoy: "nada suelto"; Gimnasio: peso corporal; Rutinas: un
                             día o un ejercicio sin nada adentro.
     lg        26px 18px  — Rutinas: la biblioteca vacía; Hábitos: la lista vacía.
     tight     16px       — Progreso: los nueve/trece estados vacíos de progEmpty(),
                             siempre este mismo padding ahí, sin excepciones. */
export function EmptyCard({ size, children }) {
  return (
    <div className={`card emptycard${size ? ` ${size}` : ''}`}>
      <div className="empty">{children}</div>
    </div>
  );
}
