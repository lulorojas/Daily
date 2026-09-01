/* ----------------------------- STUB DE virtual:pwa-register/react -----------------------------
   `virtual:pwa-register/react` no es un archivo real: lo resuelve vite-plugin-pwa durante
   el build/dev de Vite. Vitest no corre ese pipeline, así que no tiene cómo encontrarlo —
   vite.config.js alía ese import a ESTE archivo solo cuando corre bajo test
   (`process.env.VITEST`), nunca en build de producción.

   Devuelve un hook inerte: sin service worker real en jsdom no hay nada que detectar, así
   que los componentes que lo usan (UpdateBanner) simplemente no tienen nada para mostrar. */
export function useRegisterSW() {
  return {
    offlineReady: [false, () => {}],
    needRefresh: [false, () => {}],
    updateServiceWorker: () => {},
  };
}
