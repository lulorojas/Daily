import { useId } from 'react';
import { FieldErrorIcon } from '../ui/Icons';

/* Un campo del formulario: etiqueta + input + (si corresponde) el error abajo.
   Mismas clases que la app vanilla (.fld, .flabel, .inp, .bad, .ferr), así se ve idéntico.

   `useId()` genera un id único por instancia para atar el <label> al <input>: tocar la
   etiqueta enfoca el campo y los lectores de pantalla saben qué es cada cosa. En vanilla
   los ids eran fijos ('au-email'), lo que impedía tener dos formularios en pantalla. */
export function AuthField({
  label, type = 'text', placeholder, hint,
  value, onChange, error, inputRef,
  autoComplete,
}) {
  const id = useId();
  const errorId = `${id}-err`;

  return (
    <div className="fld">
      <label className="flabel" htmlFor={id}>
        {label}
        {/* El espacio va FUERA del span a propósito: .flabel y .opt tienen distinto
            letter-spacing, así que de qué lado del span caiga corre el texto un pelo. */}
        {hint && <>{' '}<span className="opt">· {hint}</span></>}
      </label>
      <input
        id={id}
        ref={inputRef}
        className={`inp${error ? ' bad' : ''}`}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        inputMode={type === 'email' ? 'email' : undefined}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <div className="ferr" id={errorId}>
          <FieldErrorIcon />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
