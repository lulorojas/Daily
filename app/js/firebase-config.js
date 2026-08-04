"use strict";
/* ----------------------------- FIREBASE (config) -----------------------------
   Proyecto daily-app-2aae2. Se carga después del SDK compat (js/vendor/) y antes que
   el resto de la app, así `firebase` ya está inicializado cuando auth.js lo necesita.

   La apiKey de un proyecto web es pública por diseño: identifica al proyecto, no autoriza
   nada por sí sola. Lo que protege los datos son el proveedor habilitado en la consola y,
   a partir de la etapa 2, las reglas de seguridad de Firestore. */
const firebaseConfig = {
  apiKey: "AIzaSyDBHLj-OHZAAC0WGQTIVygs51Gl-2u9Cgk",
  authDomain: "daily-app-2aae2.firebaseapp.com",
  projectId: "daily-app-2aae2",
  storageBucket: "daily-app-2aae2.firebasestorage.app",
  messagingSenderId: "90685314455",
  appId: "1:90685314455:web:aab2a0eda47201de2b20d2"
};

// Si el SDK no llegó a cargar, no se rompe nada acá: authGate() lo detecta y muestra la
// pantalla de "no se pudo cargar" en vez de dejar la app en blanco.
if (typeof firebase !== 'undefined' && firebase.apps && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
