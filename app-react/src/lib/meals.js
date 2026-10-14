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
     plans:  [ { id, startISO, endISO: string|null, guide?: [string], slots:[ { id, name, options:[
       { id, text, items?:[ { id, name, qty, unit?: 'u'|'gr', tipo?: 'carbo'|'proteina'|'grasa' } ] },
     ] } ] } ],
     extras: [ { id, name, color, icon, quality?: 'bueno'|'malo' } ],  // catálogo libre, shape como habits
     log:    { 'YYYY-MM-DD': [ { id, at, text, pesado?: boolean, libre?: { slotId, que }, matches:{
       options:[ { slotId, optionId, items?:[{itemId,qty}] } ],
       extras:[id],
     } } ] },
   }

   Opción medible (pedido explícito: "quiero que las opciones de cada comida y lo que yo
   comí importe... si ese día comí 2 tostadas y 3 huevos", y después "no solo cantidades,
   a veces pueden ser pesos"): toda opción tiene un nombre (`text`) y, opcionalmente, la
   lista de lo que lleva (`items`), cada ítem con su cantidad del plan en unidades (`u`,
   el default) o en gramos (`gr`). Cada ítem puede además marcarse con un `tipo` de macro
   (carbohidrato/proteína/grasa) — pedido explícito: "las mediciones podrian hacerse en
   carbohidratos y proteinas para tambien tener un registro de con que soy mas regular".

   `guide` (opcional) son las recomendaciones del nutricionista que acompañan a esa
   versión del plan ("pesar en cocido", porciones de proteína/hidrato…): se muestran en
   Comidas como guía, no se miden. `pesado` en una entrada es si Lulo pesó la comida en
   la balanza o la estimó a ojo (pedido explícito: "daily podría ponerle si pesé o no pesé
   la comida para especificarle los gramos"). `libre` marca una comida libre anotada en
   una franja ("unas galletas en el desayuno") — ver addMealLogLibre en store/mutations.js.

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

// Para construir el patrón de un ítem sin que sus caracteres especiales rompan la regex
// (el nombre lo escribe el usuario, no se puede asumir que sea texto "seguro").
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Cuánto de cada ítem de una opción medible aparece en el texto ya normalizado. Pedido
   explícito sobre cómo escribe Lulo: "número pegado al alimento" — "2 tostadas" cuenta 2,
   y con peso también "200gr de pollo" / "200 gramos de pollo" / "200g pollo" (la unidad y
   el "de" del medio son opcionales). El nombre del ítem SIN número adelante ("comí
   tostadas y huevos") se toma como "la cantidad entera del plan". Si el nombre no aparece,
   esa cantidad es 0. Devuelve un array del mismo largo que `items` (nunca se omite uno, así
   "2 de 3" se puede mostrar siempre), o `null` si NINGÚN ítem apareció. */
function matchItems(items, norm) {
  const out = items.map((item) => {
    const name = normalizeText(item.name);
    if (!name) return { itemId: item.id, qty: 0 };
    const conNumero = norm.match(new RegExp(`(\\d+)\\s*(?:gramos|grs|gr|g)?\\.?\\s*(?:de\\s+)?${escapeRegex(name)}`));
    if (conNumero) return { itemId: item.id, qty: parseInt(conNumero[1], 10) };
    if (norm.includes(name)) return { itemId: item.id, qty: item.qty };
    return { itemId: item.id, qty: 0 };
  });
  return out.some((x) => x.qty > 0) ? out : null;
}

// "Comí todo lo que dice el plan" para una opción medible: cada ítem con su cantidad.
function itemsCompletos(items) {
  return items.map((item) => ({ itemId: item.id, qty: item.qty }));
}

/* El "bot": busca, dentro del texto que el usuario escribió, cualquier opción del plan o
   cualquier extra cuyo nombre aparezca como substring. Puede matchear varios de cada uno
   a la vez (“café con un permitido” matchea el extra Café Y el extra Permitidos). Si no
   matchea nada, la entrada se guarda igual — solo que no suma a ninguna frecuencia.

   Una opción medible (con `items`) se reconoce por su nombre O por cualquiera de sus
   ítems; las cantidades salen de matchItems — y si se la nombró sin decir ningún ítem
   ("comí la tortita de banana"), cuenta como comida entera. */
export function matchEntry(state, text) {
  const norm = normalizeText(text);
  const options = [];
  (activePlan(state)?.slots ?? []).forEach((slot) => {
    slot.options.forEach((opt) => {
      const porNombre = !!opt.text && norm.includes(normalizeText(opt.text));
      if (opt.items?.length) {
        const items = matchItems(opt.items, norm) ?? (porNombre ? itemsCompletos(opt.items) : null);
        if (items) options.push({ slotId: slot.id, optionId: opt.id, items });
      } else if (porNombre) {
        options.push({ slotId: slot.id, optionId: opt.id });
      }
    });
  });
  const extras = (state.meals?.extras ?? [])
    .filter((ex) => norm.includes(normalizeText(ex.name)))
    .map((ex) => ex.id);
  return { options, extras };
}

// "3" para unidades, "200 gr" para peso.
export function qtyLabel(qty, unit) {
  return unit === 'gr' ? `${qty} gr` : String(qty);
}

// Lo que lleva una opción medible, en una línea: "3 pan, 3 huevo, 200 gr fruta".
export function itemsLabel(items) {
  return items.map((i) => `${qtyLabel(i.qty, i.unit)} ${i.name}`).join(', ');
}

// El nombre de una opción. Una opción vieja sin nombre (solo ítems) se nombra por lo
// que lleva.
export function optionLabel(option) {
  if (option.text) return option.text;
  return option.items?.length ? itemsLabel(option.items) : '';
}

// El detalle ítem por ítem de lo que matcheó una opción medible, para mostrar "2/3 pan"
// en la bitácora — un elemento por cada ítem DEL PLAN (no solo los que aparecieron), así
// el que falta se ve con 0 en vez de desaparecer de la lista.
export function itemsBreakdown(option, matchedItems) {
  return option.items.map((item) => {
    const m = matchedItems.find((x) => x.itemId === item.id);
    return { id: item.id, name: item.name, tipo: item.tipo, unit: item.unit, got: m ? m.qty : 0, expected: item.qty };
  });
}

// "2/3 pan" o "150/200 gr pollo".
export function breakdownLabel(it) {
  return `${it.got}/${it.expected}${it.unit === 'gr' ? ' gr' : ''} ${it.name}`;
}

// Cuánto de una opción cuantificada se cumplió, 0 a 1 (comer de más no suma puntos
// extra: se recorta a lo que pedía el plan). expected 0 (opción sin ítems con cantidad
// real) da 1 — no hay nada que incumplir.
export function itemsCompliance(option, matchedItems) {
  let got = 0, expected = 0;
  option.items.forEach((item) => {
    const m = matchedItems.find((x) => x.itemId === item.id);
    got += Math.min(m ? m.qty : 0, item.qty);
    expected += item.qty;
  });
  return expected ? got / expected : 1;
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
   qué franja de la bitácora quedó anotada la entrada). Para una opción CUANTIFICADA, ese
   "matcheó" no alcanza solo: tiene que haber comido al menos la mitad de lo que pedía el
   plan (UMBRAL_CUMPLIMIENTO) — pedido explícito: "quiero que las opciones... importen" y
   "una medición de bien o mal", no solo un sí/no de si la tocaste. */
const UMBRAL_CUMPLIMIENTO = 0.5;

// Nombres largos para el desglose por macro (pedido explícito, segunda vuelta: "con qué
// soy más regular" entre carbohidratos/proteínas/grasas).
const MACRO_LABELS = { carbo: 'Carbohidratos', proteina: 'Proteínas', grasa: 'Grasas' };

export function comoComes(state, per) {
  const slots = activePlan(state)?.slots ?? [];
  const optionsById = {};
  slots.forEach((slot) => slot.options.forEach((opt) => { optionsById[opt.id] = opt; }));

  const { cols, current, unit, unitPl, winLabel } = comoVenisColumns(per);
  const unitAbbr = UNIT_ABBR[unit] || unit;
  const tISO = todayISO();
  const desde = cols[0].from, hasta = cols[cols.length - 1].to;

  /* Un solo recorrido del log entero: por franja, las fechas que cuentan como "activas"
     (ver UMBRAL_CUMPLIMIENTO arriba); de paso, sobre la ventana [desde,hasta] nomás, la
     suma de cumplimiento por macro y el promedio de cumplimiento general. */
  const activeDatesBySlot = {};
  const macroTotales = {}; // tipo -> { got, expected }, ambos ya recortados por item.qty
  let sumaCumplimiento = 0, entradasConItems = 0;

  Object.keys(state.meals?.log ?? {}).forEach((d) => {
    (state.meals.log[d] ?? []).forEach((entry) => {
      entry.matches.options.forEach(({ slotId, optionId, items }) => {
        const option = optionsById[optionId];
        if (!option) return; // la opción se pudo haber borrado después
        let activa = true;
        if (items) {
          const ratio = itemsCompliance(option, items);
          activa = ratio >= UMBRAL_CUMPLIMIENTO;
          if (d >= desde && d <= hasta) {
            sumaCumplimiento += ratio;
            entradasConItems++;
            option.items.forEach((item) => {
              if (!item.tipo) return;
              const m = items.find((x) => x.itemId === item.id);
              const bucket = (macroTotales[item.tipo] ||= { got: 0, expected: 0 });
              bucket.got += Math.min(m ? m.qty : 0, item.qty);
              bucket.expected += item.qty;
            });
          }
        }
        if (activa) (activeDatesBySlot[slotId] ||= new Set()).add(d);
      });
    });
  });

  const rows = slots.map((slot, i) => {
    const dates = activeDatesBySlot[slot.id] ?? new Set();
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

  // El tile de CUMPLIMIENTO reemplaza a ENTRADAS recién cuando hay algo cuantificado que
  // mostrar — así la grilla de 3 tiles no cambia de forma, solo de contenido.
  const cumplimientoPct = entradasConItems ? Math.round((sumaCumplimiento / entradasConItems) * 100) : null;
  const stats = [
    { k: 'FRANJAS OK', v: `${rows.filter((r) => r.total > 0).length}/${rows.length || 0}` },
    { k: 'DÍAS CON REGISTRO', v: String(diasConRegistro) },
    cumplimientoPct === null
      ? { k: 'ENTRADAS', v: String(entradasEnVentana) }
      : { k: 'CUMPLIMIENTO', v: `${cumplimientoPct}%` },
  ];

  // Por macro, de mayor a menor cumplimiento: "con qué soy más regular" a simple vista.
  const macros = Object.keys(macroTotales)
    .map((tipo) => ({
      tipo,
      label: MACRO_LABELS[tipo] || tipo,
      pct: macroTotales[tipo].expected ? Math.round((macroTotales[tipo].got / macroTotales[tipo].expected) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

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

  return { winLabel, unit, unitAbbr, unitPl, cols, current, rows, stats, alerts, macros };
}

/* ============================================================================
   RECUPERAR LO BORRADO (pedido explícito: "restablecé lo del queso que borré sin
   querer"). Compara el plan vigente contra la plantilla de la que salió (ver
   lib/mealPlanTemplates.js) y devuelve qué opciones o alimentos de la plantilla ya no
   están — por nombre, sin tildes ni mayúsculas. No mira lo que Lulo agregó de más: eso
   no se toca nunca.

   También sirve cuando a la plantilla se le SUMA algo después de cargada (pedido
   explícito: "sumame a almuerzos y cenas arroz con pollo…"): lo nuevo aparece como
   faltante y "Recuperar" lo agrega igual.

   `parecido`: si menos de la mitad de los platos de la plantilla están en algún lugar
   del plan, el plan claramente NO salió de esa plantilla (lo armó a mano, o es otro
   nutricionista) y ofrecer agregarle cosas sería meterle un plan ajeno. Se cuentan
   platos DISTINTOS por nombre — el mismo plato va en dos franjas (almuerzo y cena) y no
   tiene que pesar doble.
   ============================================================================ */
export function missingFromTemplate(plan, template) {
  const faltan = [];
  const slots = plan?.slots ?? [];
  template.slots.forEach((ts) => {
    const slot = slots.find((s) => normalizeText(s.name) === normalizeText(ts.name));
    ts.options.forEach((to) => {
      const opt = slot?.options.find((o) => normalizeText(o.text) === normalizeText(to.text));
      if (!opt) {
        faltan.push({ slot: ts.name, option: to.text });
        return;
      }
      (to.items ?? []).forEach((ti) => {
        if ((opt.items ?? []).some((i) => normalizeText(i.name) === normalizeText(ti.name))) return;
        faltan.push({ slot: ts.name, option: to.text, item: ti.name });
      });
    });
  });

  const enElPlan = new Set(slots.flatMap((s) => s.options.map((o) => normalizeText(o.text))));
  const platos = new Set(template.slots.flatMap((s) => s.options.map((o) => normalizeText(o.text))));
  const encontrados = [...platos].filter((t) => enElPlan.has(t)).length;
  return { faltan, parecido: platos.size > 0 && encontrados >= platos.size / 2 };
}

// "Desayuno › Panes con queso y huevo › cucharadas de queso untable"
export function faltanteLabel(f) {
  return [f.slot, f.option, f.item].filter(Boolean).join(' › ');
}

/* ============================================================================
   "TU DÍA" — lo primero que muestra Comidas (pedido explícito: "que yo pueda llevar de una
   manera fácil, clara y didáctica el registro de mis comidas"). Por cada franja del plan
   vigente: qué se registró ese día y qué tan cerca del plan quedó. Si una franja tiene
   varias entradas (dos registros de almuerzo), vale la mejor — no se suman, porque el
   plan pide UNA de las opciones, no varias.
   ============================================================================ */
export function franjaStatus(pct, libre = false) {
  if (pct === null && libre) return { key: 'libre', label: 'Libre', color: C.teal };
  if (pct === null) return { key: 'pendiente', label: 'Pendiente', color: 'rgba(242,244,248,.45)' };
  if (pct >= 1) return { key: 'cumplida', label: 'Cumplida', color: C.green };
  if (pct >= UMBRAL_CUMPLIMIENTO) return { key: 'parcial', label: 'Parcial', color: C.amber };
  return { key: 'poco', label: 'Poco', color: C.danger };
}

export function dayMealSummary(state, dISO) {
  const slots = activePlan(state)?.slots ?? [];
  const entradas = state.meals?.log?.[dISO] ?? [];

  const franjas = slots.map((slot) => {
    const registros = [];
    entradas.forEach((e) => {
      e.matches.options.forEach((m) => {
        if (m.slotId !== slot.id) return;
        const option = slot.options.find((o) => o.id === m.optionId);
        if (!option) return;
        const medible = !!(m.items && option.items?.length);
        registros.push({
          entryId: e.id,
          option,
          match: m,
          pesado: e.pesado,
          pct: medible ? itemsCompliance(option, m.items) : 1,
          detalle: medible ? itemsBreakdown(option, m.items) : null,
        });
      });
    });
    const libres = entradas
      .filter((e) => e.libre?.slotId === slot.id)
      .map((e) => ({ entryId: e.id, que: e.libre.que }));
    const pct = registros.length ? Math.max(...registros.map((r) => r.pct)) : null;
    return { slot, registros, libres, pct, status: franjaStatus(pct, libres.length > 0) };
  });

  /* El % del plan es el promedio de las franjas que cuentan para el plan: las que tienen
     algo del plan registrado y las que siguen pendientes (cuentan 0). Una franja que fue
     SOLO comida libre queda afuera — no es el plan, pero tampoco es "no comí": Lulo pidió
     poder anotarla como algo que no está mal, no como una falta. */
  const delPlan = franjas.filter((f) => f.status.key !== 'libre');
  const pct = delPlan.length ? delPlan.reduce((a, f) => a + Math.min(1, f.pct ?? 0), 0) / delPlan.length : null;
  const pendientes = franjas.filter((f) => f.status.key === 'pendiente').map((f) => f.slot.name);
  const hechas = franjas.length - pendientes.length;
  const libres = franjas.filter((f) => f.libres.length > 0).length;
  // Entradas que no son ni del plan, ni comida libre, ni un extra conocido: "comí otra cosa".
  const fueraDePlan = entradas.filter((e) => !e.libre && !e.matches.options.length && !e.matches.extras.length).length;

  return { franjas, pct, hechas, pendientes, libres, fueraDePlan, message: dayMessage(franjas, pct, hechas, pendientes, libres) };
}

// Una frase que se entienda sin mirar los números.
function dayMessage(franjas, pct, hechas, pendientes, libres) {
  if (!franjas.length) return null;
  if (hechas === 0) return 'Todavía no registraste nada. Tocá una comida para empezar.';
  if (!pendientes.length) {
    const nLibres = `${libres} ${libres === 1 ? 'comida libre' : 'comidas libres'}`;
    if (pct === null) return `Registraste todas las comidas, ${nLibres}.`;
    if (pct >= 0.9) {
      return libres
        ? `¡Día completo! Seguiste el plan, con ${nLibres}.`
        : '¡Día completo! Seguiste el plan en todas las comidas.';
    }
    return libres
      ? `Registraste todas las comidas (${nLibres}), algunas por debajo de lo que pide el plan.`
      : 'Registraste todas las comidas, algunas por debajo de lo que pide el plan.';
  }
  return `Te falta: ${pendientes.join(', ')}.`;
}
