import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/nav/NavBar';
import { ItemFormsProvider } from '../context/ItemFormsProvider';
import { HabitFormsProvider } from '../context/HabitFormsProvider';
import { OnboardingProvider } from '../context/OnboardingProvider';
import { UpdateBanner } from '../components/ui/UpdateBanner';

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
   agenda a cargar con el estado del editor de hábitos sin usarlo nunca, y viceversa.

   OnboardingProvider va adentro de todo esto (necesita useNavigate, que solo funciona
   dentro del Router) pero afuera de nada en particular: el modal de "primera vez" y el
   tour tienen que poder taparlo todo, sección que sea. <UpdateBanner /> es aparte y no
   tiene proveedor propio: no guarda ningún estado de la cuenta, solo escucha al service
   worker, así que alcanza con un componente suelto. */
export function AppLayout() {
  return (
    <ItemFormsProvider>
      <HabitFormsProvider>
        <OnboardingProvider>
          <Outlet />
          <NavBar />
          <UpdateBanner />
        </OnboardingProvider>
      </HabitFormsProvider>
    </ItemFormsProvider>
  );
}
