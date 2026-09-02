import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsSection } from './NotificationsSection';
import { renderScreen } from '../../test/utils';
import { emptyDoc } from '../../test/fixtures';
import { isMessagingSupported, notificationPermission, requestNotificationToken } from '../../services/messaging';

/* Mismo motivo que LoginPage.test.jsx: se reemplaza el módulo entero para que el test
   pueda decidir "este navegador sí/no soporta FCM" y "el permiso da tal token" sin
   Notification real, sin service worker y sin pegarle a Firebase. */
vi.mock('../../services/messaging', () => ({
  isMessagingSupported: vi.fn(),
  notificationPermission: vi.fn(),
  requestNotificationToken: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe('sin soporte del navegador', () => {
  it('avisa que no está disponible y no ofrece ningún botón', async () => {
    isMessagingSupported.mockResolvedValue(false);
    notificationPermission.mockReturnValue('default');
    renderScreen(<NotificationsSection />, { doc: emptyDoc() });

    expect(await screen.findByText('Este navegador no admite notificaciones todavía.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('con soporte, permiso todavía no pedido', () => {
  beforeEach(() => {
    isMessagingSupported.mockResolvedValue(true);
    notificationPermission.mockReturnValue('default');
  });

  it('arranca en "Desactivadas", sin pedir el token en silencio (no hay permiso de antes)', async () => {
    renderScreen(<NotificationsSection />, { doc: emptyDoc() });
    expect(await screen.findByText('Desactivadas')).toBeInTheDocument();
    expect(requestNotificationToken).not.toHaveBeenCalled();
  });

  it('activar pide el token y lo guarda en el documento', async () => {
    const user = userEvent.setup();
    requestNotificationToken.mockResolvedValue('tok-abc');
    const { doc: leer } = renderScreen(<NotificationsSection />, { doc: emptyDoc() });

    await user.click(await screen.findByRole('button', { name: '+ Activar notificaciones' }));

    expect(leer().fcmTokens).toEqual(['tok-abc']);
    expect(await screen.findByText('Activadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar notificaciones' })).toBeInTheDocument();
  });

  it('si el permiso termina denegado, avisa y no guarda nada', async () => {
    const user = userEvent.setup();
    requestNotificationToken.mockResolvedValue(null);
    const { doc: leer } = renderScreen(<NotificationsSection />, { doc: emptyDoc() });

    await user.click(await screen.findByRole('button', { name: '+ Activar notificaciones' }));

    expect(screen.getByText(/No se pudo activar/)).toBeInTheDocument();
    expect(leer().fcmTokens).toBeUndefined();
  });
});

describe('con soporte, permiso ya concedido antes', () => {
  it('al entrar, pide el token en silencio y muestra "Activadas" si ya estaba guardado', async () => {
    isMessagingSupported.mockResolvedValue(true);
    notificationPermission.mockReturnValue('granted');
    requestNotificationToken.mockResolvedValue('tok-ya-guardado');
    const doc = { ...emptyDoc(), fcmTokens: ['tok-ya-guardado'] };

    renderScreen(<NotificationsSection />, { doc });

    expect(await screen.findByText('Activadas')).toBeInTheDocument();
  });

  it('desactivar saca el token de este dispositivo del documento', async () => {
    const user = userEvent.setup();
    isMessagingSupported.mockResolvedValue(true);
    notificationPermission.mockReturnValue('granted');
    requestNotificationToken.mockResolvedValue('tok-este-dispositivo');
    const doc = { ...emptyDoc(), fcmTokens: ['tok-este-dispositivo', 'tok-otro-dispositivo'] };
    const { doc: leer } = renderScreen(<NotificationsSection />, { doc });

    await user.click(await screen.findByRole('button', { name: 'Desactivar notificaciones' }));

    expect(leer().fcmTokens).toEqual(['tok-otro-dispositivo']);
  });
});

describe('permiso bloqueado', () => {
  it('no ofrece activar: explica que hay que cambiarlo desde el navegador', async () => {
    isMessagingSupported.mockResolvedValue(true);
    notificationPermission.mockReturnValue('denied');
    renderScreen(<NotificationsSection />, { doc: emptyDoc() });

    expect(await screen.findByText('Bloqueadas')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Las bloqueaste desde el navegador/)).toBeInTheDocument();
  });
});
