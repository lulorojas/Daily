import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/nav/NavBar';
import { ItemFormsProvider } from '../context/ItemFormsProvider';
import { HabitFormsProvider } from '../context/HabitFormsProvider';

/* ----------------------------- EL MARCO DE LA APP -----------------------------
   Todo lo que hay adentro de la sesión comparte dos cosas: la barra de abajo y los
   formularios que se abren desde más de una pantalla. En vez de que cada pantalla las
   repita —que es lo que pasaba en vanilla, donde cada view() terminaba con
   `html += navbar(acc)`— van una sola vez acá.

   Es una "ruta layout" de React Router: no tiene URL propia, envuelve a otras y <Outlet />
   es el agujero donde se dibuja la que haya coincidido.

   El orden importa: <Outlet /> antes que <NavBar /> deja la pantalla como primer hijo de
   #app, que es lo que espera el CSS (.view es el que scrollea y la barra va fija encima).

   Dos proveedores de formularios, uno por tipo de dato: el de agenda (tarea/cita, que abren
   Hoy, Calendario y el botón + de la barra) y el de hábitos (que abren Hoy y Hábitos). Cada
   uno sabe solo de lo suyo — mezclarlos en un contexto único obligaría a los formularios de
   agenda a cargar con el estado del editor de hábitos sin usarlo nunca, y viceversa. */
export function AppLayout() {
  return (
    <ItemFormsProvider>
      <HabitFormsProvider>
        <Outlet />
        <NavBar />
      </HabitFormsProvider>
    </ItemFormsProvider>
  );
}
