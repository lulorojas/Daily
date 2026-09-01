import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AjustesPage } from './AjustesPage';
import { renderScreen } from '../test/utils';
import { emptyDoc, fullDoc } from '../test/fixtures';
import { KEY_BACKUP_META, backupPayload } from '../lib/backup';
import { resetBackupMetaForTests } from '../hooks/useBackupMeta';

/* ============================================================================
   AJUSTES (completo) — etapa 4

   El texto y las clases ya están comparados contra viewAjustes() en src/compat/
   screens.test.jsx (si ese archivo existe) y píxel a píxel en src/compat/pixel.test.jsx.
   Acá se prueba lo que el pedido pide explícito: el round-trip de backup, que un archivo
   inválido no toque nada, el aviso semanal, y que "Ver el tutorial de nuevo" relance el
   onboarding.

   jsdom no implementa URL.createObjectURL: se mockea para que exportar (que dispara una
   descarga de verdad en el navegador) no reviente en el test. */
beforeEach(() => {
  localStorage.clear();
  resetBackupMetaForTests();
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
});

function importFile(doc, exportedAt = '2026-01-01T00:00:00.000Z') {
  const json = JSON.stringify(backupPayload(doc, exportedAt));
  return new File([json], 'daily-backup.json', { type: 'application/json' });
}

describe('backup: round-trip completo', () => {
  it('exportar y después importar ESE MISMO archivo deja el documento idéntico', async () => {
    const user = userEvent.setup();
    const original = fullDoc();
    const { doc: leer, store } = renderScreen(<AjustesPage />, { doc: original, withOnboarding: true });

    // Exportar: dispara la descarga y guarda la fecha en localStorage (no en Firestore).
    await user.click(screen.getByText('Exportar backup'));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const meta1 = JSON.parse(localStorage.getItem(KEY_BACKUP_META));
    expect(meta1.lastExport).toBeTruthy();

    // El JSON exportado es exactamente `original` (comprobado aparte, en backup.test.js);
    // acá lo que importa es el round-trip. Se modifica el documento como si hubiera
    // pasado el tiempo, y se importa el mismo archivo: tiene que volver a `original`.
    await store.update((draft) => { draft.items.push({ id: 'intruso', kind: 'tarea', title: 'no debería sobrevivir', date: null, done: false }); });
    expect(leer().items).toHaveLength(original.items.length + 1);

    const file = importFile(original, meta1.lastExport);
    await user.upload(document.querySelector('input[type="file"]'), file);
    await user.click(await screen.findByRole('button', { name: 'Reemplazar' }));

    await waitFor(() => expect(leer()).toEqual(original));
  });

  it('un import inválido avisa y no toca ni un dato existente', async () => {
    const user = userEvent.setup();
    const original = fullDoc();
    const { doc: leer } = renderScreen(<AjustesPage />, { doc: original, withOnboarding: true });

    const badFile = new File(['esto no es json'], 'daily-backup.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]');
    await user.upload(input, badFile);

    expect(await screen.findByText('No se pudo importar')).toBeInTheDocument();
    expect(screen.getByText(/JSON válido/)).toBeInTheDocument();
    // Nunca se preguntó nada de reemplazar: el archivo se rechazó antes de eso.
    expect(screen.queryByRole('button', { name: 'Reemplazar' })).not.toBeInTheDocument();
    expect(leer()).toEqual(original);
  });

  it('un backup de otro formato también avisa y no toca nada', async () => {
    const user = userEvent.setup();
    const original = fullDoc();
    const { doc: leer } = renderScreen(<AjustesPage />, { doc: original, withOnboarding: true });

    const payload = backupPayload(original);
    payload.format = 999;
    const file = new File([JSON.stringify(payload)], 'daily-backup.json', { type: 'application/json' });
    await user.upload(document.querySelector('input[type="file"]'), file);

    expect(await screen.findByText('No se pudo importar')).toBeInTheDocument();
    expect(screen.getByText(/otra versión/)).toBeInTheDocument();
    expect(leer()).toEqual(original);
  });

  it('importar sin confirmar (Cancelar) tampoco toca nada', async () => {
    const user = userEvent.setup();
    const original = fullDoc();
    const { doc: leer } = renderScreen(<AjustesPage />, { doc: original, withOnboarding: true });

    const file = importFile(emptyDoc());
    await user.upload(document.querySelector('input[type="file"]'), file);
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(leer()).toEqual(original);
  });
});

describe('aviso de backup (7 días)', () => {
  it('cuenta nueva de HOY: sin datos, no avisa (no hay nada que respaldar)', () => {
    renderScreen(<AjustesPage />, { doc: emptyDoc(), withOnboarding: true });
    expect(screen.queryByText(/no hacés backup|ningún backup/)).not.toBeInTheDocument();
  });

  it('con datos y sin backup nunca hecho, hace más de 7 días de la primera vez: avisa', () => {
    const haceOchoDias = new Date();
    haceOchoDias.setDate(haceOchoDias.getDate() - 8);
    localStorage.setItem(KEY_BACKUP_META, JSON.stringify({ firstSeen: haceOchoDias.toISOString() }));

    renderScreen(<AjustesPage />, { doc: fullDoc(), withOnboarding: true });
    expect(screen.getByText('Todavía no hiciste ningún backup de tus datos.')).toBeInTheDocument();
  });

  it('exportar hace desaparecer el aviso', async () => {
    const user = userEvent.setup();
    const haceOchoDias = new Date();
    haceOchoDias.setDate(haceOchoDias.getDate() - 8);
    localStorage.setItem(KEY_BACKUP_META, JSON.stringify({ firstSeen: haceOchoDias.toISOString() }));

    renderScreen(<AjustesPage />, { doc: fullDoc(), withOnboarding: true });
    expect(screen.getByText('Todavía no hiciste ningún backup de tus datos.')).toBeInTheDocument();

    await user.click(screen.getAllByText('Exportar')[0]);
    expect(screen.queryByText('Todavía no hiciste ningún backup de tus datos.')).not.toBeInTheDocument();
  });

  it('"Recordarme en una semana" también lo oculta', async () => {
    const user = userEvent.setup();
    const haceOchoDias = new Date();
    haceOchoDias.setDate(haceOchoDias.getDate() - 8);
    localStorage.setItem(KEY_BACKUP_META, JSON.stringify({ firstSeen: haceOchoDias.toISOString() }));

    renderScreen(<AjustesPage />, { doc: fullDoc(), withOnboarding: true });
    await user.click(screen.getByRole('button', { name: 'Recordarme en una semana' }));
    expect(screen.queryByText(/backup/i, { selector: '.noticecard-title' })).not.toBeInTheDocument();
  });
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
