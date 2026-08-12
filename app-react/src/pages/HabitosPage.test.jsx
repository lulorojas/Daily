import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HabitosPage } from './HabitosPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc, TODAY, TOMORROW, mondayAgo } from '../test/fixtures';
import { mondayOf, parseISO, iso } from '../lib/dates';

/* ============================================================================
   HÁBITOS

   Las rachas y los conteos ya están comparados contra la app vanilla en
   src/compat/vanilla.test.js (habitStreak, habitBestStreak, habitDayMarks…) y el texto
   completo de la pantalla contra viewHabitos() en src/compat/screens.test.jsx. Acá se
   prueba la parte interactiva: marcar, el menú de cada fila, crear/editar/borrar y que
   los días futuros no se puedan tocar.
   ============================================================================ */

describe('cabecera', () => {
  it('cuenta las marcas de hoy sobre el total posible', () => {
    // h1 (Tomar agua, x3): 2 marcas. h2 (Leer, x1): 1 marca. 3 de 4.
    renderScreen(<HabitosPage />, { doc: fullDoc() });
    expect(screen.getByText('3 de 4 marcados hoy')).toBeInTheDocument();
  });

  it('sin hábitos, lo dice', () => {
    renderScreen(<HabitosPage />, { doc: emptyDoc() });
    expect(screen.getByText('Nada que marcar todavía')).toBeInTheDocument();
  });

  it('la mejor racha entre todos los hábitos se destaca arriba', () => {
    // h2 (Leer) tiene 4 días seguidos; h1 (Tomar agua) tiene 2. Gana Leer.
    renderScreen(<HabitosPage />, { doc: fullDoc() });
    expect(screen.getByText('Mejor racha')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('días · Leer')).toBeInTheDocument();
  });

  it('sin ninguna racha activa, no se muestra el destacado', () => {
    renderScreen(<HabitosPage />, { doc: emptyDoc() });
    expect(screen.queryByText('Mejor racha')).not.toBeInTheDocument();
  });
});

describe('marcar', () => {
  it('tocar un slot deja una marca', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<HabitosPage />, { doc: fullDoc() });

    // h2 (Leer) ya tiene 1/1 hoy; se lo desmarca tocando su único slot.
    await user.click(screen.getByRole('button', { name: 'Leer, marca 1 de 1' }));
    expect(leer().habitLog[TODAY].h2).toBeUndefined();
  });

  it('multi-check: tocar el tercer slot llena hasta el tercero', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<HabitosPage />, { doc: fullDoc() });

    await user.click(screen.getByRole('button', { name: 'Tomar agua, marca 3 de 3' }));
    expect(leer().habitLog[TODAY].h1).toBe(3);
  });

  it('un día futuro no se puede marcar', () => {
    renderScreen(<HabitosPage />, { doc: fullDoc() });
    expect(screen.getByRole('button', { name: 'Leer, marca 1 de 1' })).toBeEnabled();
  });
});

describe('navegar por día (retroactivo)', () => {
  it('la tira semanal es propia de Hábitos, no la de Hoy', () => {
    // Verde, no ámbar: se comprueba que el punto de "algo marcado" siga la lógica de
    // hábitos (habitDoneCount), no la de agenda.
    const { container } = renderScreen(<HabitosPage />, { doc: fullDoc() });
    const encendidos = container.querySelectorAll('.wdot.on');
    // hoy, ago1 y ago2 tienen al menos un hábito completo (h2); ago3 también (h2 done).
    expect(encendidos.length).toBeGreaterThan(0);
  });

  it('mirar un día pasado permite marcar retroactivamente, en ESE día', async () => {
    // El lunes de la semana ANTERIOR es siempre estrictamente pasado, sin importar qué
    // día de la semana sea "hoy" en el momento en que corra el test — a diferencia de
    // "ayer" o "el lunes de esta semana", que podrían coincidir con hoy mismo.
    const dia = mondayAgo(1);
    const user = userEvent.setup();
    const doc = fullDoc();
    const antesDelDia = doc.habitLog[dia]?.h1 ?? 0;
    const antesHoy = { ...doc.habitLog[TODAY] };
    const { doc: leer } = renderScreen(<HabitosPage />, { doc });

    await user.click(screen.getByRole('button', { name: 'Semana anterior' }));
    await user.click(screen.getByRole('button', { name: dia }));
    expect(screen.getByText(/retroactivo/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tomar agua, marca 1 de 3' }));

    // Se escribió en el día que se estaba mirando, no en el de hoy.
    expect(leer().habitLog[dia]?.h1 ?? 0).not.toBe(antesDelDia);
    expect(leer().habitLog[TODAY]).toEqual(antesHoy);
  });

  it('mirando un día futuro, los slots están deshabilitados', async () => {
    const user = userEvent.setup();
    renderScreen(<HabitosPage />, { doc: fullDoc() });

    // Si "hoy" fuera domingo, mañana caería en la semana siguiente y no se vería en la
    // tira actual: se avanza solo si hace falta, así el test no depende de qué día es.
    const otraSemana = iso(mondayOf(parseISO(TODAY))) !== iso(mondayOf(parseISO(TOMORROW)));
    if (otraSemana) await user.click(screen.getByRole('button', { name: 'Semana siguiente' }));

    await user.click(screen.getByRole('button', { name: TOMORROW }));
    expect(screen.getByText(/a futuro/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leer, marca 1 de 1' })).toBeDisabled();
  });

  it('mirando hoy, dice "hoy"', () => {
    renderScreen(<HabitosPage />, { doc: fullDoc() });
    expect(screen.getByText(/· hoy/)).toBeInTheDocument();
  });
});

describe('menú de cada hábito', () => {
  it('el "⋯" abre Editar/Eliminar', async () => {
    const user = userEvent.setup();
    renderScreen(<HabitosPage />, { doc: fullDoc() });

    await user.click(screen.getByRole('button', { name: 'Opciones de Tomar agua' }));
    expect(screen.getByText('Editar hábito')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('abrir el menú de uno cierra el del otro', async () => {
    const user = userEvent.setup();
    renderScreen(<HabitosPage />, { doc: fullDoc() });

    await user.click(screen.getByRole('button', { name: 'Opciones de Tomar agua' }));
    await user.click(screen.getByRole('button', { name: 'Opciones de Leer' }));

    // Solo puede haber un menú abierto: "Editar hábito" aparece una sola vez.
    expect(screen.getAllByText('Editar hábito')).toHaveLength(1);
  });

  it('"Editar hábito" abre el formulario con los datos cargados', async () => {
    const user = userEvent.setup();
    renderScreen(<HabitosPage />, { doc: fullDoc() });

    await user.click(screen.getByRole('button', { name: 'Opciones de Tomar agua' }));
    await user.click(screen.getByText('Editar hábito'));

    expect(screen.getByRole('dialog', { name: 'Editar hábito' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Tomar agua');
    expect(screen.getByLabelText('Descripción · opcional')).toHaveValue('8 vasos');
  });

  it('"Eliminar" pide confirmación y borra el hábito con su historial', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<HabitosPage />, { doc: fullDoc() });

    await user.click(screen.getByRole('button', { name: 'Opciones de Tomar agua' }));
    await user.click(screen.getByText('Eliminar'));
    expect(screen.getByText('¿Eliminar este hábito?')).toBeInTheDocument();

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));
    const datos = leer();
    expect(datos.habits.some((h) => h.id === 'h1')).toBe(false);
    // El historial de marcas también se limpia: no queda "h1" suelto en ningún día.
    expect(Object.values(datos.habitLog).some((day) => 'h1' in day)).toBe(false);
  });
});

describe('crear un hábito', () => {
  it('el botón "Nuevo" de arriba abre el formulario en blanco', async () => {
    const user = userEvent.setup();
    renderScreen(<HabitosPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Nuevo' }));
    expect(screen.getByRole('dialog', { name: 'Nuevo hábito' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
  });

  it('guardarlo lo agrega a la lista, con veces por día por defecto en 1', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<HabitosPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Nuevo' }));
    await user.type(screen.getByLabelText('Nombre'), 'Meditar');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const hb = leer().habits[0];
    expect(hb.name).toBe('Meditar');
    expect(hb.timesPerDay).toBe(1);
  });

  it('sin nombre no guarda, y avisa', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<HabitosPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Nuevo' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('Poné un nombre para el hábito.')).toBeInTheDocument();
    expect(leer().habits).toHaveLength(0);
  });

  it('elegir 3 veces por día lo guarda así', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<HabitosPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Nuevo' }));
    await user.type(screen.getByLabelText('Nombre'), 'Agua');
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(leer().habits[0].timesPerDay).toBe(3);
  });

  it('elegir un ícono y un color los guarda', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<HabitosPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Nuevo' }));
    await user.type(screen.getByLabelText('Nombre'), 'Correr');
    await user.click(screen.getByRole('button', { name: 'llama' }));
    await user.click(screen.getByRole('button', { name: '#FFA877' })); // coral, de la paleta
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(leer().habits[0].icon).toBe('llama');
    expect(leer().habits[0].color).toBe('#FFA877');
  });

  it('con la lista vacía, solo el botón "Nuevo" de arriba (sin el atajo de abajo)', () => {
    // El "+ Nuevo hábito" de abajo de la lista es igual que en vanilla: solo existe
    // cuando ya hay al menos un hábito. Con la lista vacía, la única entrada es "Nuevo".
    renderScreen(<HabitosPage />, { doc: emptyDoc() });
    expect(screen.getByText(/Todavía no hay hábitos/)).toBeInTheDocument();
    expect(screen.queryByText('+ Nuevo hábito')).not.toBeInTheDocument();
  });

  it('con hábitos ya creados, "+ Nuevo hábito" abre el mismo formulario que "Nuevo"', async () => {
    const user = userEvent.setup();
    renderScreen(<HabitosPage />, { doc: fullDoc() });

    await user.click(screen.getByText('+ Nuevo hábito'));
    expect(screen.getByRole('dialog', { name: 'Nuevo hábito' })).toBeInTheDocument();
  });
});
