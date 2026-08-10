import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

function setup() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="¿Cerrar sesión?"
      description="Vas a volver a la pantalla de ingreso."
      okLabel="Cerrar sesión"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('muestra la pregunta y la explicación', () => {
    setup();
    expect(screen.getByText('¿Cerrar sesión?')).toBeInTheDocument();
    expect(screen.getByText('Vas a volver a la pantalla de ingreso.')).toBeInTheDocument();
  });

  it('el botón que confirma lleva la etiqueta que se le pasó', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Cancelar cancela', async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Enter confirma (igual que en la compu con la app actual)', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Escape cancela', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('tocar el fondo cancela', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(document.querySelector('.confirm-layer'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('tocar la tarjeta NO cancela', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(screen.getByText('¿Cerrar sesión?'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('al desmontarse suelta el listener del teclado', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { unmount } = render(
      <ConfirmDialog title="t" description="d" okLabel="ok" onConfirm={onConfirm} onCancel={vi.fn()} />,
    );
    unmount();
    await user.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
