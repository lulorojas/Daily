import { Outlet } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { DATA_STATUS } from '../store/dataStore';
import { LoadingPage } from '../pages/LoadingPage';
import { DataErrorPage } from '../pages/DataErrorPage';

/* Segunda puerta, después de la de sesión: hay usuario verificado, pero sus datos
   todavía no llegaron. Ninguna pantalla de la app puede dibujarse sin el documento —
   todas leen state.items, state.habits, etc. — así que se espera acá.

   Mismo orden que render() en la app vanilla: primero la puerta de sesión, después la de
   datos, y recién ahí la app. */
export function RequireData() {
  const { status, retry } = useData();

  if (status === DATA_STATUS.ERROR) return <DataErrorPage onRetry={retry} />;
  if (status !== DATA_STATUS.READY) return <LoadingPage />;
  return <Outlet />;
}
