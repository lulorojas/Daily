/* Generador de IDs, copiado carácter por carácter de app/js/utils.js.

   Timestamp en base 36 + 4 caracteres al azar. No es un UUID y no hace falta que lo sea:
   los IDs solo tienen que ser únicos dentro del documento de UNA persona.

   Se replica igual y no se "mejora" a UUID por una razón concreta: los IDs conviven en el
   mismo documento con los que ya generó la app vanilla. Cambiar el formato no rompería
   nada hoy, pero sí haría que los datos dejaran de ser homogéneos, y la regla de esta
   etapa es no tocar el modelo. */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
