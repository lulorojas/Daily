# Daily — versión React (v4)

Reescritura del frontend de Daily en **React + Vite**, contra el **mismo backend Firebase**
que la app actual: mismo proyecto, mismas credenciales, mismos usuarios y los mismos datos.

La app vanilla de [`../app`](../app) sigue siendo la que está en producción y no se toca.
Esta carpeta se construye en paralelo, por etapas; al final se evalúa el reemplazo.

## Estado

| Etapa | Alcance | Estado |
|---|---|---|
| 1 | Base del proyecto, rutas, Firebase y autenticación completa | ✅ |
| 2+ | Capa de datos (Firestore), las 5 secciones, PWA, onboarding | pendiente |

## Correrlo

```sh
npm install     # una sola vez
npm run dev     # http://localhost:5173
npm test        # los tests, una pasada
npm run build   # bundle de producción en dist/
```

## Cómo está organizado

```
src/
  components/   piezas visuales reutilizables
    auth/         las propias de las pantallas de sesión
    ui/           genéricas (íconos, confirmación)
  context/      estado global: la sesión (AuthContext + AuthProvider)
  hooks/        lógica reutilizable con estado (useAuth, useAuthForm, useAuthAction)
  lib/          funciones puras, sin React ni Firebase (validación, errores, estados)
  pages/        una pantalla completa por archivo
  routes/       el mapa de URLs y los guardianes de acceso
  services/     el único lugar que le habla a Firebase
  styles/       styles.css (copia del diseño aprobado) + auth.css
  test/         herramientas para los tests
```

Los tests viven al lado del archivo que prueban (`validation.js` → `validation.test.js`).

## Reglas de acceso

| Estado de la sesión | Puede ver | Todo lo demás lo manda a |
|---|---|---|
| Firebase no arrancó | cartel de error | — |
| Firebase no contestó todavía | "Abriendo tu Daily…" | — |
| sin sesión | `/login`, `/registro`, `/recuperar` | `/login` |
| con sesión sin verificar | `/verificar` | `/verificar` |
| con sesión verificada | la app | `/` |

## Compatibilidad con la app actual

Requisito no negociable: hay gente usando Daily hoy.

- El `firebaseConfig` es copia exacta de `app/js/firebase-config.js`.
- Las validaciones recortan espacios igual que la app actual, así una cuenta creada allá
  entra acá con la misma contraseña.
- Los mensajes de error y los textos de las pantallas son los mismos.
- El CSS es una copia sin cambios de `app/css/styles.css`; las cuatro pantallas de sesión
  se verificaron píxel a píxel contra la app actual.
