import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComidasPage } from './ComidasPage';
import { renderScreen } from '../test/utils';
import { emptyDoc } from '../test/fixtures';
import { todayISO } from '../lib/dates';
import { activePlan } from '../lib/meals';

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
    expect(screen.getByText('Almuerzo')).toBeInTheDocument();
    expect(screen.getByText('Milanesa con ensalada')).toBeInTheDocument();
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
});
