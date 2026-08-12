/* ----------------------------- NÚMEROS TIPEADOS A MANO -----------------------------
   Port del `raw.replace(',','.')` que hacía la app vanilla en cada campo de peso (kg del
   cuerpo, kg levantados). El teclado numérico del teléfono en español pone una coma como
   separador decimal; sin este cambio, "72,5" llega a Number() y da NaN.

   Devuelve null (no NaN) cuando no hay un número válido, para poder escribir
   `if (parsed === null)` en vez de `if (Number.isNaN(parsed))`, que es más fácil de leer
   mal si alguien lo copia rápido. */
export function parseDecimal(raw) {
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '') return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
