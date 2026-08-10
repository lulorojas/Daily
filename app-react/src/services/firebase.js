/* ----------------------------- FIREBASE (init) -----------------------------
   Mismo proyecto, mismas credenciales y mismos usuarios que la app vanilla: este
   firebaseConfig es una copia exacta de app/js/firebase-config.js. La versión React
   se conecta al mismo backend, así que las cuentas que ya existen entran igual.

   Diferencia con vanilla: allá se cargaba el SDK "compat" con <script> y quedaba el
   global `firebase`. Acá se usa el SDK modular, que se importa como cualquier paquete
   npm. Vite se queda solo con lo que se importa (tree-shaking), así que si mañana no
   usamos Storage, ese código nunca llega al navegador.

   La apiKey de un proyecto web es pública por diseño: identifica al proyecto, no autoriza
   nada por sí sola. Lo que protege los datos son el proveedor habilitado en la consola y
   las reglas de seguridad de Firestore (firestore.rules, en la raíz del repo). */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyDBHLj-OHZAAC0WGQTIVygs51Gl-2u9Cgk',
  authDomain: 'daily-app-2aae2.firebaseapp.com',
  projectId: 'daily-app-2aae2',
  storageBucket: 'daily-app-2aae2.firebasestorage.app',
  messagingSenderId: '90685314455',
  appId: '1:90685314455:web:aab2a0eda47201de2b20d2',
};

/* Si Firebase no arranca (config rota, entorno raro), no explota la app entera: se guarda
   el error y la puerta muestra la pantalla de "No se pudo cargar", igual que hacía
   authGate() con el estado 'sdk'. */
let app = null;
let auth = null;
let initError = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (e) {
  initError = e;
}

export function getAuthInstance() {
  return auth;
}

// La instancia de la app la necesita también Firestore (services/firestore.js).
export function getAppInstance() {
  return app;
}

export function getInitError() {
  return initError;
}

// De dónde llega el mail de Firebase (remitente por defecto: noreply@<authDomain>).
// Se muestra en las pantallas para que la persona lo reconozca y no lo tome por spam.
export function authSender() {
  return 'noreply@' + (firebaseConfig.authDomain || 'firebaseapp.com');
}
