import { MONTHS, addDays, mondayOf, parseISO, todayD } from './dates';

/* ----------------------------- TEXTOS DE GIMNASIO -----------------------------
   Lo que en viewGym() eran un par de líneas sueltas para armar el rótulo de la semana,
   sacado a función pura por la misma razón que dayKicker()/dayTitle() en lib/items.js:
   se puede probar sin dibujar nada, y src/compat/ la compara contra la app vanilla. */

// "Esta semana" si el offset es 0; si no, el rango con los meses abreviados en minúscula.
export function weekRangeLabel(offset) {
  if (offset === 0) return 'Esta semana';
  const mon = addDays(mondayOf(todayD()), offset * 7);
  const end = addDays(mon, 6);
  const mesAbrev = (d) => MONTHS[d.getMonth()].slice(0, 3).toLowerCase();
  return `${mon.getDate()} ${mesAbrev(mon)} – ${end.getDate()} ${mesAbrev(end)}`;
}

// La bajada de la cabecera: "3 de 5 entrenamientos esta semana" o "· 1 ago – 7 ago".
export function gymSubtitle(offset, done, total) {
  const cuando = offset === 0 ? 'esta semana' : `· ${weekRangeLabel(offset)}`;
  return `${done} de ${total} entrenamientos ${cuando}`;
}

/* El offset de semana al que pertenece un día. Es la cuenta que hacía el case
   'gym-plan-open' del switch de app.js, para que tocar el entreno de Hoy abra Gimnasio
   parado en la semana correcta. 6048e5 son los milisegundos de una semana
   (7 · 24 · 60 · 60 · 1000), tal cual estaba escrito en la app vanilla. */
export function weekOffsetForDay(dISO) {
  return Math.round((mondayOf(parseISO(dISO)) - mondayOf(todayD())) / 6048e5);
}
