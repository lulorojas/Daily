/* ----------------------------- SERVICE WORKER (v4) -----------------------------
   Port de app/sw.js, con la misma estrategia exacta: HTML network-first (los cambios
   aparecen apenas hay internet, y sin conexión cae al último index.html cacheado),
   assets cache-first con refresco en segundo plano.

   La diferencia de fondo con vanilla no es la estrategia — es CÓMO se arma la lista de
   archivos a precachear. Allá era una lista escrita a mano (`ASSETS`) que había que
   acordarse de actualizar a mano cada vez que se agregaba un js/*.js nuevo. Acá Vite
   genera un bundle con hash en el nombre (`index-XY12.js`) en cada build, así que una
   lista a mano quedaría desactualizada el primer build. `vite-plugin-pwa`, en modo
   "injectManifest", reemplaza `self.__WB_MANIFEST` por la lista real de archivos del
   build — con sus hashes — antes de que este archivo se sirva. El resto (la lógica de
   fetch) es nuestra, no de Workbox: se usa `precacheAndRoute` solo para la parte de
   "bajar y guardar todo esto al instalar", que es exactamente lo que hacía el
   `caches.open(CACHE).then(c => c.addAll(ASSETS))` de vanilla. */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const CACHE = 'daily-react-v2';

/* ----------------------------- NOTIFICACIONES (etapa 6) -----------------------------
   Mismo firebaseConfig que services/firebase.js, duplicado a propósito: ese archivo
   también inicializa Auth al importarse (getAuth(app)), que se apoya en APIs de la
   pestaña que acá no existen (no hay `document` en un service worker). Traerlo tal cual
   arriesgaría romper el SW entero por un efecto secundario pensado para otro contexto —
   un objeto de config duplicado es más seguro que compartir un módulo con ese acoplamiento. */
const firebaseConfig = {
  apiKey: 'AIzaSyDBHLj-OHZAAC0WGQTIVygs51Gl-2u9Cgk',
  authDomain: 'daily-app-2aae2.firebaseapp.com',
  projectId: 'daily-app-2aae2',
  storageBucket: 'daily-app-2aae2.firebasestorage.app',
  messagingSenderId: '90685314455',
  appId: '1:90685314455:web:aab2a0eda47201de2b20d2',
};

const messaging = getMessaging(initializeApp(firebaseConfig));

/* El script del cron (notifications/send.js) manda `notification: {title, body}`, que la
   mayoría de los navegadores ya muestran solos sin este handler. onBackgroundMessage()
   cubre el caso en que el payload llega como `data` puro: ahí nadie más la dibuja, así
   que se hace a mano con la misma API que usa el resto de la PWA. */
onBackgroundMessage(messaging, (payload) => {
  const { title, body } = payload.notification || payload.data || {};
  if (!title) return;
  self.registration.showNotification(title, { body, icon: '/icons/icon-192.png' });
});

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  // No self.skipWaiting() automático: la app espera a que la persona toque "Actualizar
  // ahora" (banner de actualización) antes de activar la versión nueva. Es lo mismo que
  // vanilla NO hacía (allá sí hacía skipWaiting automático) — acá es a propósito: si el
  // nuevo SW tomara control solo, el banner nunca llegaría a mostrarse a tiempo para
  // avisar antes del recargue.
});

self.addEventListener('activate', (e) => {
  cleanupOutdatedCaches();
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE && !k.startsWith('workbox-precache')).map((k) => caches.delete(k)),
    )).then(() => self.clients.claim()),
  );
});

// El mensaje que manda virtual:pwa-register cuando la persona toca "Actualizar ahora":
// recién ahí este SW en espera pasa a activo.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Todo lo que no sea de esta misma app pasa derecho a la red (Firebase Auth habla con
  // identitytoolkit/securetoken de Google: nunca hay que servirle algo cacheado).
  if (new URL(request.url).origin !== self.location.origin) return;

  const isDoc = request.mode === 'navigate' || request.destination === 'document';
  if (isDoc) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match('/index.html'))),
    );
    return;
  }

  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
