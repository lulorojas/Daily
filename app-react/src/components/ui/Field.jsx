import { FieldErrorIcon } from './Icons';

/* ----------------------------- UN CAMPO DE FORMULARIO -----------------------------
   La cáscara que comparten todos los campos: la etiqueta arriba, el control en el medio y
   el aviso de error abajo. Mismas clases que la app vanilla (.fld, .flabel, .opt, .ferr).

   El control entra por `children` en vez de estar acá adentro, y esa es toda la gracia:
   el mismo componente sirve para un <input>, para un <textarea>, para los chips del
   "Cuándo" y para el selector de hora, que no son campos de HTML sino cosas dibujadas
   a mano. En vanilla cada formulario repetía el <div class="fld"><div class="flabel">…
   a mano y había que confiar en no equivocarse.

   `htmlFor` es opcional: si el control es un campo de verdad, la etiqueta es un <label> y
   tocarla lo enfoca; si es un control dibujado (los chips), no hay a quién apuntar y sale
   como <div>, que es lo que hacía vanilla siempre. Un <label for="algo-que-no-existe"> es
   peor que no tener label. */
export function Field({ label, hint, error, htmlFor, errorId, children }) {
  const Label = htmlFor ? 'label' : 'div';

  return (
    <div className="fld">
      <Label className="flabel" htmlFor={htmlFor}>
        {label}
        {/* El espacio va FUERA del span a propósito: .flabel y .opt tienen distinto
            letter-spacing, así que de qué lado del span caiga corre el texto un pelo. */}
        {hint && <>{' '}<span className="opt">· {hint}</span></>}
      </Label>
      {children}
      {error && (
        <div className="ferr" id={errorId}>
          <FieldErrorIcon />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
