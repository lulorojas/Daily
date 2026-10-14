import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComidasPage } from './ComidasPage';
import { renderScreen } from '../test/utils';
import { emptyDoc } from '../test/fixtures';
import { todayISO } from '../lib/dates';
import { activePlan } from '../lib/meals';
import { PLAN_NUTRI_2026_10 } from '../lib/mealPlanTemplates';
import { loadMealPlanTemplate } from '../store/mutations';

/* ============================================================================
   COMIDAS

   Sexta sección, sin equivalente en vanilla: no hay nada contra qué comparar en
   src/compat/, así que se prueba directo. Lo que importa de verdad: que administrar el
   plan y los extras escriba bien el documento, y que escribir en la bitácora dispare el
   reconocimiento (matchEntry) con lo que había cargado en ese momento.
   ============================================================================ */

// Un documento con plan y extras ya cargados, para no repetir el alta en cada test.
function docConPlan() {
  return {
    ...emptyDoc(),
    meals: {
      plan: [{ id: 's1', name: 'Almuerzo', options: [{ id: 'o1', text: 'Milanesa con ensalada' }] }],
      extras: [{ id: 'e1', name: 'Café', color: '#B49BE8', icon: 'agua' }],
      log: {},
    },
  };
}

describe('estados vacíos', () => {
  it('sin plan, invita a crear la primera franja', () => {
    renderScreen(<ComidasPage />, { doc: emptyDoc() });
    expect(screen.getByText(/Todavía no armaste tu plan/)).toBeInTheDocument();
  });

  it('sin extras, explica para qué sirven', () => {
    renderScreen(<ComidasPage />, { doc: emptyDoc() });
    expect(screen.getByText(/Café, alcohol, permitidos/)).toBeInTheDocument();
  });

  it('sin entradas, lo dice sin inventar nada', () => {
    renderScreen(<ComidasPage />, { doc: emptyDoc() });
    expect(screen.getByText('Nada anotado todavía para este día.')).toBeInTheDocument();
  });
});

describe('administrar el plan', () => {
  it('crear una franja la agrega al documento y vuelve a la lista', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: emptyDoc() });

    await user.click(within(screen.getByText('Plan de comidas').closest('.sect')).getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: 'Nueva franja' }));
    await user.type(screen.getByLabelText('Nombre'), 'Desayuno');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(activePlan(leer()).slots.map((s) => s.name)).toEqual(['Desayuno']);
    expect(screen.getByRole('dialog', { name: 'Plan de comidas' })).toBeInTheDocument();
  });

  it('agregar una opción adentro de una franja', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.click(within(screen.getByText('Plan de comidas').closest('.sect')).getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: 'Almuerzo' }));   // abre sus opciones
    await user.click(screen.getByRole('button', { name: 'Nueva opción' }));
    await user.type(screen.getByLabelText(/Opción de Almuerzo/), 'Pollo con arroz');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(activePlan(leer()).slots[0].options.map((o) => o.text)).toEqual(['Milanesa con ensalada', 'Pollo con arroz']);
  });

  it('una opción puede llevar alimentos medidos en gramos (pedido explícito: "a veces pueden ser pesos")', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.click(within(screen.getByText('Plan de comidas').closest('.sect')).getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: 'Almuerzo' }));
    await user.click(screen.getByRole('button', { name: 'Nueva opción' }));
    await user.type(screen.getByLabelText(/Opción de Almuerzo/), 'Pollo con papas');
    await user.click(screen.getByRole('button', { name: 'Agregar alimento' }));
    await user.type(screen.getByLabelText('Alimento'), 'pollo');
    await user.clear(screen.getByLabelText('Cantidad del plan'));
    await user.type(screen.getByLabelText('Cantidad del plan'), '250');
    await user.selectOptions(screen.getByLabelText('Unidad'), 'gr');
    await user.selectOptions(screen.getByLabelText('Macro'), 'proteina');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    const opt = activePlan(leer()).slots[0].options[1];
    expect(opt).toMatchObject({ text: 'Pollo con papas', items: [{ name: 'pollo', qty: 250, unit: 'gr', tipo: 'proteina' }] });
  });

  it('borrar una franja pide confirmación', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.click(within(screen.getByText('Plan de comidas').closest('.sect')).getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: 'Eliminar Almuerzo' }));
    expect(screen.getByText('¿Eliminar "Almuerzo"?')).toBeInTheDocument();

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));
    expect(activePlan(leer()).slots).toEqual([]);
  });

  it('el plan se ve de solo lectura en la pantalla, con sus opciones', () => {
    renderScreen(<ComidasPage />, { doc: docConPlan() });
    const plan = screen.getByText('Plan de comidas').closest('.sect');
    expect(within(plan).getByText('Almuerzo')).toBeInTheDocument();
    expect(within(plan).getByText('Milanesa con ensalada')).toBeInTheDocument();
  });

  it('"Nuevo plan" pide confirmación y archiva el plan actual (historial de planes)', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });
    const viejaId = activePlan(leer()).id;

    await user.click(within(screen.getByText('Plan de comidas').closest('.sect')).getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: /Nuevo plan/ }));
    expect(screen.getByText('¿Empezar un plan nuevo?')).toBeInTheDocument();

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Empezar' }));

    expect(leer().meals.plans).toHaveLength(2);
    expect(leer().meals.plans.find((p) => p.id === viejaId).endISO).not.toBeNull();
    // La franja se copia (mismo nombre), pero sin opciones — hay que volver a cargarlas.
    expect(activePlan(leer()).slots.map((s) => s.name)).toEqual(['Almuerzo']);
    expect(activePlan(leer()).slots[0].options).toEqual([]);
  });
});

describe('administrar extras', () => {
  it('crear un extra lo agrega al catálogo', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: emptyDoc() });

    await user.click(within(screen.getByText('Extras').closest('.sect')).getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: 'Nuevo extra' }));
    await user.type(screen.getByLabelText('Nombre'), 'Alcohol');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(leer().meals.extras.map((e) => e.name)).toEqual(['Alcohol']);
  });

  it('crear un extra con calidad "Evitar" la guarda en el documento', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: emptyDoc() });

    await user.click(within(screen.getByText('Extras').closest('.sect')).getByRole('button', { name: /Editar/ }));
    await user.click(screen.getByRole('button', { name: 'Nuevo extra' }));
    await user.type(screen.getByLabelText('Nombre'), 'Alcohol');
    await user.click(screen.getByRole('button', { name: 'Evitar' }));
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(leer().meals.extras[0]).toMatchObject({ name: 'Alcohol', quality: 'malo' });
  });

  it('cada extra muestra cuántas veces apareció esta semana', () => {
    const doc = docConPlan();
    doc.meals.log[todayISO()] = [
      { id: 'x1', at: Date.now(), text: 'un café', matches: { options: [], extras: ['e1'] } },
    ];
    renderScreen(<ComidasPage />, { doc });

    // "Café" aparece dos veces en la pantalla (la fila del extra y la etiqueta de la
    // entrada que lo mencionó): se acota a la sección de extras.
    const seccion = screen.getByText('Extras').closest('.sect');
    expect(within(seccion).getByText('Café')).toBeInTheDocument();
    expect(within(seccion).getByText(/1 esta semana/)).toBeInTheDocument();
  });
});

describe('bitácora', () => {
  it('escribir una entrada la guarda en el día que se está mirando', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.type(screen.getByLabelText('Qué comiste'), 'Comí milanesa con ensalada');
    await user.click(screen.getByRole('button', { name: 'Anotar' }));

    const entradas = leer().meals.log[todayISO()];
    expect(entradas).toHaveLength(1);
    expect(entradas[0].text).toBe('Comí milanesa con ensalada');
  });

  it('el bot reconoce la opción del plan y la muestra como etiqueta', async () => {
    const user = userEvent.setup();
    renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.type(screen.getByLabelText('Qué comiste'), 'hoy comí milanesa con ensalada');
    await user.click(screen.getByRole('button', { name: 'Anotar' }));

    expect(screen.getByText('Almuerzo: Milanesa con ensalada')).toBeInTheDocument();
  });

  it('reconoce un extra mencionado en la misma entrada', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.type(screen.getByLabelText('Qué comiste'), 'un café después del almuerzo');
    await user.click(screen.getByRole('button', { name: 'Anotar' }));

    expect(leer().meals.log[todayISO()][0].matches.extras).toEqual(['e1']);
  });

  it('una entrada que no matchea nada se guarda igual, sin etiquetas', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.type(screen.getByLabelText('Qué comiste'), 'tomé agua');
    await user.click(screen.getByRole('button', { name: 'Anotar' }));

    const entrada = leer().meals.log[todayISO()][0];
    expect(entrada.text).toBe('tomé agua');
    expect(entrada.matches).toEqual({ options: [], extras: [] });
    expect(screen.getByText('tomé agua')).toBeInTheDocument();
  });

  it('un texto vacío no agrega nada', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docConPlan() });

    await user.click(screen.getByRole('button', { name: 'Anotar' }));
    expect(leer().meals.log[todayISO()]).toBeUndefined();
  });

  it('borrar una entrada la saca de la lista', async () => {
    const user = userEvent.setup();
    const doc = docConPlan();
    doc.meals.log[todayISO()] = [
      { id: 'x1', at: Date.now(), text: 'un café', matches: { options: [], extras: ['e1'] } },
    ];
    const { doc: leer } = renderScreen(<ComidasPage />, { doc });

    await user.click(screen.getByRole('button', { name: 'Borrar "un café"' }));
    expect(leer().meals.log[todayISO()]).toEqual([]);
  });

  it('una entrada que matchea una opción cuantificada muestra el desglose "2/3" debajo (pedido explícito: medir lo que comí)', () => {
    const doc = {
      ...emptyDoc(),
      meals: {
        plans: [{
          id: 'p1',
          startISO: todayISO(),
          endISO: null,
          slots: [{ id: 's1', name: 'Desayuno', options: [{ id: 'o1', items: [{ id: 'i1', name: 'tostadas', qty: 3 }, { id: 'i2', name: 'huevos', qty: 3 }] }] }],
        }],
        extras: [],
        log: {
          [todayISO()]: [
            { id: 'x1', at: Date.now(), text: 'comí 2 tostadas y 3 huevos', matches: { options: [{ slotId: 's1', optionId: 'o1', items: [{ itemId: 'i1', qty: 2 }, { itemId: 'i2', qty: 3 }] }], extras: [] } },
          ],
        },
      },
    };
    renderScreen(<ComidasPage />, { doc });

    const bitacora = screen.getByText('Bitácora').closest('.sect');
    expect(within(bitacora).getByText('2/3 tostadas')).toBeInTheDocument();
    expect(within(bitacora).getByText('3/3 huevos')).toBeInTheDocument();
  });
});

/* "Tu día" — registrar tocando en vez de escribiendo (pedido explícito: "que yo pueda
   llevar de una manera fácil, clara y didáctica el registro de mis comidas"). */
describe('tu día', () => {
  function docMedible() {
    return {
      ...emptyDoc(),
      meals: {
        plans: [{
          id: 'p1',
          startISO: todayISO(),
          endISO: null,
          slots: [
            { id: 's1', name: 'Desayuno', options: [{ id: 'o1', text: 'Panes con huevo', items: [{ id: 'i1', name: 'pan', qty: 3 }, { id: 'i2', name: 'fruta', qty: 200, unit: 'gr' }] }] },
            { id: 's2', name: 'Cena', options: [{ id: 'o2', text: 'Milanesa' }] },
          ],
        }],
        extras: [{ id: 'e1', name: 'Café', color: '#B49BE8', icon: 'agua' }],
        log: {},
      },
    };
  }

  it('sin plan, ofrece cargar el de la nutricionista y lo carga con un toque', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Cargar el plan de la nutricionista' }));

    const plan = activePlan(leer());
    expect(plan.slots.map((s) => s.name)).toEqual(['Desayuno', 'Almuerzo', 'Merienda', 'Cena']);
    expect(leer().meals.extras.map((e) => e.name)).toEqual(['Alcohol']);
    expect(screen.getByText('Guía de tu nutricionista')).toBeInTheDocument();
  });

  it('cada franja arranca pendiente, con una frase que dice qué falta', () => {
    renderScreen(<ComidasPage />, { doc: docMedible() });
    const dia = screen.getByText('Tu día').closest('.sect');
    expect(within(dia).getByText('Todavía no registraste nada. Tocá una comida para empezar.')).toBeInTheDocument();
    expect(within(dia).getAllByText('Pendiente')).toHaveLength(2);
  });

  it('registrar tocando: elegir la opción, bajar un pan, marcar "lo pesé" y guardar', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docMedible() });

    await user.click(screen.getByRole('button', { name: 'Registrar Desayuno' }));
    await user.click(screen.getByRole('button', { name: /Panes con huevo/ }));
    await user.click(screen.getByRole('button', { name: 'Menos pan' }));
    await user.click(screen.getByRole('switch', { name: 'Lo pesé en la balanza' }));
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    const [entrada] = leer().meals.log[todayISO()];
    expect(entrada.matches.options[0].items).toEqual([{ itemId: 'i1', qty: 2 }, { itemId: 'i2', qty: 200 }]);
    expect(entrada.pesado).toBe(true);

    const dia = screen.getByText('Tu día').closest('.sect');
    expect(within(dia).getByText('Parcial')).toBeInTheDocument();
    expect(within(dia).getByText('2/3 pan')).toBeInTheDocument();
    expect(within(dia).getByText('Te falta: Cena.')).toBeInTheDocument();
  });

  it('a una opción se le suma algo de otra opción de la misma comida (pedido explícito: arroz con pollo + wok)', async () => {
    const user = userEvent.setup();
    const doc = docMedible();
    doc.meals.plans[0].slots[0].options.push({
      id: 'o3', text: 'Wok de pollo', items: [{ id: 'w1', name: 'verdura', qty: 200, unit: 'gr' }, { id: 'w2', name: 'fideos', qty: 300, unit: 'gr' }],
    });
    const { doc: leer } = renderScreen(<ComidasPage />, { doc });

    await user.click(screen.getByRole('button', { name: 'Registrar Desayuno' }));
    await user.click(screen.getByRole('button', { name: /Panes con huevo/ }));
    await user.click(screen.getByRole('button', { name: 'Sumar algo de otra opción' }));
    await user.click(screen.getByRole('button', { name: 'Sumar verdura de Wok de pollo' }));
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    const [entrada] = leer().meals.log[todayISO()];
    expect(entrada.matches.options[0].suma).toEqual([{ optionId: 'o3', name: 'verdura', qty: 200, unit: 'gr' }]);
    const dia = screen.getByText('Tu día').closest('.sect');
    expect(within(dia).getByText('+ 200 gr verdura')).toBeInTheDocument();
    expect(within(dia).getByText('Cumplida')).toBeInTheDocument(); // sumar no la vuelve pifiada
  });

  it('una opción sin alimentos se registra con un solo toque', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docMedible() });

    await user.click(screen.getByRole('button', { name: 'Registrar Cena' }));
    await user.click(screen.getByRole('button', { name: /Milanesa/ }));

    expect(leer().meals.log[todayISO()][0].matches.options).toEqual([{ slotId: 's2', optionId: 'o2' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fuera del plan pero sano: se anota EN la franja y queda como "Fuera del plan" (pedido explícito)', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docMedible() });

    await user.click(screen.getByRole('button', { name: 'Registrar Desayuno' }));
    await user.type(screen.getByLabelText('Qué comiste fuera del plan'), 'yogur con frutas');
    await user.click(screen.getByRole('button', { name: 'Anotar fuera del plan' }));

    const [entrada] = leer().meals.log[todayISO()];
    expect(entrada.libre).toEqual({ slotId: 's1', que: 'yogur con frutas', tipo: 'sana' });

    const dia = screen.getByText('Tu día').closest('.sect');
    expect(within(dia).getByText('Fuera del plan')).toBeInTheDocument();
    expect(within(dia).getByText('yogur con frutas')).toBeInTheDocument();
    expect(within(dia).getByText('Te falta: Cena.')).toBeInTheDocument();
  });

  it('un permitido en lugar de una comida cuenta como pifiada (pedido explícito: "unas galletas en el desayuno")', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docMedible() });

    await user.click(screen.getByRole('button', { name: 'Registrar Desayuno' }));
    await user.type(screen.getByLabelText('Qué comiste fuera del plan'), 'unas galletas');
    await user.click(screen.getByRole('button', { name: 'Permitido' }));
    await user.click(screen.getByRole('button', { name: 'Anotar fuera del plan' }));

    expect(leer().meals.log[todayISO()][0].libre).toEqual({ slotId: 's1', que: 'unas galletas', tipo: 'permitido' });
    const dia = screen.getByText('Tu día').closest('.sect');
    expect(within(dia).getAllByText('Permitido').length).toBeGreaterThan(0);
    expect(within(dia).getByText('Te falta: Cena. Llevás 1 permitido.')).toBeInTheDocument();
  });

  it('un permitido suelto ("un alfajor a la tarde") no ocupa ninguna comida', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docMedible() });

    await user.click(screen.getByRole('button', { name: 'Anotar un permitido suelto' }));
    await user.type(screen.getByLabelText('Qué comiste fuera del plan'), 'un alfajor');
    await user.click(screen.getByRole('button', { name: 'Anotar fuera del plan' }));

    expect(leer().meals.log[todayISO()][0].libre).toEqual({ que: 'un alfajor', tipo: 'permitido' });
    const dia = screen.getByText('Tu día').closest('.sect');
    expect(within(dia).getByText('un alfajor')).toBeInTheDocument();
    expect(within(dia).getAllByText('Pendiente')).toHaveLength(2); // las dos comidas siguen pendientes
  });

  it('sacar un alimento al registrar, y volver a ponerlo después desde "Editar" (pedido explícito)', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docMedible() });

    await user.click(screen.getByRole('button', { name: 'Registrar Desayuno' }));
    await user.click(screen.getByRole('button', { name: /Panes con huevo/ }));
    await user.click(screen.getByRole('button', { name: 'Sacar fruta' }));
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    let [entrada] = leer().meals.log[todayISO()];
    expect(entrada.matches.options[0].items).toEqual([{ itemId: 'i1', qty: 3 }, { itemId: 'i2', qty: 0 }]);
    expect(entrada.text).toBe('Desayuno: Panes con huevo (3 pan — sin fruta)');

    // Más tarde: comió la fruta.
    await user.click(screen.getByRole('button', { name: 'Editar Desayuno: Panes con huevo' }));
    await user.click(screen.getByRole('button', { name: 'Volver a poner fruta' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const entradas = leer().meals.log[todayISO()];
    expect(entradas).toHaveLength(1); // se corrigió la misma entrada, no se sumó otra
    [entrada] = entradas;
    expect(entrada.matches.options[0].items).toEqual([{ itemId: 'i1', qty: 3 }, { itemId: 'i2', qty: 200 }]);
    expect(within(screen.getByText('Tu día').closest('.sect')).getByText('Cumplida')).toBeInTheDocument();
  });

  it('si se borró algo del plan de la nutricionista, avisa y lo recupera (pedido explícito: "restablecé lo del queso")', async () => {
    const user = userEvent.setup();
    const doc = { ...emptyDoc(), meals: { plans: [], extras: [], log: {} } };
    // El plan cargado, con el queso borrado de "Panes con queso y huevo" del desayuno.
    const plantilla = structuredClone(PLAN_NUTRI_2026_10);
    plantilla.slots[0].options[0].items = plantilla.slots[0].options[0].items.filter((i) => !i.name.includes('queso'));
    loadMealPlanTemplate(doc, plantilla);
    const { doc: leer } = renderScreen(<ComidasPage />, { doc });

    await user.click(within(screen.getByText('Plan de comidas').closest('.sect')).getByRole('button', { name: 'Agregar' }));
    expect(screen.getByText(/Desayuno › Panes con queso y huevo › cucharadas de queso untable/)).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Agregar' }));

    const items = activePlan(leer()).slots[0].options[0].items.map((i) => i.name);
    expect(items).toEqual(['pan', 'cucharadas de queso untable', 'huevo', 'fruta']); // en su lugar, no al final
  });

  it('el "+" de un extra lo anota de un toque', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<ComidasPage />, { doc: docMedible() });

    await user.click(screen.getByRole('button', { name: 'Anotar Café' }));

    expect(leer().meals.log[todayISO()][0].matches.extras).toEqual(['e1']);
  });
});
