/* Los códigos de error de Firebase, traducidos al criollo. Copiados uno a uno de la app
   vanilla (auth.js), para que la persona lea exactamente el mismo mensaje que antes. */
import { PASS_MIN } from './validation';

export const AUTH_ERR = {
  'auth/invalid-email':          'Ese email no tiene un formato válido.',
  'auth/user-disabled':          'Esta cuenta está deshabilitada.',
  'auth/user-not-found':         'No hay ninguna cuenta con ese email.',
  'auth/wrong-password':         'La contraseña no es correcta.',
  'auth/invalid-credential':     'El email o la contraseña no son correctos.',
  'auth/email-already-in-use':   'Ya existe una cuenta con ese email. Probá iniciar sesión.',
  'auth/weak-password':          'La contraseña es muy débil. Poné al menos ' + PASS_MIN + ' caracteres.',
  'auth/too-many-requests':      'Demasiados intentos seguidos. Esperá un momento y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión. Para entrar la primera vez hace falta internet.',
  'auth/operation-not-allowed':  'El ingreso con email y contraseña no está habilitado en el proyecto.',
  'auth/requires-recent-login':  'Por seguridad, volvé a iniciar sesión.',
};

export function authErrorMessage(error) {
  return (error && AUTH_ERR[error.code]) || 'Algo salió mal. Probá de nuevo en un momento.';
}
