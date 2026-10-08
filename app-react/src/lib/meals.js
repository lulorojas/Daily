/* ----------------------------- COMIDAS -----------------------------
   Sin equivalente en vanilla ni en etapas anteriores: un plan de comidas editable
   (franjas con varias opciones cada una) más una bitácora diaria de texto libre, con un
   "bot" que reconoce automáticamente qué escribiste — SIN ninguna IA real, pedido
   explícito: "un bot que entrenemos para que sepa qué anotar y qué registrar, no
   necesito respuestas ni cosas así". Lo que hay es coincidencia de texto simple
   (substring, normalizado) contra las opciones del plan vigente y contra el catálogo de
   extras (café, alcohol, permitidos… lo que el usuario arme) — nada de lenguaje natural
   de verdad, y a propósito: no hace falta más para "me va a llevar el registro".

   state.meals = {
     plan:   [ { id, name, options:[ { id, text } ] } ],   // franjas, en el orden del usuario
     extras: [ { id, name, color, icon } ],                 // catálogo libre, shape como habits
     log:    { 'YYYY-MM-DD': [ { id, at, text, matches:{ options:[{slotId,optionId}], extras:[id] } } ] },
   }

   Igual que fcmTokens, `meals` NO tiene default en normalize() (ver lib/model.js): una
   cuenta que nunca abrió Comidas no gana un campo de más en su documento. Por eso todo
   lector de acá para abajo usa `state.meals?.algo ?? default`, nunca `state.meals.algo`
   a secas. */
import { addDays, iso, parseISO, todayD } from './dates';

// Para comparar: minúsculas, sin tildes, espacios colapsados. No hay stemming de
// plurales/género a propósito (ver el comentario de arriba) — "galletitas" no matchea
// "galletita", es una limitación conocida y aceptada, no un bug.
export function normalizeText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* El "bot": busca, dentro del texto que el usuario escribió, cualquier opción del plan o
   cualquier extra cuyo nombre aparezca como substring. Puede matchear varios de cada uno
   a la vez (“café con un permitido” matchea el extra Café Y el extra Permitidos). Si no
   matchea nada, la entrada se guarda igual — solo que no suma a ninguna frecuencia. */
export function matchEntry(state, text) {
  const norm = normalizeText(text);
  const options = [];
  (state.meals?.plan ?? []).forEach((slot) => {
    slot.options.forEach((opt) => {
      if (norm.includes(normalizeText(opt.text))) options.push({ slotId: slot.id, optionId: opt.id });
    });
  });
  const extras = (state.meals?.extras ?? [])
    .filter((ex) => norm.includes(normalizeText(ex.name)))
    .map((ex) => ex.id);
  return { options, extras };
}

/* ------------------------------ FRECUENCIA DE EXTRAS ------------------------------
   Calco directo de habitMarks/habitDone/habitStreak (lib/habits.js), cambiando "marca"
   por "matcheó al menos una vez ese día": un extra no tiene timesPerDay, no hay noción de
   "incompleto" — o apareció ese día, o no. */

// Todas las fechas (con repetición, una por entrada) en que matcheó este extra.
export function extraMatchDates(state, extraId) {
  const out = [];
  Object.keys(state.meals?.log ?? {}).forEach((d) => {
    state.meals.log[d].forEach((e) => { if (e.matches.extras.includes(extraId)) out.push(d); });
  });
  return out;
}

// ¿Matcheó este extra al menos una vez ese día?
export function extraLoggedOn(state, extraId, dISO) {
  return (state.meals?.log?.[dISO] ?? []).some((e) => e.matches.extras.includes(extraId));
}

/* Racha de días consecutivos, contando hacia atrás — mismo criterio que habitStreak(): si
   hoy todavía no matcheó, se empieza a contar desde ayer (no se "pierde" la racha a media
   mañana). */
export function extraStreak(state, extraId, refISO) {
  let cur = refISO ? parseISO(refISO) : todayD();
  if (!extraLoggedOn(state, extraId, iso(cur))) cur = addDays(cur, -1);
  let n = 0;
  while (extraLoggedOn(state, extraId, iso(cur))) { n++; cur = addDays(cur, -1); }
  return n;
}

// Cuántas veces matcheó en un período (startISO null = todo el historial).
export function extraCount(state, extraId, startISO) {
  return extraMatchDates(state, extraId).filter((d) => !startISO || d >= startISO).length;
}
