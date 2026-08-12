import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { RutinasListPage } from './RutinasListPage';
import { RutinaDetailPage } from './RutinaDetailPage';
import { RutinaDayPage } from './RutinaDayPage';
import { renderScreen } from '../../test/utils';
import { emptyDoc, fullDoc } from '../../test/fixtures';

/* ============================================================================
   RUTINAS — los tres niveles

   El texto de cada nivel ya está comparado contra la app vanilla en
   src/compat/screens.test.jsx. Acá se prueba lo que ese archivo no cubre: que crear,
   editar, borrar y reordenar en cada nivel llame a la mutación correcta, que el borrado
   sea en cascada (borrar una rutina se lleva sus días y ejercicios) y que la navegación
   entre niveles sea de verdad — con las tres rutas reales, como en la app.
   ============================================================================ */

// Las tres rutas reales, igual que en AppRoutes: así "tocar una rutina" navega de
// verdad (con useParams funcionando) y no solo cambia lo que se ve dentro de una pantalla.
function renderRutinas(route, doc = fullDoc()) {
  return renderScreen(
    <Routes>
      <Route path="/gym/rutinas" element={<RutinasListPage />} />
      <Route path="/gym/rutinas/:rutId" element={<RutinaDetailPage />} />
      <Route path="/gym/rutinas/:rutId/:dayId" element={<RutinaDayPage />} />
    </Routes>,
    { doc, route },
  );
}

describe('nivel 1: biblioteca', () => {
  it('crear una rutina la agrega al final', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas', emptyDoc());

    await user.click(screen.getByRole('button', { name: '+ Crear rutina' }));
    await user.type(screen.getByLabelText('Nombre'), 'Full body');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(leer().gym.routines).toHaveLength(1);
    expect(leer().gym.routines[0].name).toBe('Full body');
    expect(leer().gym.routines[0].days).toEqual([]);
  });

  it('sin nombre, no guarda', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas', emptyDoc());

    await user.click(screen.getByRole('button', { name: '+ Crear rutina' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('Poné un nombre para la rutina.')).toBeInTheDocument();
    expect(leer().gym.routines).toHaveLength(0);
  });

  it('editar una rutina le cambia el nombre sin tocar sus días', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas');

    await user.click(screen.getByRole('button', { name: 'Editar Rutina A' }));
    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Rutina renombrada');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const r = leer().gym.routines.find((x) => x.id === 'r1');
    expect(r.name).toBe('Rutina renombrada');
    expect(r.days).toHaveLength(2);
  });

  it('reordenar mueve la rutina en el arreglo', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas');

    expect(leer().gym.routines.map((r) => r.id)).toEqual(['r1', 'r2']);
    await user.click(screen.getAllByRole('button', { name: 'Bajar' })[0]);
    expect(leer().gym.routines.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('la primera no puede subir ni la última bajar', () => {
    renderRutinas('/gym/rutinas');
    const subir = screen.getAllByRole('button', { name: 'Subir' });
    const bajar = screen.getAllByRole('button', { name: 'Bajar' });
    expect(subir[0]).toBeDisabled();
    expect(bajar[bajar.length - 1]).toBeDisabled();
  });

  it('borrar una rutina se la lleva con TODOS sus días y ejercicios', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas');

    await user.click(screen.getByRole('button', { name: 'Eliminar Rutina A' }));
    expect(screen.getByText('¿Eliminar "Rutina A"?')).toBeInTheDocument();
    expect(screen.getByText('Se borra la rutina con todos sus días y ejercicios.')).toBeInTheDocument();

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));
    expect(leer().gym.routines.some((r) => r.id === 'r1')).toBe(false);
    // No quedó ningún resto: no hay forma de que un día de r1 sobreviva suelto.
    expect(leer().gym.routines).toHaveLength(1);
  });

  it('tocar una rutina navega a sus días', async () => {
    const user = userEvent.setup();
    renderRutinas('/gym/rutinas');

    await user.click(screen.getByRole('link', { name: /Rutina A/ }));
    expect(screen.getByText('Días')).toBeInTheDocument();
    expect(screen.getByText('Pecho')).toBeInTheDocument();
  });
});

describe('nivel 2: días de una rutina', () => {
  it('crear un día lo agrega al final', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r2'); // Rutina B, sin días

    await user.click(screen.getByRole('button', { name: '+ Agregar día' }));
    await user.type(screen.getByLabelText('Nombre del día'), 'Piernas');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const r = leer().gym.routines.find((x) => x.id === 'r2');
    expect(r.days).toHaveLength(1);
    expect(r.days[0].name).toBe('Piernas');
    expect(r.days[0].exercises).toEqual([]);
  });

  it('reordenar mueve el día dentro de SU rutina, no de otra', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r1'); // días: Pecho, Espalda

    await user.click(screen.getAllByRole('button', { name: 'Bajar' })[0]);
    const r1 = leer().gym.routines.find((x) => x.id === 'r1');
    expect(r1.days.map((d) => d.name)).toEqual(['Espalda', 'Pecho']);
  });

  it('borrar un día se lleva sus ejercicios', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r1');

    await user.click(screen.getByRole('button', { name: 'Eliminar Pecho' }));
    expect(screen.getByText('Se borra el día con todos sus ejercicios.')).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));

    const r1 = leer().gym.routines.find((x) => x.id === 'r1');
    expect(r1.days.some((d) => d.id === 'd1')).toBe(false);
  });

  it('volver lleva a la biblioteca', async () => {
    const user = userEvent.setup();
    renderRutinas('/gym/rutinas/r1');
    await user.click(screen.getByRole('link', { name: 'Mis rutinas' }));
    expect(screen.getByText('Mis rutinas')).toBeInTheDocument();
  });

  it('una URL con un id que no existe vuelve a la biblioteca', () => {
    renderRutinas('/gym/rutinas/no-existe');
    expect(screen.getByRole('heading', { name: 'Mis rutinas' })).toBeInTheDocument();
  });
});

describe('nivel 3: ejercicios de un día', () => {
  it('crear un ejercicio con nombre y detalle', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r1/d2'); // Espalda, sin ejercicios

    await user.click(screen.getByRole('button', { name: '+ Agregar ejercicio' }));
    await user.type(screen.getByLabelText('Ejercicio'), 'Remo con barra');
    await user.type(screen.getByLabelText('Detalle · opcional'), '4x10');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const d2 = leer().gym.routines.find((r) => r.id === 'r1').days.find((d) => d.id === 'd2');
    expect(d2.exercises).toHaveLength(1);
    expect(d2.exercises[0]).toMatchObject({ name: 'Remo con barra', detail: '4x10' });
  });

  it('el detalle es opcional', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r1/d2');

    await user.click(screen.getByRole('button', { name: '+ Agregar ejercicio' }));
    await user.type(screen.getByLabelText('Ejercicio'), 'Dominadas');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const d2 = leer().gym.routines.find((r) => r.id === 'r1').days.find((d) => d.id === 'd2');
    expect(d2.exercises[0].detail).toBe('');
  });

  it('reordenar mueve el ejercicio dentro de SU día', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r1/d1'); // Press banca, Aperturas

    await user.click(screen.getAllByRole('button', { name: 'Bajar' })[0]);
    const d1 = leer().gym.routines.find((r) => r.id === 'r1').days.find((d) => d.id === 'd1');
    expect(d1.exercises.map((e) => e.name)).toEqual(['Aperturas', 'Press banca']);
  });

  it('editar un ejercicio le cambia nombre y detalle', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r1/d1');

    await user.click(screen.getByRole('button', { name: 'Editar Press banca' }));
    await user.clear(screen.getByLabelText('Detalle · opcional'));
    await user.type(screen.getByLabelText('Detalle · opcional'), '5x5');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const ex = leer().gym.routines.find((r) => r.id === 'r1').days.find((d) => d.id === 'd1').exercises.find((e) => e.id === 'e1');
    expect(ex.detail).toBe('5x5');
  });

  it('borrar un ejercicio solo lo quita a él, no al día', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderRutinas('/gym/rutinas/r1/d1');

    await user.click(screen.getByRole('button', { name: 'Eliminar Aperturas' }));
    expect(screen.getByText('Se quita el ejercicio de este día.')).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));

    const d1 = leer().gym.routines.find((r) => r.id === 'r1').days.find((d) => d.id === 'd1');
    expect(d1.exercises.some((e) => e.id === 'e2')).toBe(false);
    expect(d1.exercises.some((e) => e.id === 'e1')).toBe(true);
  });

  it('sin ejercicios, no ofrece reordenar', () => {
    renderRutinas('/gym/rutinas/r1/d2'); // Espalda: sin ejercicios en fullDoc()
    expect(screen.queryByRole('button', { name: 'Subir' })).not.toBeInTheDocument();
  });

  it('un día que no existe en la rutina vuelve a sus días', () => {
    renderRutinas('/gym/rutinas/r1/no-existe');
    expect(screen.getByText('Días')).toBeInTheDocument();
  });
});
