// Igual a normalizeText de lib/meals.js, escrita acá para no depender de ese archivo (que
// importa a este): minúsculas, sin tildes, espacios colapsados.
const normalizeText = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/* ============================================================================
   REGLAS DE CALIFICACIÓN DE LAS COMIDAS

   Acá viven, todas juntas y en una tabla, las reglas con las que Daily decide cuánto "cuenta"
   una comida. Son reglas que se van hablando de a una (pedido explícito: "son reglas que iremos
   hablando"), así que agregar o ajustar una es tocar ESTE archivo, no la cuenta de lib/meals.js.

   Hoy hay diez:

   1. TOLERANCIAS — no todo lo que falta baja la nota por igual. Faltar 1 tostada (un
      carbohidrato, y poco) no baja nada; faltar 1 huevo o 50 gramos de proteína sí. Cada
      macro (el `tipo` que se le pone a un alimento del plan) tiene cuánto puede faltar sin
      consecuencias. Pasado ese margen, la nota baja como siempre: lo comido sobre lo pedido
      (no hay "perdón parcial": o entra en la tolerancia, o cuenta lo que faltó).

   2. EQUIVALENCIAS — hay alimentos que valen lo mismo aunque se llamen distinto. Una banana,
      una manzana o una ensalada de frutas son "fruta".

   3. PASARSE — comer de más de un carbohidrato o de una grasa también baja la nota (pasado
      el margen de tolerancia); comer de más de proteína no. Los alimentos sin macro no se
      penalizan por pasarse.

   4. COMPENSACIÓN — por ahora SOLO la fruta compensa entre comidas del día: si al desayuno
      le faltó y en otra comida se comió de más (o una ensalada de frutas), la fruta del día se
      cumple. Los demás alimentos se miden comida por comida (decisión explícita).

   5. LA FRUTA SE CUENTA POR PIEZA, no por gramos — "nunca se pesan las frutas, solo importa
      comer y cuáles". Cada fruta del plan vale UNA pieza, sea cual sea la cantidad en gramos
      que diga el plan; comer una banana cubre una fruta, dos manzanas cubren dos. Un número
      chico anotado sobre una fruta en gramos ("2 frutas") se lee como piezas.

   6. LAS VERDURAS NO BAJAN LA NOTA — "no baja nota que no estén": una verdura o ensalada que
      falta no cuenta en contra, y ni siquiera entra en el promedio de la comida (así no la
      "diluye" ni la "suma"). Comerlas, igual, queda anotado.

   7. SOLO CUENTAN LOS ALIMENTOS CON MACRO — un alimento del plan sin macro (queso, salsa, una
      croqueta) es opcional, igual que las verduras: si falta, no baja la nota. Lo que cuenta es
      lo que lleva carbohidrato, proteína o grasa, más la fruta.

   8. SUMAR DE MÁS — si a una comida se le suma un carbohidrato o una grasa que no estaba en
      el plan (una papa extra), eso también es pasarse y baja la nota (ver nota
      sumaDeMas).

  10. PERMITIDO — un permitido anotado en una comida la vuelve mala del todo: esa comida
      cuenta 0%, aunque también tenga algo del plan registrado.

   9. PROTEÍNA EN ALMUERZO Y CENA — toda opción de almuerzo o cena lleva su proteína pesada,
      250 gr (una milanesa también se pesa). Ver proteinaImplicita().
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

/* Grupos de alimentos. Cada grupo tiene una `clave` (con la que se comparan los alimentos
   entre sí) y las palabras que lo identifican dentro del nombre de un alimento.
   - `compensa`: lo que sobra de este grupo cubre lo que faltó en otra comida del día.
   - `porPieza`: se cuenta por piezas, no por gramos.
   - `opcional`: que falte no baja la nota (ni entra al promedio). */
export const GRUPOS = [
  {
    clave: 'fruta',
    compensa: true,
    porPieza: true,
    palabras: [
      'fruta', 'banana', 'manzana', 'naranja', 'mandarina', 'pomelo', 'pera', 'durazno', 'kiwi', 'frutilla',
      'uva', 'sandia', 'melon', 'ananá', 'anana', 'ciruela', 'cereza', 'arandano', 'mango', 'papaya',
    ],
  },
  {
    clave: 'verdura',
    opcional: true,
    palabras: [
      'verdura', 'ensalada', 'lechuga', 'tomate', 'zanahoria', 'brocoli', 'espinaca', 'pepino', 'rucula', 'repollo',
      'zapallito', 'zucchini', 'berenjena', 'acelga', 'remolacha', 'morron', 'cebolla', 'coliflor', 'chauchas',
    ],
  },
];

const ENTERA = (p) => new RegExp(`(^| )${normalizeText(p)}s?( |$)`);
const REGEX_GRUPOS = GRUPOS.map((g) => ({ grupo: g, res: g.palabras.map(ENTERA) }));

// El grupo al que pertenece un alimento (por las palabras de su nombre), o undefined. La
// fruta va primero: "ensalada de frutas" es fruta, "ensalada" a secas es verdura.
export const grupoDe = (name) => {
  const norm = normalizeText(name);
  return REGEX_GRUPOS.find((r) => r.res.some((re) => re.test(norm)))?.grupo;
};

/* Con qué se compara un alimento para decir "es el mismo que aquel": la clave de su grupo
   si pertenece a alguno, o su propio nombre sin tildes ni plural. */
export function claveAlimento(name) {
  const g = grupoDe(name);
  return g ? g.clave : normalizeText(name).replace(/s$/, '');
}

// ¿Lo que sobra de este alimento cubre lo que faltó en otra comida? (hoy: solo fruta)
export const compensaEntreComidas = (name) => !!grupoDe(name)?.compensa;

const esPorPieza = (name) => !!grupoDe(name)?.porPieza;

// ¿Que falte no baja la nota? Las verduras y ensaladas, y todo alimento sin macro (queso,
// salsa, croquetas…), salvo la fruta, que siempre cuenta. `item` es { name, tipo }.
export const esOpcional = ({ name, tipo }) => !!grupoDe(name)?.opcional || (!tipo && !esPorPieza(name));

/* Cantidad "efectiva" de un alimento: la que se compara. En lo que se cuenta por pieza
   (fruta) son las piezas: un número chico sobre una fruta en gramos ("2 frutas" → 2) ya son
   piezas; uno grande son gramos y se redondea contra lo que pide el plan, con un mínimo de
   1 si se comió algo. En todo lo demás es la cantidad tal cual. */
export function cantidadEfectiva(name, qty, unit, planQty = 200) {
  if (!esPorPieza(name) || unit !== 'gr') return qty;
  if (!(qty > 0)) return 0;
  if (qty < 20) return qty;
  return Math.max(1, Math.round(qty / (planQty > 0 ? planQty : 200)));
}

// Cuánto pide el plan de este alimento, en la misma unidad "efectiva": una fruta es 1 pieza.
export const esperadoEfectivo = (item) => (esPorPieza(item.name) ? 1 : item.qty);

// Cuánto puede faltar de este alimento (en SU unidad: unidades o gramos) sin consecuencias.
export function toleranciaDe({ tipo, unit, qty, name }) {
  const t = TOLERANCIAS[tipo];
  if (!t || !(qty > 0) || esPorPieza(name)) return 0;
  return unit === 'gr' ? qty * t.fraccion : Math.max(t.unidades, Math.floor(qty * t.fraccion));
}

// Pasarse baja la nota en carbohidratos y grasas; en proteína no, y en lo que se compensa
// entre comidas (fruta) tampoco: lo que sobra ahí es justamente lo que cubre a otra comida.
export const penalizaDeMas = ({ tipo, name }) => (tipo === 'carbo' || tipo === 'grasa') && !compensaEntreComidas(name);

/* Cuánto se cumplió de UN alimento, de 0 a 1, con cantidades ya EFECTIVAS (`qty` lo pedido,
   `got` lo comido, en la misma unidad):
   - faltó, pero dentro de la tolerancia → 1;
   - faltó de más → lo comido sobre lo pedido;
   - se pasó (en carbo o grasa, más allá de la tolerancia) → lo pedido sobre lo comido;
   - cualquier otro caso → 1. */
export function cumplimientoEfectivo(item, got) {
  if (!(item.qty > 0)) return 1;
  const tol = toleranciaDe(item);
  if (got < item.qty) return item.qty - got <= tol ? 1 : got / item.qty;
  if (got > item.qty + tol && penalizaDeMas(item)) return item.qty / got;
  return 1;
}

/* Lo mismo con las cantidades CRUDAS del registro (gramos o unidades como se anotaron):
   las pasa a efectivas y aplica las reglas. `item` es { name, tipo, unit, qty }. Una verdura
   o ensalada siempre da 1. */
export function cumplimientoDeAlimento(item, got) {
  if (esOpcional(item)) return 1;
  return cumplimientoEfectivo(
    { ...item, qty: esperadoEfectivo(item) },
    cantidadEfectiva(item.name, got, item.unit, item.qty),
  );
}

/* Almuerzo y cena llevan una proteína de 250 gr: una opción de esas comidas que no trae
   ningún alimento medible ("Milanesa") se completa con ella, para que se pese como todas. */
export const llevaProteina = (slotName) => /almuerz|cena/.test(normalizeText(slotName));
export const PROTEINA_GR = 250;
export function proteinaImplicita(optionText, id) {
  return { id, name: normalizeText(optionText) || 'proteína', qty: PROTEINA_GR, unit: 'gr', tipo: 'proteina' };
}
