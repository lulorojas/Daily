import { useEffect, useState } from 'react';
import { Section } from '../ui/Section';
import { useData } from '../../hooks/useData';
import { registerFcmToken, removeFcmToken } from '../../store/mutations';
import { isMessagingSupported, notificationPermission, requestNotificationToken } from '../../services/messaging';
import { C, accentedDashedStyle } from '../../lib/theme';

/* ----------------------------- NOTIFICACIONES -----------------------------
   Sin equivalente en vanilla (etapa 6): un aviso agregado, cuatro veces por día, de lo que
   quedó pendiente — lo manda un GitHub Action por fuera de la app (ver notifications/), no
   esta pantalla. Lo único que hace React acá es pedir permiso y guardar el token de ESTE
   dispositivo en gym.fcmTokens... digo, en data.fcmTokens (ver registerFcmToken(), en
   store/mutations.js) para que el script del cron sepa a quién mandarle.

   `token` vive en estado de React, no en el documento directamente: es la única forma de
   saber si ESTE dispositivo ya está entre los guardados (data.fcmTokens es una lista de
   TODOS los dispositivos de la cuenta, sin ninguna marca de "cuál sos vos"). Al montar, si
   el permiso ya estaba concedido de antes, se vuelve a pedir el token en silencio (sin
   mostrar el diálogo del navegador: ya fue respondido) solo para poder compararlo. */
export function NotificationsSection() {
  const { data, update } = useData();
  const [soportado, setSoportado] = useState(null); // null = todavía no se sabe
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    isMessagingSupported().then(async (ok) => {
      if (!vivo) return;
      setSoportado(ok);
      if (ok && notificationPermission() === 'granted') {
        const t = await requestNotificationToken();
        if (vivo && t) setToken(t);
      }
    });
    return () => { vivo = false; };
  }, []);

  if (soportado === false) {
    return (
      <Section label="Notificaciones">
        <div className="card emptycard sm"><div className="empty">Este navegador no admite notificaciones todavía.</div></div>
      </Section>
    );
  }

  const activo = !!token && (data.fcmTokens || []).includes(token);
  const bloqueado = notificationPermission() === 'denied';

  const activar = async () => {
    setCargando(true);
    setError('');
    const t = await requestNotificationToken();
    setCargando(false);
    if (!t) { setError('No se pudo activar. Revisá los permisos de notificaciones del navegador para este sitio.'); return; }
    setToken(t);
    update((draft) => registerFcmToken(draft, t));
  };

  const desactivar = () => {
    if (!token) return;
    update((draft) => removeFcmToken(draft, token));
    setToken(null);
  };

  return (
    <Section label="Notificaciones">
      <div className="card pad2">
        <div className="inforow">
          <span className="infoname">En este dispositivo</span>
          <span className="infoval">{activo ? 'Activadas' : bloqueado ? 'Bloqueadas' : 'Desactivadas'}</span>
        </div>
      </div>

      {bloqueado ? (
        <div className="managetypes-note">
          Las bloqueaste desde el navegador. Para activarlas, cambiá el permiso de notificaciones de este sitio y volvé a esta pantalla.
        </div>
      ) : (
        <button
          type="button"
          className="dashed"
          style={accentedDashedStyle(C.amber)}
          disabled={cargando}
          onClick={activo ? desactivar : activar}
        >
          {activo ? 'Desactivar notificaciones' : '+ Activar notificaciones'}
        </button>
      )}

      {error && <div className="managetypes-note" style={{ color: C.danger }}>{error}</div>}
    </Section>
  );
}
