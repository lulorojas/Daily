import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoyPage } from './HoyPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, TODAY, TOMORROW, YESTERDAY, ago } from '../test/fixtures';
import { addDays, iso, mondayOf, parseISO, todayD } from '../lib/dates';

/* ============================================================================
   HOY

   Buena parte de estos casos son el port de los tests de la app vanilla (el bloque 31,
   "Pendientes completadas", y los de regresión de la agenda). Allá se comprobaban leyendo
   el innerHTML de #app con includes(); acá se busca lo mismo pero como lo ve un usuario:
   por texto y por rol.
   ============================================================================ */

const conItems = (items, extra = {}) => ({ ...emptyDoc(), items, ...extra });

// La celda de un día en la tira semanal (su nombre accesible es la fecha ISO).
const celda = (dISO) => screen.getByRole('button', { name: dISO });
// La fila de un ítem (su nombre accesible es el título).
const fila = (title) => screen.getByRole('button', { name: title });

describe('el día que se mira', () => {
  it('sin ?d en la URL, arranca en hoy', () => {
    renderScreen(<HoyPage />);
    expect(celda(TODAY)).toHaveAttribute('aria-pressed', 'true');
  });

  it('con ?d, arranca en ese día', () => {
    renderScreen(<HoyPage />, { route: `/?d=${TOMORROW}` });
    expect(celda(TOMORROW)).toHaveAttribute('aria-pressed', 'true');
  });

  it('un ?d inventado no rompe nada: cae en hoy', () => {
    renderScreen(<HoyPage />, { route: '/?d=chau' });
    expect(celda(TODAY)).toHaveAttribute('aria-pressed', 'true');
  });

  it('tocar un día de la tira cambia lo que se ve abajo', async () => {
    const user = userEvent.setup();
    const otro = iso(addDays(mondayOf(todayD()), 6));   // el domingo de esta semana
    renderScreen(<HoyPage />, {
      doc: conItems([
        { id: 'a', kind: 'tarea', title: 'La de hoy', desc: '', date: TODAY, time: null, done: false },
        { id: 'b', kind: 'tarea', title: 'La del domingo', desc: '', date: otro, time: null, done: false },
      ]),
    });

    expect(screen.getByText('La de hoy')).toBeInTheDocument();
    expect(screen.queryByText('La del domingo')).not.toBeInTheDocument();

    await user.click(celda(otro));
    expect(screen.getByText('La del domingo')).toBeInTheDocument();
    expect(screen.queryByText('La de hoy')).not.toBeInTheDocument();
  });

  it('las flechas mueven la tira de a una semana', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />);
    const laSemanaQueViene = iso(addDays(parseISO(TODAY), 7));

    await user.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    expect(celda(laSemanaQueViene)).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(celda(TODAY)).toHaveAttribute('aria-pressed', 'true');
  });

  it('la tira siempre muestra la semana del día elegido, de lunes a domingo', () => {
    renderScreen(<HoyPage />, { route: `/?d=${TODAY}` });
    const lunes = mondayOf(todayD());
    for (let i = 0; i < 7; i++) {
      expect(celda(iso(addDays(lunes, i)))).toBeInTheDocument();
    }
  });

  it('el punto de abajo se enciende en los días que tienen algo', () => {
    const { container } = renderScreen(<HoyPage />, {
      doc: conItems([{ id: 'a', kind: 'tarea', title: 'x', desc: '', date: TODAY, time: null, done: false }]),
    });
    const encendidos = container.querySelectorAll('.wdot.on');
    expect(encendidos).toHaveLength(1);
    expect(within(celda(TODAY)).getByText(String(todayD().getDate()))).toBeInTheDocument();
  });
});

describe('la cabecera', () => {
  it('mirando hoy saluda y cuenta lo que queda', () => {
    renderScreen(<HoyPage />, {
      doc: conItems(
        [{ id: 'a', kind: 'tarea', title: 'x', desc: '', date: TODAY, time: null, done: false }],
        { habits: [{ id: 'h', name: 'Agua', detail: '', color: '#86D9A0', icon: 'agua', timesPerDay: 1 }] },
      ),
    });
    expect(screen.getByText('Tenés 1 tarea y 1 hábito para hoy.')).toBeInTheDocument();
  });

  it('mirando otro día, el título es ese día', () => {
    renderScreen(<HoyPage />, { route: `/?d=${TOMORROW}` });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mañana');
    expect(screen.getByText('Así viene este día.')).toBeInTheDocument();
  });

  it('mirando un día pasado, invita a marcar hábitos', () => {
    renderScreen(<HoyPage />, { route: `/?d=${YESTERDAY}` });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ayer');
    expect(screen.getByText('Podés marcar los hábitos de este día.')).toBeInTheDocument();
  });

  it('el engranaje lleva a Ajustes, llevándose el día', () => {
    renderScreen(<HoyPage />, { route: `/?d=${TOMORROW}` });
    expect(screen.getByRole('link', { name: 'Ajustes' }))
      .toHaveAttribute('href', `/ajustes?d=${TOMORROW}`);
  });
});

describe('tareas del día', () => {
  const doc = conItems([
    { id: 't1', kind: 'tarea', title: 'Comprar pan', desc: 'en la esquina', date: TODAY, time: '09:00', done: false },
    { id: 't2', kind: 'tarea', title: 'Ya está', desc: '', date: TODAY, time: null, done: true, doneAt: TODAY },
  ]);

  it('muestra las del día, con su hora y su descripción', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.getByText('Comprar pan')).toBeInTheDocument();
    expect(screen.getByText('en la esquina')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('el rótulo cuenta cuántas van', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.getByText('· 1/2')).toBeInTheDocument();
  });

  it('sin tareas lo dice', () => {
    renderScreen(<HoyPage />);
    expect(screen.getByText('El día está limpio por ahora.')).toBeInTheDocument();
  });

  it('marcar una tarea la guarda como hecha, con el día que se está mirando', async () => {
    const user = userEvent.setup();
    const { item } = renderScreen(<HoyPage />, { doc });

    await user.click(within(fila('Comprar pan')).getByRole('checkbox'));
    expect(item('Comprar pan').done).toBe(true);
    expect(item('Comprar pan').doneAt).toBe(TODAY);
  });

  it('desmarcarla borra el doneAt, no lo pone en null', async () => {
    const user = userEvent.setup();
    const { item } = renderScreen(<HoyPage />, { doc });

    await user.click(within(fila('Ya está')).getByRole('checkbox'));
    expect(item('Ya está').done).toBe(false);
    expect('doneAt' in item('Ya está')).toBe(false);
  });

  it('el check no abre el formulario (corta la propagación)', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />, { doc });
    await user.click(within(fila('Comprar pan')).getByRole('checkbox'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tocar la fila sí abre el formulario, con la tarea cargada', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />, { doc });

    await user.click(fila('Comprar pan'));
    expect(screen.getByRole('dialog', { name: 'Editar tarea' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Comprar pan');
  });
});

describe('una tarea vencida no se arrastra a hoy', () => {
  const doc = conItems([
    { id: 'v', kind: 'tarea', title: 'Tarea vencida', desc: '', date: ago(40), time: null, done: false },
  ]);

  it('no aparece en el día de hoy', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.queryByText('Tarea vencida')).not.toBeInTheDocument();
    expect(screen.getByText('El día está limpio por ahora.')).toBeInTheDocument();
  });

  it('sigue estando en su fecha original', () => {
    renderScreen(<HoyPage />, { doc, route: `/?d=${ago(40)}` });
    expect(screen.getByText('Tarea vencida')).toBeInTheDocument();
  });

  it('tampoco cae en la bandeja de sin fecha', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.getByText('Nada suelto por acá.')).toBeInTheDocument();
  });
});

describe('bandeja de pendientes (sin fecha)', () => {
  /* Port del bloque 31 de los tests de la app vanilla. Una pendiente completada se ve solo
     el día en que se marcó: si mirás otro día, o pasa el tiempo, desaparece. */
  const doc = conItems([
    { id: 'p1', kind: 'tarea', title: 'Pend activa', desc: '', date: null, time: null, done: false },
    { id: 'p2', kind: 'tarea', title: 'Pend hecha hoy', desc: '', date: null, time: null, done: true, doneAt: TODAY },
    { id: 'p3', kind: 'tarea', title: 'Pend hecha ayer', desc: '', date: null, time: null, done: true, doneAt: ago(1) },
    { id: 'p4', kind: 'tarea', title: 'Pend hecha sin doneAt', desc: '', date: null, time: null, done: true },
  ]);

  it('mirando hoy: la activa y la que se completó hoy', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.getByText('Pend activa')).toBeInTheDocument();
    expect(screen.getByText('Pend hecha hoy')).toBeInTheDocument();
  });

  it('mirando hoy: no la de ayer, ni la que no sabe cuándo se marcó', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.queryByText('Pend hecha ayer')).not.toBeInTheDocument();
    expect(screen.queryByText('Pend hecha sin doneAt')).not.toBeInTheDocument();
  });

  it('mirando otro día: la completada hoy ya no está, la activa sí', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />, { doc });

    await user.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(screen.getByText('Pend activa')).toBeInTheDocument();
    expect(screen.queryByText('Pend hecha hoy')).not.toBeInTheDocument();
  });

  it('el rótulo cuenta las visibles', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.getByText('· 2 pendientes')).toBeInTheDocument();
  });

  it('marcar mirando otro día deja el doneAt en ESE día', async () => {
    const user = userEvent.setup();
    const otro = ago(7);
    const { item } = renderScreen(<HoyPage />, { doc, route: `/?d=${otro}` });

    await user.click(within(fila('Pend activa')).getByRole('checkbox'));
    expect(item('Pend activa').doneAt).toBe(otro);
  });

  it('el atajo "poner fecha" abre el mismo formulario de la tarea', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />, { doc });

    const fechas = screen.getAllByRole('button', { name: 'Poner fecha' });
    await user.click(fechas[0]);
    expect(screen.getByRole('dialog', { name: 'Editar tarea' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Pend activa');
  });

  it('sin pendientes, lo dice', () => {
    renderScreen(<HoyPage />);
    expect(screen.getByText('Nada suelto por acá.')).toBeInTheDocument();
  });
});

describe('agenda del día (citas y anuales)', () => {
  const doc = conItems([
    { id: 'c1', kind: 'cita', title: 'Dentista', desc: 'llevar estudios', date: TODAY, time: '10:00' },
    { id: 'a1', kind: 'anual', title: 'Cumple de Ana', desc: '', date: `1990-${TODAY.slice(5)}` },
  ]);

  it('muestra las citas del día y las anuales que caen hoy', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.getByText('Dentista')).toBeInTheDocument();
    expect(screen.getByText('llevar estudios')).toBeInTheDocument();
    expect(screen.getByText('Cumple de Ana')).toBeInTheDocument();
  });

  it('cada una dice de qué tipo es, y la que no tiene hora muestra --:--', () => {
    renderScreen(<HoyPage />, { doc });
    expect(screen.getByText('cita')).toBeInTheDocument();
    expect(screen.getByText('anual')).toBeInTheDocument();
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('sin citas, la sección Agenda no se dibuja', () => {
    renderScreen(<HoyPage />);
    expect(screen.queryByText('Agenda')).not.toBeInTheDocument();
  });

  it('tocar una abre su formulario', async () => {
    const user = userEvent.setup();
    renderScreen(<HoyPage />, { doc });
    await user.click(fila('Dentista'));
    expect(screen.getByRole('dialog', { name: 'Editar cita' })).toBeInTheDocument();
  });
});

describe('progreso del día', () => {
  it('mezcla tareas hechas y marcas de hábitos', () => {
    renderScreen(<HoyPage />, {
      doc: conItems(
        [
          { id: 't1', kind: 'tarea', title: 'a', desc: '', date: TODAY, time: null, done: true, doneAt: TODAY },
          { id: 't2', kind: 'tarea', title: 'b', desc: '', date: TODAY, time: null, done: false },
        ],
        {
          habits: [{ id: 'h', name: 'Agua', detail: '', color: '#86D9A0', icon: 'agua', timesPerDay: 2 }],
          habitLog: { [TODAY]: { h: 1 } },
        },
      ),
    });
    // 1 tarea hecha + 1 marca = 2, sobre 2 tareas + 2 marcas posibles = 4.
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('2 de 4 completados')).toBeInTheDocument();
  });

  it('sin nada, no cuenta nada', () => {
    renderScreen(<HoyPage />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('No tenés nada agendado para este día.')).toBeInTheDocument();
  });
});

describe('hábitos en Hoy', () => {
  const conHabito = (over = {}) => ({
    ...emptyDoc(),
    habits: [{ id: 'h1', name: 'Tomar agua', detail: '8 vasos', color: '#86D9A0', icon: 'agua', timesPerDay: 3 }],
    ...over,
  });

  it('muestra un casillero por vez que hay que marcarlo', () => {
    renderScreen(<HoyPage />, { doc: conHabito() });
    expect(screen.getAllByRole('button', { name: /Tomar agua, marca/ })).toHaveLength(3);
  });

  it('sin racha, muestra el detalle del hábito', () => {
    renderScreen(<HoyPage />, { doc: conHabito() });
    expect(screen.getByText('8 vasos')).toBeInTheDocument();
  });

  it('con racha, la muestra', () => {
    renderScreen(<HoyPage />, {
      doc: conHabito({ habitLog: { [TODAY]: { h1: 3 }, [ago(1)]: { h1: 3 } } }),
    });
    expect(screen.getByText('Racha de 2 días')).toBeInTheDocument();
  });

  it('un solo día de racha va en singular', () => {
    renderScreen(<HoyPage />, { doc: conHabito({ habitLog: { [TODAY]: { h1: 3 } } }) });
    expect(screen.getByText('Racha de 1 día')).toBeInTheDocument();
  });

  it('tocar el primer casillero deja una marca', async () => {
    const user = userEvent.setup();
    const { doc } = renderScreen(<HoyPage />, { doc: conHabito() });

    await user.click(screen.getByRole('button', { name: 'Tomar agua, marca 1 de 3' }));
    expect(doc().habitLog[TODAY].h1).toBe(1);
  });

  it('tocar el tercero llena hasta el tercero', async () => {
    const user = userEvent.setup();
    const { doc } = renderScreen(<HoyPage />, { doc: conHabito() });

    await user.click(screen.getByRole('button', { name: 'Tomar agua, marca 3 de 3' }));
    expect(doc().habitLog[TODAY].h1).toBe(3);
  });

  it('volver a tocar el último baja una marca', async () => {
    const user = userEvent.setup();
    const { doc } = renderScreen(<HoyPage />, { doc: conHabito({ habitLog: { [TODAY]: { h1: 3 } } }) });

    await user.click(screen.getByRole('button', { name: 'Tomar agua, marca 3 de 3' }));
    expect(doc().habitLog[TODAY].h1).toBe(2);
  });

  it('en un día futuro se ven pero no se marcan', () => {
    renderScreen(<HoyPage />, { doc: conHabito(), route: `/?d=${TOMORROW}` });
    expect(screen.getByRole('button', { name: 'Tomar agua, marca 1 de 3' })).toBeDisabled();
  });

  it('sin hábitos, lo dice', () => {
    renderScreen(<HoyPage />);
    expect(screen.getByText('Todavía no creaste hábitos.')).toBeInTheDocument();
  });
});

describe('entreno del día', () => {
  const conPlan = () => {
    const lunes = iso(mondayOf(todayD()));
    const plan = Array.from({ length: 7 }, () => ({ type: 'Descanso', done: false }));
    plan[(parseISO(TODAY).getDay() + 6) % 7] = { type: 'Pecho', done: false };
    return {
      ...emptyDoc(),
      gym: { customTypes: [{ id: 'ct1', name: 'Pecho', color: '#FF9B93' }], weekPlans: { [lunes]: plan }, lifts: [], routines: [], bodyWeights: [] },
    };
  };

  it('muestra el entreno planificado', () => {
    renderScreen(<HoyPage />, { doc: conPlan() });
    expect(screen.getByText('Pecho')).toBeInTheDocument();
    expect(screen.getByText('Planificado')).toBeInTheDocument();
  });

  it('un día de descanso no muestra nada', () => {
    renderScreen(<HoyPage />, { doc: conPlan(), route: `/?d=${TOMORROW}` });
    expect(screen.queryByText('Entreno')).not.toBeInTheDocument();
  });

  it('sin plan, tampoco', () => {
    renderScreen(<HoyPage />);
    expect(screen.queryByText('Entreno')).not.toBeInTheDocument();
  });
});
