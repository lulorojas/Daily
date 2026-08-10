/* ----------------------------- VALIDACIÓN DE FORMULARIOS -----------------------------
   Funciones puras: entra lo que la persona tipeó, sale un objeto de errores por campo.
   No tocan el DOM ni saben que existe React, así que se testean solas y sin montar nada.

   En la app vanilla esto lo hacía validateForm(), que además marcaba los campos y movía
   el foco. Acá se separan las dos cosas: estas funciones deciden QUÉ está mal, y el
   componente decide CÓMO mostrarlo. Los mensajes son textualmente los mismos. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASS_MIN = 6; // el mínimo que exige Firebase

// Un objeto vacío significa "está todo bien".
export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

// El email es el mismo chequeo en las tres pantallas: vacío y con formato inválido
// dicen cosas distintas, igual que en vanilla.
function emailError(email) {
  if (!email) return 'Poné tu email.';
  if (!EMAIL_RE.test(email)) return 'Ese email no tiene un formato válido.';
  return null;
}

export function validateLogin({ email, password }) {
  const errors = {};
  const e = emailError(email);
  if (e) errors.email = e;
  if (!password) errors.password = 'Poné tu contraseña.';
  return errors;
}

export function validateRegister({ email, password, password2 }) {
  const errors = {};
  const e = emailError(email);
  if (e) errors.email = e;
  if (!password) errors.password = 'Poné una contraseña.';
  else if (password.length < PASS_MIN) errors.password = 'La contraseña tiene que tener al menos ' + PASS_MIN + ' caracteres.';
  if (!password2) errors.password2 = 'Repetí la contraseña.';
  else if (password !== password2) errors.password2 = 'Las dos contraseñas no coinciden.';
  return errors;
}

export function validateReset({ email }) {
  const errors = {};
  const e = emailError(email);
  if (e) errors.email = e;
  return errors;
}
