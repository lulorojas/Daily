/* ----------------------------- TEXTOS DE HÁBITOS -----------------------------
   Port del rótulo que arma viewHabitos() antes de dibujar. Mismo criterio que
   lib/items.js: sacar a función pura lo que es puro texto, para poder probarlo sin
   montar nada y compararlo contra la app vanilla. */
export function habitsSubtitle({ total, isToday, marks, possible, day }) {
  if (!total) return 'Nada que marcar todavía';
  return isToday ? `${marks} de ${possible} marcados hoy` : `Día ${day} · ${marks} de ${possible}`;
}

// El texto de "hoy / a futuro / retroactivo" que acompaña "Mis hábitos" en el rótulo.
export function habitsWhen(isToday, isFuture) {
  return isToday ? 'hoy' : (isFuture ? 'a futuro' : 'retroactivo');
}
