/* ----------------------------- FCM (servicio) -----------------------------
   Único lugar del proyecto que importa 'firebase/messaging'. Mismo motivo que
   services/firebase.js y services/firestore.js: el resto de la app pide "el token" o
   "pedí permiso" sin saber que atrás hay Cloud Messaging.

   La VAPID key es del proyecto de Firebase (Configuración → Cloud Messaging → "Certificado
   web push"), NO se genera acá: llega por variable de entorno de Vite porque es el mismo
   tipo de dato que un id de proyecto — identifica el remitente, no es un secreto que haya
   que ocultar del bundle — pero versionar la key en el código la ataría a un solo proyecto
   de Firebase para siempre. Activar Cloud Messaging y generar esa key son pasos de consola
   fuera del alcance de este cambio; sin `VITE_FCM_VAPID_KEY` seteada, isMessagingSupported()
   da false y el resto de la app lo trata como "notificaciones no disponibles todavía", no
   como un error. */
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { getAppInstance } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

let messaging = null;
let supportedPromise = null;

/* isSupported() de Firebase chequea el navegador (Safari viejo, contextos privados, etc.);
   acá se le suma el chequeo de que la VAPID key ya esté configurada, porque sin ella
   getToken() rechaza SIEMPRE, sea cual sea el navegador. */
export function isMessagingSupported() {
  if (!VAPID_KEY) return Promise.resolve(false);
  supportedPromise ||= isSupported().catch(() => false);
  return supportedPromise;
}

function getMessagingInstance() {
  if (messaging) return messaging;
  const app = getAppInstance();
  if (!app) return null;
  messaging = getMessaging(app);
  return messaging;
}

// El registro del service worker que ya arrancó useSWUpdate() (ver hooks/useSWUpdate.js):
// sin pasárselo a getToken(), el SDK de FCM intenta registrar uno propio en
// /firebase-messaging-sw.js, que en esta app no existe — el suyo es src/sw.js.
// Con timeout: si el SW nunca llega a "ready" (falló su registro, entorno sin soporte),
// esto no puede dejar el botón de activar esperando para siempre.
function swRegistration() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return Promise.resolve(null);
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
}

/* Pide permiso al navegador y, si lo conceden, el token de ESTE dispositivo. Un solo
   punto de salida (null) para "no hay notificación posible ahora": permiso denegado,
   navegador sin soporte, VAPID key sin configurar o falla de red — quien llama no
   necesita distinguir el motivo, solo si hay token o no. */
export async function requestNotificationToken() {
  if (!(await isMessagingSupported())) return null;
  const inst = getMessagingInstance();
  if (!inst) return null;

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return null;

  const registration = await swRegistration();
  if (!registration) return null;

  try {
    return await getToken(inst, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  } catch {
    return null;
  }
}

// Estado actual del permiso, para pintar el botón sin volver a pedirlo.
export function notificationPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}
