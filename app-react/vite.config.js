import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite es el bundler/dev-server. A diferencia de la app vanilla (donde el navegador cargaba
// cada js/*.js por separado), acá el código se escribe en módulos ES y Vite los junta.
//
// `test` es la config de Vitest, que comparte el mismo archivo y los mismos alias que la app:
// los tests importan exactamente los mismos módulos que se despliegan, sin duplicar config.
//
// PWA: se eligió `vite-plugin-pwa` (el plugin oficial/estándar del ecosistema Vite para
// esto) en modo `injectManifest`, no en el modo `generateSW` que trae por defecto. La
// diferencia importa: `generateSW` le pide a Workbox que INVENTE la estrategia de caché a
// partir de config declarativa, y lo que arma por defecto es "cache-first para todo", no
// "network-first para el HTML" como hace vanilla (`app/sw.js`). Con `injectManifest` el
// service worker lo escribimos nosotros (`src/sw.js`, casi calcado del de vanilla) y el
// plugin solo se encarga de una cosa puntual: reemplazar `self.__WB_MANIFEST` por la lista
// real de archivos del build —con sus hashes, que cambian en cada build— antes de servirlo.
// Así el comportamiento es el mismo que ya conocíamos, y la lista de precache nunca queda
// desactualizada a mano.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Los mismos htmls/fuentes no hace falta precachearlos aparte: entran solos por
        // ser parte del build. Se excluye el propio manifest.webmanifest del precache de
        // Workbox porque ya lo sirve el navegador directo (no necesita pasar por el SW).
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Daily',
        short_name: 'Daily',
        description: 'Productividad personal: tareas, calendario, gimnasio y hábitos.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0E14',
        theme_color: '#0B0E14',
        lang: 'es',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Los íconos ya quedan declarados en el manifest de arriba; acá van los que además
      // hace falta que Workbox precachee (el apple-touch-icon no está en el manifest, pero
      // sigue siendo un archivo propio que la app necesita sin conexión).
      includeAssets: ['icons/icon-180.png'],
      devOptions: {
        // Sin esto, `npm run dev` no registra ningún SW: no hace falta para desarrollar,
        // pero permite probar la actualización/offline en local sin tener que buildear.
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      // Imports absolutos desde src: `@/services/auth` en vez de '../../services/auth'.
      '@': new URL('./src', import.meta.url).pathname,
      /* `virtual:pwa-register/react` no es un archivo: lo resuelve el plugin de arriba en
         el pipeline de Vite. Vitest no corre ese pipeline, así que bajo test (variable que
         Vitest pone sola) se redirige a un stub inerte — nunca en build de producción,
         donde `process.env.VITEST` no existe. */
      ...(process.env.VITEST ? { 'virtual:pwa-register/react': new URL('./src/test/pwaRegisterStub.js', import.meta.url).pathname } : {}),
    },
  },
  test: {
    // jsdom = un DOM de mentira dentro de Node, igual que en los tests de la app vanilla.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: { provider: 'v8', reportsDirectory: './coverage', include: ['src/**/*.{js,jsx}'] },
  },
});
