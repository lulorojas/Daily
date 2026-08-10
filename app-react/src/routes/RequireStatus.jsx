import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { pathForStatus } from '../lib/authStatus';

/* ----------------------------- GUARDIÁN DE RUTAS -----------------------------
   Un solo componente resuelve las tres reglas de acceso: cada grupo de rutas declara qué
   estados de sesión tiene permitidos, y si el usuario no está en uno de ellos se lo manda
   a donde le corresponde (pathForStatus).

   Se usa como ruta "layout": envuelve otras rutas y <Outlet /> es el lugar donde React
   Router dibuja la ruta hija que coincidió con la URL.

   `replace` reemplaza la entrada en el historial en vez de agregar una: sin eso, el botón
   Atrás del navegador te devolvería a la pantalla de la que te acaban de echar, en loop. */
export function RequireStatus({ allow }) {
  const { status } = useAuth();
  if (!allow.includes(status)) return <Navigate to={pathForStatus(status)} replace />;
  return <Outlet />;
}
