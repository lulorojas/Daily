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
     plans:  [ { id, startISO, endISO: string|null, slots:[ { id, name, options:[{id,text}] } ] } ],
     extras: [ { id, name, color, icon, quality?: 'bueno'|'malo' } ],  // catálogo libre, shape como habits
     log:    { 'YYYY-MM-DD': [ { id, at, text, matches:{ options:[{slotId,optionId}], extras:[id] } } ] },
   }

   Igual que fcmTokens, `meals` NO tiene default en normalize() (ver lib/model.js): una
   cuenta que nunca abrió Comidas no gana un campo de más en su documento. Por eso todo
   lector de acá para abajo usa `state.meals?.algo ?? default`, nunca `state.meals.algo`
   a secas.

   Historial de planes (pedido explícito, segunda vuelta: "el nutricionista actualiza el
   plan de tanto en tanto, quiero guardar el historial"): `meals.plans` es un array de
   versiones, cada una con sus propias franjas/opciones — la ACTIVA es la que tiene
   `endISO: null` (ver activePlan() más abajo). Cambiar de versión es una acción explícita
   del usuario ("nuevo plan", startNewMealPlan() en store/mutations.js), nunca automática:
   editar una opción del plan actual NO crea una versión nueva. Las entradas de la
   bitácora ya escritas guardan su `matches` congelado (ver addMealLogEntry en
   mutations.js), así que archivar un plan no les cambia nada retroactivamente. */
import { addDays, iso, parseISO, todayD, todayISO } from './dates';
import { C, PALETTE } from './theme';
import { comoVenisColumns, regularidadPorRatio, UNIT_ABBR } from './progress';

// La versión vigente del plan (la única con endISO:null), o null si todavía no hay
// ninguna. Todo lector de "qué tengo que comer" pasa por acá — nunca por meals.plans
// directo — para no tener que repetir el find() en cada lugar.
export function activePlan(state) {
  return (state.meals?.plans ?? []).find((p) => !p.endISO) ?? null;
}

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
  (activePlan(state)?.slots ?? []).forEach((slot) => {
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

/* ============================================================================
   "CÓMO COMÉS" (pedido explícito: "quiero que a nivel seguimiento daily entienda si estoy
   comiendo bien o mal"). Calco de comoVenis() (lib/progress.js) para franjas en vez de
   músculos — reusa comoVenisColumns() y regularidadPorRatio() de ese mismo archivo para
   que la ventana y los baldes de regularidad sean EXACTAMENTE los mismos que "Cómo venís"
   ("todos los gráficos deben tomar la misma medida de tiempo").

   Una franja cuenta un día si ALGUNA entrada de ese día matcheó una de sus opciones — sin
   importar en qué franja la escribiste (pedido explícito: comer fruta en la merienda en
   vez del desayuno igual suma, porque lo que cuenta es el slotId que matcheó el bot, no en
   qué franja de la bitácora quedó anotada la entrada). */
export function comoComes(state, per) {
  const slots = activePlan(state)?.slots ?? [];
  const { cols, current, unit, unitPl, winLabel } = comoVenisColumns(per);
  const unitAbbr = UNIT_ABBR[unit] || unit;
  const tISO = todayISO();
  const desde = cols[0].from, hasta = cols[cols.length - 1].to;

  // Por franja, el conjunto de fechas (sin repetir) donde algo matcheó una de sus
  // opciones — un recorrido del log entero, una sola vez, en vez de uno por franja.
  const matchedBySlot = {};
  Object.keys(state.meals?.log ?? {}).forEach((d) => {
    (state.meals.log[d] ?? []).forEach((e) => {
      e.matches.options.forEach(({ slotId }) => { (matchedBySlot[slotId] ||= new Set()).add(d); });
    });
  });

  const rows = slots.map((slot, i) => {
    const dates = matchedBySlot[slot.id] ?? new Set();
    const cells = cols.map((c, idx) => {
      const futuro = per === 'semana' && c.from > tISO;
      if (futuro) return { v: 0, futuro: true, current: idx === current };
      let v = 0;
      dates.forEach((d) => { if (d >= c.from && d <= c.to) v++; });
      return { v, futuro: false, current: idx === current };
    });
    const total = cells.reduce((a, c) => a + (c.futuro ? 0 : c.v), 0);
    const vigentes = cells.filter((c) => !c.futuro);
    const activas = vigentes.filter((c) => c.v > 0).length;
    const status = activas === 0
      ? { label: 'SIN REGISTRAR', color: C.danger }
      : regularidadPorRatio(activas, vigentes.length);
    // Sin color propio en el modelo (una franja no es un tipo de gym) — se asigna por
    // orden, cíclico, mismo criterio que nextExtraColor() en store/mutations.js.
    return { name: slot.name, id: slot.id, color: PALETTE[i % PALETTE.length], cells, total, status };
  });

  const entradasEnVentana = Object.keys(state.meals?.log ?? {})
    .filter((d) => d >= desde && d <= hasta)
    .reduce((a, d) => a + state.meals.log[d].length, 0);
  const diasConRegistro = Object.keys(state.meals?.log ?? {})
    .filter((d) => d >= desde && d <= hasta && state.meals.log[d].length > 0).length;
  const stats = [
    { k: 'FRANJAS OK', v: `${rows.filter((r) => r.total > 0).length}/${rows.length || 0}` },
    { k: 'DÍAS CON REGISTRO', v: String(diasConRegistro) },
    { k: 'ENTRADAS', v: String(entradasEnVentana) },
  ];

  /* Avisos de "calidad" (pedido explícito — ver store/mutations.js, campo `quality` en
     extras): un extra 'malo' (ej. Alcohol) no es una franja, así que no entra a la matriz
     de arriba, pero sí a un aviso aparte: racha en verde si no apareció en la ventana,
     alerta en rojo si apareció. Un extra 'bueno' (ej. "Comida libre") suma un aviso
     informativo en vez de quedar invisible — "fuera del plan, pero está bien". */
  const alerts = [];
  (state.meals?.extras ?? []).forEach((ex) => {
    if (ex.quality !== 'malo' && ex.quality !== 'bueno') return;
    const n = extraMatchDates(state, ex.id).filter((d) => d >= desde && d <= hasta).length;
    if (ex.quality === 'malo') {
      alerts.push(n === 0
        ? { icon: '✓', text: `Evitaste ${ex.name.toLowerCase()} en este período`, color: C.green }
        : { icon: '!', text: `${ex.name}: ${n} ${n === 1 ? 'vez' : 'veces'} en este período`, color: C.danger });
    } else if (n > 0) {
      alerts.push({ icon: '↑', text: `${ex.name}: ${n} ${n === 1 ? 'vez' : 'veces'}, fuera del plan pero está bien`, color: C.teal });
    }
  });

  return { winLabel, unit, unitAbbr, unitPl, cols, current, rows, stats, alerts };
}
