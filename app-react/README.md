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
| 3a | Pantallas Hoy y Calendario, con sus formularios | ✅ |
| 3b | Gimnasio (plan semanal, tipos, peso corporal, cargas) y Rutinas | ✅ |
| 3c | Hábitos y Progreso | ✅ |
| 4 | Ajustes completo, PWA y onboarding | pendiente |

Las cinco secciones de la barra de abajo están migradas y andando. Ajustes sigue en su
versión mínima (la cuenta y cerrar sesión); backup, importar/exportar y el tutorial llegan
con la etapa 4, así como la PWA (instalación, banner de actualización) y el responsive fino.

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

### Comparación píxel a píxel contra la app actual

`src/compat/pixel.test.jsx` dibuja cada pantalla con las dos implementaciones —la vanilla
llamando a sus `viewHoy()` / `viewCalendario()` reales— las abre a las dos en Edge con las
hojas de estilo que usa cada una, y compara las capturas píxel por píxel:

```sh
npm run test:pixel
```

Usa el Edge que ya está instalado (no descarga ningún navegador). Si hay diferencias, deja
las dos capturas más una tercera con las zonas distintas en rojo, en `pixel-diff/`.

Ni este ni los del emulador corren en `npm test`: se saltean solos.

## Cómo está organizado

```
src/
  components/   piezas visuales reutilizables
    auth/         las propias de las pantallas de sesión
    calendario/   la grilla del mes y el detalle del día
    gym/          plan semanal, tipos, peso corporal, cargas por ejercicio
    habitos/      la fila de hábito (con menú) y su formulario
    hoy/          la tira semanal, el progreso, los hábitos, el entreno
    items/        lo que Hoy y Calendario comparten: filas y formularios de agenda
    nav/          la barra de abajo y el menú del botón +
    progreso/     las nueve secciones de solo lectura de Progreso
    rutinas/      la fila compartida por los niveles "día" y "ejercicio"
    ui/           genéricas (íconos, modal, campos, gráficos, selectores de fecha y hora)
  compat/       tests que corren la app vanilla y la React sobre los mismos datos
  context/      la sesión, el acceso al store y los formularios de agenda
  hooks/        lógica reutilizable con estado (useAuth, useData, useSelectedDay…)
  lib/          funciones puras, sin React ni Firebase: el modelo y toda la lógica
  pages/        una pantalla completa por archivo
  routes/       el mapa de URLs, los guardianes de acceso y el marco de la app
  services/     el único lugar que le habla a Firebase (auth y firestore)
  store/        el documento del usuario en memoria + las mutaciones
  styles/       styles.css (copia del diseño aprobado) + auth.css + app.css
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

## Las URLs de la app

| URL | Pantalla |
|---|---|
| `/` | Hoy |
| `/calendario` | Calendario |
| `/gym` | Gimnasio: plan semanal, peso corporal, cargas por ejercicio |
| `/gym/rutinas`, `/gym/rutinas/:rutId`, `/gym/rutinas/:rutId/:dayId` | la biblioteca de rutinas, sus tres niveles |
| `/habitos` | Hábitos |
| `/progreso` | Progreso (solo lectura) |
| `/ajustes` | la cuenta y cerrar sesión (sub-pantalla de Hoy) |

El día que se está mirando viaja en la URL: `/?d=2026-08-10`. Lo comparten Hoy y
Calendario, sobrevive a recargar la página y hace que un link a un día sea un link de
verdad. Es lo que en la app vanilla eran las variables globales `ui.daySel` y `ui.calSel`.

## Los estilos

Tres archivos, y el orden importa:

- `styles.css` — el sistema visual, copia sin cambios de `app/css/styles.css`. No se toca.
- `auth.css` — lo que en vanilla estaba inline en los template strings de `auth.js`.
- `app.css` — lo mismo para `hoy.js`, `calendario.js`, `agenda.js`, `utils.js`, `gimnasio.js`,
  `rutinas.js`, `habitos.js` y `progreso.js`.

El corte es siempre el mismo: si el valor es una constante, va a una clase con nombre; si
sale de un dato (el color de un ítem según su tipo, el que el usuario le eligió a un
hábito, el ancho de la barra de progreso), se queda inline. `src/compat/styles.test.js`
comprueba que cada clase nueva declare exactamente el mismo valor que tenía el estilo
inline que reemplazó, buscándolo en los `.js` de la app vanilla.

## Compatibilidad con la app actual

Requisito no negociable: hay gente usando Daily hoy.

- El `firebaseConfig` es copia exacta de `app/js/firebase-config.js`.
- Las validaciones recortan espacios igual que la app actual, así una cuenta creada allá
  entra acá con la misma contraseña.
- Los mensajes de error y los textos de las pantallas son los mismos: `src/compat/
  screens.test.jsx` compara palabra por palabra lo que dibuja cada versión.
- El CSS es una copia sin cambios de `app/css/styles.css`; las nueve pantallas (sesión,
  Hoy, Calendario, Gimnasio, los tres niveles de Rutinas, Hábitos, Progreso) y sus
  formularios se verificaron píxel a píxel contra la app actual.
- El documento de Firestore se lee y se escribe con la misma forma. `src/compat/` carga
  los `app/js/*.js` reales y compara las dos implementaciones sobre los mismos datos.
