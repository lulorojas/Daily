/* ============================================================================
   MODELO DE DATOS — users/{uid}

   Port literal de normalize() y seed() de app/js/utils.js. Este archivo es el que más
   cuidado pide de toda la migración: hay gente usando la app hoy, y su documento tiene
   que poder ir y venir entre la versión vanilla y la React sin que cambie ni un campo.

   Forma del documento (la misma desde la v3):

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
         customTypes: [ { id, name, color } ],
         weekPlans:   { 'YYYY-MM-DD(lunes)': [ { type, done }, ...x7 ] },
         lifts:       [ { id, name, unit, color, history:[ { date, weight } ] } ],
         routines:    [ { id, name, days:[ { id, name, exercises:[ { id, name, detail } ] } ] } ],
         bodyWeights: [ { id, kg, date } ],
       },
       onboarding: { seen: boolean },
       migratedFrom?, migratedAt?,     // solo en cuentas que vienen de daily.v1
     }

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
