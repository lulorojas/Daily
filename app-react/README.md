# Daily — versión React (v4)

Reescritura del frontend de Daily en **React + Vite**, contra el **mismo backend Firebase**
que la app actual: mismo proyecto, mismas credenciales, mismos usuarios y los mismos datos.

La app vanilla de [`../app`](../app) sigue siendo la que está en producción y no se toca.
Esta carpeta se construye en paralelo, por etapas; al final se evalúa el reemplazo.

## Estado

| Etapa | Alcance | Estado |
|---|---|---|
| 1 | Base del proyecto, rutas, Firebase y autenticación completa | ✅ |
| 2 | Capa de datos: Firestore, modelo, lógica de negocio | ✅ |
| 3+ | Las 5 secciones, PWA, onboarding | pendiente |

## Correrlo

```sh
npm install     # una sola vez
npm run dev     # http://localhost:5173
npm test        # los tests, una pasada
npm run build   # bundle de producción en dist/
```

### Tests contra Firestore de verdad

Casi todos los tests usan un Firestore de mentira. Los de `src/compat/emulator.test.js`
corren contra el emulador, autenticados y con las reglas de seguridad reales aplicadas:

```sh
firebase emulators:start --only firestore,auth   # en otra terminal, desde la raíz del repo
npm run test:emulator
```

Sin el emulador, `npm test` los saltea solo.

## Cómo está organizado

```
src/
  components/   piezas visuales reutilizables
    auth/         las propias de las pantallas de sesión
    ui/           genéricas (íconos, confirmación)
  compat/       tests que corren la app vanilla y la React sobre los mismos datos
  context/      la sesión (AuthProvider) y el acceso al store (DataProvider)
  hooks/        lógica reutilizable con estado (useAuth, useData, useAuthForm…)
  lib/          funciones puras, sin React ni Firebase: el modelo y toda la lógica
  pages/        una pantalla completa por archivo
  routes/       el mapa de URLs y los guardianes de acceso
  services/     el único lugar que le habla a Firebase (auth y firestore)
  store/        el documento del usuario en memoria + las mutaciones
  styles/       styles.css (copia del diseño aprobado) + auth.css
  test/         herramientas para los tests (fixtures, Firestore falso, puente a vanilla)
```

Los tests viven al lado del archivo que prueban (`validation.js` → `validation.test.js`).

## El modelo de datos

Un documento por cuenta en `users/{uid}`, idéntico al de la app vanilla. La forma completa
está documentada arriba de [`src/lib/model.js`](src/lib/model.js), que es también el único
lugar donde se aplican los defaults y las migraciones al leer.

Regla que no se negocia: **el modelo no se toca**. Hay gente usando la app hoy y tiene que
poder ir y venir entre las dos versiones. Lo que garantiza eso son los tests de `src/compat/`.

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
- El documento de Firestore se lee y se escribe con la misma forma. `src/compat/` carga
  los `app/js/*.js` reales y compara las dos implementaciones sobre los mismos datos.
