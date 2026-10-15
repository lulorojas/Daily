/* ============================================================================
   MODELO DE DATOS — users/{uid}

   Port de normalize() y seed() de app/js/utils.js — con UNA diferencia a propósito desde
   el seguimiento por músculo: la app vanilla (`app/`) quedó de baja, así que el documento
   YA NO tiene que poder ir y venir entre las dos versiones. `weekPlans[semana][día].type`
   (un solo tipo por turno) pasó a `.muscles` (varios músculos por turno) — ver la
   migración más abajo y el comentario de dayTurnos()/gymHistory() en lib/gym.js. Todo lo
   demás de este archivo sigue el mismo criterio de siempre.

   Forma del documento:

     {
       v: 2,
       items: [                       // agenda: tres tipos en la misma lista
         { id, kind:'tarea', title, desc, date|null, time|null, done, doneAt? },
         { id, kind:'cita',  title, desc, date, time|null },
         { id, kind:'anual', title, desc, date, time|null },
       ],
       habits: [ { id, name, detail, color, icon, timesPerDay } ],
       habitLog: { 'YYYY-MM-DD': { [habitId]: cantidadDeMarcas } },
       gym: {
         customTypes:    [ { id, name, color } ],   // catálogo de músculos (ex "tipos")
         weekPlans:      { 'YYYY-MM-DD(lunes)': [ { muscles:[], done, muscles2?, done2?, absCategories?, movilidad? }, ...x7 ] },
         lifts:          [ { id, name, unit, color, history:[ { date, weight, reps? } ] } ],
         routines:       [ { id, name, days:[ { id, name, exercises:[ { id, name, detail } ] } ] } ],
         bodyWeights:    [ { id, kg, date } ],
       },
       onboarding: { seen: boolean },
       fcmTokens?:  [ 'token de FCM de cada dispositivo que activó notificaciones' ],
       meals?: {                      // seguidor de comidas, ver abajo — campo opcional
         plans: [ { id, startISO, endISO: string|null, slots:[ { id, name, options:[ { id, text } ] } ] } ],
         extras: [ { id, name, color, icon, quality?: 'bueno'|'malo' } ],
         log: { 'YYYY-MM-DD': [ { id, at, text, matches:{ options:[], extras:[] } } ] },
       },
       migratedFrom?, migratedAt?,     // solo en cuentas que vienen de daily.v1
     }

   `weekPlans[semana][día].muscles2/done2/absCategories/movilidad`, `lifts[].history[].reps`,
   `fcmTokens` y `meals` son de etapas de React sin equivalente en la app vanilla: no hay
   contra qué comparar en src/compat/, así que se prueban directo. Todos son compatibles
   hacia atrás por construcción: opcionales, ausentes en un día/registro viejo (ver
   dayTurnos()/dayAbs() en lib/gym.js; repsLabel() para reps).

   `absCategories`/`movilidad` NO son una lista aparte ni un turno más — son dos campos
   MÁS del mismo objeto día, exactamente al lado de type/done/type2/done2. No hacía falta
   ningún truco de "no poner default en normalize()" para estos dos (a diferencia de
   `fcmTokens`, más abajo): el día YA existe una vez que se toca la semana (ensureWeekPlan
   en store/mutations.js), así que agregarle dos campos más no es distinto de agregarle
   type2/done2.

   `fcmTokens` sí a propósito NO tiene un default acá (a diferencia de customTypes,
   weekPlans, etc.): si normalize() le pusiera `||= []` a TODA cuenta, ese campo vacío
   aparecería hasta en un documento que nunca activó notificaciones, y los tests de
   src/compat/writes.test.js (que comparan el documento ENTERO, campo por campo, contra lo
   que escribe vanilla) fallarían en cada mutación de cualquier pantalla — vanilla jamás va
   a escribir ese campo. Mismo truco que weekPlanFor(): la lectura (`data.fcmTokens || []`
   donde haga falta) trata la ausencia como `[]`, y el campo se materializa en el documento
   recién cuando se guarda el primer token (registerFcmToken(), en store/mutations.js).

   DOS REGLAS QUE NO SE NEGOCIAN:

   1. normalize() NO CONSTRUYE UN OBJETO NUEVO CON LOS CAMPOS CONOCIDOS.
      Arranca de una copia del documento entero y le aplica defaults encima. Si mañana
      la app vanilla agrega un campo, o si el documento trae `migratedFrom`/`migratedAt`,
      esos campos sobreviven intactos. Un normalize que armara `{ v, items, habits, ... }`
      desde cero borraría en silencio todo lo que no conociera — y como se guarda el
      documento completo con set(), ese borrado sería permanente.

   2. Las transformaciones se replican tal cual, incluidas las que parecen bugs.
      Están marcadas una por una más abajo.
   ============================================================================ */
import { REST } from './gym';
import { todayISO } from './dates';
import { uid } from './ids';
import { llevaProteina, proteinaImplicita } from './mealRules';

/* Copia profunda. structuredClone conserva todo (incluso claves con undefined); el
   fallback por JSON es para entornos viejos. Se clona porque en React el estado tiene
   que ser inmutable: normalize() nunca debe modificar lo que le pasaron. */
function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

// Cuenta nueva: arranca 100% vacía. Copia exacta de seed() en utils.js.
export function seed() {
  return {
    v: 2,
    items: [],
    gym: { customTypes: [], weekPlans: {}, lifts: [], routines: [], bodyWeights: [] },
    habits: [],
    habitLog: {},
    onboarding: { seen: false },
  };
}

/* Migración única, historial de planes de comidas (pedido explícito: "el plan cambia de
   nutricionista en nutricionista, quiero guardar el historial"): `meals.plan` (una lista
   plana de franjas, sin versión) pasa a `meals.plans` (array de versiones, cada una con
   `startISO`/`endISO` y las mismas franjas de antes adentro de `.slots`). La versión
   vieja se envuelve en una sola versión "activa" (`endISO: null`) para no perder nada ya
   cargado. Idempotente — si ya existe `meals.plans` no se toca. */
function migrateMealsPlan(meals) {
  if (meals.plans || !meals.plan) return;
  meals.plans = [{ id: uid(), startISO: todayISO(), endISO: null, slots: meals.plan }];
  delete meals.plan;
}

/* Almuerzo y cena llevan una proteína de 250 gr (decisión explícita: "las milanesas también se
   pesan"). Una opción de esas comidas sin ningún alimento medible se completa con ella.
   Idempotente: una opción que ya tiene alimentos no se toca. */
function migrateProteinaImplicita(meals) {
  meals.plans?.forEach((plan) => plan.slots?.forEach((slot) => {
    if (!llevaProteina(slot.name)) return;
    slot.options?.forEach((o) => {
      if (o.text && !o.items?.length) o.items = [proteinaImplicita(o.text, uid())];
    });
  }));
}

/* Migración única, seguimiento por músculo: un día viejo tenía `type`/`type2` (un solo
   músculo por turno, string); pasa a `muscles`/`muscles2` (varios, array). Idempotente —
   un día que YA tiene `muscles` no se vuelve a tocar, así que correr esto en cada
   normalize() de cada sesión no hace nada la segunda vez. "Descanso" (o un turno sin
   marcar) se vuelve `[]`: la ausencia de músculos ES el descanso, ya no hace falta
   guardar el string REST adentro del array. */
function migrateDayToMuscles(day) {
  if ('type' in day) {
    day.muscles = (day.type && day.type !== REST) ? [day.type] : [];
    delete day.type;
  }
  if ('type2' in day) {
    day.muscles2 = (day.type2 && day.type2 !== REST) ? [day.type2] : [];
    delete day.type2;
  }
  /* Un día que no tiene ni `type` ni `muscles` (un backup editado a mano, una escritura a
     medias) tiene que quedar leíble igual: dayTurnos() recorre la lista sin preguntar si
     existe, y antes de esto un día así reventaba la pantalla entera en vez de contarse
     como descanso. Mismo criterio para un `muscles2` que no sea una lista: se descarta el
     segundo turno en vez de arrastrar el dato roto. */
  if (!Array.isArray(day.muscles)) day.muscles = [];
  if ('muscles2' in day && !Array.isArray(day.muscles2)) delete day.muscles2;
}

export function normalize(input) {
  // Vanilla siempre recibe un objeto (snapshot de Firestore, seed(), o un backup ya
  // validado). Si llega otra cosa, se arranca de {} y los defaults hacen el resto.
  const s = (input && typeof input === 'object' && !Array.isArray(input)) ? deepClone(input) : {};

  s.v = 2;
  s.items ||= [];
  s.habits ||= [];
  s.habitLog ||= {};

  // Multi-check: cada hábito puede marcarse varias veces por día.
  // OJO con el `!(x>=1)`: no es lo mismo que `x<1`. Con undefined o NaN, `x>=1` es false
  // y entra; y un timesPerDay que viniera como string '2' pasa el chequeo y se conserva
  // como string. Se replica el idioma exacto, no una versión "arreglada".
  s.habits.forEach((h) => { if (!(h.timesPerDay >= 1)) h.timesPerDay = 1; });

  // Las marcas de habitLog pasan de boolean a entero (legacy true → 1), y las que quedan
  // en 0 se BORRAN de la clave del día.
  // Detalle replicado a propósito: se borra la marca, pero NO el objeto del día si queda
  // vacío. Un habitLog { '2024-05-01': {} } sobrevive así para siempre — y más abajo
  // cuenta como "esta cuenta tiene datos" para el onboarding. Es una inconsistencia de la
  // app actual; está anotada en el reporte y NO se corrige acá.
  Object.keys(s.habitLog).forEach((d) => {
    const day = s.habitLog[d];
    if (day && typeof day === 'object') {
      Object.keys(day).forEach((id) => {
        const v = day[id];
        day[id] = v === true ? 1 : (Number(v) || 0);
        if (!day[id]) delete day[id];
      });
    }
  });

  s.gym ||= {};
  s.gym.customTypes ||= [];
  s.gym.weekPlans ||= {};
  s.gym.lifts ||= [];
  s.gym.routines ||= [];
  s.gym.bodyWeights ||= [];
  Object.values(s.gym.weekPlans).forEach((plan) => plan.forEach(migrateDayToMuscles));

  // `meals` sigue el mismo truco que `fcmTokens`: SIN default acá. Una cuenta que nunca
  // abrió Comidas no gana un campo nuevo en su documento (writes.test.js no se entera).
  // Si ya existe (por mínimo que sea), se sanean sus sub-campos por las dudas.
  if (s.meals) {
    migrateMealsPlan(s.meals);
    migrateProteinaImplicita(s.meals);
    s.meals.plans ||= [];
    s.meals.extras ||= [];
    s.meals.log ||= {};
  }

  /* Onboarding. Lo único que se persiste es `seen`: si ya se respondió el "¿primera vez?".
     Migra también el esquema viejo (welcomeSeen). Una cuenta que YA tenía datos no ve nada.
     Ojo: la asignación final REEMPLAZA el objeto, así que cualquier campo extra que
     hubiera adentro de onboarding (los `tips` de una implementación anterior) se pierde.
     Es a propósito en la app actual y se replica igual. */
  const ob = (s.onboarding && typeof s.onboarding === 'object') ? s.onboarding : null;
  let onbSeen;
  if (ob && typeof ob.seen === 'boolean') onbSeen = ob.seen;
  else if (ob && typeof ob.welcomeSeen === 'boolean') onbSeen = ob.welcomeSeen;
  else onbSeen = !!(s.items.length || s.habits.length || s.gym.lifts.length
    || s.gym.routines.length || s.gym.bodyWeights.length || s.gym.customTypes.length
    || Object.keys(s.habitLog).length);
  s.onboarding = { seen: onbSeen };

  return s;
}

/* Lo que efectivamente se manda a Firestore. Mismo JSON.parse(JSON.stringify(...)) que
   hace dataSave() en vanilla: saca los `undefined` (Firestore los rechaza) y cualquier
   cosa no serializable. Si el objeto tuviera un ciclo, devuelve null y quien llama
   decide no escribir — igual que el try/catch de vanilla. */
export function cleanForFirestore(state) {
  try {
    return JSON.parse(JSON.stringify(state));
  } catch {
    return null;
  }
}
