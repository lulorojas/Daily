/* ============================================================================
   NOTIFICACIONES: RESUMEN AGREGADO (etapa 6)

   Este script NO es parte de app-react/: no corre en el navegador, corre cuatro veces por
   día desde .github/workflows/notificaciones.yml (GitHub Actions, con cron). Su trabajo:
   por cada cuenta con notificaciones activadas, calcular qué quedó pendiente HOY y
   mandarle UN mensaje agregado — nunca uno por tarea, cita, hábito o turno de gimnasio
   suelto (pedido explícito).

   Aislamiento por cuenta (decisión 3): se recorre la colección `users` documento por
   documento, y cada resumen se arma y se manda con los datos de ESE documento nada más.
   No hay ningún punto del script en el que datos de una cuenta puedan terminar en el
   mensaje de otra — no se arma ninguna estructura que junte más de un uid a la vez.

   La cuenta de "qué está pendiente" es la MISMA que usa la app: se importan las funciones
   puras de app-react/src/lib/ tal cual (son JS sin React ni DOM, pensadas para eso — ver
   el comentario de lib/notifications.js), en vez de reescribir la lógica acá y arriesgarse
   a que un día se desincronicen.

   Lo que este script NO hace, a propósito, porque es "paso de consola" de Lulo:
     - habilitar Cloud Messaging y generar la VAPID key (esto es del lado del cliente,
       ver app-react/src/services/messaging.js);
     - generar la cuenta de servicio que este script necesita para autenticarse.
   Ver notifications/README.md para qué secretos hay que cargar en GitHub para que esto
   funcione. Sin ellos, el workflow falla al arrancar con un mensaje claro, no en silencio.

   Por qué `npm run send` compila antes de correr (ver package.json): los imports de
   app-react/src/lib/*.js no llevan extensión ('./agenda', no './agenda.js') porque Vite
   los resuelve así — es el estilo de TODO ese árbol, no algo de este script, y cambiarlo
   ahí solo para este consumidor sería tocar el código real de la app por una conveniencia
   de un script aparte. Node por sí solo exige la extensión en ESM y no los resuelve. La
   salida: esbuild arma UN archivo (dist/send.mjs) resolviendo esos imports igual que
   Vite, dejando afuera (`--packages=external`) los paquetes de npm de verdad
   (firebase-admin), que Node sigue resolviendo como siempre desde node_modules/.
   ============================================================================ */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { normalize } from '../app-react/src/lib/model.js';
import { pendingCounts, summaryText } from '../app-react/src/lib/notifications.js';

// Argentina es UTC-3 fijo (sin horario de verano desde 2009): un corrimiento constante
// alcanza, sin tirar de ninguna librería de zonas horarias. toISOString() siempre da la
// hora en UTC sin importar en qué huso corra el runner de GitHub Actions (UTC, de por sí).
function ahoraEnBuenosAires() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000);
}

function hoyEnBuenosAires() {
  return ahoraEnBuenosAires().toISOString().slice(0, 10);
}

/* Las comidas sin cargar se reclaman solo en el envío de la noche (pedido explícito:
   "una noti a las 22 de la noche que me ponga si me faltan cargar comidas") — en los de
   las 8, 12:30 y 18 todavía no se comió lo que "falta". Se mira la hora y no qué cron
   disparó, porque el workflow no le pasa eso al script; de 21 a 23 cubre las demoras de
   GitHub Actions sin pasar a medianoche, donde "hoy" ya sería el día siguiente. */
function esElEnvioDeLaNoche() {
  const h = ahoraEnBuenosAires().getUTCHours();
  return h >= 21 && h <= 23;
}

// Tokens que FCM avisa como definitivamente inválidos: el dispositivo desinstaló la app,
// borró datos del sitio, o el token expiró. Los demás errores (red, cuota) no dicen nada
// sobre si el token sigue sirviendo, así que no se tocan.
const CODIGOS_TOKEN_INVALIDO = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

function credencialDesdeEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT (el JSON de la cuenta de '
      + 'servicio). Ver notifications/README.md.',
    );
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es JSON válido.');
  }
}

async function main() {
  const app = initializeApp({ credential: cert(credencialDesdeEnv()) });
  const db = getFirestore(app);
  const messaging = getMessaging(app);
  const hoy = hoyEnBuenosAires();
  const comidas = esElEnvioDeLaNoche();

  const snap = await db.collection('users').get();

  let notificadas = 0;
  let sinPendientes = 0;
  let sinTokens = 0;
  let tokensPodados = 0;

  for (const docSnap of snap.docs) {
    const raw = docSnap.data();
    const tokens = raw.fcmTokens;
    if (!Array.isArray(tokens) || tokens.length === 0) { sinTokens++; continue; }

    const estado = normalize(raw);
    const texto = summaryText(pendingCounts(estado, hoy, { comidas }));
    if (!texto) { sinPendientes++; continue; } // nada pendiente: no hay resumen que mandar.

    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: 'Daily', body: texto },
    });
    notificadas++;

    const invalidos = resp.responses
      .map((r, i) => (!r.success && CODIGOS_TOKEN_INVALIDO.has(r.error?.code) ? tokens[i] : null))
      .filter(Boolean);
    if (invalidos.length) {
      await docSnap.ref.update({ fcmTokens: FieldValue.arrayRemove(...invalidos) });
      tokensPodados += invalidos.length;
    }
  }

  console.log(
    `[${hoy}] cuentas notificadas: ${notificadas} · sin pendientes: ${sinPendientes} · `
    + `sin notificaciones activadas: ${sinTokens} · tokens podados: ${tokensPodados}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
