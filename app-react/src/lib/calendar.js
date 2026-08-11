import { dow, iso } from './dates';

/* ----------------------------- GRILLA DEL MES -----------------------------
   La cuenta que hacía viewCalendario() al principio, sacada a una función pura para poder
   probarla sin dibujar nada: cuántos huecos van antes del día 1 y qué fecha real le
   corresponde a cada casillero.

   `lead` son los casilleros vacíos del principio. La semana arranca en lunes (dow() ya
   devuelve 0=lunes), así que un mes que empieza un miércoles lleva dos huecos.

   `new Date(y, m+1, 0)` es el truco de siempre para saber cuántos días tiene un mes: el
   día 0 del mes siguiente es el último del actual, y JavaScript acomoda solo los años
   bisiestos y los cambios de año. */
export function monthCells(y, m) {
  const lead = dow(new Date(y, m, 1));
  const total = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push({ day: d, dISO: iso(new Date(y, m, d)) });
  return cells;
}

/* Correr el mes que se está mirando. Devuelve un objeto nuevo, no muta el que recibe:
   es estado de React y allá los objetos no se tocan en el lugar. */
export function shiftMonth({ y, m }, delta) {
  let month = m + delta;
  let year = y;
  if (month < 0) { month = 11; year -= 1; }
  if (month > 11) { month = 0; year += 1; }
  return { y: year, m: month };
}

// El mes al que pertenece una fecha, para pararse ahí al abrir el calendario.
export function monthOf(dISO) {
  const [y, m] = dISO.split('-').map(Number);
  return { y, m: m - 1 };
}
