import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite es el bundler/dev-server. A diferencia de la app vanilla (donde el navegador cargaba
// cada js/*.js por separado), acá el código se escribe en módulos ES y Vite los junta.
//
// `test` es la config de Vitest, que comparte el mismo archivo y los mismos alias que la app:
// los tests importan exactamente los mismos módulos que se despliegan, sin duplicar config.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Imports absolutos desde src: `@/services/auth` en vez de '../../services/auth'.
    alias: { '@': new URL('./src', import.meta.url).pathname },
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
