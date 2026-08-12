import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireStatus } from './RequireStatus';
import { RequireData } from './RequireData';
import { AppLayout } from './AppLayout';
import { AUTH_STATUS } from '../lib/authStatus';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { HoyPage } from '../pages/HoyPage';
import { CalendarioPage } from '../pages/CalendarioPage';
import { GymPage } from '../pages/GymPage';
import { RutinasListPage } from '../pages/rutinas/RutinasListPage';
import { RutinaDetailPage } from '../pages/rutinas/RutinaDetailPage';
import { RutinaDayPage } from '../pages/rutinas/RutinaDayPage';
import { HabitosPage } from '../pages/HabitosPage';
import { ProgresoPage } from '../pages/ProgresoPage';
import { AjustesPage } from '../pages/AjustesPage';

/* ----------------------------- MAPA DE RUTAS -----------------------------
   Todas las pantallas y quién puede verlas, en un solo archivo que se lee de arriba abajo.
   En la app vanilla esto era AUTH.screen + un if largo dentro de render(); acá cada
   pantalla tiene URL propia, lo que trae el botón Atrás, poder compartir /calendario y
   que un link a un día (/?d=2026-08-10) sea un link de verdad.

   Las tres reglas de acceso, que son las mismas que pedía la etapa 1:
     sin sesión              → login (y solo puede ver los formularios de sesión)
     con sesión sin verificar → pantalla de verificación (y nada más)
     con sesión verificada    → la app (y ya no puede volver al login) */
export function AppRoutes() {
  return (
    <Routes>
      {/* Solo sin sesión: si ya entraste, estas URLs te devuelven a donde estabas. */}
      <Route element={<RequireStatus allow={[AUTH_STATUS.SIGNED_OUT]} />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<ResetPasswordPage />} />
      </Route>

      {/* Solo con sesión sin verificar. */}
      <Route element={<RequireStatus allow={[AUTH_STATUS.UNVERIFIED]} />}>
        <Route path="/verificar" element={<VerifyEmailPage />} />
      </Route>

      {/* Solo con sesión verificada Y con los datos ya cargados: la app.
          Las tres capas se anidan, cada una con una sola responsabilidad:
          quién sos → tenés los datos → el marco (barra + formularios) → la pantalla. */}
      <Route element={<RequireStatus allow={[AUTH_STATUS.READY]} />}>
        <Route element={<RequireData />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HoyPage />} />
            <Route path="/calendario" element={<CalendarioPage />} />
            <Route path="/gym" element={<GymPage />} />
            {/* Rutinas es una sub-pantalla de Gimnasio, con sus tres niveles como rutas
                anidadas: en vanilla eran ui.rutId/ui.rutDayId, acá son parámetros de URL,
                así que abrir una rutina o un día es navegar de verdad (botón Atrás,
                link compartible). NavBar se acuerda de la última que se visitó (ver el
                comentario de lastGymPath ahí) para que volver desde otra sección te deje
                donde estabas. */}
            <Route path="/gym/rutinas" element={<RutinasListPage />} />
            <Route path="/gym/rutinas/:rutId" element={<RutinaDetailPage />} />
            <Route path="/gym/rutinas/:rutId/:dayId" element={<RutinaDayPage />} />
            <Route path="/habitos" element={<HabitosPage />} />
            <Route path="/progreso" element={<ProgresoPage />} />
            {/* Ajustes no es una sección: es una sub-pantalla de Hoy, a la que se llega
                por el engranaje. Igual que `ui.hoySub='ajustes'` en la app vanilla. */}
            <Route path="/ajustes" element={<AjustesPage />} />
          </Route>
        </Route>
      </Route>

      {/* Cualquier otra URL cae en la raíz, y ahí el guardián decide. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
