/* ----------------------------- PLANES PARA CARGAR DE UNA -----------------------------
   El plan que Lulo mandó en PDF ("Plan de alimentación Luciano Rojas", Lic. Laura
   Bevacqua, 07-10-26), listo para cargar con un toque desde Comidas
   (loadMealPlanTemplate en store/mutations.js) en vez de tipear ~20 opciones a mano.

   Cómo se transcribió (decisiones confirmadas con Lulo):
   - Lo que importa son las OPCIONES de cada franja, no el día de la semana ("puedo
     repetir 7 veces el lunes, lo que importa es comer una de las opciones"): cada
     columna del PDF se aplanó, y una comida que se repite en varios días va una vez.
   - Media mañana y media tarde quedan afuera (ya lo habló con la nutricionista).
   - Creatina, agua y sueño no van: la creatina ya es un hábito, el agua la cuenta él y el
     sueño lo mide el reloj.
   - Los nombres de los ítems van en singular y cortos ("pan", "huevo") para que el bot los
     reconozca también en plural cuando se escribe en la bitácora ("3 panes").
   - Las porciones genéricas de la hoja de recomendaciones (proteína 250 gr, hidrato
     300 gr, verduras 200 gr) completan las comidas que en el PDF no dicen cuánto.

   No es código de la app en general: es un dato, como un backup. Una cuenta nueva no lo
   ve salvo que toque "Cargar el plan". */
export const PLAN_NUTRI_2026_10 = {
  name: 'Plan Lic. Bevacqua (07/10/26)',
  guide: [
    'Pesá los alimentos ya cocidos, con la balanza de cocina.',
    'Proteína: 250 gr cocido (2½ palmas de la mano, sin los dedos). Vaca, pollo, cerdo magro o pescado — pescado todos los días que puedas.',
    'Hidrato: 300 gr cocido (12 cucharadas soperas al ras) de arroz, polenta, cuscús o quínoa; o fideos 200 gr; o 3 papas, 3 batatas o 3 boniatos chicos; o 3 rodajas de calabaza tamaño CD; o 1½ lata de choclo.',
    'Vegetales: 200 gr, a elección.',
    'Fruta grande = 200 gr.',
    'Aceite de oliva: 3 cucharadas tipo té por día.',
    'Comé cada 3 horas. Si no tenés tiempo de merendar, licuado proteico.',
    'Evitá el alcohol (solo suma masa adiposa).',
  ],
  slots: [
    {
      name: 'Desayuno',
      options: [
        {
          text: 'Panes con queso y huevo',
          items: [
            { name: 'pan', qty: 3, tipo: 'carbo' },
            { name: 'cucharadas de queso untable', qty: 3 },
            { name: 'huevo', qty: 3, tipo: 'proteina' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Panes árabes con omelette',
          items: [
            { name: 'pan arabe', qty: 3, tipo: 'carbo' },
            { name: 'huevo', qty: 3, tipo: 'proteina' },
            { name: 'feta de queso', qty: 1 },
            { name: 'tomate y zanahoria', qty: 200, unit: 'gr' },
          ],
        },
        {
          text: 'Tortita de banana',
          items: [
            { name: 'banana', qty: 200, unit: 'gr', tipo: 'carbo' },
            { name: 'avena', qty: 60, unit: 'gr', tipo: 'carbo' },
            { name: 'huevo', qty: 2, tipo: 'proteina' },
            { name: 'granola', qty: 30, unit: 'gr', tipo: 'carbo' },
          ],
        },
      ],
    },
    {
      name: 'Almuerzo',
      options: [
        {
          text: 'Pollo con boniatos al horno',
          items: [
            { name: 'pollo', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'boniato', qty: 3, tipo: 'carbo' },
            { name: 'verdura', qty: 200, unit: 'gr' },
            { name: 'pomelo', qty: 100, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Pechuga con choclo y papas',
          items: [
            { name: 'pechuga', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'papa', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'verdura', qty: 200, unit: 'gr' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Lomo con arroz yamaní',
          items: [
            { name: 'lomo', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'arroz', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'verdura', qty: 200, unit: 'gr' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Milanesa de merluza con puré',
          items: [
            { name: 'merluza', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'pure', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'ensalada', qty: 200, unit: 'gr' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Bife con batatas',
          items: [
            { name: 'bife', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'batata', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'ensalada', qty: 200, unit: 'gr' },
            { name: 'naranja', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Solomillo con arroz amarillo',
          items: [
            { name: 'solomillo', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'arroz', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'verdura', qty: 200, unit: 'gr' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Pasta con salsa boloñesa',
          items: [
            { name: 'pasta', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'ensalada de frutas', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
      ],
    },
    {
      name: 'Merienda',
      options: [
        {
          text: 'Panes árabes con omelette',
          items: [
            { name: 'pan arabe', qty: 3, tipo: 'carbo' },
            { name: 'huevo', qty: 3, tipo: 'proteina' },
            { name: 'feta de queso', qty: 1 },
            { name: 'tomate y zanahoria', qty: 200, unit: 'gr' },
          ],
        },
        {
          text: 'Pancake de avena',
          items: [
            { name: 'huevo', qty: 3, tipo: 'proteina' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
            { name: 'avena', qty: 90, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Panes con queso y huevo',
          items: [
            { name: 'pan', qty: 3, tipo: 'carbo' },
            { name: 'cucharadas de queso untable', qty: 3 },
            { name: 'huevo', qty: 3, tipo: 'proteina' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Licuado proteico',
          items: [
            { name: 'scoop de whey', qty: 1, tipo: 'proteina' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
            { name: 'vainilla', qty: 6, tipo: 'carbo' },
          ],
        },
      ],
    },
    {
      name: 'Cena',
      options: [
        {
          text: 'Pan de carne con puré',
          items: [
            { name: 'pan de carne', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'pure', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'croqueta de espinaca', qty: 2 },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Tallarines con cerdo',
          items: [
            { name: 'tallarines', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'cerdo', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'citricos', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Wok de pollo con fideos',
          items: [
            { name: 'pollo', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'fideos', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'verdura', qty: 200, unit: 'gr' },
            { name: 'manzana', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Chuleta de cerdo con boniatos',
          items: [
            { name: 'chuleta', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'boniato', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'verdura', qty: 200, unit: 'gr' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Pescado estofado con arvejas',
          items: [
            { name: 'pescado', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'papa', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'verdura', qty: 200, unit: 'gr' },
            { name: 'fruta', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Filet de merluza con budín',
          items: [
            { name: 'merluza', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'papa', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'budin de verduras', qty: 200, unit: 'gr' },
            { name: 'banana', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
        {
          text: 'Batatas con milanesa de pollo',
          items: [
            { name: 'milanesa', qty: 250, unit: 'gr', tipo: 'proteina' },
            { name: 'batata', qty: 300, unit: 'gr', tipo: 'carbo' },
            { name: 'ensalada', qty: 200, unit: 'gr' },
            { name: 'mandarina', qty: 200, unit: 'gr', tipo: 'carbo' },
          ],
        },
      ],
    },
  ],
  extras: [
    { name: 'Alcohol', color: '#FF9B93', icon: 'llama', quality: 'malo' },
    { name: 'Comida libre', color: '#6FD2D2', icon: 'corazon', quality: 'bueno' },
  ],
};
