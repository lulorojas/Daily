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
     log:    { 'YYYY-MM-DD': [ { id, at, text, pesado?: boolean, libre?: { slotId?, que, tipo }, matches:{
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
   la comida para especificarle los gramos"). `libre` marca algo fuera del plan: con
   `slotId`, en lugar de esa comida; sin él, suelto ("un alfajor a la tarde"). `tipo` es
   'sana' (distinta del plan, pero bien) o 'permitido' (cuenta como pifiada) — ver
   addMealLogLibre en store/mutations.js.

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

// La versión del plan que regía un día dado: la última que arrancó ese día o antes. Un
// día anterior a todas (la bitácora puede ser más vieja que la fecha de la primera
// versión, que se puso al migrar) usa la primera.
export function planOn(state, dISO) {
  const plans = [...(state.meals?.plans ?? [])].sort((a, b) => (a.startISO < b.startISO ? -1 : 1));
  if (!plans.length) return null;
  return plans.filter((p) => p.startISO <= dISO).pop() ?? plans[0];
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

// Clave para decir "es el mismo alimento": sin tildes, minúsculas y sin la "s" final, así
// "frutas" del plan y "fruta" sumada de otra opción cuentan como lo mismo.
export function foodKey(name) {
  return normalizeText(name).replace(/s$/, '');
}

/* Cuánto de una opción cuantificada se cumplió, 0 a 1: el PROMEDIO de lo que se cumplió de
   cada alimento (comido/pedido, recortado a 1 — comer de más no suma puntos extra). Cada
   alimento pesa igual: antes se sumaban las cantidades crudas y 300 gr de arroz valían
   cien veces más que 3 huevos. Lo `suma`do de otra opción cuenta para el alimento del
   mismo nombre ("sacaste la fruta del pancake y sumaste la del licuado: la fruta cuenta").
   Una opción sin alimentos medibles da 1 — no hay nada que incumplir. */
export function itemsCompliance(option, matchedItems, suma = []) {
  const extra = new Map();
  suma.forEach((s) => extra.set(foodKey(s.name), (extra.get(foodKey(s.name)) ?? 0) + s.qty));
  const ratios = option.items
    .filter((item) => item.qty > 0)
    .map((item) => {
      const m = matchedItems.find((x) => x.itemId === item.id);
      const got = (m ? m.qty : 0) + (extra.get(foodKey(item.name)) ?? 0);
      return Math.min(got / item.qty, 1);
    });
  return ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
}

/* Lo que Lulo pidió ("si en el día tengo que comer 4 frutas divididas en las franjas y en
   el desayuno no comí fruta pero comí entre el almuerzo y la merienda, el desayuno estuvo
   un poco peor pero para el día en general no baje porcentaje"): el % de cada comida sigue
   siendo el suyo — el desayuno SÍ quedó peor —, pero para el % del DÍA un alimento que
   faltó en una comida se cubre con lo que sobró del mismo alimento en otras comidas del día.

   Por alimento (foodKey) se arma un "pozo" con lo comido de más (sobre lo que pedía cada
   comida, o lo sumado que ni estaba en esa opción) y se reparte, en el orden del plan, a las
   comidas donde faltó. Devuelve, por franja, su % ya compensado — o null si esa franja no
   tiene un registro medible (no hay nada que compensar). Solo compensa comidas YA
   registradas: una pendiente sigue valiendo 0. */
function compensarDia(franjas) {
  const porFranja = franjas.map((f) => {
    const r = f.registros.filter((x) => x.detalle).sort((a, b) => b.pct - a.pct)[0];
    if (!r) return null;
    const m = new Map();
    const tocar = (name) => {
      const k = foodKey(name);
      if (!m.has(k)) m.set(k, { got: 0, exp: 0 });
      return m.get(k);
    };
    r.detalle.forEach((it) => { const v = tocar(it.name); v.got += it.got; v.exp += it.expected; });
    r.suma.forEach((s) => { tocar(s.name).got += s.qty; });
    return m;
  });

  const pozo = new Map();
  porFranja.forEach((m) => m?.forEach((v, k) => {
    const sobra = Math.max(0, v.got - v.exp);
    if (sobra) pozo.set(k, (pozo.get(k) ?? 0) + sobra);
  }));

  return porFranja.map((m) => {
    if (!m) return null;
    const ratios = [];
    m.forEach((v, k) => {
      if (!v.exp) return;
      let got = v.got;
      if (got < v.exp) {
        const toma = Math.min(v.exp - got, pozo.get(k) ?? 0);
        got += toma;
        pozo.set(k, (pozo.get(k) ?? 0) - toma);
      }
      ratios.push(Math.min(1, got / v.exp));
    });
    return ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
  });
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
      entry.matches.options.forEach(({ slotId, optionId, items, suma }) => {
        const option = optionsById[optionId];
        if (!option) return; // la opción se pudo haber borrado después
        let activa = true;
        if (items) {
          const ratio = itemsCompliance(option, items, suma ?? []);
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
/* Comida fuera del plan (ver addMealLogLibre en store/mutations.js) — pedido explícito:
   "las que pueden estar bien son las comidas distintas del plan pero que no son
   insalubres", y un permitido ("un alfajor") "está mal y es como una comida pifiada".
   Entradas viejas sin `tipo` (de cuando todo lo de afuera era "comida libre") cuentan
   como sanas, que es lo que significaban cuando se anotaron. */
export function libreTipo(entry) {
  return entry.libre?.tipo === 'permitido' ? 'permitido' : 'sana';
}

// `fuera`: 'permitido' | 'sana' | null — lo de fuera del plan que tuvo la franja, si la
// franja no tiene nada del plan registrado. Un permitido manda sobre una sana.
export function franjaStatus(pct, fuera = null) {
  if (pct === null && fuera === 'permitido') return { key: 'permitido', label: 'Permitido', color: C.coral };
  if (pct === null && fuera === 'sana') return { key: 'sana', label: 'Fuera del plan', color: C.teal };
  if (pct === null) return { key: 'pendiente', label: 'Pendiente', color: 'rgba(242,244,248,.45)' };
  if (pct >= 1) return { key: 'cumplida', label: 'Cumplida', color: C.green };
  if (pct >= UMBRAL_CUMPLIMIENTO) return { key: 'parcial', label: 'Parcial', color: C.amber };
  return { key: 'poco', label: 'Poco', color: C.danger };
}

// `plan` (opcional): contra qué versión del plan medir el día — por defecto la vigente,
// que es la que se registra en "Tu día". mealScoreByPeriod pasa la de ESE día (planOn).
export function dayMealSummary(state, dISO, plan = activePlan(state)) {
  const slots = plan?.slots ?? [];
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
          pct: medible ? itemsCompliance(option, m.items, m.suma ?? []) : 1,
          detalle: medible ? itemsBreakdown(option, m.items) : null,
          // Lo sumado de otras opciones (ver buildStructured en store/mutations.js): se
          // muestra, pero no cambia `pct` — ni la vuelve pifiada ni completa lo que faltó.
          suma: m.suma ?? [],
        });
      });
    });
    const libres = entradas
      .filter((e) => e.libre?.slotId === slot.id)
      .map((e) => ({ entryId: e.id, que: e.libre.que, tipo: libreTipo(e) }));
    const fuera = libres.some((l) => l.tipo === 'permitido') ? 'permitido' : libres.length ? 'sana' : null;
    const pct = registros.length ? Math.max(...registros.map((r) => r.pct)) : null;
    return { slot, registros, libres, pct, status: franjaStatus(pct, fuera) };
  });

  // % del DÍA de cada comida: el suyo, ya compensado con lo que sobró de otras comidas
  // (ver compensarDia). El estado y el % de la comida en sí NO cambian: el desayuno sin
  // fruta sigue figurando peor, lo que no baja es el día.
  const compensado = compensarDia(franjas);
  franjas.forEach((f, i) => {
    f.pctDia = f.pct === null ? null : Math.max(f.pct, compensado[i] ?? 0);
  });

  // Permitidos que no reemplazaron una comida ("un alfajor a la tarde").
  const sueltos = entradas
    .filter((e) => e.libre && !e.libre.slotId)
    .map((e) => ({ entryId: e.id, que: e.libre.que, tipo: libreTipo(e) }));

  /* El % del plan es el promedio de las franjas que cuentan para el plan: las que tienen
     algo del plan registrado y las pendientes (0). Una franja que fue una comida distinta
     pero sana queda afuera — no es el plan, pero tampoco es una falta. Una que fue un
     permitido cuenta 0: Lulo pidió que sea "como una comida pifiada". */
  const delPlan = franjas.filter((f) => f.status.key !== 'sana');
  const pct = delPlan.length
    ? delPlan.reduce((a, f) => a + (f.status.key === 'permitido' ? 0 : Math.min(1, f.pctDia ?? 0)), 0) / delPlan.length
    : null;
  const pendientes = franjas.filter((f) => f.status.key === 'pendiente').map((f) => f.slot.name);
  const hechas = franjas.length - pendientes.length;
  const sanas = franjas.filter((f) => f.status.key === 'sana').length;
  const permitidos = franjas.filter((f) => f.status.key === 'permitido').length
    + sueltos.filter((s) => s.tipo === 'permitido').length;
  // Entradas que no son ni del plan, ni fuera del plan anotadas, ni un extra: "otra cosa".
  const fueraDePlan = entradas.filter((e) => !e.libre && !e.matches.options.length && !e.matches.extras.length).length;

  return {
    franjas, sueltos, pct, hechas, pendientes, sanas, permitidos, fueraDePlan,
    message: dayMessage({ franjas, pct, hechas, pendientes, sanas, permitidos }),
  };
}

function plural(n, uno, varios) { return `${n} ${n === 1 ? uno : varios}`; }

// Una frase que se entienda sin mirar los números.
function dayMessage({ franjas, pct, hechas, pendientes, sanas, permitidos }) {
  if (!franjas.length) return null;
  const conPermitidos = permitidos ? ` Llevás ${plural(permitidos, 'permitido', 'permitidos')}.` : '';
  if (hechas === 0) {
    return permitidos
      ? `Todavía no registraste ninguna comida.${conPermitidos}`
      : 'Todavía no registraste nada. Tocá una comida para empezar.';
  }
  if (pendientes.length) return `Te falta: ${pendientes.join(', ')}.${conPermitidos}`;
  if (pct === null) return 'Registraste todas las comidas, distintas del plan pero sanas.';
  if (pct >= 0.9) {
    if (permitidos) return `Seguiste el plan en las comidas.${conPermitidos}`;
    return sanas
      ? `¡Día completo! Seguiste el plan, con ${plural(sanas, 'comida distinta pero sana', 'comidas distintas pero sanas')}.`
      : '¡Día completo! Seguiste el plan en todas las comidas.';
  }
  return `Registraste todas las comidas, algunas por debajo de lo que pide el plan.${conPermitidos}`;
}

/* ============================================================================
   "¿COMISTE BIEN?" — Progreso (pedido explícito: "un gráfico que según lapsos de tiempo
   [diga] cuántas comidas estuve bien y cuántas le pifié"). Cada comida de cada día (cada
   franja del plan que regía ese día) cae en uno de tres baldes:

     bien          — registrada del plan con al menos la mitad de lo pedido
                     (UMBRAL_CUMPLIMIENTO, el mismo de "Cómo comés"), o una comida
                     distinta del plan pero sana (pedido explícito: "las que pueden estar
                     bien son las comidas distintas del plan pero que no son insalubres").
     pifie         — registrada del plan pero con menos de la mitad, o un permitido en
                     lugar de la comida. Un permitido suelto ("un alfajor a la tarde")
                     suma uno más acá — pedido explícito: "es como una comida pifiada".
     sinRegistrar  — no se anotó nada. Va aparte: no anotar no es lo mismo que comer mal.

   Las columnas son las de comoVenisColumns() — el mismo recorte que el resto de Progreso
   ("todos los gráficos deben tomar la misma medida de tiempo"). No cuentan los días
   futuros ni los anteriores al primer registro de la bitácora: antes de empezar a usar
   Comidas no hay nada que medir, y no corresponde que sume como "sin registrar".
   ============================================================================ */
export function mealScoreByPeriod(state, per) {
  const { cols, current, winLabel } = comoVenisColumns(per);
  const tISO = todayISO();
  const log = state.meals?.log ?? {};
  const primerDia = Object.keys(log).filter((d) => log[d].length).sort()[0] ?? null;

  const bars = cols.map((c, i) => {
    const bar = { label: c.label, from: c.from, to: c.to, current: i === current, bien: 0, pifie: 0, sinRegistrar: 0 };
    if (!primerDia) return bar;
    const desde = c.from > primerDia ? c.from : primerDia;
    for (let d = parseISO(desde); iso(d) <= c.to && iso(d) <= tISO; d = addDays(d, 1)) {
      const dia = iso(d);
      const r = dayMealSummary(state, dia, planOn(state, dia));
      r.franjas.forEach((f) => {
        if (f.status.key === 'pendiente') bar.sinRegistrar++;
        else if (f.status.key === 'permitido') bar.pifie++;
        else if (f.status.key === 'sana' || f.pct >= UMBRAL_CUMPLIMIENTO) bar.bien++;
        else bar.pifie++;
      });
      bar.pifie += r.sueltos.filter((s) => s.tipo === 'permitido').length;
    }
    return bar;
  });

  const total = bars.reduce(
    (a, b) => ({ bien: a.bien + b.bien, pifie: a.pifie + b.pifie, sinRegistrar: a.sinRegistrar + b.sinRegistrar }),
    { bien: 0, pifie: 0, sinRegistrar: 0 },
  );
  const registradas = total.bien + total.pifie;
  return { winLabel, bars, total, pctBien: registradas ? total.bien / registradas : null };
}

/* ============================================================================
   "CÓMO COMÉS", DÍA POR DÍA (pedido explícito: "el gráfico tiene que ser por día, no la
   cantidad de comidas sino cómo vengo comiendo por día, y ver cuántas comidas y qué
   comidas le pifié, los permitidos de una semana"). Para cada día de la ventana del
   período elegido (la misma de "Cómo venís"), del más nuevo al más viejo: el estado de
   cada comida, el % del plan del día, qué comidas le pifiaste y qué permitidos hubo. Y
   sobre toda la ventana: cuántos días salieron bien, en qué comida le pifiás más, y la
   lista de permitidos.

   Una comida "pifiada" es la misma que en mealScoreByPeriod: registrada del plan con
   menos de la mitad, o un permitido en su lugar. Un día "bien" es uno sin comidas
   pifiadas, sin permitidos sueltos y sin comidas sin registrar.

   Igual que mealScoreByPeriod, no hay días anteriores al primer registro ni futuros.
   ============================================================================ */
const PIFIADA = new Set(['poco', 'permitido']);

export function comoComesPorDia(state, per) {
  const { cols, winLabel } = comoVenisColumns(per);
  const tISO = todayISO();
  const log = state.meals?.log ?? {};
  const primerDia = Object.keys(log).filter((d) => log[d].length).sort()[0] ?? null;
  const hasta = cols[cols.length - 1].to < tISO ? cols[cols.length - 1].to : tISO;
  const desde = primerDia && primerDia > cols[0].from ? primerDia : cols[0].from;

  const days = [];
  if (primerDia) {
    for (let d = parseISO(hasta); iso(d) >= desde; d = addDays(d, -1)) {
      const dISO = iso(d);
      const r = dayMealSummary(state, dISO, planOn(state, dISO));
      if (!r.franjas.length) continue;
      days.push({
        dISO,
        pct: r.pct,
        franjas: r.franjas.map((f) => ({
          name: f.slot.name, status: f.status, pct: f.pct,
          // qué permitido ocupó esta comida (si fue un permitido en lugar de la comida)
          libres: f.libres.filter((l) => l.tipo === 'permitido').map((l) => l.que),
        })),
        pifiadas: r.franjas.filter((f) => PIFIADA.has(f.status.key)).map((f) => f.slot.name),
        sinRegistrar: r.pendientes.length,
        permitidos: [
          ...r.franjas.flatMap((f) => f.libres.filter((l) => l.tipo === 'permitido').map((l) => l.que)),
          ...r.sueltos.filter((s) => s.tipo === 'permitido').map((s) => s.que),
        ],
        sueltos: r.sueltos.filter((s) => s.tipo === 'permitido').length,
        sueltosNombres: r.sueltos.filter((s) => s.tipo === 'permitido').map((s) => s.que),
      });
    }
  }

  const porFranja = {};
  days.forEach((d) => d.pifiadas.forEach((n) => { porFranja[n] = (porFranja[n] ?? 0) + 1; }));
  const pifiadasPorFranja = Object.entries(porFranja)
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n);

  return {
    winLabel,
    days,
    diasBien: days.filter((d) => !d.pifiadas.length && !d.sueltos && !d.sinRegistrar).length,
    diasConPifiadas: days.filter((d) => d.pifiadas.length || d.sueltos).length,
    // Las tres clases son excluyentes y suman el total de días: bien / con pifiadas / el
    // resto (le faltaron comidas por registrar, sin pifiadas) = incompleto.
    diasIncompletos: days.filter((d) => !(d.pifiadas.length || d.sueltos) && d.sinRegistrar > 0).length,
    pifiadasPorFranja,
    permitidos: days.flatMap((d) => d.permitidos.map((que) => ({ dISO: d.dISO, que }))),
  };
}

/* ============================================================================
   RECUPERAR LO QUE FALTÓ, ALCOHOL Y PERMITIDOS CON HORA (rediseño Nocturne, sección 8 del
   handoff)
   ============================================================================ */

/* Horario e ícono de cada comida. El modelo no guarda la hora de una franja, así que se
   infiere del nombre (Desayuno 08:00, Almuerzo 13:00, Merienda 17:00, Cena 21:00); una
   franja con otro nombre se reparte en el día según su lugar en el plan. `icon` es la clave
   del ícono Phosphor que usa la pantalla. */
const HORARIOS = [
  { re: /desayun/, time: '08:00', icon: 'coffee' },
  { re: /almuerz/, time: '13:00', icon: 'bowl' },
  { re: /meriend/, time: '17:00', icon: 'orange' },
  { re: /cena/, time: '21:00', icon: 'moon' },
];

export function slotMeta(slot, index = 0, total = 1) {
  const norm = normalizeText(slot.name);
  const conocido = HORARIOS.find((h) => h.re.test(norm));
  if (conocido) return { time: conocido.time, icon: conocido.icon };
  const hora = Math.round(8 + (index / Math.max(1, total - 1)) * 13);
  return { time: `${String(hora).padStart(2, '0')}:00`, icon: 'fork' };
}

const horaDe = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* La hora de una entrada de la bitácora ("HH:MM"), para mostrarla y ordenarla: la que se
   anotó a mano (`time`, en Alcohol y Permitido), si no la de la comida a la que pertenece,
   y si no, la hora en que se escribió. */
export function entryTime(entry, slots) {
  if (entry.time) return entry.time;
  const slotId = entry.libre?.slotId ?? entry.matches?.options?.[0]?.slotId;
  const i = slots.findIndex((s) => s.id === slotId);
  if (i >= 0) return slotMeta(slots[i], i, slots.length).time;
  return horaDe(entry.at);
}

// La bitácora de un día, ordenada por hora (empate: por el orden en que se anotó).
export function sortedLog(entries, slots) {
  return entries
    .map((e, i) => ({ e, i, t: entryTime(e, slots) }))
    .sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.i - b.i))
    .map((x) => x.e);
}

/* "Al final comí la verdura": si lo que se escribe nombra un alimento que le FALTÓ a una
   comida ya registrada ese día (comido menos de lo que pedía la opción), ese alimento pasa
   a contar como comido. Si el texto trae cantidad ("200 gr de verdura") se suma esa; si
   no, lo que faltaba. Devuelve qué se recuperó; quien llama lo aplica (ver
   addMealLogEntry en store/mutations.js). */
export function recuperarFaltantes(state, entradasDelDia, text) {
  const norm = normalizeText(text);
  const slots = activePlan(state)?.slots ?? [];
  const out = [];
  const yaTocado = new Set();
  entradasDelDia.forEach((e) => {
    e.matches.options.forEach((m) => {
      if (!m.items) return;
      const slot = slots.find((s) => s.id === m.slotId);
      const option = slot?.options.find((o) => o.id === m.optionId);
      if (!option?.items) return;
      option.items.forEach((item) => {
        const nombre = normalizeText(item.name);
        const clave = `${m.slotId}|${nombre}`;
        if (!nombre || !norm.includes(nombre) || yaTocado.has(clave)) return;
        const got = m.items.find((x) => x.itemId === item.id)?.qty ?? 0;
        if (got >= item.qty) return;
        const conNumero = norm.match(new RegExp(`(\\d+)\\s*(?:gramos|grs|gr|g)?\\.?\\s*(?:de\\s+)?${escapeRegex(nombre)}`));
        yaTocado.add(clave);
        out.push({
          entryId: e.id, slotId: m.slotId, optionId: m.optionId, itemId: item.id,
          slotName: slot.name, name: item.name, add: conNumero ? parseInt(conNumero[1], 10) : item.qty - got,
        });
      });
    });
  });
  return out;
}

// El extra "Alcohol" (el que tiene calendario propio), o null si no existe.
export function alcoholExtra(state) {
  return (state.meals?.extras ?? []).find((x) => normalizeText(x.name) === 'alcohol') ?? null;
}

/* Todo lo anotado de Alcohol o de Permitido en un mes ("YYYY-MM"), por día. Cada elemento
   es { dISO, entry, qty, que, slotId } — alcohol cuenta vasos (`qty`, 1 si no se dijo);
   un permitido cuenta de a uno. Es lo que dibujan los calendarios de esos dos extras. */
export function extraEntriesDelMes(state, kind, mes) {
  const log = state.meals?.log ?? {};
  const alc = alcoholExtra(state);
  const out = [];
  Object.keys(log).filter((d) => d.startsWith(mes)).sort().forEach((dISO) => {
    log[dISO].forEach((entry) => {
      if (kind === 'alcohol') {
        if (alc && entry.matches.extras.includes(alc.id)) out.push({ dISO, entry, qty: entry.qty ?? 1 });
      } else if (entry.libre?.tipo === 'permitido') {
        out.push({ dISO, entry, qty: 1, que: entry.libre.que, slotId: entry.libre.slotId ?? null });
      }
    });
  });
  return out;
}

// Vasos de alcohol entre dos fechas (inclusive).
export function vasosDeAlcohol(state, desdeISO, hastaISO) {
  const alc = alcoholExtra(state);
  if (!alc) return 0;
  const log = state.meals?.log ?? {};
  return Object.keys(log)
    .filter((d) => d >= desdeISO && d <= hastaISO)
    .reduce((a, d) => a + log[d].filter((e) => e.matches.extras.includes(alc.id)).reduce((s, e) => s + (e.qty ?? 1), 0), 0);
}
