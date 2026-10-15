// Igual a normalizeText de lib/meals.js, escrita acá para no depender de ese archivo (que
// importa a este): minúsculas, sin tildes, espacios colapsados.
const normalizeText = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/* ============================================================================
   REGLAS DE CALIFICACIÓN DE LAS COMIDAS

   Acá viven, todas juntas y en una tabla, las reglas con las que Daily decide cuánto "cuenta"
   una comida. Son reglas que se van hablando de a una (pedido explícito: "son reglas que iremos
   hablando"), así que agregar o ajustar una es tocar ESTE archivo, no la cuenta de lib/meals.js.

   Hoy hay cuatro:

   1. TOLERANCIAS — no todo lo que falta baja la nota por igual. Faltar 1 tostada (un
      carbohidrato, y poco) no baja nada; faltar 1 huevo o 50 gramos de proteína sí. Cada
      macro (el `tipo` que se le pone a un alimento del plan) tiene cuánto puede faltar sin
      consecuencias. Pasado ese margen, la nota baja como siempre: lo comido sobre lo pedido
      (no hay "perdón parcial": o entra en la tolerancia, o cuenta lo que faltó).

   2. EQUIVALENCIAS — hay alimentos que valen lo mismo aunque se llamen distinto. Una banana,
      una manzana o una ensalada de frutas son "fruta". Sirve para la compensación del día: si
      al desayuno le faltó la fruta y en la merienda se comieron dos (o hubo una ensalada de
      frutas), la fruta del día se cumple. La compensación en sí vive en compensarDia()
      (lib/meals.js); acá solo se dice QUÉ alimentos son el mismo.

   3. PASARSE — comer de más de un carbohidrato o de una grasa también baja la nota (pasado
      el margen de tolerancia); comer de más de proteína no. Los alimentos sin macro (fruta,
      verdura) no se penalizan por pasarse.

   4. COMPENSACIÓN — por ahora SOLO la fruta compensa entre comidas del día. Los demás
      alimentos se miden comida por comida (decisión explícita: "solo la fruta por ahora").
   ============================================================================ */

/* Cuánto puede faltar de un alimento sin que baje la nota, según su macro.
   - `unidades`: para alimentos que se cuentan de a uno (tostadas, huevos): como mínimo ese
     número, o el `fraccion` de lo pedido si eso es más.
   - `fraccion`: para los que van en gramos: ese porcentaje de lo pedido.
   Un macro que no está acá (proteína, grasa) o un alimento sin macro NO tiene tolerancia:
   cualquier cosa que falte baja la nota (decisión explícita: proteína y grasa, estrictas). */
export const TOLERANCIAS = {
  carbo: { unidades: 1, fraccion: 0.2 },
};

// Cuánto puede faltar de este alimento (en SU unidad: unidades o gramos) sin consecuencias.
export function toleranciaDe({ tipo, unit, qty }) {
  const t = TOLERANCIAS[tipo];
  if (!t || !(qty > 0)) return 0;
  return unit === 'gr' ? qty * t.fraccion : Math.max(t.unidades, Math.floor(qty * t.fraccion));
}

/* Grupos de alimentos equivalentes. Cada grupo tiene una `clave` (con la que se comparan) y
   las palabras que lo identifican dentro del nombre de un alimento. */
export const GRUPOS = [
  {
    clave: 'fruta',
    compensa: true, // lo que sobra de este grupo cubre lo que faltó en otra comida del día
    palabras: [
      'fruta', 'banana', 'manzana', 'naranja', 'mandarina', 'pomelo', 'pera', 'durazno', 'kiwi', 'frutilla',
      'uva', 'sandia', 'melon', 'ananá', 'anana', 'ciruela', 'cereza', 'arandano', 'mango', 'papaya',
    ],
  },
];

const ENTERA = (p) => new RegExp(`(^| )${normalizeText(p)}s?( |$)`);
const REGEX_GRUPOS = GRUPOS.map((g) => ({ clave: g.clave, res: g.palabras.map(ENTERA) }));

/* Con qué se compara un alimento para decir "es el mismo que aquel": la clave de su grupo
   si pertenece a alguno ("ensalada de frutas" → fruta), o su propio nombre sin tildes ni
   plural. Una "ensalada" a secas NO es fruta: se mira la palabra entera. */
export function claveAlimento(name) {
  const norm = normalizeText(name);
  const grupo = REGEX_GRUPOS.find((g) => g.res.some((re) => re.test(norm)));
  return grupo ? grupo.clave : norm.replace(/s$/, '');
}

const grupoDe = (name) => {
  const norm = normalizeText(name);
  return GRUPOS.find((g) => REGEX_GRUPOS.find((r) => r.clave === g.clave).res.some((re) => re.test(norm)));
};

// ¿Lo que sobra de este alimento cubre lo que faltó en otra comida? (hoy: solo fruta)
export const compensaEntreComidas = (name) => !!grupoDe(name)?.compensa;

// Pasarse baja la nota en carbohidratos y grasas; en proteína no, y en lo que se compensa
// entre comidas (fruta) tampoco: lo que sobra ahí es justamente lo que cubre a otra comida.
const penalizaDeMas = ({ tipo, name }) => (tipo === 'carbo' || tipo === 'grasa') && !compensaEntreComidas(name);

/* Cuánto se cumplió de UN alimento, de 0 a 1, aplicando las reglas de arriba:
   - faltó, pero dentro de la tolerancia → 1;
   - faltó de más → lo comido sobre lo pedido;
   - se pasó (en carbo o grasa, más allá de la tolerancia) → lo pedido sobre lo comido;
   - cualquier otro caso → 1.
   `item` es { name, tipo, unit, qty } (qty = lo que pide el plan); `got` lo comido. */
export function cumplimientoDeAlimento(item, got) {
  if (!(item.qty > 0)) return 1;
  const tol = toleranciaDe(item);
  if (got < item.qty) return item.qty - got <= tol ? 1 : got / item.qty;
  if (got > item.qty + tol && penalizaDeMas(item)) return item.qty / got;
  return 1;
}
