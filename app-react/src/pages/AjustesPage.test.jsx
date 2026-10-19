import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AjustesPage } from './AjustesPage';
import { renderScreen } from '../test/utils';
import { fullDoc } from '../test/fixtures';

/* ============================================================================
   AJUSTES (completo) — etapa 4

   El texto y las clases ya están comparados contra viewAjustes() en src/compat/
   screens.test.jsx (si ese archivo existe) y píxel a píxel en src/compat/pixel.test.jsx.
   Acá se prueba que "Ver el tutorial de nuevo" relance el onboarding y la sección de cuenta.
   (El backup —exportar e importar— se sacó: con la app hosteada y los datos en la nube ya no
   hace falta.) */
beforeEach(() => {
  localStorage.clear();
});

describe('"Ver el tutorial de nuevo"', () => {
  it('relanza el tour desde el paso 1, sin volver a preguntar "¿primera vez?"', async () => {
    const user = userEvent.setup();
    // seen ya es true: no tiene que aparecer el modal de "primera vez" en ningún momento.
    renderScreen(<AjustesPage />, { doc: fullDoc(), withOnboarding: true });

    await user.click(screen.getByText('Ver el tutorial de nuevo'));
    expect(screen.queryByText('¿Es tu primera vez en Daily?')).not.toBeInTheDocument();
    expect(screen.getByText('Bienvenido a Daily')).toBeInTheDocument();
  });
});

describe('cuenta', () => {
  it('muestra el mail de la sesión y el botón de cerrar sesión', () => {
    renderScreen(<AjustesPage />, { doc: fullDoc(), withOnboarding: true });
    expect(screen.getByText('lulo@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });
});
