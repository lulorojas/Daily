/* Mover un elemento una posición arriba o abajo, en el lugar. Lo usan las rutinas
   (ordenar rutinas, días y ejercicios). Devuelve false si el movimiento no es posible,
   para que quien llama sepa que no hay nada que guardar.
   Copia literal de moveInArray() en app/js/rutinas.js. */
export function moveInArray(arr, idx, dir) {
  const to = idx + dir;
  if (idx < 0 || to < 0 || to >= arr.length) return false;
  arr.splice(to, 0, arr.splice(idx, 1)[0]);
  return true;
}
