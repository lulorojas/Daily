// Daily — service worker.
// HTML shell: network-first (los cambios aparecen apenas hay internet).
// Assets estáticos (íconos, manifest): cache-first con refresco en segundo plano.
const CACHE = 'daily-v17';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/vendor/firebase-app-compat.js',
  './js/vendor/firebase-auth-compat.js',
  './js/vendor/firebase-firestore-compat.js',
  './js/firebase-config.js',
  './js/auth.js',
  './js/firestore.js',
  './js/onboarding.js',
  './js/utils.js',
  './js/hoy.js',
  './js/agenda.js',
  './js/calendario.js',
  './js/gimnasio.js',
  './js/rutinas.js',
  './js/habitos.js',
  './js/progreso.js',
  './js/ajustes.js',
  './js/app.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Todo lo que no sea de esta misma app pasa derecho a la red, sin que el SW lo toque.
  // Firebase Auth habla con identitytoolkit y securetoken de Google: nunca hay que
  // servirle una respuesta cacheada ni guardarle uno de sus GET.
  if (new URL(request.url).origin !== self.location.origin) return;

  // La página en sí: red primero, caché como respaldo sin conexión.
  const isDoc = request.mode === 'navigate' || request.destination === 'document';
  if (isDoc) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Resto de assets: caché primero, y se actualiza en segundo plano.
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
    })
  );
});
