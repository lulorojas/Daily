# Notificaciones — resumen agregado (etapa 6)

`send.js` corre desde `.github/workflows/notificaciones.yml`, cuatro veces por día
(8:00, 12:30, 18:00 y 22:00, hora Buenos Aires). Por cada cuenta con notificaciones
activadas, calcula qué quedó pendiente hoy (Hoy, Calendario, Hábitos y Gimnasio) y manda
**un solo mensaje agregado** por FCM — nunca uno por ítem individual. En el envío de las
22:00 suma además las comidas del plan sin cargar ("Te falta cargar: Merienda y Cena.").

Ojo: el workflow corre con el código que está en GitHub, no con el que se despliega a
Firebase Hosting. Un cambio en `app-react/src/lib/` que afecte el resumen recién llega a
las notificaciones cuando se sube (`git push`).

No corre en el navegador ni se sirve como parte de `app-react/`: es un script de Node
aparte, con su propio `package.json`.

## Pasos de consola pendientes (no los hace este cambio)

Dos cosas quedan explícitamente afuera de este código, porque son pasos de consola de
Firebase/GitHub, no líneas de código:

1. **Habilitar Cloud Messaging y generar la VAPID key**, en la consola de Firebase
   (Project settings → Cloud Messaging → "Web Push certificates" → generar par de
   claves). El valor generado va como `VITE_FCM_VAPID_KEY` en el entorno de build de
   `app-react/` (ver `app-react/src/services/messaging.js`) — sin esa variable, el
   cliente trata las notificaciones como "no disponibles" y no intenta pedir permiso.

2. **Generar la cuenta de servicio** que este script necesita para leer Firestore y
   mandar por FCM con privilegios de administrador (consola de Firebase → Project
   settings → Service accounts → "Generate new private key"). El JSON que se descarga va
   en un secreto de GitHub llamado `FIREBASE_SERVICE_ACCOUNT` (Settings → Secrets and
   variables → Actions → New repository secret), pegando el contenido completo del
   archivo tal cual.

Sin el secreto `FIREBASE_SERVICE_ACCOUNT` cargado, el workflow corre igual pero el script
falla de entrada con un mensaje claro (`credencialDesdeEnv()` en `send.js`), no en
silencio ni con un error críptico de Firebase.

## Correr en local (con la cuenta de servicio ya en mano)

```
cd notifications
npm install
FIREBASE_SERVICE_ACCOUNT="$(cat ruta/a/la-cuenta-de-servicio.json)" npm run send
```

`npm run send` compila `send.js` con esbuild (`dist/send.mjs`) antes de correrlo: los
imports de `app-react/src/lib/*.js` no llevan extensión (`./agenda`, no `./agenda.js`)
porque ese árbol está escrito para Vite, no para Node — ver el comentario al principio de
`send.js` para el porqué completo.
