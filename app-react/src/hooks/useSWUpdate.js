import { useRegisterSW } from 'virtual:pwa-register/react';

/* ----------------------------- ACTUALIZACIÓN DEL SERVICE WORKER -----------------------------
   No hay de dónde portar esto: vanilla nunca tuvo un banner de actualización (se buscó en
   los cuatro `app/js/*.js` y no existe `updatefound`/`waiting`/"actualizar" en ningún
   lado). Es funcionalidad nueva, pedida explícitamente para esta etapa.

   `registerType:'prompt'` en vite.config.js es lo que hace que un service worker nuevo se
   quede ESPERANDO en vez de tomar control solo: por eso hay algo que preguntarle a la
   persona en primer lugar. `useRegisterSW` registra el SW y avisa (`onNeedRefresh`)
   cuando hay una versión nueva instalada y en espera.

   Decisión de producto (confirmada): sin posponer. A diferencia del aviso de backup —que
   es un recordatorio que tiene sentido postergar—, una versión nueva en espera es un
   hecho: el banner queda discreto pero fijo hasta que la persona toca "Actualizar ahora"
   (o cierra y reabre la app, que de todos modos la actualiza sola en algún momento). */
export function useSWUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      // Sin service worker (navegación privada, navegador viejo) la app sigue andando
      // online igual: no hay nada más que hacer acá, solo no romper el render.
    },
  });

  return {
    needRefresh,
    updateNow: () => updateServiceWorker(true),
  };
}
