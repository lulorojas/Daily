import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/nav/NavBar';
import { ItemFormsProvider } from '../context/ItemFormsProvider';

/* ----------------------------- EL MARCO DE LA APP -----------------------------
   Todo lo que hay adentro de la sesión comparte dos cosas: la barra de abajo y los
   formularios de agenda. En vez de que cada pantalla las repita —que es lo que pasaba en
   vanilla, donde cada view() terminaba con `html += navbar(acc)`— van una sola vez acá.

   Es una "ruta layout" de React Router: no tiene URL propia, envuelve a otras y <Outlet />
   es el agujero donde se dibuja la que haya coincidido.

   El orden importa: <Outlet /> antes que <NavBar /> deja la pantalla como primer hijo de
   #app, que es lo que espera el CSS (.view es el que scrollea y la barra va fija encima).

   El proveedor de formularios envuelve a los dos porque los abren los dos: una fila de
   una pantalla y el botón + de la barra. */
export function AppLayout() {
  return (
    <ItemFormsProvider>
      <Outlet />
      <NavBar />
    </ItemFormsProvider>
  );
}
