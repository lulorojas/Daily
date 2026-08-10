import { useCallback, useRef, useState } from 'react';
import { hasErrors } from '../lib/validation';

/* ----------------------------- HOOK: formulario -----------------------------
   Los tres formularios de sesión (login, registro, recuperar) hacen lo mismo: guardar lo
   tipeado, validarlo al enviar, marcar los campos con problema y llevar el foco al primero.
   Eso es este hook.

   `register('email')` devuelve las props que el <AuthField> necesita. Es el mismo patrón
   que usa react-hook-form; lo hacemos a mano porque son tres campos y no vale la pena una
   dependencia más, pero conocer el patrón sirve para cuando sí la uses.

   Detalle de compatibilidad: los valores se recortan con trim() antes de validar Y antes
   de mandarlos a Firebase, igual que hacía av() en vanilla. Si alguien creó su cuenta en la
   app actual con un espacio de más en la contraseña, tiene que poder entrar igual acá. */
export function useAuthForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  // Los <input> del DOM, para poder mover el foco. Es el caso de uso legítimo de un ref:
  // hacerle algo imperativo a un nodo real que React ya dibujó.
  const inputs = useRef({});

  const setField = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Al corregir un campo marcado, su aviso desaparece.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const register = useCallback((name) => ({
    value: values[name] ?? '',
    error: errors[name] || null,
    onChange: (e) => setField(name, e.target.value),
    inputRef: (el) => { inputs.current[name] = el; },
  }), [values, errors, setField]);

  /* Valida y devuelve los valores limpios si está todo bien, o null si falta algo.
     Que devuelva null (en vez de true/false) obliga a usar los valores ya recortados. */
  const validateAll = useCallback(() => {
    const trimmed = {};
    for (const key of Object.keys(values)) trimmed[key] = String(values[key] ?? '').trim();

    const found = validate(trimmed);
    setErrors(found);

    if (hasErrors(found)) {
      // Al primer campo con problema, foco y a la vista. Mismo comportamiento que vanilla.
      const first = Object.keys(values).find((k) => found[k]);
      const el = inputs.current[first];
      if (el) {
        if (el.focus) el.focus();
        if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
      }
      return null;
    }
    return trimmed;
  }, [values, validate]);

  return { values, errors, register, validateAll };
}
