import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { HoyPage } from '../pages/HoyPage';
import { CalendarioPage } from '../pages/CalendarioPage';
import { GymPage } from '../pages/GymPage';
import { HabitosPage } from '../pages/HabitosPage';
import { ProgresoPage } from '../pages/ProgresoPage';
import { AjustesPage } from '../pages/AjustesPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc } from '../test/fixtures';

/* ============================================================================
   ONBOARDING — el flujo completo

   Port de las mismas cinco cosas que prueba "46. Onboarding: modal + tour guiado" en
   app/tests/test.js, contra la versión React: el modal de "primera vez", el tour
   recorriendo las 5 secciones EN ORDEN (acá con navegación real, no solo ui.tab), "Omitir"
   en cualquier paso, y que se relance solo cuando corresponde.

   AppLayout de verdad (no un layout de mentira) porque OnboardingProvider vive ahí: es la
   única forma de probar que un paso de tipo 'section' navega la URL, no solo cambia una
   variable. */
function renderApp(doc, route = '/') {
  return renderScreen(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HoyPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/gym" element={<GymPage />} />
        <Route path="/habitos" element={<HabitosPage />} />
        <Route path="/progreso" element={<ProgresoPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
      </Route>
    </Routes>,
    { doc, route },
  );
}

describe('el modal de "primera vez"', () => {
  it('una cuenta con datos (onboarding.seen=true) no lo ve', () => {
    renderApp(fullDoc());
    expect(screen.queryByText('¿Es tu primera vez en Daily?')).not.toBeInTheDocument();
  });

  it('primera vez (seen=false): aparece el modal', () => {
    renderApp(emptyDoc());
    expect(screen.getByText('¿Es tu primera vez en Daily?')).toBeInTheDocument();
  });

  it('"Ya la conozco" salta directo a la app, sin tour', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderApp(emptyDoc());

    await user.click(screen.getByText('Ya la conozco'));

    expect(screen.queryByText('¿Es tu primera vez en Daily?')).not.toBeInTheDocument();
    expect(screen.queryByText('Bienvenido a Daily')).not.toBeInTheDocument();
    expect(leer().onboarding.seen).toBe(true); // queda marcado, no vuelve a preguntar
  });

  it('elegir el tour lo arranca y marca seen', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderApp(emptyDoc());

    await user.click(screen.getByText('Sí, mostrame cómo funciona'));

    expect(screen.getByText('Bienvenido a Daily')).toBeInTheDocument();
    expect(leer().onboarding.seen).toBe(true);
  });
});

describe('el tour', () => {
  async function startTour(user, doc = emptyDoc()) {
    const result = renderApp(doc);
    await user.click(screen.getByText('Sí, mostrame cómo funciona'));
    return result;
  }

  it('recorre las 5 secciones en orden, navegando de verdad', async () => {
    const user = userEvent.setup();
    await startTour(user);

    // Paso 1: info "Bienvenido a Daily". Paso 2: info "Instalá Daily".
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByText('Instalá Daily')).toBeInTheDocument();

    // Paso 3: Hoy (ya estábamos ahí).
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByText('Tu día completo: tareas, citas y hábitos. Movete entre los días con los círculos de arriba.')).toBeInTheDocument();

    // Paso 4: Calendario — el tip lo confirma (el h1 de esa pantalla es el mes, no un texto fijo).
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByText('Todo lo que tiene fecha, mes a mes. Tocá cualquier día para ver o agregar algo.')).toBeInTheDocument();

    // Paso 5: Gimnasio — acá SÍ se puede confirmar que la URL cambió de verdad: el h1
    // real de GymPage ("Gimnasio") tiene que estar en el documento, detrás del tip.
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByRole('heading', { name: 'Gimnasio' })).toBeInTheDocument();

    // Paso 6: Hábitos.
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByRole('heading', { name: 'Hábitos' })).toBeInTheDocument();

    // Paso 7: Progreso.
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByRole('heading', { name: 'Progreso' })).toBeInTheDocument();

    // Paso 8: info "El botón +".
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByText('El botón +')).toBeInTheDocument();

    // Paso 9 (último): "¡Listo!" — el botón ahora dice "Empezar a usar Daily", no "Siguiente".
    await user.click(screen.getByText('Siguiente'));
    expect(screen.getByText('¡Listo!')).toBeInTheDocument();
    expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();

    await user.click(screen.getByText('Empezar a usar Daily'));
    expect(screen.queryByText('¡Listo!')).not.toBeInTheDocument();
    // Terminó → vuelve a Hoy: el botón + de la barra (visible en cualquier sección) más
    // la ausencia de cualquier tip del tour alcanza para confirmarlo.
    expect(screen.queryByText(/PASO \d DE 9/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument();
  });

  it('"Omitir" corta el tour en cualquier paso, sin volver a Hoy de un salto', async () => {
    const user = userEvent.setup();
    await startTour(user);
    await user.click(screen.getByText('Siguiente')); // instalar
    await user.click(screen.getByText('Siguiente')); // Hoy
    await user.click(screen.getByText('Siguiente')); // Calendario
    await user.click(screen.getByText('Siguiente')); // Gimnasio

    await user.click(screen.getByRole('button', { name: 'Omitir' }));

    expect(screen.queryByText(/PASO \d DE 9/)).not.toBeInTheDocument();
    // Se queda en Gimnasio, que es donde el tour la dejó (no fuerza la vuelta a Hoy).
    expect(screen.getByRole('heading', { name: 'Gimnasio' })).toBeInTheDocument();
  });

  it('"Ver el tutorial de nuevo" (Ajustes) relanza el tour sin volver a preguntar', async () => {
    const user = userEvent.setup();
    const { doc: leer } = renderApp(fullDoc(), '/ajustes'); // seen ya es true

    await user.click(screen.getByText('Ver el tutorial de nuevo'));

    expect(screen.queryByText('¿Es tu primera vez en Daily?')).not.toBeInTheDocument();
    expect(screen.getByText('Bienvenido a Daily')).toBeInTheDocument();
    expect(leer().onboarding.seen).toBe(true);
  });
});
