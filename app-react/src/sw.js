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

const CACHE = 'daily-react-v1';

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
