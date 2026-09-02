import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GymPage } from './GymPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc, TODAY } from '../test/fixtures';
import { weekKey } from '../lib/gym';

/* ============================================================================
   GIMNASIO

   La geometría de los datos (rachas, ranking, historial) ya está comparada contra la
   app vanilla en src/compat/vanilla.test.js, y el texto completo de la pantalla contra
   viewGym() en src/compat/screens.test.jsx. Lo que falta acá es la parte que esos dos no
   cubren: que TOCAR algo llame a la mutación correcta con los datos correctos.
   ============================================================================ */

const doc = () => fullDoc();

describe('plan semanal', () => {
  it('tocar un día lo despliega y muestra los tipos disponibles', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByRole('button', { name: 'Lun: Pecho, cambiar tipo' }));
    // Los tipos propios más "Descanso", que siempre está.
    expect(screen.getByRole('button', { name: 'Espalda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descanso' })).toBeInTheDocument();
  });

  it('elegir un tipo lo guarda en el plan de esa semana', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByRole('button', { name: 'Mar: Descanso, cambiar tipo' }));
    await user.click(screen.getByRole('button', { name: 'Espalda' }));

    expect(leer().gym.weekPlans[weekKey(0)][1].type).toBe('Espalda');
  });

  it('marcar hecho lo guarda, sin tocar el tipo', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByRole('checkbox', { name: 'Mar: Descanso' }));
    expect(leer().gym.weekPlans[weekKey(0)][1].done).toBe(true);
    expect(leer().gym.weekPlans[weekKey(0)][1].type).toBe('Descanso');
  });

  it('las flechas cambian de semana', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: doc() });

    expect(screen.getByText('Esta semana')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(screen.queryByText('Esta semana')).not.toBeInTheDocument();
  });

  it('cambiar de semana cierra el día que estaba desplegado', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByRole('button', { name: 'Mar: Descanso, cambiar tipo' }));
    expect(screen.getByRole('button', { name: 'Espalda' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(screen.queryByRole('button', { name: 'Espalda' })).not.toBeInTheDocument();
  });
});

describe('plan semanal: segundo turno (etapa 6)', () => {
  it('un día normal no ofrece quitar un segundo turno que no tiene', () => {
    renderScreen(<GymPage />, { doc: doc() });
    // Ninguna fila de "Lun" (turno único) tiene el botón de quitar segundo turno.
    expect(screen.queryByRole('button', { name: /Quitar el segundo turno de Lun/ })).not.toBeInTheDocument();
  });

  it('"2do turno" agrega un segundo chip en Descanso, sin tocar el primero', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    const filaLun = screen.getByRole('button', { name: 'Lun: Pecho, cambiar tipo' }).closest('.planday');
    await user.click(within(filaLun).getByRole('button', { name: '2do turno' }));

    const dia = leer().gym.weekPlans[weekKey(0)][0];
    expect(dia.type).toBe('Pecho'); // el primer turno no se tocó
    expect(dia.type2).toBe('Descanso');
    expect(dia.done2).toBe(false);
    expect(screen.getByRole('button', { name: 'Lun (2do turno): Descanso, cambiar tipo' })).toBeInTheDocument();
  });

  it('elegir tipo y marcar hecho en el segundo turno no toca el primero', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    const filaLun = screen.getByRole('button', { name: 'Lun: Pecho, cambiar tipo' }).closest('.planday');
    await user.click(within(filaLun).getByRole('button', { name: '2do turno' }));
    await user.click(screen.getByRole('button', { name: 'Lun (2do turno): Descanso, cambiar tipo' }));
    await user.click(screen.getByRole('button', { name: 'Espalda' }));
    await user.click(screen.getByRole('checkbox', { name: 'Lun (2do turno): Espalda' }));

    // Lun ya venía marcado como hecho en el fixture (Pecho, done:true): el punto acá es
    // que agregar y marcar el SEGUNDO turno no lo haya tocado.
    const dia = leer().gym.weekPlans[weekKey(0)][0];
    expect(dia).toMatchObject({ type: 'Pecho', done: true, type2: 'Espalda', done2: true });
  });

  it('quitar el segundo turno lo saca del todo', async () => {
    const user = userEvent.setup();
    const conSegundo = doc();
    conSegundo.gym.weekPlans[weekKey(0)][0].type2 = 'Espalda';
    conSegundo.gym.weekPlans[weekKey(0)][0].done2 = true;
    const { doc: leer } = renderScreen(<GymPage />, { doc: conSegundo });

    await user.click(screen.getByRole('button', { name: 'Quitar el segundo turno de Lun' }));

    const dia = leer().gym.weekPlans[weekKey(0)][0];
    expect('type2' in dia).toBe(false);
    expect('done2' in dia).toBe(false);
    // La fila de Lun vuelve a tener un solo turno (Miércoles sigue con su "Espalda"
    // propio: por eso no alcanza con buscar el texto suelto, hay que mirar SU fila).
    const filaLun = screen.getByRole('button', { name: 'Lun: Pecho, cambiar tipo' }).closest('.planday');
    expect(within(filaLun).queryByRole('button', { name: /Quitar el segundo turno/ })).not.toBeInTheDocument();
    expect(within(filaLun).getAllByRole('button', { name: /cambiar tipo/ })).toHaveLength(1);
    // Y vuelve a ofrecerse agregar uno, como en cualquier día de un solo turno.
    expect(within(filaLun).getByRole('button', { name: '2do turno' })).toBeInTheDocument();
  });

  it('un día ya con dos turnos no vuelve a ofrecer "2do turno"', () => {
    const conSegundo = doc();
    conSegundo.gym.weekPlans[weekKey(0)][0].type2 = 'Descanso';
    renderScreen(<GymPage />, { doc: conSegundo });

    const filaLun = screen.getByRole('button', { name: 'Lun: Pecho, cambiar tipo' }).closest('.planday');
    expect(within(filaLun).queryByRole('button', { name: '2do turno' })).not.toBeInTheDocument();
  });

  it('el contador de la cabecera cuenta turnos, no días', () => {
    const conSegundo = doc();
    // Lun ya está hecho (turno 1); se agrega un turno 2 también hecho.
    conSegundo.gym.weekPlans[weekKey(0)][0].type2 = 'Espalda';
    conSegundo.gym.weekPlans[weekKey(0)][0].done2 = true;
    renderScreen(<GymPage />, { doc: conSegundo });

    // fullDoc() ya tenía "2 de 3" con un solo turno por día; con un turno más hecho y un
    // tipo más que cuenta, pasa a "3 de 4".
    expect(screen.getByText('3 de 4 entrenamientos esta semana')).toBeInTheDocument();
  });
});

describe('tipos de entrenamiento', () => {
  it('"Administrar tipos" lista los propios, sin "Descanso"', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByText('Administrar tipos'));
    const dialogo = screen.getByRole('dialog', { name: 'Tipos de entrenamiento' });
    // "Pecho" también existe detrás, en los chips del plan semanal: se acota al modal.
    expect(within(dialogo).getByText('Pecho')).toBeInTheDocument();
    expect(within(dialogo).getByText('Espalda')).toBeInTheDocument();
    expect(within(dialogo).queryByText('Descanso')).not.toBeInTheDocument();
  });

  it('crear un tipo nuevo lo agrega y vuelve a la lista', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByText('Administrar tipos'));
    await user.click(screen.getByRole('button', { name: 'Nuevo tipo' }));
    await user.type(screen.getByLabelText('Nombre'), 'Piernas');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(leer().gym.customTypes.some((t) => t.name === 'Piernas')).toBe(true);
    // Volvió a la lista, no se quedó en el formulario ni se cerró todo.
    expect(screen.getByRole('dialog', { name: 'Tipos de entrenamiento' })).toBeInTheDocument();
  });

  it('renombrar un tipo actualiza también los días ya marcados con ese nombre', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByText('Administrar tipos'));
    await user.click(screen.getByRole('button', { name: 'Editar Pecho' }));
    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Pecho y hombro');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const lunes = leer().gym.weekPlans[weekKey(0)][0];
    expect(lunes.type).toBe('Pecho y hombro');
  });

  it('borrar un tipo pide confirmación con aviso de cascada', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByText('Administrar tipos'));
    await user.click(screen.getByRole('button', { name: 'Eliminar Espalda' }));
    expect(screen.getByText('¿Eliminar "Espalda"?')).toBeInTheDocument();
    expect(screen.getByText(/Los días ya marcados no se modifican/)).toBeInTheDocument();

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));
    expect(leer().gym.customTypes.some((t) => t.name === 'Espalda')).toBe(false);
    // El plan ya marcado con ese tipo no se toca: el historial no se reescribe.
    const miercoles = leer().gym.weekPlans[weekKey(0)][2];
    expect(miercoles.type).toBe('Espalda');
  });

  it('"Descanso" no se puede borrar: no tiene botones de administración', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByText('Administrar tipos'));
    expect(screen.queryByRole('button', { name: 'Eliminar Descanso' })).not.toBeInTheDocument();
    expect(screen.getByText(/no se puede borrar/)).toBeInTheDocument();
  });
});

describe('peso corporal', () => {
  it('registrar un peso nuevo lo agrega al final', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });
    const antes = leer().gym.bodyWeights.length;

    await user.click(screen.getByRole('button', { name: '+ Registrar peso' }));
    await user.type(screen.getByLabelText('Peso corporal · kg'), '74,2');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const registros = leer().gym.bodyWeights;
    expect(registros).toHaveLength(antes + 1);
    expect(registros[registros.length - 1].kg).toBe(74.2);
  });

  it('acepta coma o punto decimal', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: '+ Registrar peso' }));
    await user.type(screen.getByLabelText('Peso corporal · kg'), '70.5');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(leer().gym.bodyWeights[0].kg).toBe(70.5);
  });

  it('un peso inválido no guarda y avisa', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });
    const antes = leer().gym.bodyWeights.length;

    await user.click(screen.getByRole('button', { name: '+ Registrar peso' }));
    await user.type(screen.getByLabelText('Peso corporal · kg'), '0');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('Poné un peso válido en kg (mayor a 0).')).toBeInTheDocument();
    expect(leer().gym.bodyWeights).toHaveLength(antes);
  });

  it('administrar el historial permite borrar un registro', async () => {
    const user = userEvent.setup();
    const original = doc();
    const { doc: leer } = renderScreen(<GymPage />, { doc: original });

    await user.click(screen.getByRole('button', { name: 'Administrar registros' }));
    expect(screen.getByRole('dialog', { name: 'Peso corporal' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
    // Con el cartel de confirmación abierto, hay dos botones "Eliminar": el de la fila
    // (atrás) y el de confirmar. Se acota al cartel para no ser ambiguo.
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));

    expect(leer().gym.bodyWeights).toHaveLength(original.gym.bodyWeights.length - 1);
  });

  it('la serie del gráfico se ordena por fecha, no por orden de carga', () => {
    // bodyList() (etapa 2) ya lo garantiza y está comparado contra vanilla; acá se
    // confirma que la pantalla lo usa: el número grande es el ÚLTIMO por FECHA.
    const conDoc = doc();
    renderScreen(<GymPage />, { doc: conDoc });
    const ultimoPorFecha = conDoc.gym.bodyWeights.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).pop();
    expect(screen.getByText(String(ultimoPorFecha.kg))).toBeInTheDocument();
  });
});

describe('cargas por ejercicio', () => {
  it('cargar un ejercicio existente agrega un registro sin cambiar de nombre', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });
    const antes = doc().gym.lifts.find((l) => l.id === 'l1').history.length;

    await user.click(screen.getByText('+ Agregar ejercicio'));
    await user.click(screen.getByRole('button', { name: 'Sentadilla' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const sentadilla = leer().gym.lifts.find((l) => l.id === 'l1');
    expect(sentadilla.history).toHaveLength(antes + 1);
  });

  it('crear un ejercicio nuevo lo agrega a la lista', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByText('+ Agregar ejercicio'));
    await user.type(screen.getByPlaceholderText('Crear ejercicio nuevo…'), 'Remo');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(leer().gym.lifts.some((l) => l.name === 'Remo')).toBe(true);
  });

  it('sin elegir ni escribir un ejercicio, avisa', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByText('+ Agregar ejercicio'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Elegí un ejercicio o creá uno nuevo.')).toBeInTheDocument();
  });

  it('tocar un ejercicio abre su detalle, con el récord', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByRole('button', { name: /Sentadilla/ }));
    expect(screen.getByRole('dialog', { name: 'Sentadilla' })).toBeInTheDocument();
    expect(screen.getByText('72.5')).toBeInTheDocument(); // el peso actual, también el récord
  });

  it('no se puede borrar el único registro de un ejercicio', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByRole('button', { name: /Press banca/ })); // un solo registro
    await user.click(screen.getByRole('button', { name: 'Eliminar registro' }));
    expect(screen.getByText('No se puede borrar')).toBeInTheDocument();
  });

  it('eliminar el ejercicio entero pide confirmación', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: doc() });

    await user.click(screen.getByRole('button', { name: /Peso muerto/ }));
    await user.click(screen.getByRole('button', { name: 'Eliminar ejercicio' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));

    expect(leer().gym.lifts.some((l) => l.id === 'l3')).toBe(false);
  });
});

describe('rutinas', () => {
  it('la entrada muestra cuántas hay guardadas', () => {
    renderScreen(<GymPage />, { doc: doc() });
    expect(screen.getByText('2 guardadas')).toBeInTheDocument();
  });

  it('sin rutinas, invita a crear la primera', () => {
    renderScreen(<GymPage />, { doc: emptyDoc() });
    expect(screen.getByText('Todavía no creaste ninguna')).toBeInTheDocument();
  });

  it('lleva a /gym/rutinas', () => {
    renderScreen(<GymPage />, { doc: doc() });
    expect(screen.getByRole('link', { name: /Mis rutinas/ })).toHaveAttribute('href', '/gym/rutinas');
  });
});

describe('el entreno de Hoy trae la semana correcta', () => {
  it('con ?d= de un día de la semana pasada, arranca en esa semana', () => {
    renderScreen(<GymPage />, { doc: doc(), route: `/gym?d=${TODAY}` });
    expect(screen.getByText('Esta semana')).toBeInTheDocument();
  });
});

describe('abs y movilidad (etapa 6, dentro del plan semanal)', () => {
  it('sin registros esta semana, lo dice ahí mismo, dentro del plan', () => {
    renderScreen(<GymPage />, { doc: emptyDoc() });
    expect(screen.getByText('Nada esta semana.')).toBeInTheDocument();
  });

  it('registrar categorías nuevas las agrega a gym.coreLog, con el día elegido por chip', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Registrar abs o movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Lun' }));
    await user.click(screen.getByRole('button', { name: 'Core' }));
    await user.click(screen.getByRole('button', { name: 'Oblicuos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const [entrada] = leer().gym.coreLog;
    expect(entrada.categories).toEqual(['core', 'oblicuos']);
    expect(entrada.movilidad).toBe(false);
    expect(screen.getByText('Lun · Core, Oblicuos')).toBeInTheDocument();
  });

  it('movilidad sola, sin ninguna categoría, también se puede guardar', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Registrar abs o movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Hice movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const [entrada] = leer().gym.coreLog;
    expect(entrada.categories).toEqual([]);
    expect(entrada.movilidad).toBe(true);
  });

  it('sin ninguna categoría ni movilidad marcada, avisa y no guarda', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Registrar abs o movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('Marcá al menos una categoría de abdominales o movilidad.')).toBeInTheDocument();
    expect(leer().gym.coreLog ?? []).toHaveLength(0);
  });

  it('dos registros el mismo día quedan como dos entradas, no se pisan', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Registrar abs o movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Lun' }));
    await user.click(screen.getByRole('button', { name: 'Bajos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await user.click(screen.getByRole('button', { name: 'Registrar abs o movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Lun' }));
    await user.click(screen.getByRole('button', { name: 'Altos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const log = leer().gym.coreLog;
    expect(log).toHaveLength(2);
    expect(log[0].date).toBe(log[1].date);
    expect(log[0].id).not.toBe(log[1].id);
  });

  it('editar un registro existente actualiza sus categorías, desde el mismo plan semanal', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Registrar abs o movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Lun' }));
    await user.click(screen.getByRole('button', { name: 'Core' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await user.click(screen.getByRole('button', { name: 'Editar registro de Lun' }));
    await user.click(screen.getByRole('button', { name: 'Oblicuos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(leer().gym.coreLog[0].categories.sort()).toEqual(['core', 'oblicuos']);
  });

  it('navegar a otra semana filtra los registros que se muestran (no se mezclan entre semanas)', async () => {
    const user = userEvent.setup();
    renderScreen(<GymPage />, { doc: emptyDoc() });

    await user.click(screen.getByRole('button', { name: 'Registrar abs o movilidad' }));
    await user.click(screen.getByRole('button', { name: 'Lun' }));
    await user.click(screen.getByRole('button', { name: 'Core' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('Lun · Core')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(screen.queryByText('Lun · Core')).not.toBeInTheDocument();
    expect(screen.getByText('Nada esta semana.')).toBeInTheDocument();
  });
});
