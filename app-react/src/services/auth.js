/* ----------------------------- SERVICIO DE AUTENTICACIÓN -----------------------------
   Único lugar del proyecto que le habla a Firebase Auth. Los componentes NUNCA importan
   'firebase/auth': importan estas funciones. Dos ventajas concretas:

   1. Si mañana cambia el SDK (o se agrega login con Google), se toca un solo archivo.
   2. Los tests reemplazan este módulo entero por uno falso (vi.mock) y prueban toda la
      pantalla sin red, sin credenciales y sin emulador.

   Todas las funciones devuelven promesas y dejan que el error de Firebase suba tal cual:
   quien llama lo traduce con authErrorMessage(). */
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload,
} from 'firebase/auth';
import { getAuthInstance, getInitError } from './firebase';

/* El User de Firebase es un objeto mutable y con métodos: Firebase le cambia campos por
   dentro (por ejemplo emailVerified después de reload()) sin crear uno nuevo. React, en
   cambio, decide si tiene que redibujar comparando referencias: un objeto que muta por
   dentro pero sigue siendo "el mismo" no dispara nada.

   Por eso al estado de React entra siempre una foto plana e inmutable del usuario, y el
   User de verdad se queda acá adentro (auth.currentUser) para las operaciones que lo
   necesitan. */
export function toUserSnapshot(user) {
  if (!user) return null;
  return { uid: user.uid, email: user.email, emailVerified: !!user.emailVerified };
}

export function hasAuth() {
  return !getInitError() && !!getAuthInstance();
}

export function initError() {
  return getInitError();
}

/* Suscripción al estado de sesión. Firebase la persiste en IndexedDB, así que al reabrir
   la app vuelve el usuario que ya estaba logueado, incluso sin internet.
   Devuelve la función para desuscribirse (la usa el useEffect del AuthProvider). */
export function subscribeToAuth(callback) {
  const auth = getAuthInstance();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (user) => callback(toUserSnapshot(user)));
}

export function login(email, password) {
  return signInWithEmailAndPassword(getAuthInstance(), email, password);
}

/* Registro = crear la cuenta y, acto seguido, mandar el mail de verificación.
   Van juntos a propósito: una cuenta creada sin ese mail deja a la persona trabada en la
   pantalla de verificación sin nada que abrir. */
export async function register(email, password) {
  const cred = await createUserWithEmailAndPassword(getAuthInstance(), email, password);
  if (cred && cred.user) await sendEmailVerification(cred.user);
  return cred;
}

export function sendReset(email) {
  return sendPasswordResetEmail(getAuthInstance(), email);
}

export function resendVerification() {
  const user = getAuthInstance()?.currentUser;
  if (!user) return Promise.reject(new Error('no-user'));
  return sendEmailVerification(user);
}

/* emailVerified viene del token cacheado: recién después de reload() refleja que la
   persona abrió el link del mail. Devuelve la foto actualizada del usuario. */
export async function refreshUser() {
  const auth = getAuthInstance();
  const user = auth?.currentUser;
  if (!user) return null;
  await reload(user);
  return toUserSnapshot(auth.currentUser);
}

export function logout() {
  return signOut(getAuthInstance());
}
