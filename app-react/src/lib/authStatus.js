/* ----------------------------- ESTADO DE LA PUERTA -----------------------------
   El equivalente de authGate() de la app vanilla, pero como función pura: recibe lo que
   sabemos de la sesión y devuelve en qué situación está el usuario. Ni React ni Firebase
   aparecen acá, así que se puede testear con objetos inventados.

   Los cuatro estados posibles:
     'error'      → Firebase no arrancó (config rota, SDK que no cargó)
     'loading'    → todavía no sabemos si hay sesión (Firebase no contestó)
     'signed-out' → no hay sesión
     'unverified' → hay sesión, pero el email no está verificado
     'ready'      → sesión con email verificado: vía libre */

export const AUTH_STATUS = {
  ERROR: 'error',
  LOADING: 'loading',
  SIGNED_OUT: 'signed-out',
  UNVERIFIED: 'unverified',
  READY: 'ready',
};

export function authStatus({ ready, user, error }) {
  if (error) return AUTH_STATUS.ERROR;
  if (!ready) return AUTH_STATUS.LOADING;
  if (!user) return AUTH_STATUS.SIGNED_OUT;
  if (!user.emailVerified) return AUTH_STATUS.UNVERIFIED;
  return AUTH_STATUS.READY;
}

/* A dónde pertenece cada estado. Lo usan los guardianes de ruta para mandar a la persona
   a la pantalla que le corresponde cuando entra a una URL que no le toca. */
export function pathForStatus(status) {
  if (status === AUTH_STATUS.UNVERIFIED) return '/verificar';
  if (status === AUTH_STATUS.READY) return '/';
  return '/login';
}
