import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/* Atajo para leer la sesión desde cualquier componente:
     const { user, status } = useAuth();

   El chequeo del null no es paranoia: si alguien renderiza un componente fuera del
   <AuthProvider>, sin esto recibiría `undefined` y el error aparecería tres archivos
   más adelante, imposible de rastrear. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() se usó fuera de <AuthProvider>');
  return ctx;
}
